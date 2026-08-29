import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from './db.js';
import { authenticate } from './auth.js';
import { judgeSubmission, supportedLanguages } from './judge.js';
dotenv.config();

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());
const tokenFor = (user) => jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET || 'development_secret', { expiresIn: '2h' });

app.get('/api/health', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.json({ status: 'ok', database: 'connected' }); }
  catch { res.status(503).json({ status: 'error', database: 'unavailable' }); }
});
app.post('/api/auth/register', async (req, res) => {
  const { name, username, email, password } = req.body;
  if (![name, username, email, password].every(Boolean) || password.length < 6) return res.status(400).json({ message: 'Enter all fields; password needs at least 6 characters.' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.execute('INSERT INTO users (name, username, email, password_hash) VALUES (?, ?, ?, ?)', [name, username, email, hash]);
    const user = { id: result.insertId, name, username, email };
    res.status(201).json({ user, token: tokenFor(user) });
  } catch (e) { res.status(e.code === 'ER_DUP_ENTRY' ? 409 : 500).json({ message: e.code === 'ER_DUP_ENTRY' ? 'Email or username is already in use.' : 'Could not create account.' }); }
});
app.post('/api/auth/login', async (req, res) => {
  const [rows] = await pool.execute('SELECT * FROM users WHERE email = ? OR username = ? LIMIT 1', [req.body.login || '', req.body.login || '']);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(req.body.password || '', user.password_hash))) return res.status(401).json({ message: 'Incorrect login details.' });
  res.json({ user: { id: user.id, name: user.name, username: user.username, email: user.email }, token: tokenFor(user) });
});
app.get('/api/problems', async (_req, res) => { const [rows] = await pool.query('SELECT id, slug, title, difficulty, tags, solved_count FROM problems ORDER BY id'); res.json(rows); });
app.get('/api/problems/:slug', async (req, res) => { const [rows] = await pool.execute('SELECT * FROM problems WHERE slug = ?', [req.params.slug]); rows[0] ? res.json(rows[0]) : res.status(404).json({ message: 'Problem not found.' }); });
app.post('/api/submissions', authenticate, async (req, res) => {
  const { problemId, language, sourceCode } = req.body;
  if (!problemId || !language || !sourceCode) return res.status(400).json({ message: 'Problem, language and code are required.' });
  if (!supportedLanguages.includes(language)) return res.status(400).json({ message: `Choose one of: ${supportedLanguages.join(', ')}.` });
  if (sourceCode.length > 30000) return res.status(400).json({ message: 'Source code must be below 30 KB.' });
  const [tests] = await pool.execute('SELECT input_data, expected_output FROM test_cases WHERE problem_id=? ORDER BY id', [problemId]);
  if (!tests.length) return res.status(400).json({ message: 'This problem has no judge test cases yet.' });
  try {
    const result = await judgeSubmission(language, sourceCode, tests);
    const [r] = await pool.execute('INSERT INTO submissions (user_id, problem_id, language, source_code, verdict, runtime_ms) VALUES (?, ?, ?, ?, ?, ?)', [req.user.id, problemId, language, sourceCode, result.verdict, result.runtimeMs]);
    res.status(201).json({ id: r.insertId, ...result, message: result.detail || `Judged against ${tests.length} hidden test case(s).` });
  } catch (error) {
    res.status(error.code === 'JUDGE_UNAVAILABLE' ? 503 : 500).json({ message: error.message || 'Judge execution failed.' });
  }
});
app.get('/api/submissions/me', authenticate, async (req, res) => { const [rows] = await pool.execute('SELECT s.id, p.title, s.language, s.verdict, s.runtime_ms, s.created_at FROM submissions s JOIN problems p ON p.id=s.problem_id WHERE s.user_id=? ORDER BY s.created_at DESC', [req.user.id]); res.json(rows); });
app.get('/api/contests', async (_req, res) => { const [rows] = await pool.query('SELECT id, title, starts_at, duration_minutes, status FROM contests ORDER BY starts_at'); res.json(rows); });
app.get('/api/leaderboard', async (_req, res) => { const [rows] = await pool.query('SELECT u.username, u.name, COUNT(DISTINCT CASE WHEN s.verdict="Accepted" THEN s.problem_id END) solved, COALESCE(SUM(CASE WHEN s.verdict="Accepted" THEN 100 ELSE 0 END),0) score FROM users u LEFT JOIN submissions s ON u.id=s.user_id GROUP BY u.id ORDER BY score DESC, solved DESC LIMIT 10'); res.json(rows); });
app.listen(process.env.PORT || 5000, () => console.log(`CodeForge API on http://localhost:${process.env.PORT || 5000}`));
