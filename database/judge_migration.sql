USE codeforge;

CREATE TABLE IF NOT EXISTS test_cases (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  problem_id INT UNSIGNED NOT NULL,
  input_data TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  is_hidden BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
);

INSERT INTO test_cases (problem_id, input_data, expected_output, is_hidden)
SELECT id, '4 9\n2 7 11 15', '0 1', TRUE FROM problems WHERE slug='two-sum' AND NOT EXISTS (SELECT 1 FROM test_cases t WHERE t.problem_id=problems.id AND t.input_data='4 9\n2 7 11 15');
INSERT INTO test_cases (problem_id, input_data, expected_output, is_hidden)
SELECT id, '()[]{}', 'true', TRUE FROM problems WHERE slug='valid-parentheses' AND NOT EXISTS (SELECT 1 FROM test_cases t WHERE t.problem_id=problems.id AND t.input_data='()[]{}');
INSERT INTO test_cases (problem_id, input_data, expected_output, is_hidden)
SELECT id, 'abcabcbb', '3', TRUE FROM problems WHERE slug='longest-substring' AND NOT EXISTS (SELECT 1 FROM test_cases t WHERE t.problem_id=problems.id AND t.input_data='abcabcbb');
INSERT INTO test_cases (problem_id, input_data, expected_output, is_hidden)
SELECT id, '3\n1 3\n2 6\n8 10', '1 6\n8 10', TRUE FROM problems WHERE slug='merge-intervals' AND NOT EXISTS (SELECT 1 FROM test_cases t WHERE t.problem_id=problems.id AND t.input_data='3\n1 3\n2 6\n8 10');
