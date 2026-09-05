import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export function Leaderboard() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api.get('/leaderboard').then((r) => setRows(r.data)).catch(() => {});
  }, []);

  return (
    <section className="content page">
      <p className="eyebrow">COMMUNITY</p>
      <h1>Global Leaderboard</h1>
      <p className="muted">Scores are dynamically calculated from accepted submissions stored in MySQL.</p>

      <div className="table">
        {rows.length ? (
          rows.map((r, i) => (
            <div className="table-row" key={r.username || i}>
              <b>#{i + 1}</b>
              <span className="avatar">{r.name ? r.name[0].toUpperCase() : 'U'}</span>
              <Link
                to={`/profile/${encodeURIComponent(r.username)}`}
                style={{ color: 'inherit', textDecoration: 'none' }}
                title={`View ${r.username}'s profile`}
              >
                <strong style={{ cursor: 'pointer', transition: 'color 0.15s' }}>{r.username}</strong>
              </Link>
              <span>{r.solved} solved</span>
              <b>{r.score} pts</b>
            </div>
          ))
        ) : (
          <p className="empty">Be the first registered user to solve a challenge and enter the leaderboard!</p>
        )}
      </div>
    </section>
  );
}

