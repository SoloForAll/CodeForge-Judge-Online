import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool, initDatabase } from './db.js';
import { authenticate } from './auth.js';
import { runCustomCode, supportedLanguages } from './judge.js';
import { judgeQueue } from './queue.js';
dotenv.config();

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());
const tokenFor = (user) => jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET || 'development_secret', { expiresIn: '2h' });

// Auto-migrate schema on server startup
initDatabase().catch(err => console.warn('[Database] Initial auto-migration notice:', err.message));

app.get('/', (_req, res) => {
  res.json({
    name: 'CodeForge Judge Online API',
    status: 'online',
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      problems: '/api/problems',
      contests: '/api/contests',
      leaderboard: '/api/leaderboard',
      discuss: '/api/discuss'
    }
  });
});

app.get('/api/health', async (_req, res) => {

  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      database: 'connected',
      queue: {
        running: judgeQueue.runningCount,
        pending: judgeQueue.queue.length,
        concurrency: judgeQueue.concurrency
      }
    });
  } catch {
    res.status(503).json({ status: 'error', database: 'unavailable' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { name, username, email, password } = req.body;
  if (![name, username, email, password].every(Boolean) || password.length < 6) {
    return res.status(400).json({ message: 'Enter all fields; password needs at least 6 characters.' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      'INSERT INTO users (name, username, email, password_hash) VALUES (?, ?, ?, ?)',
      [name, username, email, hash]
    );
    const user = { id: result.insertId, name, username, email };
    res.status(201).json({ user, token: tokenFor(user) });
  } catch (e) {
    res.status(e.code === 'ER_DUP_ENTRY' ? 409 : 500).json({
      message: e.code === 'ER_DUP_ENTRY' ? 'Email or username is already in use.' : 'Could not create account.'
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const [rows] = await pool.execute('SELECT * FROM users WHERE email = ? OR username = ? LIMIT 1', [req.body.login || '', req.body.login || '']);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(req.body.password || '', user.password_hash))) {
    return res.status(401).json({ message: 'Incorrect login details.' });
  }
  res.json({ user: { id: user.id, name: user.name, username: user.username, email: user.email }, token: tokenFor(user) });
});

app.get('/api/problems', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, slug, title, difficulty, tags, solved_count FROM problems ORDER BY id');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: 'Failed to retrieve problems.' });
  }
});

app.get('/api/problems/:slug', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM problems WHERE slug = ?', [req.params.slug]);
    if (!rows[0]) return res.status(404).json({ message: 'Problem not found.' });

    let samples = [];
    try {
      const [tc] = await pool.execute(
        'SELECT input_data, expected_output FROM test_cases WHERE problem_id = ? ORDER BY id',
        [rows[0].id]
      );
      samples = tc;
    } catch {
      // test_cases table not yet populated or accessible
    }

    res.json({ ...rows[0], samples });
  } catch (e) {
    res.status(500).json({ message: 'Failed to load problem.' });
  }
});

// Asynchronous Submission Ingestion
app.post('/api/submissions', authenticate, async (req, res) => {
  const { problemId, language, sourceCode, contestId } = req.body;
  if (!problemId || !language || !sourceCode) {
    return res.status(400).json({ message: 'Problem, language and code are required.' });
  }
  if (!supportedLanguages.includes(language)) {
    return res.status(400).json({ message: `Choose one of: ${supportedLanguages.join(', ')}.` });
  }
  if (sourceCode.length > 30000) {
    return res.status(400).json({ message: 'Source code must be below 30 KB.' });
  }

  let tests = [];
  try {
    const [tc] = await pool.execute(
      'SELECT input_data, expected_output FROM test_cases WHERE problem_id = ? ORDER BY id',
      [problemId]
    );
    tests = tc;
  } catch (err) {
    console.error('Error querying test cases:', err);
  }

  if (!tests.length) {
    return res.status(400).json({ message: 'This problem has no judge test cases yet.' });
  }

  try {
    // 1. Insert queued record into database
    let submissionId;
    const cid = contestId ? Number(contestId) : null;
    try {
      const [result] = await pool.execute(
        'INSERT INTO submissions (user_id, problem_id, contest_id, language, source_code, status, verdict, total_test_cases) VALUES (?, ?, ?, ?, ?, "queued", "Queued", ?)',
        [req.user.id, problemId, cid, language, sourceCode, tests.length]
      );
      submissionId = result.insertId;
    } catch (insertErr) {
      // Fallback for legacy submissions table
      const [result] = await pool.execute(
        'INSERT INTO submissions (user_id, problem_id, language, source_code, verdict) VALUES (?, ?, ?, ?, "Queued")',
        [req.user.id, problemId, language, sourceCode]
      );
      submissionId = result.insertId;
    }

    // 2. Push job to async queue
    const queuedJob = judgeQueue.enqueue({
      submissionId,
      userId: req.user.id,
      problemId,
      language,
      sourceCode,
      tests
    });

    return res.status(202).json({
      id: submissionId,
      status: 'queued',
      verdict: 'Queued',
      position: queuedJob.position,
      totalTestCases: tests.length,
      message: 'Submission received and queued for judging.'
    });
  } catch (e) {
    console.error('Submission error:', e);
    return res.status(500).json({ message: 'Failed to enqueue submission.' });
  }
});

