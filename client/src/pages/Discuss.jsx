import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Plus, ThumbsUp, Search, X, Check } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export function Discuss() {
  const { user } = useAuth();
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    category: 'Solutions',
    title: '',
    content: ''
  });

  const fetchTopics = () => {
    setLoading(true);
    const params = {};
    if (filter !== 'All') params.category = filter;
    if (search.trim()) params.search = search.trim();

    api.get('/discuss', { params })
      .then((r) => setTopics(r.data))
      .catch(() => setTopics([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTopics();
  }, [filter, search]);

  const handleLike = async (id, e) => {
    e.stopPropagation();
    try {
      const { data } = await api.post(`/discuss/${id}/like`);
      setTopics((prev) =>
        prev.map((t) => (t.id === id ? { ...t, likes: data.likes } : t))
      );
    } catch {}
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!user) {
      alert('Please log in to post discussions.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/discuss', form);
      setShowModal(false);
      setForm({ category: 'Solutions', title: '', content: '' });
      fetchTopics();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to post discussion.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="content page discussion-page">
      <div className="section-title">
        <div>
          <p className="eyebrow">COMMUNITY FORUM</p>
          <h1>Discussions & Editorials</h1>
          <p className="muted">
            Share $O(n)$ algorithmic approaches, discuss competitive techniques, and help other coders.
          </p>
        </div>

        <button
          className="button"
          onClick={() => {
            if (!user) alert('Please log in to create a discussion post.');
            else setShowModal(true);
          }}
        >
          <Plus size={16} /> New Discussion
        </button>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="discussion-filter">
        <div className="search-wrap">
          <Search size={16} className="search-icon" />
          <input
            placeholder="Search discussions by keyword, problem, or username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-chips">
          {['All', 'Solutions', 'Help', 'Contests', 'Algorithms'].map((cat) => (
            <button
              key={cat}
              className={`chip ${filter === cat ? 'active-chip' : ''}`}
              onClick={() => setFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Topics List */}
      <div className="topics-list">
        {loading ? (
          <div className="loading-state">Loading discussions...</div>
        ) : topics.length ? (
          topics.map((topic) => (
            <article className="topic" key={topic.id}>
              <div className="topic-header">
                <span className="topic-type">{topic.category}</span>
                <span className="topic-time">
                  {new Date(topic.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>

              <h3>{topic.title}</h3>
              <p className="topic-content-preview">{topic.content}</p>

              <div className="topic-footer">
                <p className="topic-author">
                  Posted by <Link to={`/u/${topic.author_username}`}><b>@{topic.author_username}</b></Link>
                </p>

                <aside>
                  <button
                    className="topic-like-btn"
                    onClick={(e) => handleLike(topic.id, e)}
                    title="Upvote solution"
                  >
                    <ThumbsUp size={14} /> {topic.likes || 0}
                  </button>
                  <span className="topic-replies">
                    <MessageSquare size={14} /> {topic.replies_count || 0} replies
                  </span>
                </aside>
              </div>
            </article>
          ))
        ) : (
          <div className="empty">
            <p>No discussion topics found in this category.</p>
            {user && (
              <button
                className="button small"
                style={{ marginTop: '14px' }}
                onClick={() => setShowModal(true)}
              >
                Create First Discussion
              </button>
            )}
          </div>
        )}
      </div>

      {/* New Discussion Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create a Discussion</h2>
              <button
                className="modal-close-btn"
                onClick={() => setShowModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreatePost} style={{ padding: '24px' }}>
              <label>
                Category
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: '#242424',
                    border: '1px solid #444',
                    borderRadius: '6px',
                    color: '#eee',
                    font: '14px Manrope',
                    marginBottom: '16px'
                  }}
                >
                  <option>Solutions</option>
                  <option>Help</option>
                  <option>Contests</option>
                  <option>Algorithms</option>
                </select>
              </label>

              <label>
                Topic Title
                <input
                  required
                  placeholder="e.g. Efficient Two Pointer solution with O(1) space"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </label>

              <label>
                Post Body / Explanation
                <textarea
                  required
                  placeholder="Explain your approach, time complexity analysis, or question details..."
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  style={{
                    width: '100%',
                    height: '140px',
                    background: '#242424',
                    border: '1px solid #444',
                    borderRadius: '6px',
                    color: '#eee',
                    padding: '12px',
                    font: '14px Manrope',
                    resize: 'vertical',
                    marginBottom: '20px'
                  }}
                />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  className="button ghost-btn"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button"
                  disabled={submitting}
                >
                  {submitting ? 'Publishing...' : 'Publish Discussion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
