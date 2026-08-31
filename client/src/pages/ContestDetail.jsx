import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Trophy, Clock3, Users, ChevronRight, Check, ArrowLeft, BarChart2 } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { ContestTimer } from '../components/ContestTimer';

const difficultyClass = (d) => (d ? d.toLowerCase() : 'easy');

export function ContestDetail() {
  const { id } = useParams();
  const { user } = useAuth();

  const [contest, setContest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);

  const fetchContest = () => {
    setLoading(true);
    api.get(`/contests/${id}`)
      .then((r) => setContest(r.data))
      .catch(() => setContest(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchContest();
  }, [id, user]);

  const handleRegister = async () => {
    if (!user) {
      alert('Please log in to register for this contest.');
      return;
    }
    setRegistering(true);
    try {
      await api.post(`/contests/${id}/register`);
      setRegSuccess(true);
      fetchContest();
    } catch (e) {
      alert(e.response?.data?.message || 'Registration failed.');
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return <div className="loading-state">Loading contest details…</div>;
  }

  if (!contest) {
    return (
      <div className="content page">
        <div className="empty">
          <h2>Contest #{id} not found</h2>
          <Link to="/contests" className="button small" style={{ marginTop: '16px' }}>Back to Contests</Link>
        </div>
      </div>
    );
  }

  const isLive = new Date(contest.starts_at) <= new Date() && new Date() < (new Date(contest.starts_at).getTime() + contest.duration_minutes * 60000);

  return (
    <section className="content page contest-detail-page">
      <Link className="back" to="/contests">
        <ArrowLeft size={16} /> Back to all contests
      </Link>

      <div className="contest-header-wrap">
        <div>
          <p className="eyebrow">CONTEST #{contest.id}</p>
          <h1>{contest.title}</h1>
          <div className="contest-meta-chips">
            <span><Clock3 size={15} /> {new Date(contest.starts_at).toLocaleString()}</span>
            <span><Users size={15} /> {contest.registered_count} Registered Coders</span>
            <span>⏱ {contest.duration_minutes} Minutes</span>
          </div>
        </div>

        <div className="contest-action-btns">
          <Link to={`/contests/${id}/standings`} className="button ghost-btn">
            <BarChart2 size={16} /> View Standings
          </Link>

          {contest.isRegistered || regSuccess ? (
            <div className="registered-badge">
              <Check size={16} /> Registered
            </div>
          ) : (
            <button
              className="button"
              onClick={handleRegister}
              disabled={registering}
            >
              {registering ? 'Registering...' : 'Register for Contest'}
            </button>
          )}
        </div>
      </div>

      {/* Countdown Timer */}
      <ContestTimer
        startsAt={contest.starts_at}
        durationMinutes={contest.duration_minutes}
      />

      {/* Contest Problems List */}
      <div className="contest-section-block">
        <div className="section-title">
          <div>
            <h2>Contest Problem Set</h2>
            <p className="muted">Solve challenges in any order. Score points for accepted solutions.</p>
          </div>
          <span className="muted">{contest.problems?.length || 0} Problems</span>
        </div>

        <div className="problem-list">
          {contest.problems && contest.problems.length ? (
            contest.problems.map((p) => (
              <Link to={`/problems/${p.slug}`} className="problem-card contest-prob-card" key={p.id}>
                <span className="contest-letter-badge">{p.letter_order}</span>
                <div className={`difficulty ${difficultyClass(p.difficulty)}`}>{p.difficulty}</div>
                <div className="problem-main">
                  <h3>{p.title}</h3>
                  <p>{p.tags}</p>
                </div>
                <div className="contest-points-badge">
                  <b>{p.points}</b> pts
                </div>
                <ChevronRight className="arrow" />
              </Link>
            ))
          ) : (
            <div className="empty">Contest problems will be unlocked when the countdown finishes.</div>
          )}
        </div>
      </div>

      {/* Contest Rules */}
      <div className="contest-rules-card">
        <h3>Contest Rules & Scoring</h3>
        <ul>
          <li><b>Scoring:</b> Points for each solved problem are added to your total score immediately upon passing all test cases.</li>
          <li><b>Time Penalty:</b> Penalty is calculated as the submission time (in minutes from contest start) plus a <b>10-minute penalty</b> for each failed attempt on solved problems.</li>
          <li><b>Ranking:</b> Coders are ranked by highest total score first, then lowest time penalty.</li>
          <li><b>Environment:</b> Standard competitive libraries for JavaScript, Python, C++, and Java are supported in an isolated Docker sandbox.</li>
        </ul>
      </div>
    </section>
  );
}

