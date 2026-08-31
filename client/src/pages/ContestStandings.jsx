import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Trophy, Clock3, ArrowLeft, RefreshCw, Award } from 'lucide-react';
import api from '../api';

export function ContestStandings() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStandings = () => {
    setRefreshing(true);
    api.get(`/contests/${id}/standings`)
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    fetchStandings();
    const timer = setInterval(fetchStandings, 15000); // 15s auto-refresh
    return () => clearInterval(timer);
  }, [id]);

  if (loading) {
    return <div className="loading-state">Loading live standings…</div>;
  }

  if (!data || !data.contest) {
    return (
      <div className="content page">
        <div className="empty">
          <h2>Standings not available for Contest #{id}</h2>
          <Link to="/contests" className="button small" style={{ marginTop: '16px' }}>Back to Contests</Link>
        </div>
      </div>
    );
  }

  const { contest, problems, standings } = data;

  const getRankBadgeClass = (rank) => {
    if (rank === 1) return 'rank-1';
    if (rank === 2) return 'rank-2';
    if (rank === 3) return 'rank-3';
    return '';
  };

  return (
    <section className="content page standings-page">
      <div className="standings-top-nav">
        <Link className="back" to={`/contests/${id}`}>
          <ArrowLeft size={16} /> Back to Contest Overview
        </Link>

        <button
          className="button small ghost-btn"
          onClick={fetchStandings}
          disabled={refreshing}
        >
          <RefreshCw size={14} className={refreshing ? 'icon-spin' : ''} /> Refresh Standings
        </button>
      </div>

      <div className="section-title" style={{ marginBottom: '24px' }}>
        <div>
          <p className="eyebrow">LIVE SCOREBOARD</p>
          <h1>{contest.title} Standings</h1>
          <p className="muted">Rankings update dynamically in real time based on ICPC penalty rules.</p>
        </div>
        <span className="muted">{standings.length} Competitors</span>
      </div>

      <div className="standings-table-wrap">
        <table className="standings-table">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>Rank</th>
              <th>Competitor</th>
              <th style={{ width: '100px' }}>Score</th>
              <th style={{ width: '100px' }}>Penalty</th>
              {problems.map((p) => (
                <th key={p.id} className="th-problem">
                  <div><b>{p.letter_order}</b></div>
                  <small>{p.points} pts</small>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {standings.length ? (
              standings.map((user) => (
                <tr key={user.userId}>
                  <td>
                    <span className={`standings-rank ${getRankBadgeClass(user.rank)}`}>
                      {user.rank <= 3 ? <Award size={14} /> : null}
                      #{user.rank}
                    </span>
                  </td>

                  <td>
                    <Link to={`/u/${user.username}`} className="standings-user-cell">
                      <span className="avatar-mini">{user.name ? user.name[0].toUpperCase() : 'U'}</span>
                      <strong>{user.username}</strong>
                    </Link>
                  </td>

                  <td className="standings-score-cell">
                    <b>{user.totalScore}</b>
                  </td>

                  <td className="standings-penalty-cell">
                    {user.totalPenalty}m
                  </td>

                  {problems.map((p) => {
                    const prob = user.problems[p.id];
                    if (!prob || prob.attempts === 0) {
                      return <td key={p.id} className="standings-cell-empty">-</td>;
                    }

                    if (prob.solved) {
                      return (
                        <td key={p.id} className="standings-cell-solved">
                          <span className="matrix-badge solved">
                            +{prob.attempts}
                            <small>{prob.penalty}m</small>
                          </span>
                        </td>
                      );
                    }

                    return (
                      <td key={p.id} className="standings-cell-failed">
                        <span className="matrix-badge failed">
                          -{prob.attempts}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4 + problems.length} className="empty">
                  No submissions have been recorded yet for this contest.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

