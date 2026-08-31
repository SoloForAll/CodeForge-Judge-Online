CREATE DATABASE IF NOT EXISTS codeforge CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE codeforge;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  username VARCHAR(40) NOT NULL UNIQUE,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS problems (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(100) NOT NULL UNIQUE,
  title VARCHAR(180) NOT NULL,
  difficulty ENUM('Easy','Medium','Hard') NOT NULL,
  tags VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  input_format TEXT,
  output_format TEXT,
  example_input TEXT,
  example_output TEXT,
  solved_count INT UNSIGNED DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS test_cases (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  problem_id INT UNSIGNED NOT NULL,
  input_data TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  is_sample BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS submissions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  problem_id INT UNSIGNED NOT NULL,
  contest_id INT UNSIGNED NULL,
  language VARCHAR(30) NOT NULL,
  source_code MEDIUMTEXT NOT NULL,
  status ENUM('queued', 'processing', 'completed', 'failed') DEFAULT 'queued',
  verdict VARCHAR(30) NOT NULL DEFAULT 'Queued',
  runtime_ms INT UNSIGNED NULL,
  passed_test_cases INT UNSIGNED DEFAULT 0,
  total_test_cases INT UNSIGNED DEFAULT 0,
  error_detail TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS contests (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  starts_at DATETIME NOT NULL,
  duration_minutes INT UNSIGNED NOT NULL,
  status ENUM('Upcoming','Live','Finished') DEFAULT 'Upcoming'
);

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
);

CREATE TABLE IF NOT EXISTS contest_registrations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  contest_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_contest_registration (contest_id, user_id),
  FOREIGN KEY (contest_id) REFERENCES contests(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

