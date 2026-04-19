import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';

export default function QuizPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [answered, setAnswered] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        const setRes = await fetch(`${import.meta.env.VITE_API_URL}/api/sets/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const set = await setRes.json();
        const quizRes = await fetch(`${import.meta.env.VITE_API_URL}/api/generate/quiz`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ cards: set.cards, count: 8 }),
        });
        const data = await quizRes.json();
        setQuestions(data.questions || []);
      } catch { alert('Failed to generate quiz.'); navigate(`/sets/${id}`); }
      setLoading(false);
    }
    load();
  }, [id]);

  function answer(opt) {
    if (answered) return;
    setSelected(opt);
    setAnswered(true);
    const q = questions[index];
    const letter = opt.charAt(0);
    if (letter === q.answer) setScore(s => s + 1);
  }

  function next() {
    if (index + 1 >= questions.length) {
      setDone(true);
    } else {
      setIndex(i => i + 1);
      setSelected(null);
      setAnswered(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-400 text-sm">Generating quiz questions…</p>
    </div>
  );

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    const grade = pct >= 90 ? '🌟 Excellent!' : pct >= 70 ? '👍 Good job!' : pct >= 50 ? '📖 Keep studying!' : '💪 Don\'t give up!';
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-6 gap-5 text-center">
        <div className="text-5xl">{pct >= 70 ? '🎉' : '📚'}</div>
        <h2 className="text-2xl font-black text-white">Quiz Complete!</h2>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-xs">
          <p className="text-6xl font-black text-indigo-400">{pct}%</p>
          <p className="text-white font-semibold mt-1">{score}/{questions.length} correct</p>
          <p className="text-slate-400 text-sm mt-2">{grade}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setIndex(0); setSelected(null); setAnswered(false); setScore(0); setDone(false); }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl transition-colors">Retake Quiz</button>
          <button onClick={() => navigate(`/sets/${id}`)} className="bg-slate-800 text-slate-300 font-semibold px-6 py-3 rounded-xl border border-slate-700">Back to Set</button>
        </div>
      </div>
    );
  }

  const q = questions[index];
  const progress = (index / questions.length) * 100;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <div className="px-4 py-3 flex items-center gap-3 border-b border-slate-800">
        <button onClick={() => navigate(`/sets/${id}`)} className="text-slate-400 hover:text-white">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="flex-1">
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <span className="text-slate-400 text-sm">{index + 1}/{questions.length}</span>
      </div>

      <div className="flex-1 flex flex-col px-4 py-6 max-w-lg mx-auto w-full gap-5">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Question {index + 1}</p>
          <p className="text-white font-semibold text-base leading-relaxed">{q.question}</p>
        </div>

        <div className="space-y-2">
          {q.options?.map(opt => {
            const letter = opt.charAt(0);
            const isCorrect = letter === q.answer;
            const isSelected = selected === opt;
            let style = 'bg-slate-900 border-slate-700 text-slate-200';
            if (answered) {
              if (isCorrect) style = 'bg-green-900/40 border-green-500 text-green-300';
              else if (isSelected) style = 'bg-red-900/40 border-red-500 text-red-300';
              else style = 'bg-slate-900 border-slate-800 text-slate-500';
            }
            return (
              <button key={opt} onClick={() => answer(opt)}
                className={`w-full text-left border rounded-xl px-4 py-3.5 text-sm font-medium transition-all ${style} ${!answered ? 'hover:border-indigo-500 hover:text-white cursor-pointer' : 'cursor-default'}`}>
                {opt}
              </button>
            );
          })}
        </div>

        {answered && (
          <div className="space-y-3">
            {q.explanation && (
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Explanation</p>
                <p className="text-slate-300 text-sm">{q.explanation}</p>
              </div>
            )}
            <button onClick={next} className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-4 rounded-2xl transition-colors">
              {index + 1 >= questions.length ? 'See Results' : 'Next →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
