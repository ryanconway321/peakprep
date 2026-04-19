import { Routes, Route } from 'react-router-dom';
import { SignIn, SignUp, SignedIn, SignedOut, useUser } from '@clerk/clerk-react';
import { useEffect } from 'react';
import LandingPage from './pages/LandingPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import StudySetPage from './pages/StudySetPage.jsx';
import FlashcardsPage from './pages/FlashcardsPage.jsx';
import QuizPage from './pages/QuizPage.jsx';
import NewSetPage from './pages/NewSetPage.jsx';
import TestModePage from './pages/TestModePage.jsx';
import FinalsPage from './pages/FinalsPage.jsx';
import WorkoutStudyPage from './pages/WorkoutStudyPage.jsx';

function SyncUser() {
  const { user } = useUser();
  useEffect(() => {
    if (!user) return;
    fetch(`${import.meta.env.VITE_API_URL}/api/me/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.primaryEmailAddress?.emailAddress, name: user.fullName }),
    }).catch(() => {});
  }, [user]);
  return null;
}

const AUTH_WRAP = (title) => (
  <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4">
    <h1 className="text-3xl font-black text-indigo-400 mb-8">⚡ PeakPrep</h1>
    {title}
  </div>
);

export default function App() {
  return (
    <>
      <SignedIn><SyncUser /></SignedIn>
      <Routes>
        <Route path="/" element={<><SignedIn><DashboardPage /></SignedIn><SignedOut><LandingPage /></SignedOut></>} />
        <Route path="/sign-in/*" element={AUTH_WRAP(<SignIn routing="path" path="/sign-in" afterSignInUrl="/" />)} />
        <Route path="/sign-up/*" element={AUTH_WRAP(<SignUp routing="path" path="/sign-up" afterSignUpUrl="/" />)} />
        <Route path="/sets/new" element={<SignedIn><NewSetPage /></SignedIn>} />
        <Route path="/sets/:id" element={<SignedIn><StudySetPage /></SignedIn>} />
        <Route path="/sets/:id/flashcards" element={<SignedIn><FlashcardsPage /></SignedIn>} />
        <Route path="/sets/:id/quiz" element={<SignedIn><QuizPage /></SignedIn>} />
        <Route path="/sets/:id/test" element={<SignedIn><TestModePage /></SignedIn>} />
        <Route path="/finals" element={<SignedIn><FinalsPage /></SignedIn>} />
        <Route path="/sets/:id/workout" element={<SignedIn><WorkoutStudyPage /></SignedIn>} />
      </Routes>
    </>
  );
}
