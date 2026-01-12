-- SQL queries to check library associations in the database
-- Run with: sqlite3 prisma/dev.db < scripts/query-library-associations.sql

-- 1. Count total associations per user
SELECT 
    u.email,
    COUNT(ups.id) as total_associations
FROM User u
LEFT JOIN user_paper_states ups ON u.id = ups.user_id
GROUP BY u.id, u.email
ORDER BY total_associations DESC;

-- 2. Show associations by status for a specific user (replace email)
SELECT 
    ups.status,
    COUNT(*) as count
FROM user_paper_states ups
JOIN User u ON ups.user_id = u.id
WHERE u.email = 'sferrum@distinct.dk'  -- Change this email
GROUP BY ups.status;

-- 3. Show recent associations with paper titles
SELECT 
    u.email,
    p.title,
    ups.status,
    ups.created_at,
    ups.updated_at
FROM user_paper_states ups
JOIN User u ON ups.user_id = u.id
JOIN papers p ON ups.paper_id = p.id
WHERE u.email = 'sferrum@distinct.dk'  -- Change this email
ORDER BY ups.created_at DESC
LIMIT 10;

-- 4. Check if a specific paper is in a user's library
-- (Replace the email and paper title)
SELECT 
    p.title,
    ups.status,
    ups.created_at
FROM user_paper_states ups
JOIN User u ON ups.user_id = u.id
JOIN papers p ON ups.paper_id = p.id
WHERE u.email = 'sferrum@distinct.dk'
  AND p.title LIKE '%Graphicality%'  -- Change the search term
LIMIT 5;

