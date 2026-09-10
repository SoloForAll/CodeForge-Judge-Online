# 🎓 CodeForge — 4-Member Team Presentation & Defense Guide

This document provides each team member with their exact **30-Second Introduction Pitch**, **File Ownership**, **Technical Architecture**, and the **Top Q&A** to defend the project during the presentation.

---

## 📋 Team Roster & Module Ownership

| Member Role | Core Module | Primary Files | Key Technologies |
|---|---|---|---|
| **Member 1: Frontend Developer** | Client UI / UX & IDE | `client/src/components/*`, `client/src/pages/*`, `api.js` | React 18, Vite, Monaco Editor, EventSource (SSE) |
| **Member 2: Backend Developer** | API, Auth & JudgeQueue | `server/src/index.js`, `server/src/auth.js`, `server/src/queue.js` | Node.js, Express, JWT, bcryptjs, SSE Controller |
| **Member 3: Database Engineer** | Relational Schema & Queries | `server/src/db.js`, `database/schema.sql`, `database/seed.sql` | MySQL 8.0, `mysql2/promise`, Connection Pooling |
| **Member 4: Judge & Sandbox Specialist** | Offline Code Execution | `server/src/judge.js` | Child Process (`spawn`), GCC, Python, JDK, Node.js |

---

## 👤 Member 1: Frontend Developer

### 🎤 30-Second Opening Pitch
> *"I was responsible for the **Frontend Architecture and User Interface** using **React 18 and Vite**. My core contribution includes integrating the **VS Code Monaco Editor**, building the **Draggable Split-Pane Workspace**, connecting the real-time **Server-Sent Events (SSE)** execution listener, and implementing views for the **Problem Workspace, Contest Standings, Leaderboard, and 365-Day Activity Heatmap**."*

### 📂 Key Files Owned
- `client/src/pages/ProblemWorkspace.jsx` — Core IDE layout, problem statement pane, and judgment orchestration.
- `client/src/components/CodeEditor.jsx` — Monaco Editor instance, keyboard shortcuts (`Ctrl+Enter`), code formatting (`Shift+Alt+F`).
- `client/src/components/TestcasePanel.jsx` — Multi-case input tabs, diagnostic verdict matrix, diff viewer.
- `client/src/components/SplitPane.jsx` — Draggable horizontal and vertical pane resizer with `localStorage` memory.
- `client/src/components/DiffViewer.jsx` — Side-by-side expected vs. actual output highlighting.
- `client/src/pages/Leaderboard.jsx` & `Profile.jsx` — Global rankings and 52-week activity heatmap.
- `client/src/context/AuthContext.jsx` & `client/src/api.js` — Global auth state, Axios request interceptors.

### ⚙️ Technical Deep-Dive
1. **Monaco Editor Integration**: Embedded the editor engine behind VS Code (`@monaco-editor/react`), supporting syntax highlighting, bracket colorization, and auto-indentation for C++, Python, Java, and JavaScript.
2. **Offline-Safe Draft Persistence**: Auto-saves user code per problem and language in browser `localStorage`. Drafts persist even if the browser is reloaded completely offline.
3. **SSE Real-Time Streaming Listener**: Instead of polling every 500ms, the client connects to `/api/submissions/:id/stream` via `EventSource`. When the backend advances from Test 1 to Test 4, the UI updates dynamically with a live progress bar.
4. **Custom Code Formatter**: Language-aware code beautifier supporting Python indentation blocks and C++/Java brace indentation.

### ❓ Top Viva Questions & Answers
* **Q: Why use Server-Sent Events (SSE) instead of WebSockets or polling on the frontend?**
  * *Answer:* *"Judging progress is strictly unidirectional (Server → Client). SSE uses standard HTTP and browser-native `EventSource`, making it much lighter than bidirectional WebSockets while avoiding the heavy network overhead of polling every 500ms."*
* **Q: How does the frontend stay logged in across page refreshes?**
  * *Answer:* *"On login, the JWT is stored in `localStorage`. Our Axios client in `api.js` has a request interceptor that automatically attaches `Authorization: Bearer <token>` to every subsequent HTTP request."*
* **Q: What is the Diff Viewer and when does it trigger?**
  * *Answer:* *"In `TestcasePanel.jsx`, if a submission or custom run produces output that does not match `expected_output`, the DiffViewer renders a side-by-side card highlighting exactly where the actual output deviated from the expected output."*

---

## 👤 Member 2: Backend Developer

### 🎤 30-Second Opening Pitch
> *"I developed the **Backend API and Asynchronous Queue Architecture** using **Node.js and Express**. I designed the **JWT authentication pipeline with bcrypt password security**, the **non-blocking FIFO JudgeQueue worker pool**, and the **Server-Sent Events (SSE) streaming controller** that transmits live judging states to the client."*

