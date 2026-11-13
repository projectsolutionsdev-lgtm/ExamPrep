import {
  Question,
  MockTest,
  TestAttempt,
  UserStats,
  CurrentAffairsItem,
  UserProfile,
  AdminAnalytics
} from '../types';
import {
  SEED_QUESTIONS,
  INITIAL_MOCK_TESTS,
  SEED_CURRENT_AFFAIRS,
  DEFAULT_USER_PROFILE,
  ADMIN_USER_PROFILE,
  SEED_TEST_ATTEMPTS
} from './seedData';

const STORAGE_KEYS = {
  QUESTIONS: 'ce_exam_questions_v6',
  MOCK_TESTS: 'ce_exam_mock_tests_v6',
  ATTEMPTS: 'ce_exam_attempts_v6',
  CURRENT_AFFAIRS: 'ce_current_affairs_v6',
  USER_PROFILE: 'ce_user_profile_v6',
  CA_BOOKMARKS: 'ce_ca_bookmarks_v6',
  QUESTION_BOOKMARKS: 'ce_q_bookmarks_v6'
} as const;

const LEGACY_DUMMY_EMAILS = new Set([
  'shivraj.gond@nirmala.edu.in',
  'chris.anthony@nirmala.edu.in',
  'admin@nirmala.edu.in',
  'student@nmf.edu.in',
  'student@nirmala.edu.in'
]);

const LEGACY_STUDENT_NAMES = new Set(['Shivraj Gond', 'Chris Anthony']);

interface StorageCache {
  userProfile?: UserProfile;
  questions?: Question[];
  currentAffairs?: CurrentAffairsItem[];
  caBookmarks?: string[];
  questionBookmarks?: string[];
  mockTests?: MockTest[];
  attempts?: TestAttempt[];
}

// In-memory read-through cache to eliminate redundant localStorage reads & JSON.parse allocations
const memoryCache: StorageCache = {};

// --- Low-Level Storage & API Helpers ---

const writeStorage = <K extends keyof StorageCache>(
  key: string,
  cacheField: K,
  value: NonNullable<StorageCache[K]>
): void => {
  memoryCache[cacheField] = value;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota / private mode storage errors; in-memory cache remains valid
  }
};

const readCachedStorage = <K extends keyof StorageCache>(
  key: string,
  cacheField: K,
  fallback: NonNullable<StorageCache[K]>,
  persistIfMissing: boolean = true
): NonNullable<StorageCache[K]> => {
  const cached = memoryCache[cacheField];
  if (cached !== undefined) {
    return cached as NonNullable<StorageCache[K]>;
  }

  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      if (persistIfMissing) {
        writeStorage(key, cacheField, fallback);
      } else {
        memoryCache[cacheField] = fallback;
      }
      return fallback;
    }

    const parsed = JSON.parse(raw) as NonNullable<StorageCache[K]>;
    memoryCache[cacheField] = parsed;
    return parsed;
  } catch {
    memoryCache[cacheField] = fallback;
    return fallback;
  }
};

const safeApiCall = async (url: string, options?: RequestInit) => {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {})
      }
    });
    return res.ok ? await res.json() : null;
  } catch {
    // Graceful fallback to offline/cached mode
    return null;
  }
};

const migrateLegacyProfile = (profile: UserProfile): { profile: UserProfile; modified: boolean } => {
  let modified = false;
  const next = { ...profile };

  if (next.avatar?.includes('images.unsplash.com')) {
    next.avatar = '';
    modified = true;
  }
  if (next.role === 'admin' && next.name !== 'Admin') {
    next.name = 'Admin';
    next.email = '';
    next.avatar = '';
    modified = true;
  }
  if (next.className === 'TYIT B' || next.className === 'B.Sc. IT') {
    next.className = 'TYBSc CS';
    modified = true;
  }
  if (LEGACY_STUDENT_NAMES.has(next.name)) {
    next.name = 'Rishabh';
    next.rollNo = '101';
    next.email = 'rishabh@gmail.com';
    modified = true;
  }
  if (next.email && LEGACY_DUMMY_EMAILS.has(next.email)) {
    next.email = next.role === 'student' ? 'rishabh@gmail.com' : '';
    modified = true;
  }

  return { profile: next, modified };
};

