ALTER TABLE requests
  DROP CONSTRAINT IF EXISTS requests_status_check;

ALTER TABLE requests
  ADD CONSTRAINT requests_status_check
  CHECK (status IN ('new', 'in_review', 'converted', 'declined'));

UPDATE requests
SET status = 'in_review'
WHERE status = 'assessment_needed';

UPDATE requests
SET status = 'new'
WHERE status = 'overdue';