### 📂 Key Files Owned
- `server/src/index.js` — Express REST endpoints, middleware, routing, SSE streaming controller.
- `server/src/auth.js` — JWT verification middleware, route guards.
- `server/src/queue.js` — Asynchronous FIFO worker queue, concurrency control, EventEmitter.

### ⚙️ Technical Deep-Dive
1. **Asynchronous Non-Blocking Submission Ingestion**: When a user clicks Submit, the backend inserts a submission record, pushes the job into `JudgeQueue`, and immediately responds with `HTTP 202 Accepted` and a queue position without blocking the Node.js event loop.
2. **Worker Pool Concurrency (`JudgeQueue`)**: Configured with a default worker concurrency of 2. If 10 users submit at the exact same moment, 2 jobs run in parallel while 8 wait in queue, preventing CPU thread starvation on the local machine.
3. **SSE Event Streaming Pipeline**: Implemented `app.get('/api/submissions/:id/stream')` with headers:
   - `Content-Type: text/event-stream`
   - `Cache-Control: no-cache`
   - `Connection: keep-alive`
   When the queue worker advances through tests, it streams `event: progress\ndata: {...}\n\n` directly to the client.
4. **Security & Route Protection**: Protected routes (`/submissions`, `/contests/register`) use `authenticate` middleware in `auth.js` that decodes and validates the cryptographic JWT signature.

### ❓ Top Viva Questions & Answers
* **Q: What happens if 50 students submit code at the exact same second?**
  * *Answer:* *"The Express server does not crash because code execution is decoupled from the request-response cycle. All 50 jobs are placed in the FIFO `JudgeQueue`. The queue worker pool processes them in order with controlled concurrency (e.g., 2 parallel processes), streaming real-time queue position updates to each waiting student."*
* **Q: How does your authentication work securely?**
  * *Answer:* *"Passwords are never stored in plain text; we use `bcryptjs` with salt rounds of 10. For session management, we issue signed JSON Web Tokens (JWT) containing the user's ID and username, expiring after 2 hours."*
* **Q: Why did you pick Node.js/Express for an online judge backend?**
  * *Answer:* *"Node.js has an asynchronous, non-blocking event-driven I/O loop. It can keep hundreds of open streaming connections (SSE) active with very low memory footprint compared to traditional multi-threaded servers."*

---

## 👤 Member 3: Database Engineer

### 🎤 30-Second Opening Pitch
> *"I designed and optimized the **Relational Database Architecture in MySQL 8.0**. I built the **8 relational entities with foreign key cascade integrity**, managed connection pooling with `mysql2/promise`, designed **idempotent startup auto-migrations**, and wrote the complex SQL aggregations for the **Global Leaderboard, ICPC Contest Standings, and 365-Day Activity Heatmap**."*

### 📂 Key Files Owned
- `server/src/db.js` — Connection pool setup, dynamic environment detection, auto-migration function `initDatabase()`.
- `database/schema.sql` — Full DDL table structure, constraints, foreign keys.
- `database/seed.sql` — Initial seed data for problems, test cases, and contests.
- Aggregation SQL queries in `server/src/index.js` (Leaderboard, Profile, Contest standings).

### ⚙️ Technical Deep-Dive
1. **The 8 Relational Tables**:
   - `users`: Credentials, unique constraints on `username` and `email`, bcrypt hash.
   - `problems`: `slug` (unique), `difficulty` (ENUM), description, I/O formats.
   - `test_cases`: `problem_id` (FK ON DELETE CASCADE), `input_data`, `expected_output`, `is_sample` (boolean separating public vs. hidden tests).
   - `submissions`: `source_code` (`MEDIUMTEXT` up to 16MB), verdicts, runtime, memory.
   - `contests`, `contest_problems` (composite unique key), `contest_registrations` (composite unique key), and `discussions`.
2. **Referential Integrity with `CASCADE`**: Deleting a problem automatically cascades to purge its associated test cases and past submissions, eliminating orphaned records.
3. **Complex Leaderboard Aggregation**:
   ```sql
   SELECT u.username, u.name,
          COUNT(DISTINCT CASE WHEN s.verdict="Accepted" THEN s.problem_id END) AS solved,
          COALESCE(SUM(CASE WHEN s.verdict="Accepted" THEN 100 ELSE 0 END), 0) AS score
   FROM users u
   LEFT JOIN submissions s ON u.id = s.user_id
   GROUP BY u.id ORDER BY score DESC, solved DESC LIMIT 10;
   ```
4. **Self-Healing Auto-Migration**: `initDatabase()` runs on server startup, creates missing tables, dynamically inspects `INFORMATION_SCHEMA.COLUMNS` to apply schema patches, and auto-seeds starter challenges (Two Sum, Valid Parentheses, etc.) if empty.

### ❓ Top Viva Questions & Answers
* **Q: How do you prevent SQL Injection attacks?**
  * *Answer:* *"We strictly use parameterized prepared statements (`pool.execute(sql, [params])`). User input is treated strictly as literal data parameters, never interpreted as executable SQL syntax."*