// Real-time Server-Sent Events (SSE) progress stream for a submission
app.get('/api/submissions/:id/stream', async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).end();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  // Check if job is currently in queue or memory
  const memoryStatus = judgeQueue.getStatus(id);
  if (memoryStatus && (memoryStatus.status === 'completed' || memoryStatus.status === 'failed')) {
    res.write(`event: ${memoryStatus.status}\ndata: ${JSON.stringify(memoryStatus)}\n\n`);
    return res.end();
  }

  // Check DB if already finished
  try {
    const [rows] = await pool.execute(
      'SELECT id, verdict, runtime_ms FROM submissions WHERE id = ?',
      [id]
    );
    if (!rows[0]) {
      res.write(`event: error\ndata: ${JSON.stringify({ message: 'Submission not found' })}\n\n`);
      return res.end();
    }

    if (rows[0].verdict && rows[0].verdict !== 'Queued' && rows[0].verdict !== 'Processing') {
      const data = {
        submissionId: rows[0].id,
        status: 'completed',
        verdict: rows[0].verdict,
        runtimeMs: rows[0].runtime_ms,
        message: `${rows[0].verdict} (${rows[0].runtime_ms || 0} ms)`
      };
      res.write(`event: completed\ndata: ${JSON.stringify(data)}\n\n`);
      return res.end();
    }
  } catch {}

  // Register SSE stream for live updates
  judgeQueue.subscribe(id, res);
});

// Polling / Status lookup endpoint for submission
app.get('/api/submissions/:id', async (req, res) => {
  const id = Number(req.params.id);
  const memory = judgeQueue.getStatus(id);
  if (memory) return res.json(memory);

  try {
    const [rows] = await pool.execute(
      'SELECT s.id, s.user_id, s.problem_id, p.title as problem_title, s.language, s.verdict, s.runtime_ms, s.created_at FROM submissions s JOIN problems p ON p.id = s.problem_id WHERE s.id = ?',
      [id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Submission not found.' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch submission.' });
  }
});

// Custom Test Runner ("Run Code" without recording submission)
app.post('/api/judge/run', async (req, res) => {
  const { language, sourceCode, customInput } = req.body;
  if (!language || !sourceCode) {
    return res.status(400).json({ message: 'Language and source code are required.' });
  }
  if (!supportedLanguages.includes(language)) {
    return res.status(400).json({ message: `Choose one of: ${supportedLanguages.join(', ')}.` });
  }

  try {
    const result = await runCustomCode(language, sourceCode, customInput || '');
    res.json(result);
  } catch (error) {
    res.status(error.code === 'JUDGE_UNAVAILABLE' ? 503 : 500).json({
      message: error.message || 'Run execution failed.'
    });
  }
});

app.get('/api/submissions/me', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT s.id, p.title, s.language, s.verdict, s.runtime_ms, s.created_at FROM submissions s JOIN problems p ON p.id = s.problem_id WHERE s.user_id = ? ORDER BY s.created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: 'Failed to load user submissions.' });
  }
});

