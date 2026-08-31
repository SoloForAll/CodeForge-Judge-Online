import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Code2, Trophy, Users, CheckCircle2, ChevronRight, Terminal } from 'lucide-react';
import api from '../api';

const difficultyClass = (d) => (d ? d.toLowerCase() : 'easy');

export function HomePage() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    api.get('/problems').then((r) => setItems(r.data)).catch(() => {});
  }, []);

  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">PRACTICE. COMPETE. IMPROVE.</p>
          <h1>Build your problem-solving edge.</h1>
          <p className="muted">
            Solve curated algorithmic challenges, test code live in an isolated Docker sandbox, and climb the leaderboard.
          </p>
          <div className="hero-actions">
            <Link className="button" to="/problems">
              Start solving <ChevronRight size={18} />
            </Link>
            <Link className="ghost" to="/leaderboard">
              View leaderboard
            </Link>
          </div>
        </div>
        <div className="stat-panel">
          <Terminal size={29} />
          <strong>{items.length || 4}</strong>
          <span>curated challenges</span>
          <div className="bar"><i /></div>
          <small>Your next accepted solution starts here.</small>
        </div>
      </section>

      <section className="metrics">
        <div><b>{items.length || 4}+</b><span>Problems</span></div>
        <div><b>1,200+</b><span>Active Coders</span></div>
        <div><b>45,000+</b><span>Submissions Judged</span></div>
        <div><b>36</b><span>Contests Hosted</span></div>
      </section>

      <section className="why">
        <h2>Why CodeForge</h2>
        <div className="why-grid">
          <article>
            <Code2 />
            <h3>Monaco IDE Experience</h3>
            <p>Write solutions with full VS Code syntax highlighting, autocomplete, and indentation.</p>
          </article>
          <article>
            <Trophy />
            <h3>Contests & Rankings</h3>
            <p>Compete in timed algorithmic contests and track real-time global ratings.</p>
          </article>
          <article>
            <Users />
            <h3>Community Discussions</h3>
            <p>Share optimal $O(n)$ approaches, hints, and learn from other engineers.</p>
          </article>
          <article>
            <CheckCircle2 />
            <h3>Async Sandbox Judge</h3>
            <p>Non-blocking worker queue with live Server-Sent Events progress tracking.</p>
          </article>
        </div>
      </section>

      <section id="list" className="content">
        <div className="section-title">
          <div>
            <p className="eyebrow">PROBLEM LIBRARY</p>
            <h2>Choose a challenge</h2>
          </div>
          <span className="muted">{items.length} problems</span>
        </div>
        <div className="problem-list">
          {items.map((p) => (
            <Link to={`/problems/${p.slug}`} className="problem-card" key={p.id}>
              <div className={`difficulty ${difficultyClass(p.difficulty)}`}>{p.difficulty}</div>
              <div className="problem-main">
                <h3>{p.title}</h3>
                <p>{p.tags}</p>
              </div>
              <div className="solved">
                <CheckCircle2 size={16} />
                {p.solved_count} solved
              </div>
              <ChevronRight className="arrow" />
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

