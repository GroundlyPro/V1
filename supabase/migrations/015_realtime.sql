-- Enable Supabase Realtime on key tables
ALTER PUBLICATION supabase_realtime ADD TABLE job_visits;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE requests;
