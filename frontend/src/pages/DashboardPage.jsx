import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useUser, UserButton } from '@clerk/clerk-react';
import { useNotifications } from '../hooks/useNotifications';

const subjectColors = {
  Math: 'from-blue-600 to-blue-800',
  Science: 'from-green-600 to-emerald-800',
  English: 'from-purple-600 to-purple-800',
  History: 'from-amber-600 to-orange-800',
  HSPT: 'from-indigo-600 to-indigo-800',
  Other: 'from-slate-600 to-slate-800',
};

const subjectBorders = {
  Math: 'border-blue-700', Science: 'border-green-700', English: 'border-purple-700',
  History: 'border-amber-700', HSPT: 'border-indigo-700', Other: 'border-slate-700',
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { user } = useUser();
  const [reminderHour, setReminderHour] = useState(19);
  const { supported, subscribed, loading: notifLoading, subscribe, unsubscribe, updateReminderHour } = useNotifications(getToken);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('today'); // today | plan | sets
  const [plan, setPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [testDate, setTestDate] = useState('');
  const [testDescription, setTestDescription] = useState('');
  const [selectedSets, setSelectedSets] = useState([]);
  const [planError, setPlanError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/me/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(await res.json());
      } catch {}
      setLoading(false);
    }
    load();
  }, [getToken]);

  async function generatePlan() {
    if (!testDate || !selectedSets.length || !data) return;
    setPlanLoading(true);
    setPlanError(null);
    setPlan(null);
    try {
      const token = await getToken();
      const sets = selectedSets.map(id => {
        const s = (data.sets || []).find(x => x.id === id);
        const due = (data.dueCards || []).find(d => d.setId === id);
        return { id, title: s.title, cardCount: s._count?.cards || 0, hardCount: due?.count || 0 };
      });
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/generate/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ testDate, testDescription, sets }),
      });
      if (!res.ok) throw new Error();
      const result = await res.json();
      setPlan(result.plan);
    } catch {
      setPlanError('Could not generate plan. Try again.');
    }
    setPlanLoading(false);
  }

  function toggleSet(id) {
    setSelectedSets(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-screen bg-slate-950 pb-10">
      {/* Header */}
      <div className="bg-slate-950 border-b border-slate-800 px-5 py-4 flex items-center justify-between sticky top-0 z-10 backdrop-blur">
        <h1 className="text-xl font-black text-indigo-400">⚡ PeakPrep</h1>
        <UserButton afterSignOutUrl="/" />
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-5 space-y-5">
        {/* Greeting */}
        <div>
          <p className="text-slate-400 text-sm">{greeting},</p>
          <p className="text-2xl font-black text-white">{user?.firstName || 'Student'} 👋</p>
        </div>

        {/* Stats row */}
        {!loading && data && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <p className="text-3xl font-black text-orange-400">{data.streak}</p>
              <p className="text-xs text-slate-400 mt-0.5">Day Streak 🔥</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <p className="text-3xl font-black text-indigo-400">{data.totalDue}</p>
              <p className="text-xs text-slate-400 mt-0.5">Due Today</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <p className="text-3xl font-black text-green-400">{data.retention ?? '—'}%</p>
              <p className="text-xs text-slate-400 mt-0.5">Retention</p>
            </div>
          </div>
        )}

        {/* Today's study plan */}
        {!loading && data?.totalDue > 0 && (
          <div className="bg-gradient-to-br from-indigo-900/50 to-violet-900/50 border border-indigo-700/50 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-white font-bold">📅 Study Plan for Today</p>
              <span className="text-xs text-indigo-300 bg-indigo-900/60 px-2 py-1 rounded-full">{data.totalDue} cards due</span>
            </div>
            <p className="text-slate-300 text-xs">These cards are scheduled for review today based on spaced repetition. Study them now to stay on track.</p>
            <div className="space-y-2">
              {data.dueCards.map(d => (
                <button
                  key={d.setId}
                  onClick={() => navigate(`/sets/${d.setId}/flashcards`)}
                  className="w-full bg-slate-900/70 hover:bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {d.subject && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${subjectColors[d.subject] || subjectColors.Other} text-white`}>
                        {d.subject}
                      </span>
                    )}
                    <p className="text-white text-sm font-medium truncate">{d.setTitle}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-orange-400 text-sm font-bold">{d.count}</span>
                    <span className="text-slate-500 text-xs">due</span>
                    <span className="text-indigo-400 text-sm">→</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {!loading && data?.totalDue === 0 && data?.sets?.length > 0 && (
          <div className="bg-green-900/20 border border-green-700/40 rounded-2xl p-4 text-center space-y-1">
            <p className="text-2xl">✅</p>
            <p className="text-green-400 font-bold">All caught up for today!</p>
            <p className="text-slate-400 text-sm">No cards due right now. Come back tomorrow or study ahead.</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex rounded-xl bg-slate-900 border border-slate-800 p-1">
          {[{ id: 'today', label: '📚 Sets' }, { id: 'plan', label: '📅 Plan' }, { id: 'hspt', label: '🎯 HSPT' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === t.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Create new set / Finals prep */}
        <div className="flex gap-2">
          <button onClick={() => navigate('/sets/new')}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm transition-colors">
            + New Set
          </button>
          <button onClick={() => navigate('/finals')}
            className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm transition-colors">
            🎓 Finals Prep
          </button>
        </div>

        {/* Study sets list */}
        {tab === 'today' && (
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-12 text-slate-500">Loading...</div>
            ) : data?.sets?.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <p className="text-4xl">📚</p>
                <p className="text-slate-400">No study sets yet. Create your first one!</p>
              </div>
            ) : (
              data?.sets?.map(set => (
                <button key={set.id} onClick={() => navigate(`/sets/${set.id}`)}
                  className={`w-full bg-slate-900 hover:bg-slate-800 border rounded-2xl p-4 text-left transition-all ${subjectBorders[set.subject] || 'border-slate-800'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold truncate">{set.title}</p>
                      {set.description && <p className="text-slate-400 text-sm mt-0.5 truncate">{set.description}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      {set.subject && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-gradient-to-r ${subjectColors[set.subject] || subjectColors.Other} text-white`}>
                          {set.subject}
                        </span>
                      )}
                      <div className="flex gap-2">
                        {(data.dueCards || []).find(d => d.setId === set.id) && (
                          <span className="text-xs text-orange-400 font-bold">
                            {(data.dueCards || []).find(d => d.setId === set.id).count} due
                          </span>
                        )}
                        <span className="text-slate-500 text-xs">{set._count?.cards || 0} cards</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* Study Plan */}
        {tab === 'plan' && (
          <div className="space-y-4 pb-4">
            {!plan ? (
              <>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <p className="text-white font-bold text-sm">📅 When is your test?</p>
                  <input
                    type="date"
                    value={testDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={e => setTestDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="What's the test on? (e.g. Latin declensions, chapters 1-3)"
                    value={testDescription}
                    onChange={e => setTestDescription(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {data?.sets?.length > 0 && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <p className="text-white font-bold text-sm">📚 Which sets are you studying?</p>
                    <div className="space-y-2">
                      {data.sets.map(s => (
                        <button key={s.id} onClick={() => toggleSet(s.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors text-left ${
                            selectedSets.includes(s.id)
                              ? 'bg-indigo-900/40 border-indigo-600 text-white'
                              : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                          }`}>
                          <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            selectedSets.includes(s.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-600'
                          }`}>
                            {selectedSets.includes(s.id) && <span className="text-white text-xs">✓</span>}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{s.title}</p>
                            <p className="text-xs text-slate-500">{s._count?.cards || 0} cards{s.subject ? ` · ${s.subject}` : ''}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {planError && <p className="text-red-400 text-sm text-center">{planError}</p>}

                <button
                  onClick={generatePlan}
                  disabled={!testDate || !selectedSets.length || planLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors"
                >
                  {planLoading ? (
                    <><svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>Building your plan…</>
                  ) : '✨ Build My Study Plan'}
                </button>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-white font-black text-lg">Your Study Plan</p>
                  <button onClick={() => { setPlan(null); setSelectedSets([]); setTestDate(''); }}
                    className="text-slate-400 hover:text-white text-sm">Start Over</button>
                </div>

                {plan.map((day, i) => {
                  const isToday = i === 0;
                  const modeIcons = { flashcards: '🃏', quiz: '📝', test: '⏱️' };
                  return (
                    <div key={day.day} className={`rounded-2xl border p-4 space-y-3 ${
                      isToday ? 'bg-indigo-950/60 border-indigo-700/60' : 'bg-slate-900 border-slate-800'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            {isToday && <span className="text-xs bg-indigo-600 text-white font-bold px-2 py-0.5 rounded-full">TODAY</span>}
                            <p className={`font-black ${isToday ? 'text-indigo-300' : 'text-white'}`}>Day {day.day} — {day.label}</p>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{day.date}</p>
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
                            {task.setId && isToday && (
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

                      {day.tip && (
                        <p className="text-xs text-slate-400 italic border-t border-slate-800 pt-2">💡 {day.tip}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* HSPT Prep */}
        {tab === 'hspt' && (
          <div className="space-y-3">
            <p className="text-slate-400 text-sm">Pre-built study sets for every HSPT section. Click to start studying immediately.</p>
            {[
              { title: 'HSPT Verbal Skills', desc: 'Analogies, synonyms, antonyms, logic', emoji: '📖', section: 'Verbal' },
              { title: 'HSPT Quantitative Skills', desc: 'Number series, geometric comparison, non-verbal reasoning', emoji: '🔢', section: 'Quantitative' },
              { title: 'HSPT Reading', desc: 'Comprehension, vocabulary in context', emoji: '📚', section: 'Reading' },
              { title: 'HSPT Mathematics', desc: 'Arithmetic, algebra, geometry, problem solving', emoji: '📐', section: 'Math' },
              { title: 'HSPT Language Skills', desc: 'Grammar, punctuation, capitalization, spelling', emoji: '✍️', section: 'Language' },
            ].map(s => (
              <button key={s.section} onClick={() => navigate(`/hspt/${s.section.toLowerCase()}`)}
                className="w-full bg-slate-900 hover:bg-slate-800 border border-indigo-800/50 rounded-2xl p-4 text-left transition-all">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{s.emoji}</span>
                  <div>
                    <p className="text-white font-bold text-sm">{s.title}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{s.desc}</p>
                  </div>
                  <span className="ml-auto text-indigo-400">→</span>
                </div>
              </button>
            ))}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <p className="text-slate-400 text-sm">🚧 HSPT content coming soon — create your own sets in the meantime!</p>
            </div>
          </div>
        )}

        {/* Notification settings */}
        <div className="px-4 pb-10 mt-4">
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
            <h3 className="text-white font-bold mb-1">🔔 Study Reminders</h3>
            <p className="text-slate-400 text-sm mb-4">Get a daily push notification to remind you to review your cards.</p>
            {!supported ? (
              <p className="text-slate-500 text-sm">Not supported on this browser.</p>
            ) : subscribed ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <label className="text-slate-300 text-sm">Remind me at</label>
                  <select
                    value={reminderHour}
                    onChange={e => { const h = parseInt(e.target.value); setReminderHour(h); updateReminderHour(h); }}
                    className="bg-slate-700 text-white text-sm rounded-lg px-3 py-1.5 border border-slate-600"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}</option>
                    ))}
                  </select>
                </div>
                <button onClick={unsubscribe} disabled={notifLoading}
                  className="w-full py-2.5 rounded-xl border border-red-800 text-red-400 hover:bg-red-950 text-sm font-bold transition-colors disabled:opacity-50">
                  {notifLoading ? 'Turning off…' : 'Turn Off Notifications'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <label className="text-slate-300 text-sm">Remind me at</label>
                  <select
                    value={reminderHour}
                    onChange={e => setReminderHour(parseInt(e.target.value))}
                    className="bg-slate-700 text-white text-sm rounded-lg px-3 py-1.5 border border-slate-600"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}</option>
                    ))}
                  </select>
                </div>
                <button onClick={() => subscribe(reminderHour)} disabled={notifLoading}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-colors disabled:opacity-50">
                  {notifLoading ? 'Enabling…' : 'Enable Notifications'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
