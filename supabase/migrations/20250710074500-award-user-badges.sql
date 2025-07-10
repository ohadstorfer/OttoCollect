
-- Award badges for the current user specifically
SELECT * FROM award_historical_badges_for_user('3f1ca54e-7951-4219-af60-8dccb00d5255');

-- Also run for all users to make sure everyone gets their badges
SELECT * FROM award_historical_badges();