// --- User Profile & Authentication ---

export const getUserProfile = (): UserProfile => {
  if (memoryCache.userProfile) return memoryCache.userProfile;

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (!raw) {
      const defaultProf = { ...DEFAULT_USER_PROFILE };
      writeStorage(STORAGE_KEYS.USER_PROFILE, 'userProfile', defaultProf);
      return defaultProf;
    }

    const { profile, modified } = migrateLegacyProfile(JSON.parse(raw) as UserProfile);
    if (modified) {
      writeStorage(STORAGE_KEYS.USER_PROFILE, 'userProfile', profile);
    } else {
      memoryCache.userProfile = profile;
    }
    return profile;
  } catch {
    const fallback = { ...DEFAULT_USER_PROFILE };
    memoryCache.userProfile = fallback;
    return fallback;
  }
};

export const saveUserProfile = (profile: UserProfile): void => {
  const enriched: UserProfile = {
    ...profile,
    caBookmarks: profile.caBookmarks ?? getCABookmarks(),
    questionBookmarks: profile.questionBookmarks ?? getQuestionBookmarks()
  };

  writeStorage(STORAGE_KEYS.USER_PROFILE, 'userProfile', enriched);
  safeApiCall('/api/user-profile', {
    method: 'POST',
    body: JSON.stringify(enriched)
  });
};

export const switchStudentPersona = (persona: 'rishabh' | 'admin'): UserProfile => {
  const profile: UserProfile =
    persona === 'rishabh'
      ? { ...DEFAULT_USER_PROFILE, role: 'student' }
      : { ...ADMIN_USER_PROFILE, role: 'admin' };

  saveUserProfile(profile);
  return profile;
};

// --- MongoDB Atlas Status & Startup Hydration ---

export const fetchMongoDBStatus = async () => {
  const data = await safeApiCall('/api/status');
  return (
    data?.database || {
      database: 'MongoDB Atlas',
      status: 'disconnected',
      isConnected: false,
      uriConfigured: false,
      lastError: 'Local database cache active'
    }
  );
};

export const hydrateFromMongoDB = async (): Promise<boolean> => {
  const currentUser = getUserProfile();
  const res = await safeApiCall(`/api/bootstrap?userId=${encodeURIComponent(currentUser.id)}`);
  if (!res?.connected) return false;

  // Fresh empty cluster: seed once from default/local records
  if (res.isEmptyCluster) {
    const enrichedUser: UserProfile = {
      ...currentUser,
      caBookmarks: getCABookmarks(),
      questionBookmarks: getQuestionBookmarks()
    };

    await safeApiCall('/api/sync-seed', {
      method: 'POST',
      body: JSON.stringify({
        questions: getAllQuestions(),
        currentAffairs: getAllCurrentAffairs(),
        mockTests: getMockTests(),
        attempts: getTestAttempts(),
        profile: enrichedUser
      })
    });
    return true;
  }

  if (Array.isArray(res.questions) && res.questions.length > 0) {
    writeStorage(STORAGE_KEYS.QUESTIONS, 'questions', res.questions);
  }
  if (Array.isArray(res.currentAffairs) && res.currentAffairs.length > 0) {
    writeStorage(STORAGE_KEYS.CURRENT_AFFAIRS, 'currentAffairs', res.currentAffairs);
  }
  if (Array.isArray(res.mockTests) && res.mockTests.length > 0) {
    writeStorage(STORAGE_KEYS.MOCK_TESTS, 'mockTests', res.mockTests);
  }
  if (Array.isArray(res.attempts) && res.attempts.length > 0) {
    writeStorage(STORAGE_KEYS.ATTEMPTS, 'attempts', res.attempts);
  }

  if (res.profile?.id) {
    writeStorage(STORAGE_KEYS.USER_PROFILE, 'userProfile', res.profile);
    if (Array.isArray(res.profile.caBookmarks)) {
      writeStorage(STORAGE_KEYS.CA_BOOKMARKS, 'caBookmarks', res.profile.caBookmarks);
    }
    if (Array.isArray(res.profile.questionBookmarks)) {
      writeStorage(STORAGE_KEYS.QUESTION_BOOKMARKS, 'questionBookmarks', res.profile.questionBookmarks);
    }
  } else {
    saveUserProfile(currentUser);
  }

  return true;
};

