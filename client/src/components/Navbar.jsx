import React from 'react';
import { Link } from 'react-router-dom';
import { Code2, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header>
      <Link className="brand" to="/">
        <span><Code2 size={23} /></span>Code<span className="brand-accent">Forge</span>
      </Link>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/problems">Problems</Link>
        <Link to="/contests">Contests</Link>
        <Link to="/leaderboard">Leaderboard</Link>
        <Link to="/discuss">Discuss</Link>
      </nav>
      <div className="account">
        {user ? (
          <>
            <Link to="/profile" className="account-user-link">
              <span className="avatar">{user.name ? user.name[0].toUpperCase() : 'U'}</span>
              <span>{user.username}</span>
            </Link>
            <button className="linkbutton" onClick={logout}>
              <LogOut size={16} /> Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Log in</Link>
            <Link className="button small" to="/register">Register</Link>
          </>
        )}
      </div>
    </header>
  );
}

