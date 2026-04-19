import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';

export default function StudySetPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [set, setSet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddCard, setShowAddCard] = useState(false);
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [generating, setGenerating] = useState(false);
  const [notes, setNotes] = useState('');
  const [showGenerate, setShowGenerate] = useState(false);

  async function load() {
    try {
      const token = await getToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/sets/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSet(await res.json());
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function addCard() {
    if (!front.trim() || !back.trim()) return;
    const token = await getToken();
    await fetch(`${import.meta.env.VITE_API_URL}/api/cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ studySetId: id, front, back }),
    });
    setFront(''); setBack(''); setShowAddCard(false);
    load();
  }

  async function deleteCard(cardId) {
    const token = await getToken();
    await fetch(`${import.meta.env.VITE_API_URL}/api/cards/${cardId}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    });
    load();
  }

  async function generateMore() {
    if (!notes.trim()) return;
    setGenerating(true);
    try {
      const token = await getToken();
      await fetch(`${import.meta.env.VITE_API_URL}/api/generate/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notes, studySetId: id, count: 10 }),
      });
      setNotes(''); setShowGenerate(false);
      load();
    } catch { alert('Generation failed.'); }
    setGenerating(false);
  }

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading…</div>;
  if (!set) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Set not found.</div>;

  return (
    <div className="min-h-screen bg-slate-950 pb-10">
      <div className="sticky top-0 bg-slate-950/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center gap-3 z-10">
        <button onClick={() => navigate('/')} className="text-slate-400 hover:text-white">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold truncate">{set.title}</p>
          <p className="text-xs text-slate-400">{set.cards?.length || 0} cards</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">
        {/* Study modes */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <button onClick={() => navigate(`/sets/${id}/workout`)}
            disabled={!set.cards?.length}
            className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 disabled:opacity-40 text-white font-bold py-4 rounded-2xl flex flex-col items-center gap-1 transition-colors col-span-2">
            <span className="text-2xl">💪</span>
            <span className="text-xs">Workout Study — wrong answers = push-ups</span>
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <button onClick={() => navigate(`/sets/${id}/flashcards`)}
            disabled={!set.cards?.length}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold py-4 rounded-2xl flex flex-col items-center gap-1 transition-colors">
            <span className="text-2xl">🃏</span>
            <span className="text-xs">Flashcards</span>
          </button>
          <button onClick={() => navigate(`/sets/${id}/quiz`)}
            disabled={!set.cards?.length}
            className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-bold py-4 rounded-2xl flex flex-col items-center gap-1 transition-colors">
            <span className="text-2xl">📝</span>
            <span className="text-xs">Quiz Me</span>
          </button>
          <button onClick={() => navigate(`/sets/${id}/test`)}
            disabled={!set.cards?.length}
            className="bg-red-700 hover:bg-red-600 disabled:opacity-40 text-white font-bold py-4 rounded-2xl flex flex-col items-center gap-1 transition-colors">
            <span className="text-2xl">⏱️</span>
            <span className="text-xs">Test Mode</span>
          </button>
        </div>

        {/* Add card / Generate */}
        <div className="flex gap-2">
          <button onClick={() => { setShowAddCard(!showAddCard); setShowGenerate(false); }}
            className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold py-2.5 rounded-xl text-sm transition-colors">
            + Add Card
          </button>
          <button onClick={() => { setShowGenerate(!showGenerate); setShowAddCard(false); }}
            className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold py-2.5 rounded-xl text-sm transition-colors">
            🤖 AI Generate
          </button>
        </div>

        {showAddCard && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <textarea placeholder="Front (question/term)" value={front} onChange={e => setFront(e.target.value)} rows={2}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm resize-none" />
            <textarea placeholder="Back (answer/definition)" value={back} onChange={e => setBack(e.target.value)} rows={2}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm resize-none" />
            <button onClick={addCard} disabled={!front.trim() || !back.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
              Add Card
            </button>
          </div>
        )}

        {showGenerate && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <p className="text-xs text-slate-400">Paste more notes to generate additional cards</p>
            <textarea placeholder="Paste notes here…" value={notes} onChange={e => setNotes(e.target.value)} rows={5}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm resize-none" />
            <button onClick={generateMore} disabled={!notes.trim() || generating}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold py-2.5 rounded-xl text-sm transition-colors">
              {generating ? 'Generating…' : '✨ Generate Cards'}
            </button>
          </div>
        )}

        {/* Cards list */}
        {set.cards?.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            <p className="text-3xl mb-2">🃏</p>
            <p className="text-sm">No cards yet. Add some above or use AI to generate them.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{set.cards.length} Cards</p>
            {set.cards.map((card, i) => (
              <div key={card.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex gap-3">
                <span className="text-slate-600 text-xs font-mono mt-0.5 flex-shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-white text-sm font-medium">{card.front}</p>
                  <p className="text-slate-400 text-sm">{card.back}</p>
                </div>
                <button onClick={() => deleteCard(card.id)} className="text-slate-600 hover:text-red-400 text-lg flex-shrink-0 transition-colors">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
