import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Trophy, CheckCircle2, Award, Calendar, FileCode, Check, ArrowRight } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { SubmissionHeatmap } from '../components/SubmissionHeatmap';
import { CodeModal } from '../components/CodeModal';

const difficultyClass = (d) => (d ? d.toLowerCase() : 'easy');

export function Profile() {
  const { username: paramUsername } = useParams();
  const { user: authUser } = useAuth();

  const decodedParam = paramUsername ? (() => {
    try { return decodeURIComponent(paramUsername); } catch { return paramUsername; }
  })() : null;

  const targetUsername = decodedParam || authUser?.username;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSubId, setSelectedSubId] = useState(null);

  useEffect(() => {
    if (!targetUsername && !authUser) {
      setLoading(false);
      return;
    }

    setLoading(true);
    // When visiting /profile as authenticated user, use /users/me/profile directly
    const url = !decodedParam && authUser
      ? '/users/me/profile'
      : `/users/${encodeURIComponent(targetUsername)}/profile`;

    api.get(url)
      .then((r) => {
        setProfile(r.data);
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [decodedParam, targetUsername, authUser]);

  if (!targetUsername && !authUser) {
    return (
      <div className="content page">
        <div className="auth-card centered" style={{ margin: '60px auto' }}>
          <h2>Sign in to view your profile</h2>
          <p className="muted">Track your problem solving statistics, submission history, and global rank.</p>
          <Link className="button full" to="/login">Log in</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="loading-state">Loading user profile…</div>;
  }

  if (!profile) {
    return (
      <div className="content page">
        <div className="empty">
          <h2>User @{targetUsername} not found</h2>
          <Link to="/leaderboard" className="button small" style={{ marginTop: '16px' }}>View Leaderboard</Link>
        </div>
      </div>
    );
  }

  const { user, stats, activity, recentSubmissions } = profile;
  const isOwnProfile = authUser?.username === user.username;

  return (
    <section className="content page profile-page">
      {/* Profile Header */}
      <div className="profile-header-card">
        <div className="profile-avatar-large">
          {user.name ? user.name[0].toUpperCase() : 'U'}
        </div>
        <div className="profile-info">
          <div className="profile-title-row">
            <h1>{user.name}</h1>
            <span className="profile-badge">
              <Trophy size={15} /> {stats.score} pts
            </span>
          </div>
          <p className="profile-username">@{user.username}</p>
          <p className="profile-joined">
            <Calendar size={15} /> Joined {new Date(user.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Solving Statistics Grid */}
      <div className="profile-stats-grid">
        {/* Total Solved Card */}
        <div className="profile-card solved-overview-card">
          <h3>Problems Solved</h3>
          <div className="solved-big-number">
            <strong>{stats.solved.Total}</strong>
            <span>/ {stats.totals.Total}</span>
          </div>
          <div className="solved-progress-bar">
            <div
              className="solved-progress-fill"
              style={{
                width: `${stats.totals.Total > 0 ? (stats.solved.Total / stats.totals.Total) * 100 : 0}%`
              }}
            />
          </div>

          <div className="difficulty-breakdown">
            <div className="diff-row">
              <span className="diff-label easy">Easy</span>
              <div className="diff-bar-wrap">
                <div
                  className="diff-bar-fill easy-fill"
                  style={{
                    width: `${stats.totals.Easy > 0 ? (stats.solved.Easy / stats.totals.Easy) * 100 : 0}%`
                  }}
                />
              </div>
              <span className="diff-count">{stats.solved.Easy} / {stats.totals.Easy}</span>
            </div>

            <div className="diff-row">
              <span className="diff-label medium">Medium</span>
              <div className="diff-bar-wrap">
                <div
                  className="diff-bar-fill medium-fill"
                  style={{
                    width: `${stats.totals.Medium > 0 ? (stats.solved.Medium / stats.totals.Medium) * 100 : 0}%`
                  }}
                />
              </div>
              <span className="diff-count">{stats.solved.Medium} / {stats.totals.Medium}</span>
            </div>

            <div className="diff-row">
              <span className="diff-label hard">Hard</span>
              <div className="diff-bar-wrap">
                <div
                  className="diff-bar-fill hard-fill"
                  style={{
                    width: `${stats.totals.Hard > 0 ? (stats.solved.Hard / stats.totals.Hard) * 100 : 0}%`
                  }}
                />
              </div>
              <span className="diff-count">{stats.solved.Hard} / {stats.totals.Hard}</span>
            </div>
          </div>
        </div>

        {/* Submissions Stats Card */}
        <div className="profile-card sub-stats-card">
          <h3>Submission Analytics</h3>
          <div className="stats-metric-grid">
            <div className="metric-box">
              <span>Total Submissions</span>
              <b>{stats.totalSubmissions}</b>
            </div>
            <div className="metric-box">
              <span>Accepted Solutions</span>
              <b className="text-success">{stats.totalAccepted}</b>
            </div>
            <div className="metric-box">
              <span>Acceptance Rate</span>
              <b className="text-pending">{stats.acceptanceRate}%</b>
            </div>
            <div className="metric-box">
              <span>Community Rank</span>
              <b>Top 10%</b>
            </div>
          </div>
        </div>
      </div>

      {/* 365-Day Activity Heatmap */}
      <SubmissionHeatmap activity={activity} />

      {/* Recent Submissions Table */}
      <div className="recent-submissions-card">
        <div className="section-title" style={{ marginBottom: '16px' }}>
          <div>
            <h3>Recent Submissions</h3>
            <p className="muted">Click any submission to inspect your saved code.</p>
          </div>
        </div>

        {recentSubmissions && recentSubmissions.length ? (
          <div className="table">
            {recentSubmissions.map((s) => (
              <div
                className="table-row sub-row-clickable"
                key={s.id}
                onClick={() => setSelectedSubId(s.id)}
              >
                <div className={`difficulty ${difficultyClass(s.difficulty)}`}>{s.difficulty}</div>
                <div className="sub-col-title">
                  <strong>{s.problem_title}</strong>
                  <span className="sub-lang-pill">{s.language}</span>
                </div>
                <div className={s.verdict === 'Accepted' ? 'text-success' : 'text-danger'}>
                  {s.verdict}
                </div>
                <div className="sub-time">
                  {s.runtime_ms ? `${s.runtime_ms} ms` : '-'}
                </div>
                <div className="sub-action">
                  <button className="button small ghost-btn">
                    <FileCode size={14} /> View Code
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">No submissions recorded yet.</div>
        )}
      </div>

      {/* Code Modal */}
      {selectedSubId && (
        <CodeModal
          submissionId={selectedSubId}
          onClose={() => setSelectedSubId(null)}
        />
      )}
    </section>
  );
}

