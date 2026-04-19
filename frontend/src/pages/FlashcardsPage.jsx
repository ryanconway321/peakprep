import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';

export default function FlashcardsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [cards, setCards] = useState([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);
  const [results, setResults] = useState({ easy: 0, medium: 0, hard: 0 });

  useEffect(() => {
    async function load() {
      const token = await getToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/sets/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      // Prioritize cards due for review
      const sorted = [...(data.cards || [])].sort((a, b) => new Date(a.nextReview) - new Date(b.nextReview));
      setCards(sorted);
    }
    load();
  }, [id]);

  async function rate(difficulty) {
    const token = await getToken();
    const card = cards[index];
    await fetch(`${import.meta.env.VITE_API_URL}/api/cards/${card.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ front: card.front, back: card.back, difficulty }),
    });

    const key = difficulty === 1 ? 'easy' : difficulty === 2 ? 'medium' : 'hard';
    setResults(r => ({ ...r, [key]: r[key] + 1 }));

    if (index + 1 >= cards.length) {
      setDone(true);
    } else {
      setIndex(i => i + 1);
      setFlipped(false);
    }
  }

  if (!cards.length) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading…</div>;

  const card = cards[index];
  const progress = ((index) / cards.length) * 100;

  if (done) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-6 gap-6 text-center">
      <div className="text-5xl">🎉</div>
      <h2 className="text-2xl font-black text-white">Session Complete!</h2>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-xs space-y-3">
        <div className="flex justify-between"><span className="text-slate-400 text-sm">Easy</span><span className="text-green-400 font-bold">{results.easy}</span></div>
        <div className="flex justify-between"><span className="text-slate-400 text-sm">Medium</span><span className="text-yellow-400 font-bold">{results.medium}</span></div>
        <div className="flex justify-between"><span className="text-slate-400 text-sm">Hard</span><span className="text-red-400 font-bold">{results.hard}</span></div>
      </div>
      <p className="text-slate-400 text-sm">Hard cards will appear sooner in your next session.</p>
      <div className="flex gap-3">
        <button onClick={() => { setIndex(0); setFlipped(false); setDone(false); setResults({ easy: 0, medium: 0, hard: 0 }); }}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl transition-colors">Study Again</button>
        <button onClick={() => navigate(`/sets/${id}`)} className="bg-slate-800 text-slate-300 font-semibold px-6 py-3 rounded-xl border border-slate-700">Back to Set</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3 border-b border-slate-800">
        <button onClick={() => navigate(`/sets/${id}`)} className="text-slate-400 hover:text-white">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="flex-1">
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <span className="text-slate-400 text-sm">{index + 1}/{cards.length}</span>
      </div>

      {/* Card */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
        <button
          onClick={() => setFlipped(f => !f)}
          className="w-full max-w-md min-h-52 bg-slate-900 border-2 border-slate-700 hover:border-indigo-500 rounded-3xl p-8 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer"
        >
          <p className="text-xs text-slate-500 uppercase tracking-wider">{flipped ? 'Answer' : 'Question'}</p>
          <p className="text-white text-xl font-semibold text-center leading-relaxed">{flipped ? card.back : card.front}</p>
          {!flipped && <p className="text-slate-600 text-xs mt-4">Tap to reveal answer</p>}
        </button>

        {/* Rating buttons */}
        {flipped && (
          <div className="flex gap-3 w-full max-w-md">
            <button onClick={() => rate(3)} className="flex-1 bg-red-900/40 hover:bg-red-900/60 border border-red-700/50 text-red-300 font-bold py-4 rounded-2xl transition-colors text-sm">
              😓 Hard
            </button>
            <button onClick={() => rate(2)} className="flex-1 bg-yellow-900/40 hover:bg-yellow-900/60 border border-yellow-700/50 text-yellow-300 font-bold py-4 rounded-2xl transition-colors text-sm">
              🤔 Medium
            </button>
            <button onClick={() => rate(1)} className="flex-1 bg-green-900/40 hover:bg-green-900/60 border border-green-700/50 text-green-300 font-bold py-4 rounded-2xl transition-colors text-sm">
              😊 Easy
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
