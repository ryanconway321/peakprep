import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';

const SUBJECTS = ['Math', 'Science', 'English', 'History', 'HSPT', 'Other'];

export default function NewSetPage() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('generate'); // generate | manual

  async function create() {
    if (!title.trim()) return;
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/sets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, description, subject }),
      });
      const set = await res.json();

      if (mode === 'generate' && notes.trim()) {
        await fetch(`${import.meta.env.VITE_API_URL}/api/generate/cards`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ notes, studySetId: set.id, count: 15 }),
        });
      }

      navigate(`/sets/${set.id}`);
    } catch {
      alert('Something went wrong. Try again.');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-10">
      <div className="sticky top-0 bg-slate-950/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center gap-3 z-10">
        <button onClick={() => navigate('/')} className="text-slate-400 hover:text-white">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-lg font-bold text-white">New Study Set</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
        <input
          type="text"
          placeholder="Set title (e.g. Chapter 5 Biology)"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-base"
        />
        <input
          type="text"
          placeholder="Description (optional)"
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />

        {/* Subject */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Subject</p>
          <div className="flex flex-wrap gap-2">
            {SUBJECTS.map(s => (
              <button key={s} onClick={() => setSubject(subject === s ? '' : s)}
                className={`px-3 py-1.5 rounded-xl text-sm font-semibold border transition-colors ${subject === s ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-1">
          {[{ id: 'generate', label: '🤖 AI Generate' }, { id: 'manual', label: '✏️ Manual' }].map(m => (
            <button key={m.id} onClick={() => setMode(m.id)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${mode === m.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              {m.label}
            </button>
          ))}
        </div>

        {mode === 'generate' && (
          <div className="space-y-2">
            <p className="text-xs text-slate-400">Paste your notes below — AI will generate up to 15 flashcards automatically.</p>
            <textarea
              placeholder="Paste your notes, textbook content, or anything you want to study..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={8}
              className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none text-sm"
            />
          </div>
        )}

        {mode === 'manual' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center text-slate-400 text-sm">
            Create the set first, then add cards one by one on the next screen.
          </div>
        )}

        <button
          onClick={create}
          disabled={!title.trim() || loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black py-4 rounded-2xl text-base transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <><svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg> {mode === 'generate' ? 'Generating cards…' : 'Creating…'}</>
          ) : mode === 'generate' ? '✨ Generate & Create' : 'Create Set'}
        </button>
      </div>
    </div>
  );
}
