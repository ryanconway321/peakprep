import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';

const SUBJECTS = ['Math', 'Science', 'English', 'History', 'HSPT', 'Other'];

export default function FinalsPage() {
  const navigate = useNavigate();
  const { getToken } = useAuth();

  const [step, setStep] = useState(1); // 1 = info, 2 = notes, 3 = generating, 4 = done
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [finalDate, setFinalDate] = useState('');
  const [whatsCovered, setWhatsCovered] = useState('');
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState(null); // { setId, plan }
  const [error, setError] = useState(null);

  async function generate() {
    if (!title.trim() || !notes.trim()) return;
    setStep(3);
    setError(null);
    try {
      const token = await getToken();

      // 1. Create the study set
      const setRes = await fetch(`${import.meta.env.VITE_API_URL}/api/sets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, subject, description: whatsCovered }),
      });
      const set = await setRes.json();
      if (!set.id) throw new Error('Set creation failed');

      // 2. Generate cards from notes
      const cardRes = await fetch(`${import.meta.env.VITE_API_URL}/api/generate/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notes, studySetId: set.id, count: 25 }),
      });
      const cardData = await cardRes.json();
      const cardCount = cardData.cards?.length || 0;

      // 3. Generate study plan if finalDate provided
      let plan = null;
      if (finalDate) {
        try {
          const planRes = await fetch(`${import.meta.env.VITE_API_URL}/api/generate/plan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              testDate: finalDate,
              testDescription: whatsCovered || title,
              sets: [{ id: set.id, title, cardCount, hardCount: 0 }],
            }),
          });
          const planData = await planRes.json();
          plan = planData.plan;
        } catch { /* plan is optional */ }
      }

      setResult({ setId: set.id, cardCount, plan });
      setStep(4);
    } catch {
      setError('Something went wrong. Try again.');
      setStep(2);
    }
  }

  const modeIcons = { flashcards: '🃏', quiz: '📝', test: '⏱️' };

  return (
    <div className="min-h-screen bg-slate-950 pb-10">
      <div className="sticky top-0 bg-slate-950/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center gap-3 z-10">
        <button onClick={() => navigate('/')} className="text-slate-400 hover:text-white">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-lg font-bold text-white">🎓 Finals Prep</h1>
          <p className="text-xs text-slate-400">Paste your notes — get cards + a study plan</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">

        {/* Step 3 — Generating */}
        {step === 3 && (
          <div className="flex flex-col items-center justify-center py-24 gap-6">
            <svg className="animate-spin w-12 h-12 text-indigo-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            <div className="text-center">
              <p className="text-white font-bold text-lg">Building your finals kit…</p>
              <p className="text-slate-400 text-sm mt-1">Generating flashcards + study plan from your notes</p>
            </div>
          </div>
        )}

        {/* Step 4 — Done */}
        {step === 4 && result && (
          <div className="space-y-5">
            <div className="text-center space-y-2 py-4">
              <p className="text-5xl">🎓</p>
              <p className="text-white font-black text-2xl">You're ready to study!</p>
              <p className="text-slate-400 text-sm">{result.cardCount} flashcards created from your notes</p>
            </div>

            <button
              onClick={() => navigate(`/sets/${result.setId}/flashcards`)}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl text-base transition-colors"
            >
              🃏 Start Studying Now
            </button>
            <button
              onClick={() => navigate(`/sets/${result.setId}`)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-3 rounded-2xl text-sm border border-slate-700 transition-colors"
            >
              View All Cards
            </button>

            {result.plan && (
              <div className="space-y-3">
                <p className="text-white font-black text-lg">📅 Your Study Plan</p>
                {result.plan.map((day, i) => (
                  <div key={day.day} className={`rounded-2xl border p-4 space-y-3 ${i === 0 ? 'bg-indigo-950/60 border-indigo-700/60' : 'bg-slate-900 border-slate-800'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {i === 0 && <span className="text-xs bg-indigo-600 text-white font-bold px-2 py-0.5 rounded-full">TODAY</span>}
                        <p className={`font-black ${i === 0 ? 'text-indigo-300' : 'text-white'}`}>Day {day.day} — {day.label}</p>
                      </div>
                      <span className="text-xs text-slate-400 bg-slate-800 px-3 py-1 rounded-full">~{day.totalMinutes} min</span>
                    </div>
                    <div className="space-y-2">
                      {day.tasks.map((task, j) => (
                        <div key={j} className="bg-slate-800/60 rounded-xl px-3 py-2.5 flex items-center gap-3">
                          <span className="text-lg">{modeIcons[task.mode] || '📖'}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-semibold truncate">{task.setTitle}</p>
                            <p className="text-slate-400 text-xs">{task.focus} · ~{task.minutes} min</p>
                          </div>
                          {task.setId && i === 0 && (
                            <button
                              onClick={() => navigate(`/sets/${task.setId}/${task.mode}`)}
                              className="flex-shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                            >
                              Start
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    {day.tip && <p className="text-xs text-slate-400 italic border-t border-slate-800 pt-2">💡 {day.tip}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Steps 1 & 2 — Form */}
        {(step === 1 || step === 2) && (
          <>
            {/* Set info */}
            <div className="space-y-3">
              <input
                type="text"
                placeholder="What subject / class? (e.g. AP Bio Unit 4)"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-base"
              />
              <input
                type="text"
                placeholder="What does the final cover? (e.g. chapters 1-5, cell division, genetics)"
                value={whatsCovered}
                onChange={e => setWhatsCovered(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
              />
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
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Final exam date (optional — for study plan)</p>
                <input
                  type="date"
                  value={finalDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={e => setFinalDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Paste your notes</p>
              <p className="text-xs text-slate-500">Copy from Google Docs, Google Classroom, your textbook, anywhere — paste it all here. AI will pull out the most important stuff.</p>
              <textarea
                placeholder="Paste everything here — class notes, assignment descriptions, textbook sections, study guides…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={12}
                className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none text-sm"
              />
            </div>

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <button
              onClick={generate}
              disabled={!title.trim() || !notes.trim()}
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white font-black py-4 rounded-2xl text-base transition-all flex items-center justify-center gap-2"
            >
              🎓 Build My Finals Kit
            </button>
          </>
        )}
      </div>
    </div>
  );
}
