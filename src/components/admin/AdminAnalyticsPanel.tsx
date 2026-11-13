import React from 'react';
import { AdminAnalytics } from '../../types';
import { Database, Server, RefreshCw } from 'lucide-react';

interface AdminAnalyticsPanelProps {
  analytics: AdminAnalytics;
  mongoStatus: any;
  isCheckingMongo: boolean;
  mockTestsCount: number;
  onRefreshStatus: () => void;
}

export const AdminAnalyticsPanel: React.FC<AdminAnalyticsPanelProps> = ({
  analytics,
  mongoStatus,
  isCheckingMongo,
  mockTestsCount,
  onRefreshStatus
}) => {
  const isConnected = Boolean(mongoStatus?.isConnected);

  return (
    <div className="space-y-6">
      {/* MongoDB Atlas Database Status & Cloud Cluster Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div
              className={`p-3 rounded-2xl ${
                isConnected
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                  : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
              }`}
            >
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-serif">
                  MongoDB Atlas Cloud Database
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1 ${
                    isConnected
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                      : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                    }`}
                  />
                  {isConnected ? 'Atlas Connected' : 'Local Storage Mode'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isConnected
                  ? `Connected to cluster: ${mongoStatus?.host || 'MongoDB Atlas Serverless Cluster'} • Database: ${
                      mongoStatus?.dbName || 'examportal'
                    }`
                  : 'Running with resilient local buffer. Connect to MongoDB Atlas anytime by setting MONGODB_URI in Vercel or environment variables.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onRefreshStatus}
            disabled={isCheckingMongo}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCheckingMongo ? 'animate-spin' : ''}`} />
            <span>{isCheckingMongo ? 'Pinging Atlas...' : 'Test Connection'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Target Database</span>
            <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
              <Server className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>MongoDB Atlas (M0 / Serverless)</span>
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Environment Variable</span>
            <p className="font-mono text-[11px] font-bold text-amber-900 dark:text-amber-300">MONGODB_URI</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Collections Managed</span>
            <p className="text-slate-700 dark:text-slate-300 font-semibold">
              TestAttempts, Questions, CurrentAffairs, Users
            </p>
          </div>
        </div>
      </div>

      {/* Live Aggregate Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Active Candidates</span>
            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {analytics.source === 'mongodb-atlas' ? 'Live DB' : 'Live Local'}
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
            {analytics.totalStudents}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            Top Exam: {analytics.topPerformingExam}
          </p>
        </div>

        <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Tests Attempted</span>
          <p className="text-2xl sm:text-3xl font-black text-amber-800 dark:text-amber-400 font-mono">
            {analytics.totalTestsAttempted}
          </p>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
            {analytics.completionRatePercentage ?? 100}% Completion Rate
          </p>
        </div>

        <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Average Student Score</span>
          <p className="text-2xl sm:text-3xl font-black text-cyan-800 dark:text-cyan-400 font-mono">
            {analytics.averageScorePercentage}%
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Aggregated Mean Accuracy</p>
        </div>

        <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
            Question Bank &amp; Tests
          </span>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
            {analytics.totalQuestionsInBank}
          </p>
          <p className="text-[11px] text-amber-800 dark:text-amber-400 font-semibold">
            {analytics.totalMockTests ?? mockTestsCount} Mock Tests • {analytics.totalCurrentAffairsPosts} CA Briefs
          </p>
        </div>
      </div>

      {/* Note */}
      <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-3">
        <h3 className="text-base font-bold text-slate-900 dark:text-white font-serif">Faculty Admin Note</h3>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          This administrative module empowers project coordinators and educators to maintain a real-time, authentic curriculum of daily current affairs and competitive examination test sets. All scoring computations strictly implement negative penalties (-0.25 for Banking, -0.33 for Railways, -0.50 for SSC, and -0.66 for UPSC).
        </p>
      </div>
    </div>
  );
};
