USE codeforge;
INSERT INTO problems (slug,title,difficulty,tags,description,input_format,output_format,example_input,example_output,solved_count) VALUES
('two-sum','Two Sum','Easy','Arrays, Hash Map','Given an array of integers and a target, return the indices of two numbers that add up to the target.','First line: n and target. Second line: n integers.','Print the two zero-based indices.','4 9\n2 7 11 15','0 1',284),
('valid-parentheses','Valid Parentheses','Easy','Stack, Strings','Given a string containing brackets, determine whether it is valid.','A string of brackets.','Print true or false.','()[]{}','true',196),
('longest-substring','Longest Substring Without Repeating Characters','Medium','Strings, Sliding Window','Find the length of the longest substring without repeated characters.','A lowercase string.','Print the maximum length.','abcabcbb','3',143),
('merge-intervals','Merge Intervals','Medium','Arrays, Sorting','Merge all overlapping intervals.','Number of intervals followed by start/end pairs.','Print merged intervals.','3\n1 3\n2 6\n8 10','1 6\n8 10',87);
INSERT INTO contests (title,starts_at,duration_minutes,status) VALUES ('Weekly Challenge #1','2026-08-30 18:00:00',90,'Upcoming'),('Algorithm Sprint','2026-09-06 10:00:00',120,'Upcoming');
