# CodeForge — Online Coding Judge MVP

A presentation-ready full-stack coding-practice project. It demonstrates the complete **React frontend → Express REST API → MySQL database** flow without relying on copied code.

## What works

- Register and login using JWT sessions (passwords are hashed with bcrypt)
- MySQL `users`, `problems`, `submissions`, `contests`, and `contest_problems` tables
- Problem browser and detail/code-submission screen
- Submission history for the logged-in user
- Contest list and live leaderboard computed from stored submissions
- Polished responsive dashboard

## Real local judge engine (JavaScript)

The judge runs submitted JavaScript against hidden MySQL test cases inside a Docker container with **no network**, a 128 MB memory limit, process limits, a read-only filesystem and a 3-second timeout.

1. Install and start Docker Desktop for Windows, then restart VS Code so the `docker` command is available in its terminal.
2. In MySQL Workbench, run `database/judge_migration.sql` once.
3. Pull the small runner image once: `docker pull node:20-alpine`.
4. Restart the app with `npm run dev`.

Supported languages are JavaScript, Python, C++17, and Java 21. Pull their runner images once: `docker pull node:20-alpine`, `docker pull python:3.12-alpine`, `docker pull gcc:14`, and `docker pull eclipse-temurin:21-jdk-alpine`.

Each run has no network, 256 MB memory, a process limit, no Linux capabilities, a read-only submission mount, temporary in-container compiler storage, an output cap, and a time limit. Do not run submitted code directly on Windows or in the Express process.

## Windows / VS Code setup

1. Install Node.js LTS and MySQL Server (MySQL Workbench is optional).
2. In MySQL Workbench, open and run `database/schema.sql`, then `database/seed.sql`.
3. Copy `server/.env.example` to `server/.env` and enter your MySQL password plus a long `JWT_SECRET`.
4. Open this folder in VS Code. In its terminal run:

   ```powershell
   npm install
   npm run install:all
   npm run dev
   ```

5. Visit `http://localhost:5173`. The API is at `http://localhost:5000/api/health`.

## Presentation architecture

```text
React + Vite UI → Axios REST requests → Express API → mysql2 connection pool → MySQL tables
```

For registration, the API validates input, hashes the password, inserts a row in `users`, and responds with a JWT. For submission, the API uses that JWT to identify the user and saves a row in `submissions`; the leaderboard aggregates accepted rows.
