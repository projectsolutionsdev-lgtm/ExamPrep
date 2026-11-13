import React from 'react';
import {
  Clock,
  Pause,
  Play,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  X,
  Lock
} from 'lucide-react';
import { CategoryCutoffs } from '../../types';
import { formatExamTime } from '../../utils/examUtils';

export const PausedExamOverlay: React.FC<{
  secondsRemaining: number;
  onResume: () => void;
}> = ({ secondsRemaining, onResume }) => (
  <div className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center space-y-4">
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 max-w-md shadow-xl flex flex-col items-center space-y-4">
      <div className="w-16 h-16 rounded-3xl bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-700 dark:text-amber-400">
        <Pause className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-black text-slate-900 dark:text-white font-serif">Examination Timer Paused</h2>
      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
        The examination countdown has been paused. Test questions are obscured to ensure exam integrity. Click resume to continue your timed session.
      </p>
      <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-mono text-amber-900 dark:text-amber-300 font-bold text-lg w-full">
        Time Remaining: {formatExamTime(secondsRemaining)}
      </div>
      <button
        onClick={onResume}
        className="w-full px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        <Play className="w-4 h-4 fill-slate-950" />
        <span>Resume Examination</span>
      </button>
    </div>
  </div>
);

export const TimeExpiredModal: React.FC = () => (
  <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
    <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 rounded-3xl w-full max-w-md shadow-xl p-6 sm:p-8 space-y-5 text-center text-slate-900 dark:text-slate-100 animate-in fade-in zoom-in duration-200">
      <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 mx-auto">
        <Clock className="w-8 h-8 animate-spin" />
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-bold font-serif text-slate-900 dark:text-white">Examination Time Has Expired!</h3>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          The timer for this paper has reached 00:00. Your saved responses are being compiled and evaluated automatically.
        </p>
      </div>
      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-200 dark:border-slate-700">
        <div className="h-full bg-amber-500 animate-pulse w-full" />
      </div>
    </div>
  </div>
);

export const SubmitConfirmModal: React.FC<{
  totalQuestions: number;
  answeredCount: number;
  unansweredCount: number;
  reviewCount: number;
  secondsRemaining: number;
  selectedCategory: keyof CategoryCutoffs;
  onCancel: () => void;
  onConfirm: () => void;
}> = ({
  totalQuestions,
  answeredCount,
  unansweredCount,
  reviewCount,
  secondsRemaining,
  selectedCategory,
  onCancel,
  onConfirm
}) => (
  <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-xl p-6 sm:p-8 space-y-6 text-slate-900 dark:text-slate-100">
      <div className="flex items-center space-x-3 text-amber-700 dark:text-amber-400">
        <ShieldAlert className="w-8 h-8 shrink-0" />
        <div>
          <h3 className="text-xl font-bold font-serif text-slate-900 dark:text-white">Final Examination Submission</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Review your responses before finalizing scorecard</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
        <div className="space-y-1">
          <span className="text-slate-500 dark:text-slate-400">Total Questions:</span>
          <p className="text-base font-bold font-mono text-slate-900 dark:text-white">{totalQuestions}</p>
        </div>
        <div className="space-y-1">
          <span className="text-emerald-700 dark:text-emerald-400">Answered Questions:</span>
          <p className="text-base font-bold font-mono text-emerald-700 dark:text-emerald-400">{answeredCount}</p>
        </div>
        <div className="space-y-1">
          <span className="text-rose-600 dark:text-rose-400">Unattempted:</span>
          <p className="text-base font-bold font-mono text-rose-600 dark:text-rose-400">{unansweredCount}</p>
        </div>
        <div className="space-y-1">
          <span className="text-purple-700 dark:text-purple-400">Marked for Review:</span>
          <p className="text-base font-bold font-mono text-purple-700 dark:text-purple-400">{reviewCount}</p>
        </div>
        <div className="col-span-2 pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-slate-500 dark:text-slate-400 font-mono">
          <span>Time Remaining:</span>
          <span className="text-amber-800 dark:text-amber-400 font-bold">{formatExamTime(secondsRemaining)}</span>
        </div>
      </div>

      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
        Once submitted, your responses will be evaluated against official answer keys and{' '}
        <strong className="text-amber-800 dark:text-amber-300">{selectedCategory} Category Cutoffs</strong> with full negative marking calculation.
      </p>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <button
          onClick={onCancel}
          className="py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
        >
          Back to Test
        </button>
        <button
          onClick={onConfirm}
          className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Confirm &amp; Submit</span>
        </button>
      </div>
    </div>
  </div>
);

