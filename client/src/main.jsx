import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { ProblemsCatalog } from './pages/ProblemsCatalog';
import { ProblemWorkspace } from './pages/ProblemWorkspace';
import { Contests } from './pages/Contests';
import { ContestDetail } from './pages/ContestDetail';
import { ContestStandings } from './pages/ContestStandings';
import { Leaderboard } from './pages/Leaderboard';
import { Discuss } from './pages/Discuss';
import { Profile } from './pages/Profile';
import { Auth } from './pages/Auth';

import './styles.css';
import './catalog.css';

function AppLayout({ children }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/problems" element={<ProblemsCatalog />} />
            <Route path="/problems/:slug" element={<ProblemWorkspace />} />
            <Route path="/contests" element={<Contests />} />
            <Route path="/contests/:id" element={<ContestDetail />} />
            <Route path="/contests/:id/standings" element={<ContestStandings />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/discuss" element={<Discuss />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/u/:username" element={<Profile />} />
            <Route path="/login" element={<Auth register={false} />} />
            <Route path="/register" element={<Auth register={true} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </AuthProvider>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<App />);
}