// --- Question Bank CRUD ---

export const getAllQuestions = (): Question[] =>
  readCachedStorage(STORAGE_KEYS.QUESTIONS, 'questions', SEED_QUESTIONS);

export const saveCustomQuestion = (newQ: Omit<Question, 'id'>): Question => {
  const created: Question = {
    ...newQ,
    id: `custom-cq-${Date.now()}`,
    dateAdded: new Date().toISOString().split('T')[0]
  };
  writeStorage(STORAGE_KEYS.QUESTIONS, 'questions', [created, ...getAllQuestions()]);
  safeApiCall('/api/questions', { method: 'POST', body: JSON.stringify(created) });
  return created;
};

export const updateQuestion = (updatedQ: Question): void => {
  const all = getAllQuestions();
  const idx = all.findIndex(q => q.id === updatedQ.id);
  if (idx < 0) return;

  const next = [...all];
  next[idx] = updatedQ;
  writeStorage(STORAGE_KEYS.QUESTIONS, 'questions', next);
  safeApiCall('/api/questions', { method: 'POST', body: JSON.stringify(updatedQ) });
};

export const deleteCustomQuestion = (id: string): void => {
  const filtered = getAllQuestions().filter(q => q.id !== id);
  writeStorage(STORAGE_KEYS.QUESTIONS, 'questions', filtered);
  safeApiCall(`/api/questions/${id}`, { method: 'DELETE' });
};

// --- Current Affairs CRUD ---

export const getAllCurrentAffairs = (): CurrentAffairsItem[] =>
  readCachedStorage(STORAGE_KEYS.CURRENT_AFFAIRS, 'currentAffairs', SEED_CURRENT_AFFAIRS);

export const saveCurrentAffairsPost = (post: Omit<CurrentAffairsItem, 'id'>): CurrentAffairsItem => {
  const created: CurrentAffairsItem = { ...post, id: `ca-post-${Date.now()}` };
  writeStorage(STORAGE_KEYS.CURRENT_AFFAIRS, 'currentAffairs', [created, ...getAllCurrentAffairs()]);
  safeApiCall('/api/current-affairs', { method: 'POST', body: JSON.stringify(created) });
  return created;
};

export const updateCurrentAffairsPost = (updatedPost: CurrentAffairsItem): void => {
  const all = getAllCurrentAffairs();
  const idx = all.findIndex(p => p.id === updatedPost.id);
  if (idx < 0) return;

  const next = [...all];
  next[idx] = updatedPost;
  writeStorage(STORAGE_KEYS.CURRENT_AFFAIRS, 'currentAffairs', next);
  safeApiCall('/api/current-affairs', { method: 'POST', body: JSON.stringify(updatedPost) });
};

export const deleteCurrentAffairsPost = (id: string): void => {
  const filtered = getAllCurrentAffairs().filter(p => p.id !== id);
  writeStorage(STORAGE_KEYS.CURRENT_AFFAIRS, 'currentAffairs', filtered);
  safeApiCall(`/api/current-affairs/${id}`, { method: 'DELETE' });
};

// --- Bookmarks (Current Affairs & Question Bank) ---

const syncBookmarksToMongo = (caBookmarks: string[], questionBookmarks: string[]) => {
  safeApiCall('/api/bookmarks', {
    method: 'POST',
    body: JSON.stringify({
      userId: getUserProfile().id,
      caBookmarks,
      questionBookmarks
    })
  });
};

export const getCABookmarks = (): string[] =>
  readCachedStorage(STORAGE_KEYS.CA_BOOKMARKS, 'caBookmarks', [], false);

export const getQuestionBookmarks = (): string[] =>
  readCachedStorage(STORAGE_KEYS.QUESTION_BOOKMARKS, 'questionBookmarks', [], false);

