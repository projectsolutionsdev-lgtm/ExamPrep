import React, { useState, useMemo } from 'react';
import { MockTest, Question, ExamCategory, SectionName } from '../../types';
import { saveMockTest, deleteMockTest } from '../../data/storage';
import { Clock, Edit3, Trash2, Search, Check } from 'lucide-react';

interface MockTestSchedulerProps {
  mockTests: MockTest[];
  questions: Question[];
  onMutated: (message: string, isError?: boolean) => void;
}

export const MockTestScheduler: React.FC<MockTestSchedulerProps> = ({
  mockTests,
  questions,
  onMutated
}) => {
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [confirmDeleteTestId, setConfirmDeleteTestId] = useState<string | null>(null);
  const [testSearch, setTestSearch] = useState('');
  const [testBankFilter, setTestBankFilter] = useState('');

  // Form fields
  const [testTitle, setTestTitle] = useState('');
  const [testSubtitle, setTestSubtitle] = useState('');
  const [testCategory, setTestCategory] = useState<ExamCategory>('UPSC Civil Services');
  const [testDurationMins, setTestDurationMins] = useState(60);
  const [testMarksPerQ, setTestMarksPerQ] = useState(2.0);
  const [testNegMarks, setTestNegMarks] = useState(0.66);
  const [testCutoffUR, setTestCutoffUR] = useState(12.0);
  const [testCutoffOBC, setTestCutoffOBC] = useState(11.0);
  const [testCutoffEWS, setTestCutoffEWS] = useState(10.5);
  const [testCutoffSC, setTestCutoffSC] = useState(9.0);
  const [testCutoffST, setTestCutoffST] = useState(8.0);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);

  const selectedQuestionIdSet = useMemo(() => new Set(selectedQuestionIds), [selectedQuestionIds]);

  const filteredBankPickerQuestions = useMemo(() => {
    const q = testBankFilter.trim().toLowerCase();
    if (!q) return questions;
    return questions.filter(
      item =>
        item.text.toLowerCase().includes(q) ||
        item.examCategory.toLowerCase().includes(q) ||
        item.section.toLowerCase().includes(q)
    );
  }, [questions, testBankFilter]);

  const filteredMockTests = useMemo(() => {
    const q = testSearch.trim().toLowerCase();
    if (!q) return mockTests;
    return mockTests.filter(
      t => t.title.toLowerCase().includes(q) || t.examCategory.toLowerCase().includes(q)
    );
  }, [mockTests, testSearch]);

  const resetForm = () => {
    setEditingTestId(null);
    setTestTitle('');
    setTestSubtitle('');
    setTestCategory('UPSC Civil Services');
    setTestDurationMins(60);
    setTestMarksPerQ(2.0);
    setTestNegMarks(0.66);
    setTestCutoffUR(12.0);
    setTestCutoffOBC(11.0);
    setTestCutoffEWS(10.5);
    setTestCutoffSC(9.0);
    setTestCutoffST(8.0);
    setSelectedQuestionIds([]);
  };

  const startEdit = (test: MockTest) => {
    setEditingTestId(test.id);
    setTestTitle(test.title);
    setTestSubtitle(test.subtitle || '');
    setTestCategory(test.examCategory);
    setTestDurationMins(test.overallTimeLimitMinutes);
    setTestMarksPerQ(test.marksPerQuestion);
    setTestNegMarks(test.negativeMarksPerQuestion);
    setTestCutoffUR(test.categoryCutoffs?.UR ?? test.overallCutoffMarks);
    setTestCutoffOBC(test.categoryCutoffs?.OBC ?? 11.0);
    setTestCutoffEWS(test.categoryCutoffs?.EWS ?? 10.5);
    setTestCutoffSC(test.categoryCutoffs?.SC ?? 9.0);
    setTestCutoffST(test.categoryCutoffs?.ST ?? 8.0);
    setSelectedQuestionIds((test.questions || []).map(q => q.id));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testTitle.trim()) {
      onMutated('Please provide a mock test title.', true);
      return;
    }

    const existingTest = editingTestId ? mockTests.find(t => t.id === editingTestId) : undefined;
    const pickedQuestions =
      selectedQuestionIds.length > 0
        ? questions.filter(q => selectedQuestionIdSet.has(q.id))
        : existingTest?.questions?.length
        ? existingTest.questions
        : questions.filter(q => q.examCategory === testCategory).slice(0, 8);
    const testQuestions = pickedQuestions.length > 0 ? pickedQuestions : questions.slice(0, 8);

    // Group selected questions by section automatically so multi-section papers stay intact
    const sectionMap = new Map<string, Question[]>();
    for (const q of testQuestions) {
      const secName = q.section || 'General Studies';
      const list = sectionMap.get(secName) || [];
      list.push(q);
      sectionMap.set(secName, list);
    }

    const sectionEntries = Array.from(sectionMap.entries());
    const minsPerSec = Math.max(5, Math.round((Number(testDurationMins) || 60) / Math.max(1, sectionEntries.length)));
    const cutoffPerSec = Number(((Number(testCutoffUR) || 10) / Math.max(1, sectionEntries.length)).toFixed(1));

    const newTest: MockTest = {
      id: editingTestId || `custom-test-${Date.now()}`,
      title: testTitle.trim(),
      subtitle: testSubtitle.trim() || `${testCategory} Custom Practice Paper`,
      examCategory: testCategory,
      totalQuestions: testQuestions.length,
      overallTimeLimitMinutes: Number(testDurationMins) || 60,
      marksPerQuestion: Number(testMarksPerQ) || 1.0,
      negativeMarksPerQuestion: Number(testNegMarks) || 0,
      overallCutoffMarks: Number(testCutoffUR) || 10.0,
      categoryCutoffs: {
        UR: Number(testCutoffUR) || 10.0,
        OBC: Number(testCutoffOBC) || 9.0,
        EWS: Number(testCutoffEWS) || 8.5,
        SC: Number(testCutoffSC) || 7.0,
        ST: Number(testCutoffST) || 6.0
      },
      sections: sectionEntries.map(([secName, secQs], idx) => ({
        id: `sec-${Date.now()}-${idx}`,
        section: secName as SectionName,
        questionIds: secQs.map(q => q.id),
        timeLimitMinutes: minsPerSec,
        cutoffMarks: cutoffPerSec
      })),
      questions: testQuestions
    };

    saveMockTest(newTest);
    onMutated(
      editingTestId ? 'Mock Test updated successfully!' : 'Mock Test scheduled and published for aspirants!'
    );
    resetForm();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Form: Schedule or Edit Test */}
      <form
        onSubmit={handleSubmit}
        className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-8 shadow-sm space-y-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white font-serif flex items-center gap-2">
            {editingTestId ? (
              <Edit3 className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            ) : (
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            )}
            <span>{editingTestId ? 'Edit Mock Test Paper' : 'Assemble & Schedule New Mock Test Paper'}</span>
          </h3>
          {editingTestId && (
            <button
              type="button"
              onClick={resetForm}
              className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
          <div className="sm:col-span-2">
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Test Title *</label>
            <input
              type="text"
              value={testTitle}
              onChange={e => setTestTitle(e.target.value)}
              placeholder="e.g. UPSC Prelims 2026 Special Mock Paper #3"
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm sm:text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-amber-500 focus:bg-white dark:focus:bg-slate-800"
              required
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Exam Category *</label>
            <select
              value={testCategory}
              onChange={e => setTestCategory(e.target.value as ExamCategory)}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm sm:text-xs text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-amber-500 focus:bg-white dark:focus:bg-slate-800"
            >
              <option value="UPSC Civil Services">UPSC Civil Services</option>
              <option value="SSC (CGL/CHSL/MTS)">SSC (CGL/CHSL/MTS)</option>
              <option value="Banking (IBPS/SBI/RBI)">Banking (IBPS/SBI/RBI)</option>
              <option value="Railways (RRB NTPC/Group D)">Railways (RRB NTPC/Group D)</option>
              <option value="Class 12 Aptitude & Entrance">Class 12 Aptitude &amp; Entrance</option>
              <option value="Class 10 Foundation Aptitude">Class 10 Foundation Aptitude</option>
              <option value="General Studies & Science">General Studies &amp; Science</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Subtitle / Paper Description</label>
            <input
              type="text"
              value={testSubtitle}
              onChange={e => setTestSubtitle(e.target.value)}
              placeholder="e.g. Full-length sectional simulator with negative marking"
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm sm:text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-amber-500 focus:bg-white dark:focus:bg-slate-800"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Duration (Minutes)</label>
            <input
              type="number"
              value={testDurationMins}
              onChange={e => setTestDurationMins(Number(e.target.value))}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm sm:text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:bg-white dark:focus:bg-slate-800"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Marks per Correct (+)</label>
            <input
              type="number"
              step="0.1"
              value={testMarksPerQ}
              onChange={e => setTestMarksPerQ(Number(e.target.value))}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm sm:text-xs text-emerald-700 dark:text-emerald-400 font-bold focus:ring-2 focus:ring-amber-500 focus:bg-white dark:focus:bg-slate-800"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Negative Penalty (-)</label>
            <input
              type="number"
              step="0.01"
              value={testNegMarks}
              onChange={e => setTestNegMarks(Number(e.target.value))}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm sm:text-xs text-rose-700 dark:text-rose-400 font-bold focus:ring-2 focus:ring-amber-500 focus:bg-white dark:focus:bg-slate-800"
            />
          </div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
          <span className="font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider block">
            Reservation Category Cutoffs (UR / OBC / EWS / SC / ST)
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'UR Cutoff', value: testCutoffUR, setter: setTestCutoffUR },
              { label: 'OBC Cutoff', value: testCutoffOBC, setter: setTestCutoffOBC },
              { label: 'EWS Cutoff', value: testCutoffEWS, setter: setTestCutoffEWS },
              { label: 'SC Cutoff', value: testCutoffSC, setter: setTestCutoffSC },
              { label: 'ST Cutoff', value: testCutoffST, setter: setTestCutoffST }
            ].map(field => (
              <div key={field.label}>
                <label className="text-slate-600 dark:text-slate-400 block mb-1 text-[11px]">{field.label}</label>
                <input
                  type="number"
                  step="0.1"
                  value={field.value}
                  onChange={e => field.setter(Number(e.target.value))}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-sm sm:text-xs text-slate-900 dark:text-white"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Question Bank Picker */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Select Questions ({selectedQuestionIds.length} picked — leave empty for auto-pick)
            </span>
            <input
              type="text"
              value={testBankFilter}
              onChange={e => setTestBankFilter(e.target.value)}
              placeholder="Filter bank..."
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-sm sm:text-xs text-slate-900 dark:text-white w-full sm:w-44"
            />
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
            {filteredBankPickerQuestions.map(q => {
              const checked = selectedQuestionIdSet.has(q.id);
              return (
                <label
                  key={q.id}
                  className={`flex items-start gap-2.5 p-2 rounded-xl border cursor-pointer transition-colors ${
                    checked
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setSelectedQuestionIds(prev => (checked ? prev.filter(id => id !== q.id) : [...prev, q.id]))
                    }
                    className="mt-0.5 rounded text-amber-500 focus:ring-amber-500"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-cyan-700 dark:text-cyan-400 mr-1.5">[{q.section}]</span>
                    <span className="text-slate-800 dark:text-slate-200 line-clamp-1">{q.text}</span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          className="w-full sm:w-auto min-h-[44px] px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {editingTestId ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
          <span>{editingTestId ? 'Save Mock Test Updates' : 'Save & Schedule Mock Test'}</span>
        </button>
      </form>

      {/* Right List: Scheduled Mock Tests */}
      <div className="lg:col-span-5 space-y-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white font-serif">
              Scheduled Mock Tests ({mockTests.length})
            </h3>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search tests..."
                value={testSearch}
                onChange={e => setTestSearch(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-sm sm:text-xs text-slate-900 dark:text-white w-full sm:w-40 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
            {filteredMockTests.map(test => (
              <div
                key={test.id}
                className={`p-4 bg-slate-50 dark:bg-slate-800/60 border rounded-2xl space-y-2.5 text-xs ${
                  editingTestId === test.id
                    ? 'border-amber-500 ring-1 ring-amber-400'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <span className="inline-block px-2 py-0.5 bg-cyan-50 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 rounded text-[10px] font-bold">
                      {test.examCategory}
                    </span>
                    <h4 className="font-bold text-slate-900 dark:text-white line-clamp-2">{test.title}</h4>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEdit(test)}
                      className="p-2 text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                      title="Edit Mock Test"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {confirmDeleteTestId === test.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            deleteMockTest(test.id);
                            if (editingTestId === test.id) resetForm();
                            setConfirmDeleteTestId(null);
                            onMutated('Mock test deleted.');
                          }}
                          className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-bold cursor-pointer"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteTestId(null)}
                          className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteTestId(test.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                        title="Delete Mock Test"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-slate-600 dark:text-slate-400 pt-1.5 border-t border-slate-200 dark:border-slate-700">
                  <span>{test.totalQuestions} Qs</span>
                  <span>•</span>
                  <span>{test.overallTimeLimitMinutes}m</span>
                  <span>•</span>
                  <span className="text-emerald-700 dark:text-emerald-400">+{test.marksPerQuestion}</span>
                  <span>/</span>
                  <span className="text-rose-600 dark:text-rose-400">-{test.negativeMarksPerQuestion}</span>
                  <span>•</span>
                  <span className="text-amber-800 dark:text-amber-400">UR ≥ {test.overallCutoffMarks}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
