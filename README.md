# CodeForge — Online Coding Judge MVP

A presentation-ready full-stack coding-practice project. It demonstrates the complete **React frontend → Express REST API → MySQL database** flow without relying on copied code.

## What works

- Register and login using JWT sessions (passwords are hashed with bcrypt)
- MySQL `users`, `problems`, `submissions`, `contests`, and `contest_problems` tables
- Problem browser and detail/code-submission screen
- Submission history for the logged-in user
- Contest list and live leaderboard computed from stored submissions
- Polished responsive dashboard

> The MVP deliberately does **not** execute untrusted code. It stores a submission and returns a clearly-labelled demo verdict. A production judge needs an isolated Docker/VM runner and queue.

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
