import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <h1 className="text-2xl font-black text-indigo-400">⚡ PeakPrep</h1>
        <div className="flex gap-3">
          <button onClick={() => navigate('/sign-in')} className="text-slate-300 hover:text-white px-4 py-2 text-sm font-medium">Sign In</button>
          <button onClick={() => navigate('/sign-up')} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors">Get Started Free</button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-8 py-20">
        <div className="space-y-4 max-w-2xl">
          <div className="inline-block bg-indigo-900/40 border border-indigo-700/50 text-indigo-300 text-xs font-semibold px-3 py-1.5 rounded-full uppercase tracking-wider">AI-Powered Study Tool</div>
          <h2 className="text-5xl font-black text-white leading-tight">
            Study smarter.<br /><span className="text-indigo-400">Score higher.</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-lg mx-auto">Paste your notes and let AI generate flashcards and quizzes instantly. Built for students who want to actually retain what they study.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={() => navigate('/sign-up')} className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-lg px-8 py-4 rounded-2xl transition-colors">Start Studying Free →</button>
          <button onClick={() => navigate('/sign-in')} className="bg-slate-800 hover:bg-slate-700 text-white font-semibold text-lg px-8 py-4 rounded-2xl border border-slate-700 transition-colors">Sign In</button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full mt-8">
          {[
            { icon: '🤖', title: 'AI Flashcards', desc: 'Paste your notes, get instant flashcards' },
            { icon: '📝', title: 'Practice Quizzes', desc: 'Multiple choice questions with explanations' },
            { icon: '🧠', title: 'Spaced Repetition', desc: 'Hard cards come back more often' },
          ].map(f => (
            <div key={f.title} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-left">
              <div className="text-3xl mb-2">{f.icon}</div>
              <p className="text-white font-bold text-sm">{f.title}</p>
              <p className="text-slate-400 text-xs mt-1">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
