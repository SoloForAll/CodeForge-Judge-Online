<div align="center">

# ⚡ CodeForge — Online Coding Judge & Competitive Platform

[![React](https://img.shields.io/badge/Frontend-React%2018%20%7C%20Vite-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js%20%7C%20Express-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![MySQL](https://img.shields.io/badge/Database-MySQL%208.0-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Judge0 CE](https://img.shields.io/badge/Execution-Judge0%20CE%20Cloud-0A84FF?logo=target&logoColor=white)](https://ce.judge0.com/)
[![Monaco Editor](https://img.shields.io/badge/Editor-VS%20Code%20Monaco-007ACC?logo=visualstudiocode&logoColor=white)](https://microsoft.github.io/monaco-editor/)
[![Deployment](https://img.shields.io/badge/Deploy-Railway%20%7C%20Vercel-0B0D0E?logo=railway&logoColor=white)](https://railway.app/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An enterprise-grade, full-stack **Online Coding Judge and Competitive Programming Platform**. Built with an **Asynchronous Judge Queue**, real-time **Server-Sent Events (SSE)** execution streaming, an integrated **VS Code Monaco Editor**, a high-speed **Cloud Execution Engine (Judge0 CE)**, **Draggable Split-Pane Workspaces**, **Peak Memory Profiling (MB)**, **Interactive Contests with Live Standings**, **365-day Activity Heatmaps**, and a **Community Discussion Forum**.

</div>

---

## 🌟 Key Platform Features

### 1. ⚙️ Asynchronous Judge Queue & Deep Profiling
- **Non-Blocking Ingestion**: Submissions respond immediately with `HTTP 202 Accepted` and are placed in a FIFO queue.
- **Worker Concurrency Control**: Configurable worker pool (default: 2 parallel runners) manages judging throughput and system stability.
- **Live SSE Progress Updates**: Streams real-time execution states directly to the user's browser:
  $$\text{Queued} \longrightarrow \text{Compiling} \longrightarrow \text{Running Test } X/Y \longrightarrow \text{Accepted / Verdict}$$
- **💾 Peak Memory Consumption Tracking**: Accurate peak memory measurement in Megabytes (`MB`) alongside execution runtime (`ms`).
- **📊 Performance Benchmark Percentiles**: Evaluates and displays dynamic percentile rankings (e.g. *⏱️ Beats 94.2% | 💾 Memory beats 91.0%*).
- **🧪 Per-Testcase Diagnostic Matrix**: Interactive matrix displaying individual statuses, runtimes, and memory footprints for every evaluated testcase.

### 2. 💻 VS Code Monaco Editor & Draggable Workspace
- **↔️ Draggable Split-Pane Workspace (LeetCode Style)**:
  - **Horizontal Split**: Drag divider between Problem Statement and Code Workspace to customize pane widths.
  - **Vertical Split**: Drag divider between Monaco Editor and the Testcase / Results Console to adjust console height.
  - **Persistence & Reset**: Remembers custom split ratios in `localStorage`; **double-click** any divider to reset to default.
- **Multi-Language IDE**: Native syntax highlighting, bracket colorization, code folding, and auto-indentation for:
  - 🟨 **JavaScript (Node.js 20)**
  - 🟦 **Python 3.12**
  - 🔷 **C++ (GCC 14)**
  - ☕ **Java (JDK 17)**
- **🧹 Smart Multi-Language Code Formatter**: Intelligent, custom language-aware formatter supporting Python (indentation depth, colon-blocks, and dedent tracking), C++, Java, and JavaScript (`Shift + Alt + F` or click **"Format"**).
- **↺ Instant Editor Reset**: Reverts Monaco editor buffer directly to clean starter templates with immediate visual feedback (`✓ Formatted!`, `↺ Reset!`).
- **Draft Persistence**: Code is automatically cached in `localStorage` per problem and language — drafts are never lost on refresh.
- **Keybindings**: `Ctrl + Enter` (Run Code) and `Ctrl + Shift + Enter` (Submit Solution).

### 3. 🔍 Side-by-Side Diff Viewer & Multi-Case Playground
- **Side-by-Side Output Diff**: Visual comparison card displaying **Expected Output vs Actual Output** with highlighted diffs and one-click copy buttons.
- **Multi-Testcase Tabs**: Dedicated `Case 1`, `Case 2`, `+ Add Case` tabs in the custom test runner.
- **Sparkles Quick Sample Loader**: Click **"Load Sample Cases"** to automatically populate all problem example inputs into test tabs in one click.
- **One-Click Example Copy**: Interactive floating copy buttons on example input/output blocks in problem statements.
- **⚠️ Full Error Traceback & Compiler Stderr**: Complete compiler errors and runtime tracebacks (e.g. Python `ValueError`, C++ segmentation faults) are surfaced with visual alerts in the results panel.

### 4. ☁️ High-Speed Cloud Execution Engine (Judge0 CE)
All user code is executed securely via cloud-based judge infrastructure powered by **Judge0 CE**:
- **Zero Local Docker Dependency**: No local Docker daemon or heavy containers required on your machine or deployment server.
- **Ultra-Low Latency**: Near-instant execution (< 5ms runner spin-up for compiled C++ / Python / JS).
- **Precise Profiling**: Accurate millisecond-level execution runtimes and peak memory profiling.
- **Comprehensive Status Detection**: Full support for Accepted (3), Time Limit Exceeded (5), Compilation Error (6), and Runtime Errors (7–14).
- **Cloud-Ready**: Works out of the box on cloud hosting platforms such as Railway, Render, Fly.io, and AWS without privileged container requirements.

### 5. 🏆 Interactive Contests Engine & Dynamic Standings
- **Live Countdown Timer**: Dynamic clock transitioning smoothly between **Upcoming**, **Live**, and **Concluded** states.
- **Contest Problem Sets**: Problems labeled by contest order (**A**, **B**, **C**) with custom score weights (e.g. 100 pts, 200 pts, 300 pts).
- **ICPC / LeetCode Scoreboard Matrix**:
  - Live scoreboard tracking Total Score, Time Penalty, and individual problem attempt matrices.
  - Solved problems display solve time and attempt count (`+1`, `+2 (14m)`); failed attempts display penalty markers (`-2`).
- **One-Click Registration**: Track contest participants with dedicated participant rosters.

### 6. 📊 User Profile, Solving Stats & 365-Day Activity Heatmap
- **Difficulty Breakdown**: Visual progress bars tracking solved problems across **Easy**, **Medium**, and **Hard** tiers.
- **365-Day Contribution Graph**: 52-week activity heatmap with green intensity tiers and hover tooltips showing daily submission frequencies.
- **Source Code Viewer Modal**: Inspect past submissions with a read-only Monaco Editor, runtime benchmarks, verdict tags, and one-click code copying.
- **Safe Special Character Routing**: Profiles and leaderboard links safely handle handles with special characters (e.g., `#`, `@`) using URI encoding and a dedicated `/api/users/me/profile` endpoint.

### 7. 💬 Community Discussion & Editorial Forum
- **Categorized Forums**: Filter and post discussions across **Solutions**, **Help**, **Contests**, and **Algorithms**.
- **Interactive Upvoting**: Upvote helpful community explanations and time complexity breakdowns.
- **Search & Filter**: Find editorials and approaches by keyword, topic, or author.

---

## 🏛️ System Architecture

```text
                                  ┌────────────────────────────────────────────────────────┐
                                  │                  React 18 + Vite Client                │
                                  │  (SplitPane • Monaco IDE • DiffViewer • Heatmaps)     │
                                  └───────────────▲────────────────────────▲───────────────┘
                                                  │                        │
                                     HTTP / REST API              Server-Sent Events (SSE)
                                  (Auth, Problems, Run)           (Live Verdict Stream)
                                                  │                        │
                                  ┌───────────────▼────────────────────────┴───────────────┐
                                  │                   Express.js API Server                │
                                  │         (JWT Auth • Auto-Migration • Nixpacks)         │
                                  └───────────────┬────────────────────────▲───────────────┘
                                                  │                        │
                                            Enqueue Job               Emit Progress
                                                  │                        │
                                  ┌───────────────▼────────────────────────┴───────────────┐
                                  │               JudgeQueue Concurrency Engine            │
                                  │           (Worker Pool • Concurrency Limit = 2)        │
                                  └───────────────┬────────────────────────────────────────┘
                                                  │
                                            Cloud Execution (?wait=true)
                                                  │
                                  ┌───────────────▼────────────────────────────────────────┐
                                  │                 Judge0 CE Cloud Sandbox                │
                                  │     Node.js 20 • Python 3.12 • GCC 14.1 • JDK 17       │
                                  │        (Precise CPU Timing • Memory Footprint)         │
                                  └────────────────────────────────────────────────────────┘
                                                  │
                                             Write Results
                                                  │
                                  ┌───────────────▼────────────────────────────────────────┐
                                  │                    MySQL 8.0 Database                  │
                                  │  (Users • Problems • Submissions • Contests • Posts)   │
                                  └────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema Overview

The database schema is managed automatically upon server startup via non-destructive auto-migrations:

- `users` — User credentials, bcrypt password hashes, and profile timestamps.
- `problems` — Problem statements, difficulty levels, tags, input/output formats, examples, and solved counts.
- `test_cases` — Sample and hidden test cases for automated judging.
- `submissions` — Submission source code, language, verdict, runtime, `memory_mb`, passed/total test count, error detail, and contest ID.
- `contests` — Contest metadata, start times, durations, and statuses (`Upcoming`, `Live`, `Finished`).
- `contest_problems` — Problem-to-contest mapping with letter labels (`A`, `B`, `C`) and score weights.
- `contest_registrations` — User contest registrations.
- `discussions` — Community forum posts, categories, content, likes, and reply counts.

---

## 🔌 API Reference

### Authentication & User Profile
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register a new coder account | No |
| `POST` | `/api/auth/login` | Authenticate and obtain JWT token | No |
| `GET` | `/api/users/me/profile` | Retrieve authenticated user's profile and stats safely | **Yes** |
| `GET` | `/api/users/:username/profile` | Get solve stats, 365-day heatmap data, and recent submissions | No |

### Problems & Execution
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/problems` | List all problems in catalog | No |
| `GET` | `/api/problems/:slug` | Retrieve problem statement and sample test cases | No |
| `POST` | `/api/judge/run` | Execute code against arbitrary custom input ("Run Code") | No |
| `POST` | `/api/submissions` | Enqueue an official submission for judging (`HTTP 202`) | **Yes** |
| `GET` | `/api/submissions/:id/stream` | Server-Sent Events (SSE) live progress stream | No |
| `GET` | `/api/submissions/:id` | Lookup submission verdict and status | No |
| `GET` | `/api/submissions/:id/code` | Retrieve submitted source code for Monaco viewer modal | No |
| `GET` | `/api/submissions/me` | Fetch logged-in user's submission history | **Yes** |

### Contests & Scoreboard
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/contests` | List all upcoming and active contests | No |
| `GET` | `/api/contests/:id` | Contest overview, problem set, and registration status | Optional |
| `POST` | `/api/contests/:id/register` | Register authenticated user for a contest | **Yes** |
| `GET` | `/api/contests/:id/standings` | Real-time ICPC penalty standings and problem matrix | No |

### Community Discussions
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/discuss` | List discussions with category and search filters | No |
| `POST` | `/api/discuss` | Create a new discussion / solution thread | **Yes** |
| `POST` | `/api/discuss/:id/like` | Upvote a discussion post | No |

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have the following installed on your machine:
- [Node.js (v18+)](https://nodejs.org/)
- [MySQL Server (v8.0+)](https://dev.mysql.com/downloads/mysql/) *(or a cloud MySQL instance like Railway MySQL, Aiven, or PlanetScale)*
*(Note: Docker is **not required** — code execution is handled natively by the cloud judge engine).*

### 2. Database Setup
Log into MySQL and initialize the database:
```powershell
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```
*(The server also includes automatic startup migrations to ensure tables, columns, and sample seed data remain synchronized).*

### 3. Configure Environment Variables
Create a `.env` file inside the `server/` directory:
```env
PORT=5000
CLIENT_URL=http://localhost:5173
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=codeforge
DB_USER=root
DB_PASSWORD=your_mysql_password
JWT_SECRET=your_super_secret_jwt_key_2026
JUDGE_CONCURRENCY=2
```
*Note: If deploying on Railway, the database connection is automatically detected via `MYSQL_URL` or `DATABASE_URL`.*

### 4. Install Dependencies & Run
From the project root directory:
```powershell
# Install root, server, and client dependencies
npm run install:all

# Start both backend and frontend concurrently
npm run dev
```

- **Frontend Client**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000`

---

## ☁️ Cloud Deployment Guide

### Backend on Railway
1. Push your repository to GitHub.
2. Link the repository on [Railway](https://railway.app/).
3. Add a **MySQL** plugin on Railway.
4. Set the following environment variables on the backend service:
   - `JWT_SECRET`: A secure random secret string
   - `CLIENT_URL`: URL of your deployed frontend (e.g. `https://your-frontend.vercel.app`)
5. Railway will automatically build and deploy via the included `railway.json` configuration.

### Frontend on Vercel
1. Import the repository in [Vercel](https://vercel.com/).
2. Set **Root Directory** to `client`.
3. Configure the build environment variable:
   - `VITE_API_BASE_URL`: `https://your-railway-backend.up.railway.app/api`
4. Deploy!

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + Enter` / `Cmd + Enter` | **Run Code** against Custom Input in sandbox |
| `Ctrl + Shift + Enter` / `Cmd + Shift + Enter` | **Submit Solution** to Asynchronous Judge Queue |
| `Shift + Alt + F` / `Ctrl + Shift + F` | **Format Code** in Monaco Editor |
| `Escape` | Close Code Viewer / Discussion Modals |

---

## 📁 Repository Structure

```text
CodeForge/
├── client/                      # React 18 + Vite Frontend
│   ├── src/
│   │   ├── components/          # Reusable Components
│   │   │   ├── CodeEditor.jsx   # Monaco Editor Wrapper, Shortcuts & Formatter
│   │   │   ├── CodeModal.jsx    # Read-only Source Code Viewer Modal
│   │   │   ├── ContestTimer.jsx # Live Countdown Clock
│   │   │   ├── DiffViewer.jsx   # Side-by-Side Expected vs Actual Diff Card
│   │   │   ├── Navbar.jsx       # Header Navigation & Auth Controls
│   │   │   ├── SplitPane.jsx    # Draggable Horizontal/Vertical Resizer
│   │   │   ├── SubmissionHeatmap.jsx # 52-Week Activity Heatmap
│   │   │   └── TestcasePanel.jsx# Multi-Case Input, Matrix & Live Verdicts
│   │   ├── context/
│   │   │   └── AuthContext.jsx  # Global Auth State & Token Management
│   │   ├── pages/               # Application Views
│   │   │   ├── Auth.jsx         # Login & Register Page
│   │   │   ├── ContestDetail.jsx# Contest Problem Set & Overview
│   │   │   ├── Contests.jsx     # Contests List
│   │   │   ├── ContestStandings.jsx # Live ICPC Scoreboard Matrix
│   │   │   ├── Discuss.jsx      # Community Discussions & Editorials
│   │   │   ├── HomePage.jsx     # Landing Page & Metrics
│   │   │   ├── Leaderboard.jsx  # Global User Rankings
│   │   │   ├── ProblemsCatalog.jsx # Search & Filterable Problem List
│   │   │   ├── ProblemWorkspace.jsx# Resizable Split-Screen Workspace
│   │   │   └── Profile.jsx      # User Profile & Stats Dashboard
│   │   ├── api.js               # Axios Client Configuration
│   │   ├── main.jsx             # React App Root, ErrorBoundary & Router
│   │   └── styles.css           # Core Dark Theme Stylesheet
│   └── package.json
├── database/
│   ├── schema.sql               # Complete MySQL Schema DDL
│   └── seed.sql                 # Problems & Test Cases Seed Data
├── server/                      # Node.js + Express Backend
│   ├── src/
│   │   ├── auth.js              # JWT Authentication Middleware
│   │   ├── db.js                # MySQL Connection Pool & Auto-Migration
│   │   ├── index.js             # Express API Endpoints & SSE Streaming
│   │   ├── judge.js             # Judge0 CE Runner, Memory Profiler & Diagnostics
│   │   └── queue.js             # Asynchronous Concurrency JudgeQueue
│   ├── package.json
│   └── railway.json             # Railway Deployment Specification
├── railway.json                 # Monorepo Deployment Configuration
├── package.json                 # Monorepo Workspace Scripts
└── README.md                    # Project Documentation
```

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
