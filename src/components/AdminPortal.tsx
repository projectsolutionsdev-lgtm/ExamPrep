import React, { useState, useEffect, useCallback } from 'react';
import { Question, MockTest, CurrentAffairsItem, AdminAnalytics } from '../types';
import {
  getAdminAnalytics,
  fetchLiveAdminAnalytics,
  fetchMongoDBStatus
} from '../data/storage';
import {
  ShieldCheck,
  BookOpen,
  CheckCircle2,
  TrendingUp,
  Layers,
  Clock,
  X
} from 'lucide-react';
import { AdminAnalyticsPanel } from './admin/AdminAnalyticsPanel';
import { CurrentAffairsManager } from './admin/CurrentAffairsManager';
import { QuestionBankManager } from './admin/QuestionBankManager';
import { MockTestScheduler } from './admin/MockTestScheduler';

interface AdminPortalProps {
  questions: Question[];
  currentAffairs: CurrentAffairsItem[];
  mockTests: MockTest[];
  onDataChanged: () => void;
}

type AdminTab = 'analytics' | 'ca_crud' | 'questions_crud' | 'tests_crud';

export const AdminPortal: React.FC<AdminPortalProps> = ({
  questions,
  currentAffairs,
  mockTests,
  onDataChanged
}) => {
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>('analytics');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [mongoStatus, setMongoStatus] = useState<any>(null);
  const [isCheckingMongo, setIsCheckingMongo] = useState<boolean>(false);
  const [analytics, setAnalytics] = useState<AdminAnalytics>(() => getAdminAnalytics());

  const refreshAdminLiveStats = useCallback(async () => {
    const live = await fetchLiveAdminAnalytics();
    setAnalytics(live);
  }, []);

  useEffect(() => {
    fetchMongoDBStatus().then(setMongoStatus);
    refreshAdminLiveStats();
  }, [questions.length, currentAffairs.length, mockTests.length, refreshAdminLiveStats]);

  const handleRefreshMongoStatus = async () => {
    setIsCheckingMongo(true);
    const status = await fetchMongoDBStatus();
    setMongoStatus(status);
    await refreshAdminLiveStats();
    setIsCheckingMongo(false);
  };

  const showNotification = useCallback((msg: string, isError: boolean = false) => {
    if (isError) {
      setErrorMsg(msg);
      setSuccessMsg('');
      setTimeout(() => setErrorMsg(''), 3500);
    } else {
      setSuccessMsg(msg);
      setErrorMsg('');
      setTimeout(() => setSuccessMsg(''), 3500);
    }
  }, []);

  const handleChildMutation = useCallback(
    (message: string, isError: boolean = false) => {
      showNotification(message, isError);
      if (!isError) {
        onDataChanged();
        refreshAdminLiveStats();
      }
    },
    [showNotification, onDataChanged, refreshAdminLiveStats]
  );

  const tabs: Array<{ id: AdminTab; label: string; icon: React.ReactNode }> = [
    { id: 'analytics', label: 'Aggregate Analytics', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'ca_crud', label: `Current Affairs (${currentAffairs.length})`, icon: <BookOpen className="w-4 h-4" /> },
    { id: 'questions_crud', label: `Question Bank (${questions.length})`, icon: <Layers className="w-4 h-4" /> },
    { id: 'tests_crud', label: `Mock Test Scheduler (${mockTests.length})`, icon: <Clock className="w-4 h-4" /> }
  ];

  return (
    <div
      id="admin-portal-container"
      className="max-w-7xl mx-auto py-5 sm:py-8 px-3.5 sm:px-6 lg:px-8 space-y-6 sm:space-y-8 transition-colors duration-200"
    >
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" /> Faculty &amp; Admin Management Panel
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white font-serif">
            Portal Control &amp; Question Bank Administration
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Nirmala Memorial Foundation College of Commerce and Science (Autonomous) • Dept. of Computer Science
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 rounded-2xl text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
          <X className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Admin Module Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl gap-1.5 text-xs font-bold overflow-x-auto scrollbar-none">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveAdminTab(tab.id)}
            className={`shrink-0 sm:shrink sm:flex-1 whitespace-nowrap px-4 py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeAdminTab === tab.id
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/60 dark:hover:bg-slate-800/60'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Active Tab Panel (Only the active tab's form state is kept in memory) */}
      {activeAdminTab === 'analytics' && (
        <AdminAnalyticsPanel
          analytics={analytics}
          mongoStatus={mongoStatus}
          isCheckingMongo={isCheckingMongo}
          mockTestsCount={mockTests.length}
          onRefreshStatus={handleRefreshMongoStatus}
        />
      )}

      {activeAdminTab === 'ca_crud' && (
        <CurrentAffairsManager
          currentAffairs={currentAffairs}
          onMutated={handleChildMutation}
        />
      )}

      {activeAdminTab === 'questions_crud' && (
        <QuestionBankManager
          questions={questions}
          onMutated={handleChildMutation}
        />
      )}

      {activeAdminTab === 'tests_crud' && (
        <MockTestScheduler
          mockTests={mockTests}
          questions={questions}
          onMutated={handleChildMutation}
        />
      )}
    </div>
  );
};
