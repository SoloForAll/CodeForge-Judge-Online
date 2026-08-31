import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ChevronRight, Search, Filter } from 'lucide-react';
import api from '../api';

const difficultyClass = (d) => (d ? d.toLowerCase() : 'easy');

export function ProblemsCatalog() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('All');
  const [selectedTag, setSelectedTag] = useState('All');

  useEffect(() => {
    api.get('/problems').then((r) => setItems(r.data)).catch(() => {});
  }, []);

  // Extract unique tags
  const allTags = ['All', ...new Set(items.flatMap((p) => (p.tags ? p.tags.split(',').map((t) => t.trim()) : [])))];

  const filtered = items.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.tags && p.tags.toLowerCase().includes(search.toLowerCase()));
    const matchesDiff = difficulty === 'All' || p.difficulty === difficulty;
    const matchesTag = selectedTag === 'All' || (p.tags && p.tags.includes(selectedTag));
    return matchesSearch && matchesDiff && matchesTag;
  });

  return (
    <section className="content page">
      <p className="eyebrow">PROBLEM LIBRARY</p>
      <h1>Problems</h1>
      <p className="muted">Filter by topic, difficulty, or search to practice your algorithms.</p>

      <div className="catalog-tools">
        <div className="search-wrap">
          <Search size={17} className="search-icon" />
          <input
            placeholder="Search problems by title, tag, or topic..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="filter-select"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
        >
          <option value="All">All difficulties</option>
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>

        {allTags.length > 1 && (
          <select
            className="filter-select"
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
          >
            {allTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag === 'All' ? 'All topics' : tag}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="problem-list">
        {filtered.length ? (
          filtered.map((p, i) => (
            <Link to={`/problems/${p.slug}`} className="problem-card" key={p.id}>
              <span className="problem-number">{i + 1}</span>
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
          ))
        ) : (
          <div className="empty">No problems matched your search criteria.</div>
        )}
      </div>
    </section>
  );
}

