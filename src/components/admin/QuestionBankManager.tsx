import React, { useState, useMemo } from 'react';
import { Question, SectionName, PracticeTopic, ExamCategory } from '../../types';
import {
  saveCustomQuestion,
  updateQuestion,
  deleteCustomQuestion
} from '../../data/storage';
import { PlusCircle, Edit3, Trash2, Search, Check } from 'lucide-react';

interface QuestionBankManagerProps {
  questions: Question[];
  onMutated: (message: string, isError?: boolean) => void;
}

export const QuestionBankManager: React.FC<QuestionBankManagerProps> = ({
  questions,
  onMutated
}) => {
  const [editingQId, setEditingQId] = useState<string | null>(null);
  const [confirmDeleteQId, setConfirmDeleteQId] = useState<string | null>(null);
  const [qSearch, setQSearch] = useState('');

  // Form fields
  const [qSection, setQSection] = useState<SectionName>('General Studies');
  const [qTopic, setQTopic] = useState<PracticeTopic | string>('Polity & Constitution');
  const [qExamCategory, setQExamCategory] = useState<ExamCategory>('UPSC Civil Services');
  const [qExamTag, setQExamTag] = useState('UPSC Prelims GS-1');
  const [qDifficulty, setQDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [qPassage, setQPassage] = useState('');
  const [qText, setQText] = useState('');
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [optD, setOptD] = useState('');
  const [correctOptId, setCorrectOptId] = useState('a');
  const [explanation, setExplanation] = useState('');

  const filteredBankQuestions = useMemo(() => {
    const q = qSearch.trim().toLowerCase();
    if (!q) return questions;
    return questions.filter(item => item.text.toLowerCase().includes(q));
  }, [questions, qSearch]);

  const resetForm = () => {
    setEditingQId(null);
    setQSection('General Studies');
    setQTopic('Polity & Constitution');
    setQExamCategory('UPSC Civil Services');
    setQExamTag('UPSC Prelims GS-1');
    setQDifficulty('Medium');
    setQPassage('');
    setQText('');
    setOptA('');
    setOptB('');
    setOptC('');
    setOptD('');
    setCorrectOptId('a');
    setExplanation('');
  };

  const startEdit = (q: Question) => {
    setEditingQId(q.id);
    setQSection(q.section);
    setQTopic(q.topic || 'Polity & Constitution');
    setQExamCategory(q.examCategory);
    setQExamTag(q.examTag || 'Competitive Exam');
    setQDifficulty(q.difficulty || 'Medium');
    setQPassage(q.passage || '');
    setQText(q.text);
    setOptA(q.options?.[0]?.text || '');
    setOptB(q.options?.[1]?.text || '');
    setOptC(q.options?.[2]?.text || '');
    setOptD(q.options?.[3]?.text || '');
    setCorrectOptId(q.correctOptionId || 'a');
    setExplanation(q.explanation || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qText.trim() || !optA.trim() || !optB.trim() || !optC.trim() || !optD.trim() || !explanation.trim()) {
      onMutated('Please complete all question fields, options, and step-by-step solution rationale.', true);
      return;
    }

    const qPayload = {
      section: qSection,
      topic: qTopic,
      examCategory: qExamCategory,
      passage: qPassage.trim() || undefined,
      text: qText.trim(),
      options: [
        { id: 'a', text: optA.trim() },
        { id: 'b', text: optB.trim() },
        { id: 'c', text: optC.trim() },
        { id: 'd', text: optD.trim() }
      ],
      correctOptionId: correctOptId,
      explanation: explanation.trim(),
      difficulty: qDifficulty,
      examTag: qExamTag.trim() || 'Competitive Exam'
    };

    if (editingQId) {
      updateQuestion({ id: editingQId, ...qPayload });
      onMutated('Question updated in the central Question Bank!');
    } else {
      saveCustomQuestion(qPayload);
      onMutated('New question successfully added to the central Question Bank!');
    }
    resetForm();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left: Create or Edit Question */}
      <form
        onSubmit={handleSubmit}
        className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white font-serif flex items-center gap-2">
            {editingQId ? (
              <Edit3 className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            ) : (
              <PlusCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            )}
            <span>{editingQId ? 'Edit Question Bank Item' : 'Add New Examination Question'}</span>
          </h3>
          {editingQId && (
            <button
              type="button"
              onClick={resetForm}
              className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Section *</label>
            <select
              value={qSection}
              onChange={e => setQSection(e.target.value as SectionName)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white transition-colors"
            >
              <option value="General Studies">General Studies</option>
              <option value="Quantitative Aptitude">Quantitative Aptitude</option>
              <option value="Reasoning & Logical Intelligence">Reasoning &amp; Logical Intelligence</option>
              <option value="General Awareness">General Awareness</option>
              <option value="General Science">General Science</option>
              <option value="English Comprehension">English Comprehension</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Target Exam *</label>
            <select
              value={qExamCategory}
              onChange={e => setQExamCategory(e.target.value as ExamCategory)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white transition-colors"
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

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Difficulty</label>
            <select
              value={qDifficulty}
              onChange={e => setQDifficulty(e.target.value as 'Easy' | 'Medium' | 'Hard')}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white font-bold transition-colors"
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
        </div>

        <div>
          <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 text-xs">Practice Topic *</label>
          <input
            type="text"
            value={qTopic}
            onChange={e => setQTopic(e.target.value)}
            placeholder="e.g. Polity & Constitution"
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white text-sm sm:text-xs transition-colors"
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 text-xs">Reference Passage (Optional)</label>
          <textarea
            rows={2}
            value={qPassage}
            onChange={e => setQPassage(e.target.value)}
            placeholder="Optional reading comprehension passage or data context..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white text-sm sm:text-xs transition-colors"
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 text-xs">Question Text *</label>
          <textarea
            rows={3}
            value={qText}
            onChange={e => setQText(e.target.value)}
            placeholder="Type examination question statement..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white dark:focus:bg-slate-900 transition-colors"
            required
          />
        </div>

        {/* 4 Options */}
        <div className="space-y-2">
          <label className="font-bold text-slate-700 dark:text-slate-300 block text-xs">4 Answer Options *</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <input
              type="text"
              value={optA}
              onChange={e => setOptA(e.target.value)}
              placeholder="Option (a)"
              className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white transition-colors"
              required
            />
            <input
              type="text"
              value={optB}
              onChange={e => setOptB(e.target.value)}
              placeholder="Option (b)"
              className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white transition-colors"
              required
            />
            <input
              type="text"
              value={optC}
              onChange={e => setOptC(e.target.value)}
              placeholder="Option (c)"
              className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white transition-colors"
              required
            />
            <input
              type="text"
              value={optD}
              onChange={e => setOptD(e.target.value)}
              placeholder="Option (d)"
              className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white transition-colors"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Correct Answer *</label>
            <select
              value={correctOptId}
              onChange={e => setCorrectOptId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-emerald-700 dark:text-emerald-400 font-extrabold transition-colors"
            >
              <option value="a">Option (a)</option>
              <option value="b">Option (b)</option>
              <option value="c">Option (c)</option>
              <option value="d">Option (d)</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Exam Tag</label>
            <input
              type="text"
              value={qExamTag}
              onChange={e => setQExamTag(e.target.value)}
              placeholder="e.g. UPSC GS-1, SSC CGL"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 text-xs">Detailed Solution &amp; Rationale *</label>
          <textarea
            rows={3}
            value={explanation}
            onChange={e => setExplanation(e.target.value)}
            placeholder="Explain the step-by-step conceptual rationale, formula, or statutory article..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white dark:focus:bg-slate-900 transition-colors"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full min-h-[44px] py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {editingQId ? <Check className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
          <span>{editingQId ? 'Update Question in Bank' : 'Save Question to Question Bank'}</span>
        </button>
      </form>

      {/* Right: Question Bank List */}
      <div className="lg:col-span-6 space-y-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white font-serif">
              Bank Questions ({questions.length})
            </h3>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search questions..."
                value={qSearch}
                onChange={e => setQSearch(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-sm sm:text-xs text-slate-900 dark:text-white w-full sm:w-44 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
            {filteredBankQuestions.map((q, idx) => (
              <div
                key={q.id}
                className={`p-4 bg-slate-50 dark:bg-slate-800/60 border rounded-2xl flex items-start justify-between gap-3 text-xs ${
                  editingQId === q.id
                    ? 'border-amber-500 ring-1 ring-amber-400'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded text-[10px] font-bold">
                      {q.section}
                    </span>
                    <span className="text-cyan-800 dark:text-cyan-300 text-[10px] font-semibold">{q.examCategory}</span>
                  </div>
                  <p className="font-medium text-slate-800 dark:text-slate-200 leading-snug line-clamp-2">
                    <strong className="text-amber-800 dark:text-amber-400 mr-1">#{idx + 1}</strong> {q.text}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => startEdit(q)}
                    className="p-2 text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                    title="Edit Question"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  {confirmDeleteQId === q.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          deleteCustomQuestion(q.id);
                          if (editingQId === q.id) resetForm();
                          setConfirmDeleteQId(null);
                          onMutated('Question removed from Question Bank.');
                        }}
                        className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-bold cursor-pointer"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteQId(null)}
                        className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteQId(q.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                      title="Delete Question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
