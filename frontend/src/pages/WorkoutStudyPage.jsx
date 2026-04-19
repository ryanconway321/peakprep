import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { usePose } from '../hooks/usePose';

const REPS_REQUIRED = 5;
const THRIVE_API = import.meta.env.VITE_THRIVE_API_URL || null;

// ── Rep detection (same logic as RhythmRepPage) ──────────────────────────────
function usePushUpCounter(onRep) {
  const stateRef = useRef({ phase: 'up', min: null, max: null, count: 0 });

  const handleResults = useCallback((results) => {
    const lm = results.poseLandmarks;
    if (!lm) return;
    const nose = lm[0];
    const y = nose.y;
    const s = stateRef.current;

    if (s.min === null) { s.min = y; s.max = y; return; }
    s.min = Math.min(s.min, y);
    s.max = Math.max(s.max, y);
    const range = s.max - s.min;
    if (range < 0.04) return;

    const pct = (y - s.min) / range;
    if (s.phase === 'up' && pct > 0.65) {
      s.phase = 'down';
    } else if (s.phase === 'down' && pct < 0.35) {
      s.phase = 'up';
      s.count += 1;
      onRep(s.count);
    }
  }, [onRep]);

  return handleResults;
}

// ── Push-up challenge overlay ─────────────────────────────────────────────────
function PushUpChallenge({ onDone }) {
  const [reps, setReps] = useState(0);
  const [done, setDone] = useState(false);
  const repsRef = useRef(0);

  const onRep = useCallback((count) => {
    repsRef.current = count;
    setReps(count);
    if (count >= REPS_REQUIRED && !done) {
      setDone(true);
      setTimeout(() => onDone(count), 800);
    }
  }, [done, onDone]);

  const handleResults = usePushUpCounter(onRep);
  const { videoRef, camError, status } = usePose(handleResults);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
      {/* Camera background */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover opacity-70"
        playsInline
        muted
        autoPlay
      />
      <div className="relative z-10 text-center px-6">
        {camError ? (
          <div className="bg-slate-900/90 rounded-2xl p-8">
            <p className="text-red-400 mb-4">Camera not available</p>
            <button
              onClick={() => onDone(0)}
              className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold"
            >
              Skip
            </button>
          </div>
        ) : (
          <div className="bg-slate-900/80 backdrop-blur rounded-2xl p-8 max-w-sm w-full">
            <p className="text-red-400 font-bold text-lg mb-1">Wrong answer!</p>
            <p className="text-white text-2xl font-black mb-6">Do {REPS_REQUIRED} push-ups 💪</p>
            <div className="text-7xl font-black mb-2" style={{ color: reps >= REPS_REQUIRED ? '#22c55e' : '#a78bfa' }}>
              {reps}
            </div>
            <p className="text-slate-300 text-sm mb-4">of {REPS_REQUIRED} push-ups</p>
            <div className="w-full bg-slate-700 rounded-full h-3">
              <div
                className="h-3 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, (reps / REPS_REQUIRED) * 100)}%`,
                  background: reps >= REPS_REQUIRED ? '#22c55e' : '#818cf8',
                }}
              />
            </div>
            {status === 'loading' && <p className="text-slate-400 text-xs mt-3">Starting camera…</p>}
            {done && <p className="text-green-400 font-bold mt-4">Great work! ✅</p>}
            <button
              onClick={() => onDone(reps)}
              className="mt-5 text-slate-400 text-xs underline"
            >
              Skip
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main WorkoutStudyPage ─────────────────────────────────────────────────────
export default function WorkoutStudyPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();

  const [set, setSet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [phase, setPhase] = useState('card'); // card | pushup | done
  const [totalPushUps, setTotalPushUps] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const pushUpsRef = useRef(0);

  useEffect(() => {
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
    load();
  }, [id, getToken]);

  const cards = set?.cards || [];
  const card = cards[cardIndex];
  const isLast = cardIndex >= cards.length - 1;

  function handleCorrect() {
    setCorrect(c => c + 1);
    advance();
  }

  function handleWrong() {
    setWrong(w => w + 1);
    setPhase('pushup');
  }

  function handlePushUpDone(reps) {
    pushUpsRef.current += reps;
    setTotalPushUps(pushUpsRef.current);
    setPhase('card');
    advance();
  }

  function advance() {
    setFlipped(false);
    if (isLast) {
      setPhase('done');
      logReps();
    } else {
      setCardIndex(i => i + 1);
    }
  }

  async function logReps() {
    const total = pushUpsRef.current;
    if (total === 0) return;
    try {
      const token = await getToken();
      // Log to PeakPrep (optional future backend)
      // Log to Thrive
      if (THRIVE_API) {
        await fetch(`${THRIVE_API}/api/reps`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ gameId: 'workout-study', pushUps: total }),
        });
      }
    } catch {}
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading…</div>
  );
  if (!set || !cards.length) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <p className="text-slate-400 mb-4">No cards in this set.</p>
        <button onClick={() => navigate(-1)} className="text-indigo-400 underline">Go back</button>
      </div>
    </div>
  );

  // ── Done screen ──────────────────────────────────────────────────────────────
  if (phase === 'done') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-6 text-center">
        <div className="text-6xl mb-6">🎉</div>
        <h1 className="text-3xl font-black text-white mb-2">Set Complete!</h1>
        <p className="text-slate-400 mb-8">{set.title}</p>
        <div className="grid grid-cols-3 gap-4 w-full max-w-xs mb-8">
          <div className="bg-green-900/40 border border-green-700 rounded-xl p-4">
            <div className="text-2xl font-black text-green-400">{correct}</div>
            <div className="text-xs text-green-300 mt-1">Correct</div>
          </div>
          <div className="bg-red-900/40 border border-red-700 rounded-xl p-4">
            <div className="text-2xl font-black text-red-400">{wrong}</div>
            <div className="text-xs text-red-300 mt-1">Wrong</div>
          </div>
          <div className="bg-purple-900/40 border border-purple-700 rounded-xl p-4">
            <div className="text-2xl font-black text-purple-400">{totalPushUps}</div>
            <div className="text-xs text-purple-300 mt-1">Push-ups</div>
          </div>
        </div>
        {totalPushUps > 0 && (
          <p className="text-slate-400 text-sm mb-6">
            {THRIVE_API ? '💪 Push-ups logged to Thrive!' : `💪 You did ${totalPushUps} push-ups!`}
          </p>
        )}
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => { setCardIndex(0); setFlipped(false); setCorrect(0); setWrong(0); setTotalPushUps(0); pushUpsRef.current = 0; setPhase('card'); }}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl"
          >
            Play Again
          </button>
          <button
            onClick={() => navigate(`/sets/${id}`)}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl"
          >
            Back to Set
          </button>
        </div>
      </div>
    );
  }

  // ── Push-up challenge ────────────────────────────────────────────────────────
  if (phase === 'pushup') {
    return <PushUpChallenge onDone={handlePushUpDone} />;
  }

  // ── Card phase ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-slate-950/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center gap-3 z-10">
        <button onClick={() => navigate(`/sets/${id}`)} className="text-slate-400 hover:text-white">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold truncate">💪 Workout Study</p>
          <p className="text-xs text-slate-400">{set.title} · Card {cardIndex + 1} of {cards.length}</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-green-400 font-bold">✓ {correct}</span>
          <span className="text-red-400 font-bold">✗ {wrong}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-slate-800">
        <div
          className="h-1 bg-indigo-500 transition-all duration-300"
          style={{ width: `${((cardIndex) / cards.length) * 100}%` }}
        />
      </div>

      {/* Card */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-32">
        <div
          className="w-full max-w-sm min-h-48 bg-slate-800 border border-slate-700 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer select-none active:scale-95 transition-transform"
          onClick={() => setFlipped(f => !f)}
        >
          {!flipped ? (
            <>
              <p className="text-xs text-slate-500 mb-3 uppercase tracking-widest">Question</p>
              <p className="text-white text-xl font-semibold leading-snug">{card.front}</p>
              <p className="text-slate-500 text-xs mt-6">Tap to reveal answer</p>
            </>
          ) : (
            <>
              <p className="text-xs text-indigo-400 mb-3 uppercase tracking-widest">Answer</p>
              <p className="text-white text-xl font-semibold leading-snug">{card.back}</p>
            </>
          )}
        </div>

        {flipped && (
          <div className="flex gap-4 mt-8 w-full max-w-sm">
            <button
              onClick={handleWrong}
              className="flex-1 py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl text-lg"
            >
              ✗ Wrong
            </button>
            <button
              onClick={handleCorrect}
              className="flex-1 py-4 bg-green-600 hover:bg-green-500 text-white font-black rounded-2xl text-lg"
            >
              ✓ Got it
            </button>
          </div>
        )}

        {!flipped && (
          <p className="text-slate-600 text-sm mt-6">Wrong answer = 5 push-ups 💪</p>
        )}
      </div>
    </div>
  );
}
