import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'codeforge',
  waitForConnections: true,
  connectionLimit: 10
});

export async function initDatabase() {
  try {
    // 1. Ensure test_cases table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS test_cases (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        problem_id INT UNSIGNED NOT NULL,
        input_data TEXT NOT NULL,
        expected_output TEXT NOT NULL,
        is_sample BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
      )
    `);

    // 2. Ensure is_sample column exists in test_cases
    const [tcCols] = await pool.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'test_cases' AND COLUMN_NAME = 'is_sample'"
    );
    if (tcCols.length === 0) {
      await pool.query('ALTER TABLE test_cases ADD COLUMN is_sample BOOLEAN DEFAULT FALSE');
      console.log('[Database] Added missing is_sample column to test_cases.');
    }

    // 3. Ensure submissions columns exist
    const [subCols] = await pool.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'submissions'"
    );
    const subColNames = subCols.map(c => c.COLUMN_NAME);

    if (!subColNames.includes('status')) {
      await pool.query("ALTER TABLE submissions ADD COLUMN status ENUM('queued', 'processing', 'completed', 'failed') DEFAULT 'queued'");
    }
    if (!subColNames.includes('passed_test_cases')) {
      await pool.query("ALTER TABLE submissions ADD COLUMN passed_test_cases INT UNSIGNED DEFAULT 0");
    }
    if (!subColNames.includes('total_test_cases')) {
      await pool.query("ALTER TABLE submissions ADD COLUMN total_test_cases INT UNSIGNED DEFAULT 0");
    }
    if (!subColNames.includes('error_detail')) {
      await pool.query("ALTER TABLE submissions ADD COLUMN error_detail TEXT NULL");
    }
    if (!subColNames.includes('contest_id')) {
      await pool.query("ALTER TABLE submissions ADD COLUMN contest_id INT UNSIGNED NULL");
    }
    if (!subColNames.includes('memory_mb')) {
      await pool.query("ALTER TABLE submissions ADD COLUMN memory_mb INT UNSIGNED NULL");
    }


    // 4. Ensure contest_problems table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contest_problems (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        contest_id INT UNSIGNED NOT NULL,
        problem_id INT UNSIGNED NOT NULL,
        letter_order VARCHAR(4) NOT NULL DEFAULT 'A',
        points INT UNSIGNED NOT NULL DEFAULT 100,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_contest_problem (contest_id, problem_id),
        FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE CASCADE,
        FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
      )
    `);

    // 5. Ensure contest_registrations table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contest_registrations (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        contest_id INT UNSIGNED NOT NULL,
        user_id INT UNSIGNED NOT NULL,
        registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_contest_registration (contest_id, user_id),
        FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // 6. Seed contest problems if empty
    const [existingCP] = await pool.query('SELECT COUNT(*) as count FROM contest_problems');
    if (existingCP[0].count === 0) {
      await pool.query(`
        INSERT INTO contest_problems (contest_id, problem_id, letter_order, points) VALUES
        (1, 1, 'A', 100),
        (1, 2, 'B', 200),
        (1, 3, 'C', 300),
        (2, 2, 'A', 100),
        (2, 4, 'B', 300)
      `).catch(() => {});
    }

    // 7. Seed test cases if empty
    const [existingTests] = await pool.query('SELECT COUNT(*) as count FROM test_cases');
    if (existingTests[0].count === 0) {
      console.log('[Database] Auto-seeding test cases for default problems...');
      await pool.query(`
        INSERT INTO test_cases (problem_id, input_data, expected_output, is_sample) VALUES
        (1, '4 9\\n2 7 11 15', '0 1', TRUE),
        (1, '3 6\\n3 2 4', '1 2', FALSE),
        (1, '2 6\\n3 3', '0 1', FALSE),
        (1, '5 100\\n10 20 30 40 60', '3 4', FALSE),
        (2, '()[]{}', 'true', TRUE),
        (2, '(]', 'false', FALSE),
        (2, '([)]', 'false', FALSE),
        (2, '{[]}', 'true', FALSE),
        (2, '(((((((((())))))))))', 'true', FALSE),
        (3, 'abcabcbb', '3', TRUE),
        (3, 'bbbbb', '1', FALSE),
        (3, 'pwwkew', '3', FALSE),
        (3, 'abcdef', '6', FALSE),
        (3, 'a', '1', FALSE),
        (4, '3\\n1 3\\n2 6\\n8 10', '1 6\\n8 10', TRUE),
        (4, '2\\n1 4\\n4 5', '1 5', FALSE),
        (4, '1\\n1 4', '1 4', FALSE),
        (4, '4\\n1 3\\n3 5\\n6 7\\n7 8', '1 5\\n6 8', FALSE);
      `);
      console.log('[Database] Test cases seeded successfully.');
    }

    // 8. Ensure discussions table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS discussions (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        category VARCHAR(50) NOT NULL DEFAULT 'Solutions',
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        likes INT UNSIGNED DEFAULT 0,
        replies_count INT UNSIGNED DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // 9. Seed default discussions if empty
    const [existingDiscussions] = await pool.query('SELECT COUNT(*) as count FROM discussions');
    if (existingDiscussions[0].count === 0) {
      const [users] = await pool.query('SELECT id FROM users LIMIT 1');
      if (users.length > 0) {
        const authorId = users[0].id;
        await pool.query(`
          INSERT INTO discussions (user_id, category, title, content, likes, replies_count) VALUES
          (?, 'Solutions', 'Optimal O(n) Hash Map approach for Two Sum in Python & C++', 'Instead of using two nested loops which takes O(n^2), we can use a hash map to store complements in a single pass.', 87, 12),
          (?, 'Help', 'Why did my sliding window solution exceed the 3-second time limit on test case 4?', 'Make sure you are incrementing the left pointer and deleting characters from the set properly to avoid infinite while loops.', 24, 5),
          (?, 'Contests', 'Weekly Challenge #1 Discussion & Editorial thread', 'Great contest everyone! For problem C (Merge Intervals), remember to sort intervals by start time first.', 115, 28),
          (?, 'Algorithms', 'Interval scheduling and greedy sorting patterns cheatsheet', 'Key greedy patterns: 1. Earliest finish time first. 2. Min-heap for active concurrent events. 3. Sweep line algorithm.', 64, 8)
        `, [authorId, authorId, authorId, authorId]).catch(() => {});
      }
    }
  } catch (error) {
    console.warn('[Database] Auto-migration notice:', error.message);
  }
}