* **Q: Why use Connection Pooling instead of opening a new connection per query?**
  * *Answer:* *"Opening and closing a TCP handshake on every database query introduces latency and can exhaust MySQL connection limits. Our pool (`mysql2.createPool`) maintains up to 10 persistent reusable connections, queuing queries when all are busy."*
* **Q: Why did you choose MySQL (Relational) over MongoDB (NoSQL)?**
  * *Answer:* *"Competitive coding platforms are strictly relational: Submissions belong to Users and Problems; Contests map to Problems with point weights. MySQL provides ACID compliance for contest rankings, unique composite constraints to prevent duplicate contest registrations, and powerful `JOIN` aggregations for live scoreboards."*

---

## 👤 Member 4: Judge & Code Execution Engine

### 🎤 30-Second Opening Pitch
> *"I was responsible for the **Local Code Execution Engine and Compiler Sandbox** in `judge.js`. I built the **100% offline multi-language execution pipeline for Python, C++, Java, and Node.js**, enforced strict **execution timeouts (5 seconds) and memory limits**, captured stdout and stderr diagnostics, and classified verdicts including **Accepted, Wrong Answer, TLE, and Compilation Error with full tracebacks**."*

### 📂 Key Files Owned
- `server/src/judge.js` — Process runner `executeProcess`, `runLocal`, compiler pipeline, `judgeSubmission`, `runCustomCode`.

### ⚙️ Technical Deep-Dive
1. **100% Offline Architecture**:
   - Compiles and runs directly on the local host without any cloud API or Docker daemon:
     - **Python**: Spawns `python -u` (unbuffered stdout).
     - **C++**: Compiles with `g++ -O2 solution.cpp -o solution.exe`, checks exit code, then executes the binary.
     - **Java**: Compiles with `javac Main.java`, checks exit code, then executes `java -Xmx256m Main`.
     - **JavaScript**: Spawns `node solution.js`.
2. **Ephemeral Isolated Workspaces**:
   - For every execution, generates a unique temporary directory in `os.tmpdir()` (e.g., `codeforge_1741635849_ab3x9`). Writes source files, compiles, runs against stdin, and guarantees total folder deletion inside a `finally` block.
3. **Verdict Classification Logic**:
   - `Timed Out (5000ms)` $\longrightarrow$ **Time Limit Exceeded (TLE)**
   - `compileRes.code !== 0` $\longrightarrow$ **Compilation Error** (extracts compiler stderr)
   - `proc.code !== 0` $\longrightarrow$ **Runtime Error** (extracts exception traceback)
   - `normalize(stdout) !== normalize(expected_output)` $\longrightarrow$ **Wrong Answer**
   - All tests match $\longrightarrow$ **Accepted**
4. **Performance & Memory Profiling**:
   - High-resolution timing via `performance.now()` returning execution time in milliseconds (`runtimeMs`).
   - Caps max output to 64KB (`MAX_OUTPUT_BYTES`) to protect against infinite print loops.

### ❓ Top Viva Questions & Answers
* **Q: How do you prevent an infinite loop like `while(true)` from freezing the computer?**
  * *Answer:* *"In `executeProcess()`, we set a strict timer of 5000ms (5 seconds). If the process doesn't close within that window, the timer triggers `proc.kill('SIGKILL')`, immediately terminating the child process and returning a `timedOut: true` flag which translates to the **Time Limit Exceeded** verdict."*
* **Q: How do you handle whitespace and newline differences in output verification?**
  * *Answer:* *"We use a `normalize()` function that trims leading/trailing whitespace, converts Windows `\r\n` to Unix `\n`, and strips trailing spaces before comparing `stdout` with `expected_output`."*
* **Q: Does this require internet connectivity or Docker to judge code?**
  * *Answer:* *"No. It runs 100% locally and offline. It spawns the locally installed `node`, `python`, `g++`, or `javac` binaries as child processes, piping input via `stdin` and capturing output via `stdout`/`stderr` streams."*

---

## 🎯 Live Demonstration Flow for the Team

When presenting to the teacher:
1. **Sit together in sequence**: Frontend $\rightarrow$ Backend $\rightarrow$ Database $\rightarrow$ Judge.
2. **Run 1 live problem demonstration** (e.g. *Two Sum*):
   - **Member 1 (Frontend)**: Demonstrates the IDE, selects Python 3, pastes the optimal hash map solution, and clicks **Run Code**.
   - **Member 4 (Judge)**: Explains how `runLocal()` in `judge.js` spawns Python offline, pipes the custom input, and captures execution time (e.g., 85 ms).
   - **Member 2 (Backend)**: Shows the browser Network tab with the live `/api/submissions/:id/stream` SSE connection pushing status updates as the solution is submitted.
   - **Member 3 (Database)**: Opens the **Leaderboard** and **Profile** to show the query aggregating the new Accepted verdict, incrementing the solve count, and updating the 365-day heatmap.
