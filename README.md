<div align="center">

# ⚡ CodeForge — Online Coding Judge & Competitive Platform

[![React](https://img.shields.io/badge/Frontend-React%2018%20%7C%20Vite-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js%20%7C%20Express-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![MySQL](https://img.shields.io/badge/Database-MySQL%208.0-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Docker](https://img.shields.io/badge/Sandbox-Docker%20Containers-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Monaco Editor](https://img.shields.io/badge/Editor-VS%20Code%20Monaco-007ACC?logo=visualstudiocode&logoColor=white)](https://microsoft.github.io/monaco-editor/)

An enterprise-grade, full-stack **Online Coding Judge and Competitive Programming Platform**. Built with an **Asynchronous Judge Queue**, real-time **Server-Sent Events (SSE)** execution streaming, an integrated **VS Code Monaco Editor**, hardened **Docker Sandboxes**, **Interactive Contests with Live Standings**, **365-day Activity Heatmaps**, and a **Community Discussion Forum**.

</div>

---

## 🌟 Key Platform Features

### 1. ⚙️ Asynchronous Judge Queue & Real-Time Streaming
- **Non-Blocking Ingestion**: Submissions respond immediately with `HTTP 202 Accepted` and are placed in a FIFO queue.
- **Worker Concurrency Control**: Configurable worker pool (default: 2 parallel runners) prevents Docker container exhaustion and system overload.
- **Live SSE Progress Updates**: Streams real-time execution states directly to the user's browser:
  $$\text{Queued} \longrightarrow \text{Compiling} \longrightarrow \text{Running Test } X/Y \longrightarrow \text{Accepted / Verdict}$$
- **Zero-Crash Auto-Migration**: Automatic startup database migration verifies and syncs table schemas non-destructively.

### 2. 💻 VS Code Monaco Editor Experience
- **Multi-Language IDE**: Native syntax highlighting, bracket colorization, code folding, and auto-indentation for:
  - 🟨 **JavaScript (Node.js 20)**
  - 🟦 **Python 3.12**
  - 🔷 **C++17 (GCC 14)**
  - ☕ **Java 21 (OpenJDK Temurin)**
- **Draft Persistence**: Code is automatically cached in `localStorage` per problem and language — drafts are never lost on page refresh.
- **Custom Keybindings**:
  - `Ctrl + Enter` / `Cmd + Enter` $\to$ **Run Code** (Arbitrary custom test input)
  - `Ctrl + Shift + Enter` $\to$ **Submit Solution** (Hidden judge test suite)
- **Reset to Template**: Instant one-click restoration of boilerplate starter code.

### 3. 🛡️ Hardened Multi-Language Docker Sandbox
All user code is executed in ephemeral, isolated Docker containers with strict resource and security constraints:
- 🚫 **Network Disabled**: `--network none` prevents outbound sockets or network requests.
- 💾 **Memory & CPU Caps**: Memory clamped to 256MB (`--memory 256m`, `--memory-swap 256m`) and CPU throttled (`--cpus 0.5`).
- ⏱️ **Process & PID Quotas**: `--pids-limit 64` prevents fork bombs.
- 🔒 **Least Privilege Security**: `--read-only` root filesystem, `--cap-drop ALL`, and `--security-opt no-new-privileges`.
- 📁 **Isolated Storage**: Temporary in-memory compilation workspace via `--tmpfs /tmp` and `--tmpfs /work`.

### 4. 🏆 Interactive Contests Engine & Dynamic Standings
- **Live Countdown Timer**: Dynamic clock transitioning smoothly between **Upcoming**, **Live**, and **Concluded** states.
- **Contest Problem Sets**: Problems labeled by contest order (**A**, **B**, **C**) with custom score weights (e.g. 100 pts, 200 pts, 300 pts).
- **ICPC / LeetCode Scoreboard Matrix**:
  - Live scoreboard tracking Total Score, Time Penalty, and individual problem attempt matrices.
  - Solved problems display solve time and attempt count (`+1`, `+2 (14m)`); failed attempts display penalty markers (`-2`).
- **One-Click Registration**: Track contest participants with dedicated participant rosters.

### 5. 📊 User Profile, Solving Stats & 365-Day Activity Heatmap
- **Difficulty Breakdown**: Visual progress bars tracking solved problems across **Easy**, **Medium**, and **Hard** tiers.
- **365-Day Contribution Graph**: 52-week activity heatmap with green intensity tiers and hover tooltips showing daily submission frequencies.
- **Source Code Viewer Modal**: Inspect past submissions with a read-only Monaco Editor, runtime benchmarks, verdict tags, and one-click code copying.
- **Public Profiles**: Share progress and stats via `/profile` or `/u/:username`.

### 6. 💬 Community Discussion & Editorial Forum
- **Categorized Forums**: Filter and post discussions across **Solutions**, **Help**, **Contests**, and **Algorithms**.
- **Interactive Upvoting**: Upvote helpful community explanations and time complexity breakdowns.
- **Search & Filter**: Find editorials and approaches by keyword, topic, or author.

---

## 🏛️ System Architecture

```text
                                  ┌────────────────────────────────────────────────────────┐
                                  │                  React 18 + Vite Client                │
                                  │  (Monaco Editor • Activity Heatmap • Contest Matrix)  │
                                  └───────────────▲────────────────────────▲───────────────┘
                                                  │                        │
                                     HTTP / REST API              Server-Sent Events (SSE)
                                  (Auth, Problems, Run)           (Live Verdict Stream)
                                                  │                        │
                                  ┌───────────────▼────────────────────────┴───────────────┐
                                  │                   Express.js API Server                │
                                  │               (JWT Auth • Auto-Migration)              │
                                  └───────────────┬────────────────────────▲───────────────┘
                                                  │                        │
                                            Enqueue Job               Emit Progress
                                                  │                        │
                                  ┌───────────────▼────────────────────────┴───────────────┐
                                  │               JudgeQueue Concurrency Engine            │
                                  │           (Worker Pool • Concurrency Limit = 2)        │
                                  └───────────────┬────────────────────────────────────────┘
                                                  │
                                            Spawn Sandbox
                                                  │
                                  ┌───────────────▼────────────────────────────────────────┐
                                  │               Docker Isolated Container                │
                                  │    Node:20 • Python:3.12 • GCC:14 • Temurin:21-JDK     │
                                  │   (--network none • 256MB RAM • Read-Only • Cap-Drop)  │
                                  └────────────────────────────────────────────────────────┘
                                                  │
                                             Write Results
                                                  │
                                  ┌───────────────▼────────────────────────────────────────┐
                                  │                    MySQL 8.0 Database                  │
                                  │    (Users • Problems • Submissions • Contests • Posts) │
                                  └────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema Overview

The database schema is managed automatically upon server startup via non-destructive auto-migrations:

- `users` — User credentials, bcrypt password hashes, and profile timestamps.
- `problems` — Problem statements, difficulty levels, tags, input/output formats, examples, and solved counts.
- `test_cases` — Sample and hidden test cases for automated judging.
- `submissions` — Submission source code, language, verdict, runtime, passed/total test count, error detail, and contest ID.
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
- [MySQL Server (v8.0+)](https://dev.mysql.com/downloads/mysql/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) *(running with Linux containers)*

### 2. Pull Runner Docker Images
Pull the lightweight execution environments once:
```powershell
docker pull node:20-alpine
docker pull python:3.12-alpine
docker pull gcc:14
docker pull eclipse-temurin:21-jdk-alpine
```

### 3. Database Setup
Log into MySQL and initialize the database using the provided schema and seed files:
```powershell
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```
*(The server also includes automatic startup migration to ensure tables and columns remain synced).*

### 4. Configure Environment Variables
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

### 5. Install Dependencies & Run
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

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + Enter` / `Cmd + Enter` | **Run Code** against Custom Input in Docker sandbox |
| `Ctrl + Shift + Enter` / `Cmd + Shift + Enter` | **Submit Solution** to Asynchronous Judge Queue |
| `Escape` | Close Code Viewer / Discussion Modals |

---

## 📁 Repository Structure

```text
CodeForge/
├── client/                      # React 18 + Vite Frontend
│   ├── src/
│   │   ├── components/          # Reusable Components
│   │   │   ├── CodeEditor.jsx   # Monaco Editor Wrapper & Shortcuts
│   │   │   ├── CodeModal.jsx    # Read-only Source Code Viewer Modal
│   │   │   ├── ContestTimer.jsx # Live Countdown Clock
│   │   │   ├── Navbar.jsx       # Header Navigation & Auth Controls
│   │   │   ├── SubmissionHeatmap.jsx # 52-Week Activity Heatmap
│   │   │   └── TestcasePanel.jsx# Custom Input & Live SSE Verdicts
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
│   │   │   ├── ProblemWorkspace.jsx# Split-screen Monaco Workspace
│   │   │   └── Profile.jsx      # User Profile & Stats Dashboard
│   │   ├── api.js               # Axios Client Configuration
│   │   ├── main.jsx             # React App Root & Router
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
│   │   ├── judge.js             # Docker Sandbox Runner & Stdin Handler
│   │   └── queue.js             # Asynchronous Concurrency JudgeQueue
│   └── package.json
├── package.json                 # Monorepo Workspace Scripts
└── README.md                    # Project Documentation
```

---
