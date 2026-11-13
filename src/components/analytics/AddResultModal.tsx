import React, { useState } from 'react';
import {
  TestAttempt,
  Question,
  UserProfile,
  MockTest,
  CategoryCutoffs,
  CategoryName
} from '../../types';
import { Plus, Zap, X, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface AddResultModalProps {
  user: UserProfile;
  allMockTests: MockTest[];
  allQuestions: Question[];
  onClose: () => void;
  onAddResult?: (newAttempt: TestAttempt) => void;
}

const SIMULATION_PRESETS = [
  {
    label: 'UPSC Prelims Paper #1',
    summary: 'Score: 16.68 / 20.0 • 90% Acc (Qualified)',
    style: 'bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100/60 dark:hover:bg-amber-950/60 border-amber-200 dark:border-amber-800/60',
    subStyle: 'text-amber-800 dark:text-amber-400',
    testTitle: 'UPSC Civil Services Prelims Mock Exam 2026 (GS Paper-1)',
    category: 'UPSC Civil Services',
    score: 16.68,
    max: 20.0,
    totalQ: 10,
    correct: 9,
    wrong: 1,
    timeMins: 16,
    targetCat: 'UR' as CategoryName
  },
  {
    label: 'SSC CGL Tier-1 Grand Mock',
    summary: 'Score: 17.5 / 20.0 • 95% Acc (Top 2%)',
    style: 'bg-cyan-50 dark:bg-cyan-950/30 hover:bg-cyan-100/60 dark:hover:bg-cyan-950/60 border-cyan-200 dark:border-cyan-800/60',
    subStyle: 'text-cyan-800 dark:text-cyan-400',
    testTitle: 'SSC CGL Tier-1 All India Grand Mock Test 2026',
    category: 'SSC (CGL/CHSL/MTS)',
    score: 17.5,
    max: 20.0,
    totalQ: 10,
    correct: 9,
    wrong: 1,
    timeMins: 12,
    targetCat: 'UR' as CategoryName
  },
  {
    label: 'Banking PO Speed Drill',
    summary: 'Score: 13.5 / 15.0 • 93% Acc (OBC)',
    style: 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border-slate-200 dark:border-slate-700',
    subStyle: 'text-slate-600 dark:text-slate-300',
    testTitle: 'IBPS PO Prelims Speed Drill Mock 2026',
    category: 'Banking (IBPS/SBI/RBI)',
    score: 13.5,
    max: 15.0,
    totalQ: 15,
    correct: 14,
    wrong: 1,
    timeMins: 14,
    targetCat: 'OBC' as CategoryName
  },
  {
    label: 'Railway RRB NTPC Drill',
    summary: 'Score: 8.5 / 10.0 • 90% Acc (Passed)',
    style: 'bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100/60 dark:hover:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/60',
    subStyle: 'text-emerald-800 dark:text-emerald-400',
    testTitle: 'Railway RRB NTPC General Science & GK Drill 2026',
    category: 'Railways (RRB NTPC/Group D)',
    score: 8.5,
    max: 10.0,
    totalQ: 10,
    correct: 9,
    wrong: 1,
    timeMins: 8,
    targetCat: 'SC' as CategoryName
  }
];

export const AddResultModal: React.FC<AddResultModalProps> = ({
  user,
  allMockTests,
  allQuestions,
  onClose,
  onAddResult
}) => {
  const [selectedMockTestId, setSelectedMockTestId] = useState<string>(
    allMockTests[0]?.id || 'mock-upsc-prelims-2026'
  );
  const [customTestTitle, setCustomTestTitle] = useState<string>('');
  const [inputScore, setInputScore] = useState<number>(16.0);
  const [inputMaxMarks, setInputMaxMarks] = useState<number>(20.0);
  const [inputTotalQuestions, setInputTotalQuestions] = useState<number>(10);
  const [inputCorrect, setInputCorrect] = useState<number>(8);
  const [inputWrong, setInputWrong] = useState<number>(1);
  const [inputCategory, setInputCategory] = useState<CategoryName>('UR');
  const [inputDurationMinutes, setInputDurationMinutes] = useState<number>(15);

  const handleApplyPreset = (preset: (typeof SIMULATION_PRESETS)[number]) => {
    const matchingTest = allMockTests.find(t => t.title === preset.testTitle) || allMockTests[0];
    if (matchingTest) setSelectedMockTestId(matchingTest.id);
    setCustomTestTitle(preset.testTitle);
    setInputScore(preset.score);
    setInputMaxMarks(preset.max);
    setInputTotalQuestions(preset.totalQ);
    setInputCorrect(preset.correct);
    setInputWrong(preset.wrong);
    setInputDurationMinutes(preset.timeMins);
    setInputCategory(preset.targetCat);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const matchedTest = allMockTests.find(t => t.id === selectedMockTestId);
    const chosenTitle = customTestTitle.trim() || matchedTest?.title || 'Competitive Mock Test Assessment';
    const chosenCategory = matchedTest?.examCategory || 'UPSC Civil Services';

    const defaultCutoffs: CategoryCutoffs = matchedTest?.categoryCutoffs || {
      UR: Math.round(inputMaxMarks * 0.6),
      OBC: Math.round(inputMaxMarks * 0.55),
      EWS: Math.round(inputMaxMarks * 0.52),
      SC: Math.round(inputMaxMarks * 0.45),
      ST: Math.round(inputMaxMarks * 0.4)
    };

    const targetCutoff = defaultCutoffs[inputCategory] || inputMaxMarks * 0.5;
    const passedOverall = inputScore >= (matchedTest?.overallCutoffMarks || inputMaxMarks * 0.55);
    const passedCat = inputScore >= targetCutoff;

    const attemptedQCount = Math.min(inputTotalQuestions, inputCorrect + inputWrong);
    const accuracy = attemptedQCount > 0 ? Math.round((inputCorrect / attemptedQCount) * 100) : 0;

    const testQs = matchedTest?.questions || allQuestions.slice(0, inputTotalQuestions);
    const answersMap: Record<string, string> = {};
    const reviewStatusMap: Record<string, string> = {};

    testQs.forEach((q, idx) => {
      if (idx < inputCorrect) {
        answersMap[q.id] = q.correctOptionId;
        reviewStatusMap[q.id] = 'answered';
      } else if (idx < inputCorrect + inputWrong) {
        answersMap[q.id] = q.options.find(o => o.id !== q.correctOptionId)?.id || 'a';
        reviewStatusMap[q.id] = 'answered';
      } else {
        reviewStatusMap[q.id] = 'unanswered';
      }
    });

    const sectionResults = matchedTest?.sections?.map(s => ({
      section: s.section,
      totalQuestions: s.questionIds.length || 3,
      attempted: Math.min(s.questionIds.length, Math.ceil(attemptedQCount / (matchedTest.sections.length || 1))),
      correct: Math.min(s.questionIds.length, Math.ceil(inputCorrect / (matchedTest.sections.length || 1))),
      wrong: Math.max(0, Math.floor(inputWrong / (matchedTest.sections.length || 1))),
      scoreMarks: Number((inputScore / (matchedTest.sections.length || 1)).toFixed(2)),
      cutoffMarks: s.cutoffMarks || 3.0,
      passedSectionCutoff: true,
      accuracyPercentage: accuracy
    })) || [
      {
        section: 'General Studies',
        totalQuestions: inputTotalQuestions,
        attempted: attemptedQCount,
        correct: inputCorrect,
        wrong: inputWrong,
        scoreMarks: inputScore,
        cutoffMarks: defaultCutoffs.UR,
        passedSectionCutoff: passedCat,
        accuracyPercentage: accuracy
      }
    ];

    const newAttempt: TestAttempt = {
      id: `attempt-manual-${Date.now()}`,
      testId: matchedTest?.id || `test-${Date.now()}`,
      testTitle: chosenTitle,
      examCategory: chosenCategory,
      testType: 'MockTest',
      studentName: user.name,
      rollNo: user.rollNo,
      timestamp: Date.now(),
      dateFormatted: new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      scoreMarks: inputScore,
      maxMarks: inputMaxMarks,
      totalQuestions: inputTotalQuestions,
      attemptedQuestions: attemptedQCount,
      correctAnswers: inputCorrect,
      wrongAnswers: inputWrong,
      accuracyPercentage: accuracy,
      totalTimeSeconds: inputDurationMinutes * 60,
      selectedCategory: inputCategory,
      overallCutoffMarks: matchedTest?.overallCutoffMarks || defaultCutoffs.UR,
      categoryCutoffsUsed: defaultCutoffs,
      passedOverallCutoff: passedOverall,
      passedCategoryCutoff: passedCat,
      sectionResults,
      userAnswers: answersMap,
      questionReviewStatus: reviewStatusMap
    };

    onAddResult?.(newAttempt);

    if (passedCat || passedOverall) {
      try {
        confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
      } catch {
        // Ignore confetti canvas errors
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col transition-colors duration-200">
        {/* Modal Top */}
        <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 shrink-0">
              <Plus className="w-5 h-5 text-amber-700 dark:text-amber-400" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white font-serif truncate">
                Add Result in Data Analysis Section
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 line-clamp-1 sm:line-clamp-none">
                Record a new mock test result to generate automated cutoffs and sectional analytics
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-8 space-y-5 sm:space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Quick Simulation Presets (1-Click Fill):</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {SIMULATION_PRESETS.map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${preset.style}`}
                >
                  <span className="font-bold text-slate-900 dark:text-white block">{preset.label}</span>
                  <span className={`text-[11px] ${preset.subStyle}`}>{preset.summary}</span>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 border-t border-slate-100 dark:border-slate-800 pt-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Select Examination Paper *
              </label>
              <select
                value={selectedMockTestId}
                onChange={e => {
                  setSelectedMockTestId(e.target.value);
                  const t = allMockTests.find(m => m.id === e.target.value);
                  if (t) {
                    setCustomTestTitle(t.title);
                    setInputMaxMarks(t.totalQuestions * t.marksPerQuestion);
                    setInputTotalQuestions(t.totalQuestions);
                    setInputScore(Number((t.totalQuestions * t.marksPerQuestion * 0.8).toFixed(2)));
                    setInputCorrect(Math.floor(t.totalQuestions * 0.85));
                    setInputWrong(Math.max(1, Math.floor(t.totalQuestions * 0.1)));
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm sm:text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {allMockTests.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.examCategory})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Score Obtained (Marks) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={inputScore}
                  onChange={e => setInputScore(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm sm:text-xs font-bold font-mono text-amber-800 dark:text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Maximum Marks *
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={inputMaxMarks}
                  onChange={e => setInputMaxMarks(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm sm:text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Duration (Minutes) *
                </label>
                <input
                  type="number"
                  value={inputDurationMinutes}
                  onChange={e => setInputDurationMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm sm:text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Correct Answers
                </label>
                <input
                  type="number"
                  value={inputCorrect}
                  onChange={e => setInputCorrect(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm sm:text-xs font-bold font-mono text-emerald-700 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Wrong Answers
                </label>
                <input
                  type="number"
                  value={inputWrong}
                  onChange={e => setInputWrong(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm sm:text-xs font-bold font-mono text-rose-700 dark:text-rose-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reservation Category
                </label>
                <select
                  value={inputCategory}
                  onChange={e => setInputCategory(e.target.value as CategoryName)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm sm:text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="UR">UR (General)</option>
                  <option value="OBC">OBC</option>
                  <option value="EWS">EWS</option>
                  <option value="SC">SC</option>
                  <option value="ST">ST</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] sm:min-h-0 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="min-h-[44px] sm:min-h-0 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Result &amp; Update Data Analysis</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
