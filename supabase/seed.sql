insert into public.activity_types (key, label, base_xp, daily_cap, category, icon, requires_proof, is_active)
values
  ('resume_update', 'Update / tailor resume', 20, 1, 'resume', 'file-text', false, true),
  ('job_application', 'Submit a job application', 30, 5, 'applications', 'briefcase', false, true),
  ('coffee_chat_sent', 'Send a coffee-chat / networking request', 40, 5, 'networking', 'send', false, true),
  ('coffee_chat_completed', 'Complete a coffee chat / info interview', 75, 3, 'networking', 'coffee', false, true),
  ('mock_interview', 'Mock interview / interview prep', 60, 3, 'interview', 'mic', false, true),
  ('real_interview', 'Real interview (phone / onsite)', 100, 3, 'interview', 'phone', false, true),
  ('profile_update', 'Update LinkedIn / portfolio', 15, 1, 'resume', 'linkedin', false, true),
  ('skill_practice', 'Skill lesson / practice problem', 10, 5, 'skill', 'book-open', false, true),
  ('daily_checkin', 'Daily check-in', 5, 1, 'engagement', 'check-circle', false, true);
