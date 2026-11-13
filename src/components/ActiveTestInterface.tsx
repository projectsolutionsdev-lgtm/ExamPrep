import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MockTest, Question, TestAttempt, UserProfile, CategoryCutoffs } from '../types';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Send,
  RotateCcw,
  Layers,
  GraduationCap,
  X,
  Volume2,
  VolumeX,
  Pause,
  Play,
  Hourglass,
  Lock
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ThemeToggle } from '../context/ThemeContext';
import {
  playTimerBeep,
  formatExamTime,
  normalizeTestSections,
  buildTestAttemptResult
} from '../utils/examUtils';
import { QuestionPalettePanel } from './exam/QuestionPalettePanel';
import {
  PausedExamOverlay,
  TimeExpiredModal,
  SubmitConfirmModal,
  ExitConfirmModal,
  NextSectionConfirmModal
} from './exam/ExamModals';

interface ActiveTestInterfaceProps {
  test: MockTest;
  user: UserProfile;
  selectedCategory: keyof CategoryCutoffs;
  timerMode?: 'overall' | 'sectional';
  onFinishTest: (attempt: TestAttempt) => void;
  onExitTest: () => void;
}

export const ActiveTestInterface: React.FC<ActiveTestInterfaceProps> = ({
  test,
  user,
  selectedCategory,
  timerMode = 'overall',
  onFinishTest,
  onExitTest
}) => {
  const isSectionalMode = timerMode === 'sectional';
  const totalSeconds = Math.max(60, (test.overallTimeLimitMinutes || 60) * 60);

  const effectiveSections = useMemo(
    () => normalizeTestSections(test, totalSeconds),
    [test, totalSeconds]
  );

  // Candidate response state
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({});
  const [visitedQuestions, setVisitedQuestions] = useState<Record<string, boolean>>({
    [test.questions[0]?.id || '']: true
  });

  // Sectional & question cursor state
  const [activeSectionIndex, setActiveSectionIndex] = useState<number>(0);
  const [sectionSecondsRemaining, setSectionSecondsRemaining] = useState<number>(
    effectiveSections[0]?.durationSeconds || totalSeconds
  );
  const [sectionTransitionNotice, setSectionTransitionNotice] = useState<string>('');
  const [showNextSectionModal, setShowNextSectionModal] = useState<boolean>(false);

  const initialQuestionIdx = useMemo(() => {
    if (!isSectionalMode || !effectiveSections[0]?.questionIds?.length) return 0;
    const firstSecIds = new Set(effectiveSections[0].questionIds);
    return Math.max(0, test.questions.findIndex(q => firstSecIds.has(q.id)));
  }, [isSectionalMode, effectiveSections, test.questions]);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(initialQuestionIdx);
  const [activeSectionName, setActiveSectionName] = useState<string>(
    effectiveSections[0]?.section || 'General Studies'
  );

  // Timer & UI modal state
  const [secondsRemaining, setSecondsRemaining] = useState<number>(totalSeconds);
  const [isTimerPaused, setIsTimerPaused] = useState<boolean>(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(true);
  const [isTimeUpModalOpen, setIsTimeUpModalOpen] = useState<boolean>(false);
  const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState<boolean>(false);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState<boolean>(false);
  const [isMobilePaletteOpen, setIsMobilePaletteOpen] = useState<boolean>(false);
  const [currentQuestionSeconds, setCurrentQuestionSeconds] = useState<number>(0);

  const activeSectionObj = effectiveSections[activeSectionIndex] || effectiveSections[0];
  const activeSectionQuestionIdSet = useMemo(
    () => new Set(activeSectionObj?.questionIds || []),
    [activeSectionObj]
  );

  const isQuestionUnlocked = useCallback(
    (q: Question): boolean => !isSectionalMode || activeSectionQuestionIdSet.has(q.id),
    [isSectionalMode, activeSectionQuestionIdSet]
  );

  const activeSectionQuestionIndices = useMemo(() => {
    if (!isSectionalMode) return test.questions.map((_, idx) => idx);
    const indices: number[] = [];
    for (let i = 0; i < test.questions.length; i++) {
      if (activeSectionQuestionIdSet.has(test.questions[i].id)) indices.push(i);
    }
    return indices;
  }, [isSectionalMode, test.questions, activeSectionQuestionIdSet]);

  // Refs to read fresh answers safely inside timer intervals
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSubmitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answersRef = useRef(selectedAnswers);
  const markedRef = useRef(markedForReview);
  const visitedRef = useRef(visitedQuestions);
  const activeSectionIdxRef = useRef(activeSectionIndex);
  const secondsRemainingRef = useRef(secondsRemaining);

  useEffect(() => { answersRef.current = selectedAnswers; }, [selectedAnswers]);
  useEffect(() => { markedRef.current = markedForReview; }, [markedForReview]);
  useEffect(() => { visitedRef.current = visitedQuestions; }, [visitedQuestions]);
  useEffect(() => { activeSectionIdxRef.current = activeSectionIndex; }, [activeSectionIndex]);
  useEffect(() => { secondsRemainingRef.current = secondsRemaining; }, [secondsRemaining]);

  const currentQ: Question = test.questions[currentQuestionIndex] || test.questions[0];

  const compileAndFinish = useCallback(
    (celebrate: boolean) => {
      if (timerRef.current) clearInterval(timerRef.current);
      const result = buildTestAttemptResult({
        test,
        user,
        selectedCategory,
        isSectionalMode,
        totalSeconds,
        secondsRemaining: secondsRemainingRef.current,
        answers: answersRef.current,
        markedForReview: markedRef.current,
        visitedQuestions: visitedRef.current
      });

      if (celebrate && (result.passedCategoryCutoff || result.passedOverallCutoff)) {
        try {
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        } catch {
          // Ignore confetti canvas failures
        }
      }
      onFinishTest(result);
    },
    [test, user, selectedCategory, isSectionalMode, totalSeconds, onFinishTest]
  );

  const advanceToNextSection = useCallback(
    (reason: 'timeout' | 'manual') => {
      const currIdx = activeSectionIdxRef.current;
      if (currIdx >= effectiveSections.length - 1) return;

      const nextIdx = currIdx + 1;
      const nextSec = effectiveSections[nextIdx];
      const nextSecIds = new Set(nextSec.questionIds);
      const firstNextQIdx = test.questions.findIndex(q => nextSecIds.has(q.id));

      setActiveSectionIndex(nextIdx);
      setSectionSecondsRemaining(nextSec.durationSeconds);
      if (firstNextQIdx !== -1) setCurrentQuestionIndex(firstNextQIdx);
      setActiveSectionName(nextSec.section);
      setShowNextSectionModal(false);
      setSectionTransitionNotice(
        reason === 'timeout'
          ? `Time expired for "${effectiveSections[currIdx].section}". Section locked — moved to "${nextSec.section}".`
          : `Section "${effectiveSections[currIdx].section}" locked — moved to "${nextSec.section}".`
      );

      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = setTimeout(() => setSectionTransitionNotice(''), 5000);
      if (isSoundEnabled) playTimerBeep(620, 180, 2);
    },
    [effectiveSections, test.questions, isSoundEnabled]
  );

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
      if (autoSubmitTimerRef.current) clearTimeout(autoSubmitTimerRef.current);
    };
  }, []);

  // Reset per-question timer when navigating questions
  useEffect(() => {
    setCurrentQuestionSeconds(0);
    if (currentQ?.id) {
      setVisitedQuestions(prev => (prev[currentQ.id] ? prev : { ...prev, [currentQ.id]: true }));
      if (currentQ.section) setActiveSectionName(currentQ.section);
    }
  }, [currentQuestionIndex, currentQ]);

  // Main countdown loop
  useEffect(() => {
    const triggerAutoSubmit = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (isSoundEnabled) playTimerBeep(880, 300, 3);
      setIsTimeUpModalOpen(true);
      if (autoSubmitTimerRef.current) clearTimeout(autoSubmitTimerRef.current);
      autoSubmitTimerRef.current = setTimeout(() => compileAndFinish(false), 1800);
    };

    timerRef.current = setInterval(() => {
      if (isTimerPaused) return;

      if (isSectionalMode) {
        setSectionSecondsRemaining(secPrev => {
          if (secPrev <= 1) {
            if (activeSectionIdxRef.current < effectiveSections.length - 1) {
              setTimeout(() => advanceToNextSection('timeout'), 0);
              return 0;
            }
            triggerAutoSubmit();
            return 0;
          }
          if (secPrev === 60 && isSoundEnabled) playTimerBeep(750, 220, 2);
          return secPrev - 1;
        });
      }

      setSecondsRemaining(prev => {
        if (prev <= 1) {
          triggerAutoSubmit();
          return 0;
        }
        if (!isSectionalMode && prev === 300 && isSoundEnabled) playTimerBeep(520, 200, 2);
        if (!isSectionalMode && prev === 60 && isSoundEnabled) playTimerBeep(750, 250, 3);
        return prev - 1;
      });

      setCurrentQuestionSeconds(qPrev => qPrev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerPaused, isSoundEnabled, isSectionalMode, effectiveSections.length, advanceToNextSection, compileAndFinish]);

  // Navigation & question actions
  const handleSelectOption = (optId: string) => {
    setSelectedAnswers(prev => ({ ...prev, [currentQ.id]: optId }));
  };

  const handleClearResponse = () => {
    setSelectedAnswers(prev => {
      const next = { ...prev };
      delete next[currentQ.id];
      return next;
    });
  };

  const handleToggleReview = () => {
    setMarkedForReview(prev => ({ ...prev, [currentQ.id]: !prev[currentQ.id] }));
  };

  const handleSaveAndNext = () => {
    if (isSectionalMode) {
      const pos = activeSectionQuestionIndices.indexOf(currentQuestionIndex);
      if (pos !== -1 && pos < activeSectionQuestionIndices.length - 1) {
        setCurrentQuestionIndex(activeSectionQuestionIndices[pos + 1]);
      }
      return;
    }
    if (currentQuestionIndex < test.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (isSectionalMode) {
      const pos = activeSectionQuestionIndices.indexOf(currentQuestionIndex);
      if (pos > 0) setCurrentQuestionIndex(activeSectionQuestionIndices[pos - 1]);
      return;
    }
    if (currentQuestionIndex > 0) setCurrentQuestionIndex(prev => prev - 1);
  };

  const isAtSectionStart = isSectionalMode
    ? activeSectionQuestionIndices.indexOf(currentQuestionIndex) <= 0
    : currentQuestionIndex === 0;
  const isAtSectionEnd = isSectionalMode
    ? activeSectionQuestionIndices.indexOf(currentQuestionIndex) >= activeSectionQuestionIndices.length - 1
    : currentQuestionIndex === test.questions.length - 1;

  // Derived HUD metrics
  const answeredCount = useMemo(() => Object.keys(selectedAnswers).length, [selectedAnswers]);
  const reviewCount = useMemo(() => {
    let count = 0;
    for (const v of Object.values(markedForReview)) {
      if (v) count++;
    }
    return count;
  }, [markedForReview]);
  const unansweredCount = test.questions.length - answeredCount;

  const activeDisplaySecs = isSectionalMode ? sectionSecondsRemaining : secondsRemaining;
  const activeTimerPct = isSectionalMode
    ? Math.min(100, Math.max(0, (sectionSecondsRemaining / (activeSectionObj?.durationSeconds || 1)) * 100))
    : Math.min(100, Math.max(0, (secondsRemaining / totalSeconds) * 100));

  return (
    <div id="active-test-interface" className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col relative selection:bg-amber-500 selection:text-slate-950 transition-colors duration-200">
      
      {/* Top Examination Control Bar */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 py-2 sm:py-2.5 sticky top-0 z-30 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-2 sm:gap-3 transition-colors duration-200">
        <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
          <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 shrink-0">
            <GraduationCap className="w-5 h-5 text-amber-700 dark:text-amber-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2 flex-wrap">
              <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white max-w-[200px] sm:max-w-xs md:max-w-md truncate font-serif">
                {test.title}
              </span>
              <span className="px-1.5 sm:px-2 py-0.5 bg-cyan-50 dark:bg-cyan-950/60 text-cyan-900 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 rounded text-[9px] sm:text-[10px] font-bold shrink-0">
                {test.examCategory}
              </span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
              <span>Candidate: <strong className="text-slate-800 dark:text-slate-200">{user.name}</strong></span>
              <span className="hidden sm:inline">•</span>
              <span className="text-amber-800 dark:text-amber-400 font-bold">Cat: {selectedCategory}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end space-x-2 sm:space-x-3 w-full md:w-auto shrink-0 pt-1 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <ThemeToggle size="sm" />
            <button
              onClick={() => setIsSoundEnabled(prev => !prev)}
              title={isSoundEnabled ? 'Timer Sound Enabled (Click to Mute)' : 'Timer Sound Muted (Click to Unmute)'}
              className={`min-h-[38px] min-w-[38px] sm:min-h-0 sm:min-w-0 flex items-center justify-center p-1.5 sm:p-2 rounded-xl border text-xs transition-colors cursor-pointer ${
                isSoundEnabled
                  ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800/80 text-amber-800 dark:text-amber-300 hover:text-amber-900'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              {isSoundEnabled ? <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            </button>

            <button
              onClick={() => setIsTimerPaused(prev => !prev)}
              title={isTimerPaused ? 'Resume Examination' : 'Pause Examination Timer'}
              className={`min-h-[38px] sm:min-h-0 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
                isTimerPaused
                  ? 'bg-amber-500 text-slate-950 border-amber-400 animate-pulse shadow-xs'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {isTimerPaused ? <Play className="w-3.5 h-3.5 fill-slate-950" /> : <Pause className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isTimerPaused ? 'Resume' : 'Pause'}</span>
            </button>
          </div>

          {/* Live Countdown Timer HUD */}
          <div
            className={`px-2.5 sm:px-3.5 py-1.5 rounded-2xl border flex items-center space-x-1.5 sm:space-x-2 font-mono font-bold text-xs sm:text-base shadow-xs transition-all ${
              activeDisplaySecs < 60
                ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 ring-2 ring-rose-400 animate-pulse'
                : activeDisplaySecs < 300
                ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300 animate-pulse'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
            }`}
            title={
              isSectionalMode
                ? `Strict Section Timer (${activeSectionObj.section}) • Overall Remaining: ${formatExamTime(secondsRemaining)}`
                : 'Overall Paper Timer'
            }
          >
            <Clock className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${activeDisplaySecs < 300 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`} />
            <div className="flex flex-col leading-none">
              {isSectionalMode && (
                <span className="text-[9px] font-sans uppercase tracking-wider text-cyan-700 dark:text-cyan-400 font-extrabold">
                  Sec {activeSectionIndex + 1}/{effectiveSections.length}
                </span>
              )}
              <span className="tabular-timer">{formatExamTime(activeDisplaySecs)}</span>
            </div>
            <div className="w-8 sm:w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden hidden sm:block">
              <div
                className={`h-full transition-all duration-1000 ${
                  activeDisplaySecs < 60 ? 'bg-rose-500' : activeDisplaySecs < 300 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${activeTimerPct}%` }}
              />
            </div>
          </div>

          <button
            onClick={() => setShowSubmitConfirmModal(true)}
            className="min-h-[38px] sm:min-h-0 px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Submit</span>
          </button>
        </div>
      </header>

      {/* Section Transition Notice in Sectional Timer Mode */}
      {sectionTransitionNotice && (
        <div className="px-4 py-2 bg-cyan-50 dark:bg-cyan-950/60 border-b border-cyan-200 dark:border-cyan-800 text-cyan-900 dark:text-cyan-200 text-xs font-bold flex items-center justify-center gap-2">
          <Lock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
          <span>{sectionTransitionNotice}</span>
        </div>
      )}

      {/* Timer Warning Banner (< 5 mins) */}
      {activeDisplaySecs < 300 && (
        <div
          className={`px-4 py-1.5 text-center text-xs font-bold flex items-center justify-center gap-2 border-b ${
            activeDisplaySecs < 60
              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 border-rose-200 dark:border-rose-900 animate-pulse'
              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-900'
          }`}
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            {activeDisplaySecs < 60
              ? `CRITICAL ALERT: Less than 1 minute remaining (${activeDisplaySecs}s) ${
                  isSectionalMode && activeSectionIndex < effectiveSections.length - 1
                    ? 'in this section before moving to next section'
                    : 'before auto-submit'
                }!`
              : `TIME WARNING: Only ${Math.ceil(activeDisplaySecs / 60)} minutes remaining${
                  isSectionalMode ? ` in ${activeSectionObj.section}` : ''
                }!`}
          </span>
        </div>
      )}

      {/* Main Examination Workspace */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        
        {/* Left 8 Columns: Active Question Card */}
        <div className="lg:col-span-8 flex flex-col justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-xs space-y-5 sm:space-y-6">
          <div className="space-y-5 sm:space-y-6">
            {/* Question Header Bar & Live Pacer */}
            <div className="flex flex-wrap items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 gap-2">
              <div className="flex items-center flex-wrap gap-2">
                <span className="px-3 py-1 bg-amber-500 text-slate-950 font-black rounded-xl text-xs">
                  Question {currentQuestionIndex + 1} of {test.questions.length}
                </span>
                <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold">
                  Section: {currentQ?.section}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-50 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                  {currentQ?.topic}
                </span>
                <button
                  type="button"
                  onClick={() => setIsMobilePaletteOpen(true)}
                  className="lg:hidden px-2.5 py-1 bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800/80 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Layers className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                  <span>Palette Matrix</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-mono text-slate-700 dark:text-slate-300 flex items-center gap-1.5" title="Time spent on current question">
                  <Hourglass className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Time: {formatExamTime(currentQuestionSeconds)}</span>
                </div>
                <div className="flex items-center space-x-2 text-xs font-mono">
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">+{test.marksPerQuestion}</span>
                  <span className="text-slate-400">/</span>
                  <span className="text-rose-600 dark:text-rose-400 font-bold">-{test.negativeMarksPerQuestion}</span>
                </div>
              </div>
            </div>

            {currentQ?.passage && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 leading-relaxed max-h-48 overflow-y-auto space-y-1">
                <span className="font-bold text-amber-900 dark:text-amber-400 uppercase tracking-wider block text-[10px]">
                  Passage / Reference Context:
                </span>
                <p>{currentQ.passage}</p>
              </div>
            )}

            <div className="text-sm sm:text-base font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
              <p className="whitespace-pre-line">{currentQ?.text}</p>
            </div>

            <div className="space-y-3 pt-2">
              {currentQ?.options.map(opt => {
                const isSelected = selectedAnswers[currentQ.id] === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => handleSelectOption(opt.id)}
                    className={`p-3.5 sm:p-4 min-h-[48px] rounded-2xl border cursor-pointer transition-all duration-200 active:scale-[0.99] sm:active:scale-100 flex items-center justify-between text-xs sm:text-sm ${
                      isSelected
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-600 text-amber-950 dark:text-amber-200 ring-1 ring-amber-400 font-semibold shadow-xs'
                        : 'bg-white dark:bg-slate-850/80 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <span
                        className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono uppercase text-xs font-bold shrink-0 mt-0.5 ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {opt.id}
                      </span>
                      <span className="leading-relaxed">{opt.text}</span>
                    </div>

                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ml-3 ${
                        isSelected ? 'border-amber-500 bg-amber-500' : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Question Controls */}
          <div className="pt-4 sm:pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleToggleReview}
                className={`flex-1 sm:flex-none min-h-[44px] sm:min-h-0 px-3 sm:px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  markedForReview[currentQ?.id]
                    ? 'bg-purple-50 dark:bg-purple-950/50 border-purple-300 dark:border-purple-800 text-purple-900 dark:text-purple-300'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                <Bookmark className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>{markedForReview[currentQ?.id] ? 'Marked for Review' : 'Mark for Review'}</span>
              </button>

              {selectedAnswers[currentQ?.id] && (
                <button
                  onClick={handleClearResponse}
                  className="min-h-[44px] sm:min-h-0 px-3 sm:px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-rose-600 dark:text-rose-400 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrev}
                disabled={isAtSectionStart}
                className="flex-1 sm:flex-none min-h-[44px] sm:min-h-0 px-3.5 sm:px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              {isSectionalMode && isAtSectionEnd && activeSectionIndex < effectiveSections.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setShowNextSectionModal(true)}
                  className="flex-1 sm:flex-none min-h-[44px] sm:min-h-0 px-4 sm:px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Lock &amp; Next Section</span>
                </button>
              ) : (
                <button
                  onClick={handleSaveAndNext}
                  disabled={isAtSectionEnd}
                  className="flex-1 sm:flex-none min-h-[44px] sm:min-h-0 px-4 sm:px-5 py-2.5 bg-amber-500 hover:bg-amber-600 dark:bg-amber-400 dark:hover:bg-amber-500 disabled:opacity-40 disabled:pointer-events-none text-white dark:text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>Save &amp; Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Mobile-only Bottom Quick Bar */}
            <div className="lg:hidden pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowExitConfirmModal(true)}
                className="min-h-[40px] px-2.5 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer whitespace-nowrap shrink-0"
              >
                <span className="sm:hidden">Exit</span>
                <span className="hidden sm:inline">Exit Early</span>
              </button>

              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => setIsMobilePaletteOpen(true)}
                  className="min-h-[40px] px-3 py-2 bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800/80 text-amber-950 dark:text-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap"
                >
                  <Layers className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Palette ({currentQuestionIndex + 1}/{test.questions.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSubmitConfirmModal(true)}
                  className="min-h-[40px] px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Submit</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right 4 Columns: Question Palette (Desktop) */}
        <div className="hidden lg:flex flex-col justify-between lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-6">
          <QuestionPalettePanel
            questions={test.questions}
            effectiveSections={effectiveSections}
            activeSectionIndex={activeSectionIndex}
            activeSectionName={activeSectionName}
            currentQuestionIndex={currentQuestionIndex}
            currentQuestionSection={currentQ?.section}
            isSectionalMode={isSectionalMode}
            isQuestionUnlocked={isQuestionUnlocked}
            selectedAnswers={selectedAnswers}
            markedForReview={markedForReview}
            visitedQuestions={visitedQuestions}
            answeredCount={answeredCount}
            unansweredCount={unansweredCount}
            reviewCount={reviewCount}
            onSelectQuestion={setCurrentQuestionIndex}
            onRequestNextSection={() => setShowNextSectionModal(true)}
            variant="desktop"
          />

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <button
              onClick={() => setShowExitConfirmModal(true)}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-semibold cursor-pointer"
            >
              Exit Early
            </button>
            <button
              onClick={() => setShowSubmitConfirmModal(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              Final Submit
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Question Palette Drawer */}
      {isMobilePaletteOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[85vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl p-4 sm:p-6 pb-safe space-y-4 text-slate-900 dark:text-slate-100 flex flex-col">
            <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto sm:hidden shrink-0" />

            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300">
                  <Layers className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white font-serif">Question Navigator Palette</h3>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                    <span>Q {currentQuestionIndex + 1} of {test.questions.length}</span>
                    <span>•</span>
                    <span className="text-amber-800 dark:text-amber-400 font-semibold">{activeSectionName}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobilePaletteOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                aria-label="Close palette"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <QuestionPalettePanel
              questions={test.questions}
              effectiveSections={effectiveSections}
              activeSectionIndex={activeSectionIndex}
              activeSectionName={activeSectionName}
              currentQuestionIndex={currentQuestionIndex}
              currentQuestionSection={currentQ?.section}
              isSectionalMode={isSectionalMode}
              isQuestionUnlocked={isQuestionUnlocked}
              selectedAnswers={selectedAnswers}
              markedForReview={markedForReview}
              visitedQuestions={visitedQuestions}
              answeredCount={answeredCount}
              unansweredCount={unansweredCount}
              reviewCount={reviewCount}
              onSelectQuestion={(idx) => {
                setCurrentQuestionIndex(idx);
                setIsMobilePaletteOpen(false);
              }}
              onRequestNextSection={() => {
                setIsMobilePaletteOpen(false);
                setShowNextSectionModal(true);
              }}
              variant="mobile"
            />

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsMobilePaletteOpen(false);
                  setShowExitConfirmModal(true);
                }}
                className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer text-center"
              >
                Exit Early
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMobilePaletteOpen(false);
                  setShowSubmitConfirmModal(true);
                }}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Submit Exam</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Isolated Modals & Overlays */}
      {isTimerPaused && (
        <PausedExamOverlay
          secondsRemaining={secondsRemaining}
          onResume={() => setIsTimerPaused(false)}
        />
      )}

      {isTimeUpModalOpen && <TimeExpiredModal />}

      {showSubmitConfirmModal && (
        <SubmitConfirmModal
          totalQuestions={test.questions.length}
          answeredCount={answeredCount}
          unansweredCount={unansweredCount}
          reviewCount={reviewCount}
          secondsRemaining={secondsRemaining}
          selectedCategory={selectedCategory}
          onCancel={() => setShowSubmitConfirmModal(false)}
          onConfirm={() => compileAndFinish(true)}
        />
      )}

      {showExitConfirmModal && (
        <ExitConfirmModal
          totalQuestions={test.questions.length}
          answeredCount={answeredCount}
          unansweredCount={unansweredCount}
          secondsRemaining={secondsRemaining}
          onSubmitAndView={() => {
            setShowExitConfirmModal(false);
            compileAndFinish(true);
          }}
          onExitWithoutSaving={() => {
            setShowExitConfirmModal(false);
            if (timerRef.current) clearInterval(timerRef.current);
            onExitTest();
          }}
          onCancel={() => setShowExitConfirmModal(false)}
        />
      )}

      {showNextSectionModal && isSectionalMode && activeSectionIndex < effectiveSections.length - 1 && (
        <NextSectionConfirmModal
          currentSectionName={activeSectionObj.section}
          nextSectionName={effectiveSections[activeSectionIndex + 1].section}
          nextSectionMinutes={Math.round(effectiveSections[activeSectionIndex + 1].durationSeconds / 60)}
          onCancel={() => setShowNextSectionModal(false)}
          onConfirm={() => advanceToNextSection('manual')}
        />
      )}
    </div>
  );
};
