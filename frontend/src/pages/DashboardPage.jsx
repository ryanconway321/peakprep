import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useUser, UserButton } from '@clerk/clerk-react';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { user } = useUser();
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/sets`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setSets(data);
      } catch {}
      setLoading(false);
    }
    load();
  }, [getToken]);

  const SUBJECTS = ['Math', 'Science', 'English', 'History', 'HSPT', 'Other'];
  const subjectColors = { Math: 'from-blue-600 to-blue-800', Science: 'from-green-600 to-emerald-800', English: 'from-purple-600 to-purple-800', History: 'from-amber-600 to-orange-800', HSPT: 'from-indigo-600 to-indigo-800', Other: 'from-slate-600 to-slate-800' };

  return (
    <div className="min-h-screen bg-slate-950 pb-10">
      {/* Header */}
      <div className="bg-slate-950 border-b border-slate-800 px-5 py-4 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-xl font-black text-indigo-400">⚡ PeakPrep</h1>
        <div className="flex items-center gap-3">
          <span className="text-slate-400 text-sm hidden sm:block">Hey, {user?.firstName || 'there'} 👋</span>
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
        {/* Create new set */}
        <button
          onClick={() => navigate('/sets/new')}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-base transition-colors"
        >
          <span className="text-xl">+</span> Create Study Set
        </button>

        {/* Study sets */}
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Your Study Sets</h2>
          {loading ? (
            <div className="text-center py-12 text-slate-500">Loading...</div>
          ) : sets.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <p className="text-4xl">📚</p>
              <p className="text-slate-400">No study sets yet. Create your first one!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sets.map(set => (
                <button
                  key={set.id}
                  onClick={() => navigate(`/sets/${set.id}`)}
                  className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 text-left transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold truncate">{set.title}</p>
                      {set.description && <p className="text-slate-400 text-sm mt-0.5 truncate">{set.description}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {set.subject && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-gradient-to-r ${subjectColors[set.subject] || subjectColors.Other} text-white`}>
                          {set.subject}
                        </span>
                      )}
                      <span className="text-slate-500 text-xs">{set._count?.cards || 0} cards</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