export const toggleCABookmark = (caId: string): string[] => {
  const current = getCABookmarks();
  const updated = current.includes(caId) ? current.filter(id => id !== caId) : [...current, caId];
  writeStorage(STORAGE_KEYS.CA_BOOKMARKS, 'caBookmarks', updated);
  syncBookmarksToMongo(updated, getQuestionBookmarks());
  return updated;
};

export const toggleQuestionBookmark = (questionId: string): string[] => {
  const current = getQuestionBookmarks();
  const updated = current.includes(questionId)
    ? current.filter(id => id !== questionId)
    : [...current, questionId];
  writeStorage(STORAGE_KEYS.QUESTION_BOOKMARKS, 'questionBookmarks', updated);
  syncBookmarksToMongo(getCABookmarks(), updated);
  return updated;
};

// --- Mock Tests CRUD ---

export const getMockTests = (): MockTest[] =>
  readCachedStorage(STORAGE_KEYS.MOCK_TESTS, 'mockTests', INITIAL_MOCK_TESTS);

export const saveMockTest = (test: MockTest): void => {
  const all = [...getMockTests()];
  const existingIdx = all.findIndex(t => t.id === test.id);
  if (existingIdx >= 0) {
    all[existingIdx] = test;
  } else {
    all.unshift(test);
  }
  writeStorage(STORAGE_KEYS.MOCK_TESTS, 'mockTests', all);
  safeApiCall('/api/mock-tests', { method: 'POST', body: JSON.stringify(test) });
};

export const deleteMockTest = (id: string): void => {
  const filtered = getMockTests().filter(t => t.id !== id);
  writeStorage(STORAGE_KEYS.MOCK_TESTS, 'mockTests', filtered);
  safeApiCall(`/api/mock-tests/${id}`, { method: 'DELETE' });
};

// --- Test Attempts & Analytics ---

export const getTestAttempts = (): TestAttempt[] => {
  if (memoryCache.attempts) return memoryCache.attempts;

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ATTEMPTS);
    if (!raw) {
      writeStorage(STORAGE_KEYS.ATTEMPTS, 'attempts', SEED_TEST_ATTEMPTS);
      return SEED_TEST_ATTEMPTS;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      writeStorage(STORAGE_KEYS.ATTEMPTS, 'attempts', SEED_TEST_ATTEMPTS);
      return SEED_TEST_ATTEMPTS;
    }

    let migrated = false;
    const cleaned = parsed.map((att: TestAttempt) => {
      if (LEGACY_STUDENT_NAMES.has(att.studentName)) {
        migrated = true;
        return { ...att, studentName: 'Rishabh', rollNo: '101' };
      }
      return att;
    });

    if (migrated) {
      writeStorage(STORAGE_KEYS.ATTEMPTS, 'attempts', cleaned);
    } else {
      memoryCache.attempts = cleaned;
    }
    return cleaned;
  } catch {
    memoryCache.attempts = SEED_TEST_ATTEMPTS;
    return SEED_TEST_ATTEMPTS;
  }
};

export const saveTestAttempt = (attempt: TestAttempt): void => {
  const user = getUserProfile();
  const enhanced: TestAttempt = {
    ...attempt,
    studentName: attempt.studentName || user.name,
    rollNo: attempt.rollNo || user.rollNo
  };
  writeStorage(STORAGE_KEYS.ATTEMPTS, 'attempts', [enhanced, ...getTestAttempts()]);
  safeApiCall('/api/test-attempts', { method: 'POST', body: JSON.stringify(enhanced) });
};

