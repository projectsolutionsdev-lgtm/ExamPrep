import React, { useState, useMemo } from 'react';
import { CurrentAffairsItem, CurrentAffairsCategory } from '../../types';
import {
  saveCurrentAffairsPost,
  updateCurrentAffairsPost,
  deleteCurrentAffairsPost
} from '../../data/storage';
import { PlusCircle, Edit3, Trash2, Search, Check } from 'lucide-react';

interface CurrentAffairsManagerProps {
  currentAffairs: CurrentAffairsItem[];
  onMutated: (message: string, isError?: boolean) => void;
}

export const CurrentAffairsManager: React.FC<CurrentAffairsManagerProps> = ({
  currentAffairs,
  onMutated
}) => {
  const [editingCaId, setEditingCaId] = useState<string | null>(null);
  const [confirmDeleteCaId, setConfirmDeleteCaId] = useState<string | null>(null);
  const [caSearch, setCaSearch] = useState('');

  // Form fields
  const [caTitle, setCaTitle] = useState('');
  const [caCategory, setCaCategory] = useState<CurrentAffairsCategory>('National');
  const [caDate, setCaDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [caSummary, setCaSummary] = useState('');
  const [caFullArticle, setCaFullArticle] = useState('');
  const [caKeyTakeaways, setCaKeyTakeaways] = useState('');
  const [caSource, setCaSource] = useState('Official Press Release / PIB');
  const [caTags, setCaTags] = useState('UPSC GS-2, SSC CGL');
  const [caReadTime, setCaReadTime] = useState(4);

  // Attached MCQ fields
  const [caQText, setCaQText] = useState('');
  const [caOptA, setCaOptA] = useState('');
  const [caOptB, setCaOptB] = useState('');
  const [caOptC, setCaOptC] = useState('');
  const [caOptD, setCaOptD] = useState('');
  const [caCorrectOpt, setCaCorrectOpt] = useState('a');
  const [caQExpl, setCaQExpl] = useState('');

  const filteredCurrentAffairs = useMemo(() => {
    const q = caSearch.trim().toLowerCase();
    if (!q) return currentAffairs;
    return currentAffairs.filter(c => c.title.toLowerCase().includes(q));
  }, [currentAffairs, caSearch]);

  const resetForm = () => {
    setEditingCaId(null);
    setCaTitle('');
    setCaCategory('National');
    setCaDate(new Date().toISOString().split('T')[0]);
    setCaSummary('');
    setCaFullArticle('');
    setCaKeyTakeaways('');
    setCaSource('Official Press Release / PIB');
    setCaTags('UPSC GS-2, SSC CGL');
    setCaReadTime(4);
    setCaQText('');
    setCaOptA('');
    setCaOptB('');
    setCaOptC('');
    setCaOptD('');
    setCaCorrectOpt('a');
    setCaQExpl('');
  };

  const startEdit = (ca: CurrentAffairsItem) => {
    setEditingCaId(ca.id);
    setCaTitle(ca.title);
    setCaCategory(ca.category);
    setCaDate(ca.date);
    setCaSummary(ca.summary);
    setCaFullArticle(ca.fullArticle);
    setCaKeyTakeaways((ca.keyTakeaways || []).join('\n'));
    setCaSource(ca.source || 'Official Press Release / PIB');
    setCaTags((ca.tags || []).join(', '));
    setCaReadTime(ca.readTimeMinutes || 4);

    if (ca.practiceQuestion) {
      setCaQText(ca.practiceQuestion.questionText || '');
      setCaOptA(ca.practiceQuestion.options?.[0]?.text || '');
      setCaOptB(ca.practiceQuestion.options?.[1]?.text || '');
      setCaOptC(ca.practiceQuestion.options?.[2]?.text || '');
      setCaOptD(ca.practiceQuestion.options?.[3]?.text || '');
      setCaCorrectOpt(ca.practiceQuestion.correctOptionId || 'a');
      setCaQExpl(ca.practiceQuestion.explanation || '');
    } else {
      setCaQText('');
      setCaOptA('');
      setCaOptB('');
      setCaOptC('');
      setCaOptD('');
      setCaCorrectOpt('a');
      setCaQExpl('');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caTitle.trim() || !caSummary.trim() || !caFullArticle.trim()) {
      onMutated('Please fill in required title, summary, and article content.', true);
      return;
    }

    const takeawaysArray = caKeyTakeaways
      .split('\n')
      .map(t => t.trim())
      .filter(Boolean);

    const tagsArray = caTags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const attachedQuestion =
      caQText.trim() && caOptA.trim() && caOptB.trim()
        ? {
            questionText: caQText.trim(),
            options: [
              { id: 'a', text: caOptA.trim() },
              { id: 'b', text: caOptB.trim() },
              { id: 'c', text: caOptC.trim() || 'Option C' },
              { id: 'd', text: caOptD.trim() || 'Option D' }
            ],
            correctOptionId: caCorrectOpt,
            explanation: caQExpl.trim() || 'Conceptual solution rationale'
          }
        : undefined;

    const payload = {
      title: caTitle.trim(),
      summary: caSummary.trim(),
      fullArticle: caFullArticle.trim(),
      keyTakeaways:
        takeawaysArray.length > 0 ? takeawaysArray : ['Essential concept for competitive examinations.'],
      category: caCategory,
      date: caDate,
      readTimeMinutes: Number(caReadTime) || 4,
      source: caSource.trim() || 'Official Gazette / PIB',
      tags: tagsArray.length > 0 ? tagsArray : ['Current Affairs', 'Competitive Exams'],
      practiceQuestion: attachedQuestion
    };

    if (editingCaId) {
      updateCurrentAffairsPost({ id: editingCaId, ...payload });
      onMutated('Current Affairs article updated successfully!');
    } else {
      saveCurrentAffairsPost(payload);
      onMutated('Current Affairs article published successfully!');
    }
    resetForm();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Form: Add or Edit Article */}
      <form
        onSubmit={handleSubmit}
        className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white font-serif flex items-center gap-2">
            {editingCaId ? (
              <Edit3 className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            ) : (
              <PlusCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            )}
            <span>{editingCaId ? 'Edit Current Affairs Article' : 'Publish Daily Current Affairs Article'}</span>
          </h3>
          {editingCaId && (
            <button
              type="button"
              onClick={resetForm}
              className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Category *</label>
            <select
              value={caCategory}
              onChange={e => setCaCategory(e.target.value as CurrentAffairsCategory)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:bg-white dark:focus:bg-slate-900 font-semibold transition-colors"
            >
              <option value="National">National</option>
              <option value="International">International</option>
              <option value="Economy & Banking">Economy &amp; Banking</option>
              <option value="Science & Technology">Science &amp; Technology</option>
              <option value="Government Schemes">Government Schemes</option>
              <option value="Environment & Ecology">Environment &amp; Ecology</option>
              <option value="Sports">Sports</option>
              <option value="Awards & Honours">Awards &amp; Honours</option>
              <option value="Appointments & Summits">Appointments &amp; Summits</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Publication Date *</label>
            <input
              type="date"
              value={caDate}
              onChange={e => setCaDate(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:bg-white dark:focus:bg-slate-900 transition-colors"
              required
            />
          </div>
        </div>

        <div>
          <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 text-xs">Headline / Title *</label>
          <input
            type="text"
            value={caTitle}
            onChange={e => setCaTitle(e.target.value)}
            placeholder="e.g. ISRO Launches Shukrayaan Venus Mission Payload Testing"
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white dark:focus:bg-slate-900 transition-colors"
            required
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 text-xs">Executive Summary (2-3 lines) *</label>
          <textarea
            rows={2}
            value={caSummary}
            onChange={e => setCaSummary(e.target.value)}
            placeholder="Brief summary for quick revision ticker..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white dark:focus:bg-slate-900 transition-colors"
            required
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 text-xs">Full Comprehensive Article *</label>
          <textarea
            rows={4}
            value={caFullArticle}
            onChange={e => setCaFullArticle(e.target.value)}
            placeholder="Detailed article body for aspirants..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white dark:focus:bg-slate-900 transition-colors"
            required
          />
        </div>

        <div>
          <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 text-xs">
            Key Takeaways for Aspirants (One bullet point per line)
          </label>
          <textarea
            rows={3}
            value={caKeyTakeaways}
            onChange={e => setCaKeyTakeaways(e.target.value)}
            placeholder="Bullet 1: Outlay and key statutory sections&#10;Bullet 2: Target date and constitutional provisions"
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white dark:focus:bg-slate-900 transition-colors"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Source Citation</label>
            <input
              type="text"
              value={caSource}
              onChange={e => setCaSource(e.target.value)}
              placeholder="e.g. PIB Delhi / The Hindu"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:bg-white dark:focus:bg-slate-900 transition-colors"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Exam Tags (Comma-separated)</label>
            <input
              type="text"
              value={caTags}
              onChange={e => setCaTags(e.target.value)}
              placeholder="UPSC GS-3, SSC CGL, Banking GA"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:bg-white dark:focus:bg-slate-900 transition-colors"
            />
          </div>
        </div>

        {/* Attached MCQ sub-card */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
          <span className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider block">
            Attach Diagnostic Practice MCQ (Optional)
          </span>
          <input
            type="text"
            value={caQText}
            onChange={e => setCaQText(e.target.value)}
            placeholder="Question text..."
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-slate-900 dark:text-white text-xs transition-colors"
          />
          <div className="grid grid-cols-2 gap-2 text-xs">
            <input
              type="text"
              value={caOptA}
              onChange={e => setCaOptA(e.target.value)}
              placeholder="Option A"
              className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-slate-900 dark:text-white transition-colors"
            />
            <input
              type="text"
              value={caOptB}
              onChange={e => setCaOptB(e.target.value)}
              placeholder="Option B"
              className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-slate-900 dark:text-white transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <input
              type="text"
              value={caOptC}
              onChange={e => setCaOptC(e.target.value)}
              placeholder="Option C (Optional)"
              className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-slate-900 dark:text-white transition-colors"
            />
            <input
              type="text"
              value={caOptD}
              onChange={e => setCaOptD(e.target.value)}
              placeholder="Option D (Optional)"
              className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-slate-900 dark:text-white transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <select
              value={caCorrectOpt}
              onChange={e => setCaCorrectOpt(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-emerald-700 dark:text-emerald-400 font-bold transition-colors"
            >
              <option value="a">Correct: Option A</option>
              <option value="b">Correct: Option B</option>
              <option value="c">Correct: Option C</option>
              <option value="d">Correct: Option D</option>
            </select>
            <input
              type="text"
              value={caQExpl}
              onChange={e => setCaQExpl(e.target.value)}
              placeholder="Rationale"
              className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-slate-900 dark:text-white transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full min-h-[44px] py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {editingCaId ? <Check className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
          <span>{editingCaId ? 'Save Article Updates' : 'Publish to Current Affairs Feed'}</span>
        </button>
      </form>

      {/* Right List: Manage Articles */}
      <div className="lg:col-span-6 space-y-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white font-serif">
              Published Articles ({currentAffairs.length})
            </h3>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search articles..."
                value={caSearch}
                onChange={e => setCaSearch(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-sm sm:text-xs text-slate-900 dark:text-white w-full sm:w-44 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
            {filteredCurrentAffairs.map(ca => (
              <div
                key={ca.id}
                className={`p-4 bg-slate-50 dark:bg-slate-800/60 border rounded-2xl flex items-start justify-between gap-3 text-xs ${
                  editingCaId === ca.id
                    ? 'border-amber-500 ring-1 ring-amber-400'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded text-[10px] font-bold">
                      {ca.category}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 text-[10px]">{ca.date}</span>
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white line-clamp-1">{ca.title}</h4>
                  <p className="text-slate-600 dark:text-slate-300 line-clamp-2 text-[11px]">{ca.summary}</p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => startEdit(ca)}
                    className="p-2 text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                    title="Edit Article"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  {confirmDeleteCaId === ca.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          deleteCurrentAffairsPost(ca.id);
                          if (editingCaId === ca.id) resetForm();
                          setConfirmDeleteCaId(null);
                          onMutated('Current Affairs article deleted.');
                        }}
                        className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-bold cursor-pointer"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteCaId(null)}
                        className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteCaId(ca.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                      title="Delete Article"
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
