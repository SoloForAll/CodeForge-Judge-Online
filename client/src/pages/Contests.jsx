import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Clock3, Users, ChevronRight, CheckCircle2 } from 'lucide-react';
import api from '../api';

export function Contests() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    api.get('/contests').then((r) => setItems(r.data)).catch(() => {});
  }, []);

  return (
    <section className="content page">
      <p className="eyebrow">COMPETE</p>
      <h1>Upcoming & Active Contests</h1>
      <p className="muted">Test your speed, algorithm accuracy, and ranking against global competitors.</p>

      <div className="contest-grid">
        {items.map((c) => (
          <article className="contest" key={c.id}>
            <div className="contest-icon">
              <Trophy />
            </div>
            <span className="pill">{c.status}</span>
            <h2>{c.title}</h2>
            <p>
              <Clock3 size={17} />
              {new Date(c.starts_at).toLocaleString()}
            </p>
            <p>
              <Users size={17} />
              {c.registered_count || 0} registered · {c.duration_minutes} minutes
            </p>
            <Link
              to={`/contests/${c.id}`}
              className="button small"
              style={{ width: '100%', marginTop: '16px', justifyContent: 'center' }}
            >
              Enter Contest <ChevronRight size={15} />
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

