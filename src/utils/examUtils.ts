import {
  MockTest,
  TestAttempt,
  UserProfile,
  CategoryCutoffs,
  SectionResult,
  MockTestSectionConfig
} from '../types';

export interface EffectiveSection extends MockTestSectionConfig {
  index: number;
  durationSeconds: number;
}

// Shared AudioContext prevents native audio thread leaks and browser AudioContext limit exhaustion
let sharedAudioCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
};

export const playTimerBeep = (freq: number = 660, durationMs: number = 180, count: number = 1): void => {
  const ctx = getAudioContext();
  if (!ctx) return;

  let delay = 0;
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      try {
        if (ctx.state === 'closed') return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.onended = () => {
          osc.disconnect();
          gain.disconnect();
        };
        osc.start();
        osc.stop(ctx.currentTime + durationMs / 1000);
      } catch {
        // Ignore browser autoplay / audio errors
      }
    }, delay);
    delay += durationMs + 120;
  }
};

export const formatExamTime = (secs: number): string => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const mm = m.toString().padStart(2, '0');
  const ss = s.toString().padStart(2, '0');
  return h > 0 ? `${h.toString().padStart(2, '0')}:${mm}:${ss}` : `${mm}:${ss}`;
};

export const normalizeTestSections = (test: MockTest, totalSeconds: number): EffectiveSection[] => {
  const rawSections: MockTestSectionConfig[] =
    test.sections && test.sections.length > 0
      ? test.sections
      : [
          {
            id: 'sec-default',
            section: test.questions[0]?.section || 'General Studies',
            questionIds: test.questions.map(q => q.id),
            timeLimitMinutes: test.overallTimeLimitMinutes || 60,
            cutoffMarks: test.overallCutoffMarks || 5
          }
        ];

  const totalSectionMins = rawSections.reduce((sum, s) => sum + (s.timeLimitMinutes || 15), 0) || 60;

  return rawSections.map((sec, idx) => {
    const ratio = (sec.timeLimitMinutes || totalSectionMins / rawSections.length) / totalSectionMins;
    return {
      ...sec,
      index: idx,
      durationSeconds: Math.max(30, Math.round(totalSeconds * ratio))
    };
  });
};

export interface BuildAttemptParams {
  test: MockTest;
  user: UserProfile;
  selectedCategory: keyof CategoryCutoffs;
  isSectionalMode: boolean;
  totalSeconds: number;
  secondsRemaining: number;
  answers: Record<string, string>;
  markedForReview: Record<string, boolean>;
  visitedQuestions: Record<string, boolean>;
}

export const buildTestAttemptResult = ({
  test,
  user,
  selectedCategory,
  isSectionalMode,
  totalSeconds,
  secondsRemaining,
  answers,
  markedForReview,
  visitedQuestions
}: BuildAttemptParams): TestAttempt => {
  let correctCount = 0;
  let wrongCount = 0;
  let score = 0;

  const responses: Record<string, string> = {};
  const questionReviewStatus: Record<string, 'answered' | 'unanswered' | 'marked_review' | 'not_visited'> = {};

  for (const q of test.questions) {
    const ans = answers[q.id];
    if (ans) {
      responses[q.id] = ans;
      if (ans === q.correctOptionId) {
        correctCount++;
        score += test.marksPerQuestion;
      } else {
        wrongCount++;
        score -= test.negativeMarksPerQuestion;
      }
    }

    if (markedForReview[q.id]) {
      questionReviewStatus[q.id] = 'marked_review';
    } else if (ans) {
      questionReviewStatus[q.id] = 'answered';
    } else if (visitedQuestions[q.id]) {
      questionReviewStatus[q.id] = 'unanswered';
    } else {
      questionReviewStatus[q.id] = 'not_visited';
    }
  }

  const attemptedTotal = correctCount + wrongCount;
  const accuracy = attemptedTotal > 0 ? Math.round((correctCount / attemptedTotal) * 100) : 0;
  const maxMarks = test.questions.length * test.marksPerQuestion;

  const appliedCategoryCutoff = test.categoryCutoffs?.[selectedCategory] || test.overallCutoffMarks;
  const passedCategoryCutoff = score >= appliedCategoryCutoff;
  const passedOverallCutoff = score >= test.overallCutoffMarks;

  const sectionResults: SectionResult[] = (test.sections || []).map(sec => {
    const secIdSet = new Set(sec.questionIds);
    let secTotal = 0;
    let secCorrect = 0;
    let secWrong = 0;
    let secScore = 0;

    for (const q of test.questions) {
      if (!secIdSet.has(q.id)) continue;
      secTotal++;
      const userAns = answers[q.id];
      if (!userAns) continue;
      if (userAns === q.correctOptionId) {
        secCorrect++;
        secScore += test.marksPerQuestion;
      } else {
        secWrong++;
        secScore -= test.negativeMarksPerQuestion;
      }
    }

    const secAttempted = secCorrect + secWrong;
    return {
      section: sec.section,
      totalQuestions: secTotal,
      attempted: secAttempted,
      correct: secCorrect,
      wrong: secWrong,
      scoreMarks: Math.max(0, Number(secScore.toFixed(2))),
      accuracyPercentage: secAttempted > 0 ? Math.round((secCorrect / secAttempted) * 100) : 0,
      cutoffMarks: sec.cutoffMarks || 5,
      passedSectionCutoff: secScore >= (sec.cutoffMarks || 5)
    };
  });

  if (sectionResults.length === 0) {
    sectionResults.push({
      section: 'General Studies',
      totalQuestions: test.questions.length,
      attempted: attemptedTotal,
      correct: correctCount,
      wrong: wrongCount,
      scoreMarks: Math.max(0, Number(score.toFixed(2))),
      accuracyPercentage: accuracy,
      cutoffMarks: appliedCategoryCutoff,
      passedSectionCutoff: passedCategoryCutoff
    });
  }

  return {
    id: `attempt-${Date.now()}`,
    testId: test.id,
    testTitle: test.title,
    examCategory: test.examCategory,
    studentName: user.name,
    rollNo: user.rollNo,
    dateFormatted: new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    timestamp: Date.now(),
    scoreMarks: Number(score.toFixed(2)),
    maxMarks,
    totalQuestions: test.questions.length,
    attemptedQuestions: attemptedTotal,
    correctAnswers: correctCount,
    wrongAnswers: wrongCount,
    accuracyPercentage: accuracy,
    totalTimeSeconds: Math.max(1, totalSeconds - secondsRemaining),
    timeLimitSeconds: totalSeconds,
    timerModeUsed: isSectionalMode ? 'sectional' : 'overall',
    selectedCategory,
    overallCutoffMarks: test.overallCutoffMarks,
    categoryCutoffsUsed: test.categoryCutoffs || {
      UR: test.overallCutoffMarks,
      OBC: Number((test.overallCutoffMarks * 0.9).toFixed(1)),
      EWS: Number((test.overallCutoffMarks * 0.85).toFixed(1)),
      SC: Number((test.overallCutoffMarks * 0.75).toFixed(1)),
      ST: Number((test.overallCutoffMarks * 0.65).toFixed(1)),
      [selectedCategory]: appliedCategoryCutoff
    },
    passedOverallCutoff,
    passedCategoryCutoff,
    sectionResults,
    userAnswers: responses,
    questionReviewStatus
  };
};
