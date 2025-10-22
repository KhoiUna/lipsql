-- Postgres: seed_data.sql

-- Enable uuid extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

TRUNCATE TABLE videos, choices, questions, quiz_sets, cards, decks RESTART IDENTITY CASCADE;

-- Insert 10000 decks
INSERT INTO decks (user_id, title, source, is_pending, failed, is_curating_video, curating_video_failed)
SELECT 
    'user_' || (random() * 10)::int,
    'Deck ' || i || ' - ' || 
    (ARRAY['Biology', 'Chemistry', 'Physics', 'History', 'Mathematics', 'Literature', 'Computer Science', 'Geography'])[floor(random() * 8 + 1)],
    (ARRAY['youtube', 'pdf', 'text', 'web'])[floor(random() * 4 + 1)],
    i % 5 = 0,  -- 20% pending
    i % 20 = 0, -- 5% failed
    i % 10 = 0, -- 10% curating video
    i % 50 = 0  -- 2% curating video failed
FROM generate_series(1, 10000) AS i;

-- Insert 1,000,000 cards
INSERT INTO cards (deck_id, question, answer, created_at, starred, position)
SELECT 
    (random() * 99 + 1)::int,
    'Question ' || i || ': ' || 
    (ARRAY[
        'What is the definition of',
        'Explain the concept of',
        'How does',
        'Why is',
        'When did',
        'Where is',
        'Who discovered'
    ])[floor(random() * 7 + 1)] || ' topic ' || (random() * 100)::int || '?',
    'Answer ' || i || ': ' ||
    (ARRAY[
        'This refers to the fundamental principle',
        'The main characteristic is',
        'Research shows that',
        'The primary reason is',
        'Historical records indicate',
        'Located in the region of',
        'Discovered by researchers in'
    ])[floor(random() * 7 + 1)] || ' details about topic ' || (random() * 100)::int,
    NOW() - (random() * 365 || ' days')::interval,
    random() > 0.8,  -- 20% starred
    i % 100
FROM generate_series(1, 1000000) AS i;

-- Insert 10000 quiz sets (some decks have quiz sets)
INSERT INTO quiz_sets (deck_id, title, is_pending, failed, custom_prompt)
SELECT 
    (random() * 99 + 1)::int,
    'Quiz Set ' || i || ' - ' ||
    (ARRAY['Beginner', 'Intermediate', 'Advanced', 'Expert', 'Review'])[floor(random() * 5 + 1)],
    i % 5 = 0,  -- 20% pending
    i % 25 = 0, -- 4% failed
    CASE WHEN random() > 0.7 THEN 'Custom prompt for quiz generation ' || i ELSE NULL END
FROM generate_series(1, 10000) AS i;

-- Insert 10000 questions
INSERT INTO questions (quiz_set_id, content, correct_choice, explanation)
SELECT 
    (random() * 49 + 1)::int,
    'Question ' || i || ': ' ||
    (ARRAY[
        'Which of the following best describes',
        'What is the primary function of',
        'How many',
        'In what year did',
        'Which scientist discovered',
        'What percentage of',
        'Which formula represents'
    ])[floor(random() * 7 + 1)] || ' the concept?',
    (random() * 3)::int,  -- Random correct choice (0-3)
    'Explanation ' || i || ': ' ||
    (ARRAY[
        'This is correct because research demonstrates',
        'The evidence supports this conclusion through',
        'Historical analysis reveals that',
        'Scientific studies have proven',
        'The fundamental principle shows'
    ])[floor(random() * 5 + 1)] || ' key findings.'
FROM generate_series(1, 10000) AS i;

-- Insert 10000 choices
INSERT INTO choices (question_id, content)
SELECT 
    ((i - 1) / 4 + 1)::int,  -- 4 choices per question
    'Choice ' || chr(65 + (i - 1) % 4) || ': ' ||
    (ARRAY[
        'Approximately',
        'Exactly',
        'More than',
        'Less than',
        'Between',
        'Around',
        'Nearly'
    ])[floor(random() * 7 + 1)] || ' ' || (random() * 1000)::int || ' ' ||
    (ARRAY['units', 'items', 'cases', 'instances', 'examples', 'samples'])[floor(random() * 6 + 1)]
FROM generate_series(1, 10000) AS i;

-- Insert 10000 videos
INSERT INTO videos (deck_id, title, video_id, thumbnail_url, description, channel_title)
SELECT 
    (random() * 99 + 1)::int,
    'Educational Video ' || i || ' - ' ||
    (ARRAY['Tutorial', 'Lecture', 'Demonstration', 'Overview', 'Deep Dive'])[floor(random() * 5 + 1)],
    'vid_' || lpad(i::text, 11, '0'),
    'https://img.youtube.com/vi/vid_' || lpad(i::text, 11, '0') || '/maxresdefault.jpg',
    'Description for video ' || i || ' covering important educational content.',
    (ARRAY[
        'EduChannel',
        'LearnHub',
        'ScienceDaily',
        'MathMaster',
        'HistoryNow',
        'TechTutorials'
    ])[floor(random() * 6 + 1)] || ' ' || (random() * 1000)::int
FROM generate_series(1, 10000) AS i;

-- Update updated_at timestamps randomly for some records
UPDATE cards SET updated_at = NOW() - (random() * 180 || ' days')::interval WHERE random() > 0.5;
UPDATE decks SET updated_at = NOW() - (random() * 180 || ' days')::interval WHERE random() > 0.5;
UPDATE quiz_sets SET updated_at = NOW() - (random() * 180 || ' days')::interval WHERE random() > 0.5;
UPDATE questions SET updated_at = NOW() - (random() * 180 || ' days')::interval WHERE random() > 0.5;
UPDATE choices SET updated_at = NOW() - (random() * 180 || ' days')::interval WHERE random() > 0.5;
UPDATE videos SET updated_at = NOW() - (random() * 180 || ' days')::interval WHERE random() > 0.5;

-- Display summary
SELECT 'Data seeded successfully!' AS status;
SELECT 'Decks: ' || COUNT(*) FROM decks;
SELECT 'Cards: ' || COUNT(*) FROM cards;
SELECT 'Quiz Sets: ' || COUNT(*) FROM quiz_sets;
SELECT 'Questions: ' || COUNT(*) FROM questions;
SELECT 'Choices: ' || COUNT(*) FROM choices;
SELECT 'Videos: ' || COUNT(*) FROM videos;