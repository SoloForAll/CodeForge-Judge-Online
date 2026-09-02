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


class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('React Error caught by ErrorBoundary:', error, info);
    this.setState({ info });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', color: '#f08e85', background: '#181818', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h2 style={{ color: '#ffa51d' }}>⚠️ Something went wrong in CodeForge React App</h2>
          <pre style={{ background: '#242424', padding: '16px', borderRadius: '8px', color: '#ff8c8c', overflowX: 'auto' }}>
            {this.state.error?.toString()}
          </pre>
          <pre style={{ background: '#1f1f1f', padding: '16px', borderRadius: '8px', color: '#aaa', overflowX: 'auto', fontSize: '12px' }}>
            {this.state.info?.componentStack || this.state.error?.stack}
          </pre>
          <button
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            style={{ marginTop: '16px', padding: '10px 18px', background: '#ffa51d', color: '#000', border: 0, borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Clear Local Cache & Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}


const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<App />);
}
