import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';

const ROUND_TIME = 30; // seconds

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function RapidFirePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();

  const [cards, setCards]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [phase, setPhase]       = useState('idle'); // idle | playing | done
  const [index, setIndex]       = useState(0);
  const [flipped, setFlipped]   = useState(false);
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [correct, setCorrect]   = useState(0);
  const [wrong, setWrong]       = useState(0);
  const [skipped, setSkipped]   = useState(0);
  const [streak, setStreak]     = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [flash, setFlash]       = useState(null); // 'correct' | 'wrong' | null
  const timerRef = useRef(null);
  const streakRef = useRef(0);
  const correctRef = useRef(0);
  const wrongRef = useRef(0);
  const skippedRef = useRef(0);

  useEffect(() => {
    async function load() {
      const token = await getToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/sets/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setCards(shuffle(data.cards || []));
      setLoading(false);
    }
    load();
  }, [id]);

  function startGame() {
    const shuffled = shuffle(cards);
    setCards(shuffled);
    setIndex(0);
    setFlipped(false);
    setTimeLeft(ROUND_TIME);
    correctRef.current = 0;
    wrongRef.current = 0;
    skippedRef.current = 0;
    streakRef.current = 0;
    setCorrect(0);
    setWrong(0);
    setSkipped(0);
    setStreak(0);
    setBestStreak(0);
    setPhase('playing');
  }

  // Timer
  useEffect(() => {
    if (phase !== 'playing') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setPhase('done');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  function triggerFlash(type) {
    setFlash(type);
    setTimeout(() => setFlash(null), 300);
  }

  function next(result) {
    // result: 'correct' | 'wrong' | 'skip'
    if (result === 'correct') {
      correctRef.current++;
      streakRef.current++;
      setCorrect(correctRef.current);
      setStreak(streakRef.current);
      setBestStreak(b => Math.max(b, streakRef.current));
      triggerFlash('correct');
    } else if (result === 'wrong') {
      wrongRef.current++;
      streakRef.current = 0;
      setWrong(wrongRef.current);
      setStreak(0);
      triggerFlash('wrong');
    } else {
      skippedRef.current++;
      setSkipped(skippedRef.current);
    }

    setFlipped(false);
    // Wrap around so you never run out of cards
    setIndex(i => (i + 1) % cards.length);
  }

  const total = correctRef.current + wrongRef.current + skippedRef.current;
  const accuracy = total > 0 ? Math.round((correctRef.current / (total - skippedRef.current || 1)) * 100) : 0;

  const timerPct = (timeLeft / ROUND_TIME) * 100;
  const timerColor = timeLeft > 10 ? '#818cf8' : timeLeft > 5 ? '#f97316' : '#ef4444';

  const card = cards[index];

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading…</div>
  );

  // ── Done screen ────────────────────────────────────────────────────────────
  if (phase === 'done') {
    const answered = correctRef.current + wrongRef.current;
    const acc = answered > 0 ? Math.round((correctRef.current / answered) * 100) : 0;
    const grade = acc >= 90 ? { label: 'S', color: '#facc15', bg: 'bg-yellow-900/40 border-yellow-600' }
                : acc >= 75 ? { label: 'A', color: '#4ade80', bg: 'bg-green-900/40 border-green-600' }
                : acc >= 60 ? { label: 'B', color: '#818cf8', bg: 'bg-indigo-900/40 border-indigo-600' }
                : acc >= 45 ? { label: 'C', color: '#fb923c', bg: 'bg-orange-900/40 border-orange-600' }
                : { label: 'F', color: '#ef4444', bg: 'bg-red-900/40 border-red-600' };

    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl mb-4">⚡</div>
        <h1 className="text-3xl font-black text-white mb-1">Time's up!</h1>
        <p className="text-slate-400 mb-6 text-sm">{cards.length > 0 ? cards[0]?.studySetId : ''}</p>

        {/* Grade */}
        <div className={`w-24 h-24 rounded-2xl border-2 flex items-center justify-center mb-6 ${grade.bg}`}>
          <span className="text-5xl font-black" style={{ color: grade.color }}>{grade.label}</span>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 w-full max-w-xs mb-6">
          <div className="bg-green-900/30 border border-green-700 rounded-xl p-4">
            <div className="text-3xl font-black text-green-400">{correctRef.current}</div>
            <div className="text-xs text-green-300 mt-1">Correct</div>
          </div>
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-4">
            <div className="text-3xl font-black text-red-400">{wrongRef.current}</div>
            <div className="text-xs text-red-300 mt-1">Wrong</div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="text-3xl font-black text-slate-300">{skippedRef.current}</div>
            <div className="text-xs text-slate-400 mt-1">Skipped</div>
          </div>
          <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl p-4">
            <div className="text-3xl font-black text-yellow-400">{bestStreak}</div>
            <div className="text-xs text-yellow-300 mt-1">Best streak</div>
          </div>
        </div>

        <div className="text-2xl font-black text-white mb-1">{acc}%</div>
        <div className="text-slate-400 text-sm mb-8">accuracy · {answered} answered in 30s</div>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button onClick={startGame}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl text-lg">
            Play Again
          </button>
          <button onClick={() => navigate(`/sets/${id}`)}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl">
            Back to Set
          </button>
        </div>
      </div>
    );
  }

  // ── Idle screen ────────────────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-6 text-center">
        <div className="text-6xl mb-4">⚡</div>
        <h1 className="text-3xl font-black text-white mb-2">Rapid Fire</h1>
        <p className="text-slate-400 mb-8 max-w-xs">
          30 seconds. Flip each card, mark it right or wrong. Answer as many as you can. Go!
        </p>
        <div className="w-full max-w-xs space-y-3">
          <div className="flex justify-between text-sm px-1">
            <span className="text-slate-400">{cards.length} cards</span>
            <span className="text-indigo-400">⏱ 30 sec</span>
          </div>
          <button onClick={startGame}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl text-xl">
            Start
          </button>
          <button onClick={() => navigate(`/sets/${id}`)}
            className="w-full py-3 text-slate-400 hover:text-white text-sm">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Playing ────────────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-150 ${
      flash === 'correct' ? 'bg-green-950' : flash === 'wrong' ? 'bg-red-950' : 'bg-slate-950'
    }`}>
      {/* Timer bar */}
      <div className="w-full h-2 bg-slate-800">
        <div
          className="h-2 transition-all duration-1000 linear"
          style={{ width: `${timerPct}%`, backgroundColor: timerColor }}
        />
      </div>

      {/* HUD */}
      <div className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-xl font-black text-green-400">{correct}</div>
            <div className="text-xs text-slate-500">correct</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-black text-red-400">{wrong}</div>
            <div className="text-xs text-slate-500">wrong</div>
          </div>
        </div>

        {/* Timer */}
        <div className="text-center">
          <div className="text-4xl font-black tabular-nums" style={{ color: timerColor }}>
            {timeLeft}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {streak >= 3 && (
            <div className="text-center">
              <div className="text-xl font-black text-yellow-400">🔥{streak}</div>
              <div className="text-xs text-slate-500">streak</div>
            </div>
          )}
          <div className="text-center">
            <div className="text-xl font-black text-slate-400">{skipped}</div>
            <div className="text-xs text-slate-500">skip</div>
          </div>
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 pb-4">
        <div
          className="w-full max-w-sm min-h-44 bg-slate-800 border border-slate-700 rounded-2xl p-7 flex flex-col items-center justify-center text-center cursor-pointer select-none active:scale-95 transition-transform"
          onClick={() => !flipped && setFlipped(true)}
        >
          {!flipped ? (
            <>
              <p className="text-xs text-slate-500 mb-3 uppercase tracking-widest">Question</p>
              <p className="text-white text-xl font-semibold leading-snug">{card?.front}</p>
              <p className="text-slate-600 text-xs mt-5">tap to flip</p>
            </>
          ) : (
            <>
              <p className="text-xs text-indigo-400 mb-3 uppercase tracking-widest">Answer</p>
              <p className="text-white text-xl font-semibold leading-snug">{card?.back}</p>
            </>
          )}
        </div>

        {/* Action buttons */}
        <div className="w-full max-w-sm mt-5">
          {flipped ? (
            <div className="flex gap-3">
              <button onClick={() => next('wrong')}
                className="flex-1 py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl text-lg active:scale-95 transition-transform">
                ✗
              </button>
              <button onClick={() => next('correct')}
                className="flex-1 py-4 bg-green-600 hover:bg-green-500 text-white font-black rounded-2xl text-lg active:scale-95 transition-transform">
                ✓
              </button>
            </div>
          ) : (
            <button onClick={() => next('skip')}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold rounded-2xl text-sm">
              Skip →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