export const getUserStats = (): UserStats => {
  const attempts = getTestAttempts();
  const caBookmarks = getCABookmarks();

  if (attempts.length === 0) {
    return {
      totalTestsTaken: 0,
      totalQuestionsAttempted: 0,
      averageAccuracy: 0,
      highestScore: 0,
      testsPassed: 0,
      totalPracticeTimeMinutes: 0,
      currentAffairsReadCount: Math.max(caBookmarks.length, 6)
    };
  }

  let totalQuestionsAttempted = 0;
  let totalAccuracySum = 0;
  let highestScore = -Infinity;
  let testsPassed = 0;
  let totalSeconds = 0;

  for (let i = 0; i < attempts.length; i++) {
    const att = attempts[i];
    totalQuestionsAttempted += att.attemptedQuestions;
    totalAccuracySum += att.accuracyPercentage;
    if (att.scoreMarks > highestScore) highestScore = att.scoreMarks;
    if (att.passedOverallCutoff || att.passedCategoryCutoff) testsPassed++;
    totalSeconds += att.totalTimeSeconds;
  }

  return {
    totalTestsTaken: attempts.length,
    totalQuestionsAttempted,
    averageAccuracy: Math.round(totalAccuracySum / attempts.length),
    highestScore: highestScore === -Infinity ? 0 : highestScore,
    testsPassed,
    totalPracticeTimeMinutes: Math.round(totalSeconds / 60),
    currentAffairsReadCount: Math.max(caBookmarks.length + 4, 8)
  };
};

export const getAdminAnalytics = (): AdminAnalytics => {
  const attempts = getTestAttempts();
  const questions = getAllQuestions();
  const currentAffairs = getAllCurrentAffairs();
  const mockTests = getMockTests();
  const currentUser = getUserProfile();

  const distinctStudents = new Set<string>();
  const examCounts: Record<string, number> = {};
  let accuracySum = 0;
  let completedCount = 0;

  for (let i = 0; i < attempts.length; i++) {
    const att = attempts[i];
    const name = att.studentName?.trim();
    if (name) distinctStudents.add(name);
    accuracySum += att.accuracyPercentage;
    if (att.attemptedQuestions > 0) completedCount++;
    if (att.examCategory) {
      examCounts[att.examCategory] = (examCounts[att.examCategory] || 0) + 1;
    }
  }

  if (currentUser.role === 'student' && currentUser.name.trim()) {
    distinctStudents.add(currentUser.name.trim());
  }

  const totalAttempts = attempts.length;
  let topPerformingExam = 'No Attempts Yet';
  let topCount = 0;
  for (const [exam, count] of Object.entries(examCounts)) {
    if (count > topCount) {
      topCount = count;
      topPerformingExam = exam;
    }
  }

  return {
    totalStudents: Math.max(distinctStudents.size, 1),
    totalTestsAttempted: totalAttempts,
    averageScorePercentage: totalAttempts > 0 ? Math.round(accuracySum / totalAttempts) : 0,
    completionRatePercentage: totalAttempts > 0 ? Math.round((completedCount / totalAttempts) * 100) : 0,
    topPerformingExam,
    totalQuestionsInBank: questions.length,
    totalCurrentAffairsPosts: currentAffairs.length,
    totalMockTests: mockTests.length,
    source: 'local'
  };
};

export const fetchLiveAdminAnalytics = async (): Promise<AdminAnalytics> => {
  const res = await safeApiCall('/api/analytics');
  return res?.connected && res?.analytics ? (res.analytics as AdminAnalytics) : getAdminAnalytics();
};

export const resetStorageToDefaults = (): void => {
  writeStorage(STORAGE_KEYS.QUESTIONS, 'questions', SEED_QUESTIONS);
  writeStorage(STORAGE_KEYS.MOCK_TESTS, 'mockTests', INITIAL_MOCK_TESTS);
  writeStorage(STORAGE_KEYS.CURRENT_AFFAIRS, 'currentAffairs', SEED_CURRENT_AFFAIRS);
  writeStorage(STORAGE_KEYS.USER_PROFILE, 'userProfile', DEFAULT_USER_PROFILE);
  memoryCache.attempts = undefined;
  memoryCache.caBookmarks = [];
  memoryCache.questionBookmarks = [];
  localStorage.removeItem(STORAGE_KEYS.ATTEMPTS);
  localStorage.removeItem(STORAGE_KEYS.CA_BOOKMARKS);
  localStorage.removeItem(STORAGE_KEYS.QUESTION_BOOKMARKS);
};