// Contests Endpoints
app.get('/api/contests', async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.id, c.title, c.starts_at, c.duration_minutes, c.status,
             (SELECT COUNT(*) FROM contest_problems cp WHERE cp.contest_id = c.id) as problem_count,
             (SELECT COUNT(*) FROM contest_registrations cr WHERE cr.contest_id = c.id) as registered_count
      FROM contests c 
      ORDER BY c.starts_at ASC
    `);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: 'Failed to load contests.' });
  }
});

// Single Contest Detail & Problem Set
app.get('/api/contests/:id', async (req, res) => {
  const contestId = Number(req.params.id);
  try {
    const [contests] = await pool.execute(
      'SELECT id, title, starts_at, duration_minutes, status FROM contests WHERE id = ?',
      [contestId]
    );
    if (!contests[0]) return res.status(404).json({ message: 'Contest not found.' });
    const contest = contests[0];

    // Contest problems
    const [problems] = await pool.execute(`
      SELECT cp.letter_order, cp.points, p.id, p.slug, p.title, p.difficulty, p.tags, p.solved_count
      FROM contest_problems cp
      JOIN problems p ON p.id = cp.problem_id
      WHERE cp.contest_id = ?
      ORDER BY cp.letter_order ASC
    `, [contestId]);

    // Registered count
    const [regCount] = await pool.execute(
      'SELECT COUNT(*) as count FROM contest_registrations WHERE contest_id = ?',
      [contestId]
    );

    // Check if requesting user is registered
    let isRegistered = false;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'development_secret');
        if (decoded && decoded.id) {
          const [userReg] = await pool.execute(
            'SELECT id FROM contest_registrations WHERE contest_id = ? AND user_id = ?',
            [contestId, decoded.id]
          );
          isRegistered = userReg.length > 0;
        }
      } catch {}
    }

    res.json({
      ...contest,
      registered_count: Number(regCount[0]?.count || 0),
      isRegistered,
      problems
    });
  } catch (e) {
    console.error('Error fetching contest:', e);
    res.status(500).json({ message: 'Failed to load contest details.' });
  }
});

// Register authenticated user for a contest
app.post('/api/contests/:id/register', authenticate, async (req, res) => {
  const contestId = Number(req.params.id);
  try {
    const [contest] = await pool.execute('SELECT id FROM contests WHERE id = ?', [contestId]);
    if (!contest[0]) return res.status(404).json({ message: 'Contest not found.' });

    await pool.execute(
      'INSERT IGNORE INTO contest_registrations (contest_id, user_id) VALUES (?, ?)',
      [contestId, req.user.id]
    );
    res.json({ message: 'Successfully registered for contest!', registered: true });
  } catch (e) {
    res.status(500).json({ message: 'Failed to register for contest.' });
  }
});

// Dynamic Contest Standings & Scoreboard (ICPC/LeetCode Scoring)
app.get('/api/contests/:id/standings', async (req, res) => {
  const contestId = Number(req.params.id);
  try {
    const [contests] = await pool.execute(
      'SELECT id, title, starts_at, duration_minutes, status FROM contests WHERE id = ?',
      [contestId]
    );
    if (!contests[0]) return res.status(404).json({ message: 'Contest not found.' });
    const contest = contests[0];

    const [problems] = await pool.execute(`
      SELECT cp.letter_order, cp.points, p.id, p.title, p.slug, p.difficulty
      FROM contest_problems cp
      JOIN problems p ON p.id = cp.problem_id
      WHERE cp.contest_id = ?
      ORDER BY cp.letter_order ASC
    `, [contestId]);

    // Fetch registered coders
    const [registered] = await pool.execute(`
      SELECT u.id, u.username, u.name
      FROM contest_registrations cr
      JOIN users u ON u.id = cr.user_id
      WHERE cr.contest_id = ?
    `, [contestId]);

    // Fetch all submissions for this contest
    const [subs] = await pool.execute(`
      SELECT s.id, s.user_id, u.username, u.name, s.problem_id, s.verdict, s.created_at
      FROM submissions s
      JOIN users u ON u.id = s.user_id
      WHERE s.contest_id = ?
      ORDER BY s.created_at ASC
    `, [contestId]);

    // Map participants
    const userMap = new Map();
    for (const r of registered) {
      userMap.set(r.id, {
        userId: r.id,
        username: r.username,
        name: r.name,
        totalScore: 0,
        totalPenalty: 0,
        solvedCount: 0,
        problems: {}
      });
    }

    for (const s of subs) {
      if (!userMap.has(s.user_id)) {
        userMap.set(s.user_id, {
          userId: s.user_id,
          username: s.username,
          name: s.name,
          totalScore: 0,
          totalPenalty: 0,
          solvedCount: 0,
          problems: {}
        });
      }
    }

    // Initialize problem maps
    for (const user of userMap.values()) {
      for (const p of problems) {
        user.problems[p.id] = {
          problemId: p.id,
          letter: p.letter_order,
          solved: false,
          attempts: 0,
          points: 0,
          penalty: 0
        };
      }
    }

    // Process submissions in chronological order
    for (const s of subs) {
      const user = userMap.get(s.user_id);
      if (!user) continue;
      const prob = user.problems[s.problem_id];
      if (!prob || prob.solved) continue; // Ignore after solved

      prob.attempts++;
      if (s.verdict === 'Accepted') {
        prob.solved = true;
        const problemConfig = problems.find(p => p.id === s.problem_id);
        const pts = problemConfig?.points || 100;
        prob.points = pts;

        const startTime = new Date(contest.starts_at).getTime();
        const subTime = new Date(s.created_at).getTime();
        const minutes = Math.max(0, Math.floor((subTime - startTime) / 60000));
        prob.penalty = minutes + (prob.attempts - 1) * 10;

        user.totalScore += pts;
        user.totalPenalty += prob.penalty;
        user.solvedCount++;
      }
    }

    // Sort standings: highest score, lowest penalty, highest solved count
    const standings = Array.from(userMap.values()).sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      if (a.totalPenalty !== b.totalPenalty) return a.totalPenalty - b.totalPenalty;
      return b.solvedCount - a.solvedCount;
    });

    res.json({
      contest,
      problems,
      standings: standings.map((st, idx) => ({ rank: idx + 1, ...st }))
    });
  } catch (e) {
    console.error('Error fetching contest standings:', e);
    res.status(500).json({ message: 'Failed to load contest standings.' });
  }
});

app.get('/api/leaderboard', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT u.username, u.name, COUNT(DISTINCT CASE WHEN s.verdict="Accepted" THEN s.problem_id END) solved, COALESCE(SUM(CASE WHEN s.verdict="Accepted" THEN 100 ELSE 0 END),0) score FROM users u LEFT JOIN submissions s ON u.id=s.user_id GROUP BY u.id ORDER BY score DESC, solved DESC LIMIT 10'
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ message: 'Failed to load leaderboard.' });
  }
});

// User Profile & Statistics Dashboard Endpoint
app.get('/api/users/:username/profile', async (req, res) => {
  const { username } = req.params;
  try {
    const [users] = await pool.execute(
      'SELECT id, name, username, email, created_at FROM users WHERE username = ? LIMIT 1',
      [username]
    );
    if (!users[0]) return res.status(404).json({ message: 'User not found.' });
    const user = users[0];

    // Total problems by difficulty
    const [difficultyTotals] = await pool.query(
      'SELECT difficulty, COUNT(*) as count FROM problems GROUP BY difficulty'
    );
    const totals = { Easy: 0, Medium: 0, Hard: 0, Total: 0 };
    for (const d of difficultyTotals) {
      totals[d.difficulty] = Number(d.count);
      totals.Total += Number(d.count);
    }

    // User solved problems by difficulty
    const [solvedRows] = await pool.execute(
      `SELECT p.difficulty, COUNT(DISTINCT p.id) as solved 
       FROM submissions s 
       JOIN problems p ON p.id = s.problem_id 
       WHERE s.user_id = ? AND s.verdict = 'Accepted' 
       GROUP BY p.difficulty`,
      [user.id]
    );
    const solved = { Easy: 0, Medium: 0, Hard: 0, Total: 0 };
    for (const s of solvedRows) {
      solved[s.difficulty] = Number(s.solved);
      solved.Total += Number(s.solved);
    }

    // Submission summary stats
    const [subStats] = await pool.execute(
      'SELECT COUNT(*) as total_submissions, COUNT(CASE WHEN verdict = "Accepted" THEN 1 END) as total_accepted FROM submissions WHERE user_id = ?',
      [user.id]
    );
    const totalSubmissions = Number(subStats[0]?.total_submissions || 0);
    const totalAccepted = Number(subStats[0]?.total_accepted || 0);
    const acceptanceRate = totalSubmissions > 0 ? Math.round((totalAccepted / totalSubmissions) * 100) : 0;

    // 365-day submission heatmap activity
    const [activityRows] = await pool.execute(
      `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') as date, COUNT(*) as count 
       FROM submissions 
       WHERE user_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL 365 DAY) 
       GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d') 
       ORDER BY date ASC`,
      [user.id]
    );

    // Recent submissions
    const [recentSubmissions] = await pool.execute(
      `SELECT s.id, p.title as problem_title, p.slug as problem_slug, p.difficulty, s.language, s.verdict, s.runtime_ms, s.created_at 
       FROM submissions s 
       JOIN problems p ON p.id = s.problem_id 
       WHERE s.user_id = ? 
       ORDER BY s.created_at DESC 
       LIMIT 30`,
      [user.id]
    );

    res.json({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        createdAt: user.created_at
      },
      stats: {
        solved,
        totals,
        totalSubmissions,
        totalAccepted,
        acceptanceRate,
        score: solved.Total * 100
      },
      activity: activityRows,
      recentSubmissions
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Failed to load user profile.' });
  }
});

// View exact submission source code
app.get('/api/submissions/:id/code', async (req, res) => {
  const id = Number(req.params.id);
  try {
    const [rows] = await pool.execute(
      `SELECT s.id, s.user_id, u.username, p.title as problem_title, p.slug as problem_slug, s.language, s.source_code, s.verdict, s.runtime_ms, s.created_at 
       FROM submissions s 
       JOIN problems p ON p.id = s.problem_id 
       JOIN users u ON u.id = s.user_id 
       WHERE s.id = ? LIMIT 1`,
      [id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Submission not found.' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve submission code.' });
  }
});

// Discussion Forum Endpoints
app.get('/api/discuss', async (req, res) => {
  const { category, search } = req.query;
  try {
    let query = `
      SELECT d.id, d.category, d.title, d.content, d.likes, d.replies_count, d.created_at,
             u.username as author_username, u.name as author_name
      FROM discussions d
      JOIN users u ON u.id = d.user_id
    `;
    const params = [];
    const conditions = [];

    if (category && category !== 'All') {
      conditions.push('d.category = ?');
      params.push(category);
    }
    if (search) {
      conditions.push('(d.title LIKE ? OR d.content LIKE ? OR u.username LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY d.created_at DESC';

    const [rows] = await pool.execute(query, params);
    res.json(rows);
  } catch (e) {
    console.error('Error fetching discussions:', e);
    res.status(500).json({ message: 'Failed to load discussions.' });
  }
});

app.post('/api/discuss', authenticate, async (req, res) => {
  const { category, title, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ message: 'Title and content are required.' });
  }
  try {
    const [result] = await pool.execute(
      'INSERT INTO discussions (user_id, category, title, content) VALUES (?, ?, ?, ?)',
      [req.user.id, category || 'Solutions', title, content]
    );
    res.status(201).json({ id: result.insertId, message: 'Discussion post created successfully!' });
  } catch (e) {
    res.status(500).json({ message: 'Failed to create discussion post.' });
  }
});

app.post('/api/discuss/:id/like', async (req, res) => {
  const id = Number(req.params.id);
  try {
    await pool.execute('UPDATE discussions SET likes = likes + 1 WHERE id = ?', [id]);
    const [rows] = await pool.execute('SELECT likes FROM discussions WHERE id = ?', [id]);
    res.json({ likes: rows[0]?.likes || 0 });
  } catch (e) {
    res.status(500).json({ message: 'Failed to update like.' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`CodeForge API running on http://localhost:${PORT}`));




