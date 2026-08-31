USE codeforge;

DELETE FROM test_cases;
DELETE FROM contest_problems;
DELETE FROM contests;
DELETE FROM submissions;
DELETE FROM problems;

INSERT INTO problems (id, slug, title, difficulty, tags, description, input_format, output_format, example_input, example_output, solved_count) VALUES
(1, 'two-sum', 'Two Sum', 'Easy', 'Arrays, Hash Map', 'Given an array of integers and a target, return the indices of two numbers that add up to the target.', 'First line: n and target. Second line: n integers.', 'Print the two zero-based indices separated by space.', '4 9\n2 7 11 15', '0 1', 284),
(2, 'valid-parentheses', 'Valid Parentheses', 'Easy', 'Stack, Strings', 'Given a string containing brackets, determine whether it is valid.', 'A string of brackets.', 'Print true or false.', '()[]{}', 'true', 196),
(3, 'longest-substring', 'Longest Substring Without Repeating Characters', 'Medium', 'Strings, Sliding Window', 'Find the length of the longest substring without repeated characters.', 'A lowercase string.', 'Print the maximum length.', 'abcabcbb', '3', 143),
(4, 'merge-intervals', 'Merge Intervals', 'Medium', 'Arrays, Sorting', 'Merge all overlapping intervals.', 'Number of intervals followed by start/end pairs.', 'Print merged intervals.', '3\n1 3\n2 6\n8 10', '1 6\n8 10', 87);

-- Test cases for Problem 1: Two Sum
INSERT INTO test_cases (problem_id, input_data, expected_output, is_sample) VALUES
(1, '4 9\n2 7 11 15', '0 1', TRUE),
(1, '3 6\n3 2 4', '1 2', FALSE),
(1, '2 6\n3 3', '0 1', FALSE),
(1, '5 100\n10 20 30 40 60', '3 4', FALSE);

-- Test cases for Problem 2: Valid Parentheses
INSERT INTO test_cases (problem_id, input_data, expected_output, is_sample) VALUES
(2, '()[]{}', 'true', TRUE),
(2, '(]', 'false', FALSE),
(2, '([)]', 'false', FALSE),
(2, '{[]}', 'true', FALSE),
(2, '(((((((((())))))))))', 'true', FALSE);

-- Test cases for Problem 3: Longest Substring Without Repeating Characters
INSERT INTO test_cases (problem_id, input_data, expected_output, is_sample) VALUES
(3, 'abcabcbb', '3', TRUE),
(3, 'bbbbb', '1', FALSE),
(3, 'pwwkew', '3', FALSE),
(3, 'abcdef', '6', FALSE),
(3, 'a', '1', FALSE);

-- Test cases for Problem 4: Merge Intervals
INSERT INTO test_cases (problem_id, input_data, expected_output, is_sample) VALUES
(4, '3\n1 3\n2 6\n8 10', '1 6\n8 10', TRUE),
(4, '2\n1 4\n4 5', '1 5', FALSE),
(4, '1\n1 4', '1 4', FALSE),
(4, '4\n1 3\n3 5\n6 7\n7 8', '1 5\n6 8', FALSE);

INSERT INTO contests (id, title, starts_at, duration_minutes, status) VALUES 
(1, 'Weekly Challenge #1', '2026-08-30 18:00:00', 90, 'Upcoming'),
(2, 'Algorithm Sprint', '2026-09-06 10:00:00', 120, 'Upcoming');

INSERT INTO contest_problems (contest_id, problem_id, letter_order, points) VALUES
(1, 1, 'A', 100),
(1, 2, 'B', 200),
(1, 3, 'C', 300),
(2, 2, 'A', 100),
(2, 4, 'B', 300);