export const ExitConfirmModal: React.FC<{
  totalQuestions: number;
  answeredCount: number;
  unansweredCount: number;
  secondsRemaining: number;
  onSubmitAndView: () => void;
  onExitWithoutSaving: () => void;
  onCancel: () => void;
}> = ({
  totalQuestions,
  answeredCount,
  unansweredCount,
  secondsRemaining,
  onSubmitAndView,
  onExitWithoutSaving,
  onCancel
}) => (
  <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-xl p-6 sm:p-8 space-y-5 text-slate-900 dark:text-slate-100 animate-in fade-in zoom-in duration-200">
      <div className="flex items-center space-x-3 text-amber-600 dark:text-amber-400">
        <div className="p-2.5 rounded-2xl bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800">
          <AlertTriangle className="w-6 h-6 text-amber-700 dark:text-amber-400" />
        </div>
        <div>
          <h3 className="text-xl font-bold font-serif text-slate-900 dark:text-white">Exit Examination?</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Choose how you would like to end this session</p>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-slate-500 dark:text-slate-400">Answered Questions:</span>
          <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {answeredCount} of {totalQuestions}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500 dark:text-slate-400">Unanswered Questions:</span>
          <span className="font-bold font-mono text-rose-600 dark:text-rose-400">{unansweredCount}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500 dark:text-slate-400">Remaining Time:</span>
          <span className="font-bold font-mono text-amber-700 dark:text-amber-400">
            {formatExamTime(secondsRemaining)}
          </span>
        </div>
      </div>

      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
        You can submit your saved answers to evaluate your diagnostic scorecard, or return directly to the Mock Test Portal without saving.
      </p>

      <div className="space-y-2.5 pt-1">
        <button
          onClick={onSubmitAndView}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Submit Responses &amp; View Results</span>
        </button>

        <button
          onClick={onExitWithoutSaving}
          className="w-full py-2.5 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <X className="w-4 h-4" />
          <span>Exit Without Submitting</span>
        </button>

        <button
          onClick={onCancel}
          className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition-all cursor-pointer"
        >
          Cancel &amp; Resume Test
        </button>
      </div>
    </div>
  </div>
);

export const NextSectionConfirmModal: React.FC<{
  currentSectionName: string;
  nextSectionName: string;
  nextSectionMinutes: number;
  onCancel: () => void;
  onConfirm: () => void;
}> = ({ currentSectionName, nextSectionName, nextSectionMinutes, onCancel, onConfirm }) => (
  <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-xl p-6 sm:p-8 space-y-5 text-slate-900 dark:text-slate-100">
      <div className="flex items-center space-x-3 text-cyan-700 dark:text-cyan-400">
        <div className="p-2.5 rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800">
          <Lock className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold font-serif text-slate-900 dark:text-white">Lock Section &amp; Continue?</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Strict Sectional Timer Rules</p>
        </div>
      </div>

      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
        Once you lock <strong className="text-slate-900 dark:text-white">{currentSectionName}</strong>, you cannot return to edit answers in this section. The timer for{' '}
        <strong className="text-cyan-700 dark:text-cyan-400">{nextSectionName}</strong> ({nextSectionMinutes}m) will start immediately.
      </p>

      <div className="grid grid-cols-2 gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-[44px] py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl cursor-pointer"
        >
          Stay in Section
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="min-h-[44px] py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Lock &amp; Proceed</span>
        </button>
      </div>
    </div>
  </div>
);
