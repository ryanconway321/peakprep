import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';

export default function TestModePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(null);
  const [input, setInput] = useState('');
  const timerRef = useRef(null);
  const startRef = useRef(Date.now());

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
          body: JSON.stringify({ cards: set.cards, count: 10 }),
        });
        const data = await quizRes.json();
        setQuestions(data.questions || []);
        // 1.5 min per question
        setTimeLeft((data.questions?.length || 10) * 90);
      } catch { navigate(`/sets/${id}`); }
      setLoading(false);
    }
    load();
  }, [id]);

  // Timer
  useEffect(() => {
    if (timeLeft === null || submitted) return;
    if (timeLeft <= 0) { handleSubmit(); return; }
    timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [timeLeft, submitted]);

  function selectAnswer(qIdx, opt) {
    if (submitted) return;
    setAnswers(a => ({ ...a, [qIdx]: opt }));
  }

  async function handleSubmit() {
    setSubmitted(true);
    clearTimeout(timerRef.current);
    const duration = Math.round((Date.now() - startRef.current) / 1000);
    const score = questions.filter((q, i) => answers[i]?.charAt(0) === q.answer).length;
    try {
      const token = await getToken();
      await fetch(`${import.meta.env.VITE_API_URL}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ studySetId: id, mode: 'test', score, total: questions.length, duration }),
      });
    } catch {}
  }

  const mins = Math.floor((timeLeft || 0) / 60);
  const secs = ((timeLeft || 0) % 60).toString().padStart(2, '0');
  const isLowTime = timeLeft !== null && timeLeft < 60;

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-400 text-sm">Generating test…</p>
    </div>
  );

  if (submitted) {
    const score = questions.filter((q, i) => answers[i]?.charAt(0) === q.answer).length;
    const pct = Math.round((score / questions.length) * 100);
    const grade = pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : pct >= 60 ? 'D' : 'F';
    const gradeColor = pct >= 90 ? 'text-green-400' : pct >= 70 ? 'text-yellow-400' : 'text-red-400';

    return (
      <div className="min-h-screen bg-slate-950 pb-10">
        <div className="sticky top-0 bg-slate-950 border-b border-slate-800 px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(`/sets/${id}`)} className="text-slate-400 hover:text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <p className="text-white font-bold">Test Results</p>
        </div>
        <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-2">
            <p className={`text-7xl font-black ${gradeColor}`}>{grade}</p>
            <p className="text-white font-bold text-xl">{pct}%</p>
            <p className="text-slate-400">{score} out of {questions.length} correct</p>
          </div>

          <div className="space-y-3">
            {questions.map((q, i) => {
              const correct = answers[i]?.charAt(0) === q.answer;
              return (
                <div key={i} className={`bg-slate-900 border rounded-2xl p-4 space-y-2 ${correct ? 'border-green-700/50' : 'border-red-700/50'}`}>
                  <div className="flex gap-2 items-start">
                    <span className="text-lg">{correct ? '✅' : '❌'}</span>
                    <p className="text-white text-sm font-medium">{q.question}</p>
                  </div>
                  {!correct && (
                    <div className="pl-7 space-y-1">
                      {answers[i] && <p className="text-red-400 text-xs">Your answer: {answers[i]}</p>}
                      <p className="text-green-400 text-xs">Correct: {q.options?.find(o => o.charAt(0) === q.answer)}</p>
                      {q.explanation && <p className="text-slate-400 text-xs">{q.explanation}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button onClick={() => navigate(`/sets/${id}`)} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl transition-colors">
            Back to Set
          </button>
        </div>
      </div>
    );
  }

  const q = questions[index];
  const answered = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-slate-800 bg-slate-950 sticky top-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/sets/${id}`)} className="text-slate-400 hover:text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <p className="text-white font-bold text-sm">Test Mode ⏱️</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-400 text-xs">{answered}/{questions.length} answered</span>
          <span className={`font-black text-sm px-3 py-1 rounded-full ${isLowTime ? 'bg-red-900/60 text-red-300 animate-pulse' : 'bg-slate-800 text-white'}`}>
            {mins}:{secs}
          </span>
        </div>
      </div>

      {/* Question nav dots */}
      <div className="flex gap-1.5 px-4 py-2 overflow-x-auto border-b border-slate-800">
        {questions.map((_, i) => (
          <button key={i} onClick={() => { setInput(''); setIndex(i); }}
            className={`flex-shrink-0 w-7 h-7 rounded-full text-xs font-bold transition-colors ${
              i === index ? 'bg-indigo-600 text-white' :
              answers[i] ? 'bg-green-700 text-white' : 'bg-slate-800 text-slate-400'
            }`}>{i + 1}</button>
        ))}
      </div>

      <div className="flex-1 flex flex-col px-4 py-5 max-w-lg mx-auto w-full gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Question {index + 1}</p>
          <p className="text-white font-semibold leading-relaxed">{q.question}</p>
        </div>

        <div className="space-y-2">
          {q.options?.map(opt => {
            const selected = answers[index] === opt;
            return (
              <button key={opt} onClick={() => selectAnswer(index, opt)}
                className={`w-full text-left border rounded-xl px-4 py-3.5 text-sm font-medium transition-all ${
                  selected ? 'bg-indigo-900/50 border-indigo-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-200 hover:border-indigo-500'
                }`}>
                {opt}
              </button>
            );
          })}
        </div>

        <div className="flex gap-3 mt-auto pt-2">
          {index > 0 && (
            <button onClick={() => setIndex(i => i - 1)} className="flex-1 bg-slate-800 text-slate-300 font-semibold py-3 rounded-xl border border-slate-700">← Prev</button>
          )}
          {index < questions.length - 1 ? (
            <button onClick={() => setIndex(i => i + 1)} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-colors">Next →</button>
          ) : (
            <button onClick={handleSubmit} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black py-3 rounded-xl transition-colors">Submit Test</button>
          )}
        </div>
      </div>
    </div>
  );
}
