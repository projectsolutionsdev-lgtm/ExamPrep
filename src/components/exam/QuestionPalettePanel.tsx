import React from 'react';
import { Question } from '../../types';
import { EffectiveSection } from '../../utils/examUtils';
import { Layers, Lock } from 'lucide-react';

interface QuestionPalettePanelProps {
  questions: Question[];
  effectiveSections: EffectiveSection[];
  activeSectionIndex: number;
  activeSectionName: string;
  currentQuestionIndex: number;
  currentQuestionSection?: string;
  isSectionalMode: boolean;
  isQuestionUnlocked: (q: Question) => boolean;
  selectedAnswers: Record<string, string>;
  markedForReview: Record<string, boolean>;
  visitedQuestions: Record<string, boolean>;
  answeredCount: number;
  unansweredCount: number;
  reviewCount: number;
  onSelectQuestion: (index: number) => void;
  onRequestNextSection: () => void;
  variant?: 'desktop' | 'mobile';
}

export const QuestionPalettePanel: React.FC<QuestionPalettePanelProps> = ({
  questions,
  effectiveSections,
  activeSectionIndex,
  activeSectionName,
  currentQuestionIndex,
  currentQuestionSection,
  isSectionalMode,
  isQuestionUnlocked,
  selectedAnswers,
  markedForReview,
  visitedQuestions,
  answeredCount,
  unansweredCount,
  reviewCount,
  onSelectQuestion,
  onRequestNextSection,
  variant = 'desktop'
}) => {
  const activeSectionObj = effectiveSections[activeSectionIndex] || effectiveSections[0];
  const isMobile = variant === 'mobile';

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Desktop Palette Header (Mobile drawer renders its own close header) */}
      {!isMobile && (
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white font-serif flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Question Palette
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            {currentQuestionIndex + 1} / {questions.length}
          </span>
        </div>
      )}

      {/* Section Filter / Jumper */}
      {effectiveSections.length > 1 && (
        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {isSectionalMode ? 'Strict Sectional Mode:' : isMobile ? 'Jump by Section:' : 'Paper Sections:'}
            </span>
            {isSectionalMode && activeSectionIndex < effectiveSections.length - 1 && (
              <button
                type="button"
                onClick={onRequestNextSection}
                className="text-[10px] font-bold text-cyan-700 dark:text-cyan-400 hover:underline cursor-pointer"
              >
                Next Section →
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {effectiveSections.map((sec, sIdx) => {
              const isActiveSec = isSectionalMode
                ? sIdx === activeSectionIndex
                : sec.section === currentQuestionSection;
              const isLockedSec = isSectionalMode && sIdx !== activeSectionIndex;

              return (
                <button
                  key={sec.id}
                  type="button"
                  disabled={isLockedSec}
                  onClick={() => {
                    if (isLockedSec) return;
                    const secIds = new Set(sec.questionIds);
                    const firstQIndex = questions.findIndex(q => secIds.has(q.id));
                    if (firstQIndex !== -1) onSelectQuestion(firstQIndex);
                  }}
                  className={`px-2.5 py-1 rounded-lg ${
                    isMobile ? 'text-xs' : 'text-[11px]'
                  } font-bold transition-all flex items-center gap-1 ${
                    isActiveSec
                      ? 'bg-cyan-600 text-white shadow-xs cursor-pointer'
                      : isLockedSec
                      ? 'bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-70'
                      : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-600 cursor-pointer'
                  }`}
                >
                  {isLockedSec && <Lock className={isMobile ? 'w-3 h-3 shrink-0' : 'w-2.5 h-2.5 shrink-0'} />}
                  <span>{sec.section}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Status Legend Grid */}
      <div className="grid grid-cols-2 gap-2 text-[11px] p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-2">
          <div className="w-3.5 h-3.5 rounded-md bg-emerald-600 font-mono text-[9px] text-white flex items-center justify-center font-bold">
            {answeredCount}
          </div>
          <span className="text-slate-700 dark:text-slate-300">Answered</span>
        </div>

        <div className="flex items-center space-x-2">
          <div className="w-3.5 h-3.5 rounded-md bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 font-mono text-[9px] text-rose-800 dark:text-rose-300 flex items-center justify-center font-bold">
            {unansweredCount}
          </div>
          <span className="text-slate-700 dark:text-slate-300">Not Answered</span>
        </div>

        <div className="flex items-center space-x-2">
          <div className="w-3.5 h-3.5 rounded-md bg-purple-600 font-mono text-[9px] text-white flex items-center justify-center font-bold">
            {reviewCount}
          </div>
          <span className="text-slate-700 dark:text-slate-300">{isMobile ? 'Marked Review' : 'Marked for Review'}</span>
        </div>

        <div className="flex items-center space-x-2">
          <div className="w-3.5 h-3.5 rounded-md bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 font-mono text-[9px] text-slate-600 dark:text-slate-300 flex items-center justify-center">
            -
          </div>
          <span className="text-slate-500 dark:text-slate-400">Not Visited</span>
        </div>
      </div>

      {/* Question Matrix Grid */}
      <div className="space-y-2 flex-1">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
          {isSectionalMode
            ? `Section Questions (${activeSectionObj?.section || activeSectionName}):`
            : isMobile
            ? 'Tap to Jump Directly:'
            : 'Select Question to Jump:'}
        </span>

        <div className={`grid grid-cols-5 sm:grid-cols-6 gap-2 ${isMobile ? 'max-h-56' : 'max-h-64'} overflow-y-auto p-1 scrollbar-thin`}>
          {questions.map((q, idx) => {
            const unlocked = isQuestionUnlocked(q);
            const isCurrent = currentQuestionIndex === idx;
            const isAnswered = Boolean(selectedAnswers[q.id]);
            const isMarked = Boolean(markedForReview[q.id]);
            const isVisited = Boolean(visitedQuestions[q.id]);

            let btnStyle =
              'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600';
            if (!unlocked) {
              btnStyle =
                'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 opacity-45 cursor-not-allowed';
            } else if (isMarked) {
              btnStyle = 'bg-purple-600 text-white font-bold border-purple-500 cursor-pointer';
            } else if (isAnswered) {
              btnStyle = 'bg-emerald-600 text-white font-bold border-emerald-500 cursor-pointer';
            } else if (isVisited) {
              btnStyle =
                'bg-rose-100 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 font-bold cursor-pointer';
            } else {
              btnStyle += ' cursor-pointer';
            }

            if (isCurrent) {
              btnStyle += ' ring-2 ring-amber-500 scale-105';
            }

            return (
              <button
                key={q.id}
                type="button"
                disabled={!unlocked}
                onClick={() => unlocked && onSelectQuestion(idx)}
                className={`${
                  isMobile ? 'h-11 sm:h-10 font-bold active:scale-95' : 'h-9'
                } rounded-xl border flex items-center justify-center text-xs font-mono transition-all ${btnStyle}`}
                title={!unlocked ? 'Locked until this section opens' : `Question ${idx + 1}`}
              >
                {unlocked ? idx + 1 : <Lock className={isMobile ? 'w-3.5 h-3.5' : 'w-3 h-3'} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
