import React, { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import { 
  UserProfile, 
  UserStats, 
  CurrentAffairsItem, 
  MockTest, 
  TestAttempt, 
  Question,
  CategoryCutoffs 
} from './types';
import { 
  getUserProfile, 
  getUserStats, 
  getAllCurrentAffairs, 
  getMockTests, 
  getTestAttempts, 
  getAllQuestions,
  getCABookmarks,
  getQuestionBookmarks,
  saveTestAttempt,
  hydrateFromMongoDB
} from './data/storage';

import { Navbar } from './components/Navbar';

// Lazy-load heavy views and modals to cut initial JS bundle and heap footprint
const LandingPage = lazy(() => import('./components/LandingPage').then(m => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('./components/LoginPage').then(m => ({ default: m.LoginPage })));
const HomeDashboard = lazy(() => import('./components/HomeDashboard').then(m => ({ default: m.HomeDashboard })));
const CurrentAffairsModule = lazy(() => import('./components/CurrentAffairsModule').then(m => ({ default: m.CurrentAffairsModule })));
const MockTestPortal = lazy(() => import('./components/MockTestPortal').then(m => ({ default: m.MockTestPortal })));
const ActiveTestInterface = lazy(() => import('./components/ActiveTestInterface').then(m => ({ default: m.ActiveTestInterface })));
const ResultsAnalyticsView = lazy(() => import('./components/ResultsAnalyticsView').then(m => ({ default: m.ResultsAnalyticsView })));
const TopicPracticeView = lazy(() => import('./components/TopicPracticeView').then(m => ({ default: m.TopicPracticeView })));
const BookmarksView = lazy(() => import('./components/BookmarksView').then(m => ({ default: m.BookmarksView })));
const UserProfileView = lazy(() => import('./components/UserProfileView').then(m => ({ default: m.UserProfileView })));
const AdminPortal = lazy(() => import('./components/AdminPortal').then(m => ({ default: m.AdminPortal })));
const AuthModal = lazy(() => import('./components/AuthModal').then(m => ({ default: m.AuthModal })));
const ScorecardPrintModal = lazy(() => import('./components/ScorecardPrintModal').then(m => ({ default: m.ScorecardPrintModal })));

const ViewFallback: React.FC = () => (
  <div className="min-h-[45vh] flex items-center justify-center p-8">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 rounded-full border-3 border-amber-500 border-t-transparent animate-spin" />
      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loading module...</span>
    </div>
  </div>
);

export const App: React.FC = () => {
  // Page Flow State: Dedicated Landing Page -> Login Page -> Main Examination Portal
  const [currentPage, setCurrentPage] = useState<'landing' | 'login' | 'portal'>('landing');

  // Navigation & View State (within portal)
  const [activeTab, setActiveTab] = useState<'home' | 'ca' | 'mock' | 'practice' | 'analytics' | 'bookmarks' | 'profile' | 'admin'>('home');
  
  // Data Entities (lazy initializers prevent redundant localStorage reads/JSON.parse on every render)
  const [user, setUser] = useState<UserProfile>(() => getUserProfile());
  const [stats, setStats] = useState<UserStats>(() => getUserStats());
  const [currentAffairs, setCurrentAffairs] = useState<CurrentAffairsItem[]>(() => getAllCurrentAffairs());
  const [mockTests, setMockTests] = useState<MockTest[]>(() => getMockTests());
  const [questions, setQuestions] = useState<Question[]>(() => getAllQuestions());
  const [attempts, setAttempts] = useState<TestAttempt[]>(() => getTestAttempts());
  const [caBookmarkIds, setCaBookmarkIds] = useState<string[]>(() => getCABookmarks());
  const [qBookmarkIds, setQBookmarkIds] = useState<string[]>(() => getQuestionBookmarks());

  // Active Test State
  const [activeTest, setActiveTest] = useState<MockTest | null>(null);
  const [activeCandidateCategory, setActiveCandidateCategory] = useState<keyof CategoryCutoffs>('UR');
  const [activeTimerMode, setActiveTimerMode] = useState<'overall' | 'sectional'>('overall');

  // Completed Test Attempt (for immediate Results view)
  const [activeAttemptResult, setActiveAttemptResult] = useState<TestAttempt | null>(() => attempts[0] || null);

  // Direct Article Deep-Link from Bookmarks
  const [deepLinkedArticleId, setDeepLinkedArticleId] = useState<string | null>(null);

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [printableScorecardAttempt, setPrintableScorecardAttempt] = useState<TestAttempt | null>(null);

  // Reload all storage state
  const reloadData = useCallback(() => {
    setUser(getUserProfile());
    setStats(getUserStats());
    setCurrentAffairs(getAllCurrentAffairs());
    setMockTests(getMockTests());
    setQuestions(getAllQuestions());
    const freshAttempts = getTestAttempts();
    setAttempts(freshAttempts);
    setCaBookmarkIds(getCABookmarks());
    setQBookmarkIds(getQuestionBookmarks());
    setActiveAttemptResult(prev => prev || freshAttempts[0] || null);
  }, []);

  // Full MongoDB Atlas Hydration on Startup
  useEffect(() => {
    let mounted = true;
    hydrateFromMongoDB().then((hydrated) => {
      if (hydrated && mounted) {
        reloadData();
      }
    });
    return () => { mounted = false; };
  }, [reloadData]);

  // Launch Test
  const handleStartTest = useCallback((
    test: MockTest,
    category: keyof CategoryCutoffs,
    timerMode: 'overall' | 'sectional' = 'overall'
  ) => {
    setActiveTest(test);
    setActiveCandidateCategory(category);
    setActiveTimerMode(timerMode);
  }, []);

  // Finish Test
  const handleFinishTest = useCallback((attempt: TestAttempt) => {
    saveTestAttempt(attempt);
    setActiveAttemptResult(attempt);
    setActiveTest(null);
    reloadData();
    setActiveTab('analytics');
  }, [reloadData]);

  // Exit Test
  const handleExitTest = useCallback(() => {
    setActiveTest(null);
    setActiveTab('mock');
  }, []);

  // Retake current test from analytics
  const handleRetakeCurrentTest = useCallback(() => {
    if (!activeAttemptResult) return;
    const matchedTest = mockTests.find(t => t.id === activeAttemptResult.testId) || mockTests[0];
    if (matchedTest) {
      handleStartTest(matchedTest, activeAttemptResult.selectedCategory || 'UR');
    }
  }, [activeAttemptResult, mockTests, handleStartTest]);

  const currentAnalyticsAttempt = activeAttemptResult || attempts[0] || null;
  const currentAnalyticsQuestions = useMemo(() => {
    if (!currentAnalyticsAttempt) return [];
    return (
      mockTests.find(t => t.id === currentAnalyticsAttempt.testId)?.questions ||
      questions.slice(0, currentAnalyticsAttempt.totalQuestions)
    );
  }, [currentAnalyticsAttempt, mockTests, questions]);

  const clearDeepLinkedArticle = useCallback(() => setDeepLinkedArticleId(null), []);

  // 1. If in active testing session, render isolated full-screen test hall
  if (activeTest) {
    return (
      <Suspense fallback={<ViewFallback />}>
        <ActiveTestInterface
          test={activeTest}
          user={user}
          selectedCategory={activeCandidateCategory}
          timerMode={activeTimerMode}
          onFinishTest={handleFinishTest}
          onExitTest={handleExitTest}
        />
      </Suspense>
    );
  }

  // 2. Dedicated Landing Page
  if (currentPage === 'landing') {
    return (
      <Suspense fallback={<ViewFallback />}>
        <LandingPage
          mockTests={mockTests}
          onNavigateToLogin={() => setCurrentPage('login')}
          onQuickExplore={() => setCurrentPage('portal')}
        />
      </Suspense>
    );
  }

  // 3. Dedicated Login Page
  if (currentPage === 'login') {
    return (
      <Suspense fallback={<ViewFallback />}>
        <LoginPage
          currentUser={user}
          onLoginSuccess={(updated) => {
            setUser(updated);
            reloadData();
            setCurrentPage('portal');
          }}
          onBackToLanding={() => setCurrentPage('landing')}
          onGuestAccess={() => setCurrentPage('portal')}
        />
      </Suspense>
    );
  }

  // 4. Main Examination & Assessment Portal
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-amber-200 selection:text-amber-950 dark:selection:bg-amber-500/30 dark:selection:text-amber-200 transition-colors duration-200">
      
      {/* Sticky Main Navigation */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        user={user}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        caBookmarksCount={caBookmarkIds.length + qBookmarkIds.length}
        onNavigateToLanding={() => setCurrentPage('landing')}
        onLogout={() => setCurrentPage('login')}
      />

      {/* Main Content View Switcher */}
      <main className="flex-1 pb-6 lg:pb-16">
        <Suspense fallback={<ViewFallback />}>
        {activeTab === 'home' && (
          <HomeDashboard
            user={user}
            stats={stats}
            currentAffairs={currentAffairs}
            mockTests={mockTests}
            attempts={attempts}
            onNavigateTab={setActiveTab}
            onSelectTest={(test) => handleStartTest(test, 'UR')}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
          />
        )}

        {activeTab === 'ca' && (
          <CurrentAffairsModule
            currentAffairs={currentAffairs}
            bookmarks={caBookmarkIds}
            onBookmarkChange={reloadData}
            initialArticleId={deepLinkedArticleId}
            onClearInitialArticle={clearDeepLinkedArticle}
          />
        )}

        {activeTab === 'mock' && (
          <MockTestPortal
            mockTests={mockTests}
            user={user}
            onStartTest={handleStartTest}
          />
        )}

        {activeTab === 'practice' && (
          <TopicPracticeView
            questions={questions}
          />
        )}

        {activeTab === 'analytics' && (
          currentAnalyticsAttempt ? (
            <ResultsAnalyticsView
              attempt={currentAnalyticsAttempt}
              testQuestions={currentAnalyticsQuestions}
              user={user}
              allAttempts={attempts}
              allMockTests={mockTests}
              allQuestions={questions}
              onSelectAttempt={(att) => setActiveAttemptResult(att)}
              onAddResult={(newAtt) => {
                saveTestAttempt(newAtt);
                reloadData();
                setActiveAttemptResult(newAtt);
              }}
              onRetakeTest={handleRetakeCurrentTest}
              onBackToPortal={() => setActiveTab('mock')}
              onOpenScorecardPrint={() => setPrintableScorecardAttempt(currentAnalyticsAttempt)}
            />
          ) : (
            <div className="max-w-4xl mx-auto py-16 px-4 text-center space-y-4">
              <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <h3 className="text-xl font-bold font-serif text-slate-900 dark:text-white">No Mock Tests Completed Yet</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Complete your first timed mock test or add an exam result to generate comprehensive performance diagnostics and category cutoff analytics.
                </p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
                  <button
                    onClick={() => setActiveTab('mock')}
                    className="px-5 py-3 sm:py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-sm transition-colors cursor-pointer"
                  >
                    Go to Mock Test Portal
                  </button>
                  <button
                    onClick={() => {
                      reloadData();
                      if (attempts.length > 0) setActiveAttemptResult(attempts[0]);
                    }}
                    className="px-5 py-3 sm:py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl shadow-sm transition-colors cursor-pointer"
                  >
                    Load Sample Results
                  </button>
                </div>
              </div>
            </div>
          )
        )}

        {activeTab === 'bookmarks' && (
          <BookmarksView
            currentAffairs={currentAffairs}
            questions={questions}
            caBookmarkIds={caBookmarkIds}
            questionBookmarkIds={qBookmarkIds}
            onBookmarksUpdated={reloadData}
            onOpenArticle={(item) => {
              setDeepLinkedArticleId(item.id);
              setActiveTab('ca');
            }}
          />
        )}

        {activeTab === 'profile' && (
          <UserProfileView
            user={user}
            stats={stats}
            attempts={attempts}
            onProfileUpdated={(updated) => {
              setUser(updated);
              reloadData();
            }}
            onViewAttemptScorecard={(att) => {
              setActiveAttemptResult(att);
              setActiveTab('analytics');
            }}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
          />
        )}

        {activeTab === 'admin' && (
          <AdminPortal
            questions={questions}
            currentAffairs={currentAffairs}
            mockTests={mockTests}
            onDataChanged={reloadData}
          />
        )}
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 pt-8 pb-24 lg:pb-8 px-4 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2 transition-colors duration-200">
        <p className="font-bold text-slate-700 dark:text-slate-300">
          Competitive Exam and Current Affairs Mock Test Portal • Academic Year 2026-27
        </p>
        <p className="text-slate-600 dark:text-slate-400">
          Nirmala Memorial Foundation College of Commerce and Science (Autonomous) • Department of Computer Science
        </p>
        <p className="text-[11px] text-slate-500 dark:text-slate-500">
          Department of Computer Science • B.Sc. CS Mock Test &amp; Assessment Platform
        </p>
      </footer>


      {/* Authentication Modal */}
      {isAuthModalOpen && (
        <Suspense fallback={null}>
          <AuthModal
            currentUser={user}
            onClose={() => setIsAuthModalOpen(false)}
            onProfileUpdated={(updated) => {
              setUser(updated);
              reloadData();
            }}
          />
        </Suspense>
      )}

      {/* Printable Scorecard Modal */}
      {printableScorecardAttempt && (
        <Suspense fallback={null}>
          <ScorecardPrintModal
            attempt={printableScorecardAttempt}
            user={user}
            onClose={() => setPrintableScorecardAttempt(null)}
          />
        </Suspense>
      )}

    </div>
  );
};
export default App;
