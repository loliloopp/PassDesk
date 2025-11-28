-- Добавление дополнительных статусов в группу status_hr
-- status_hr_edited, status_hr_edited_compl, status_hr_fired_off

INSERT INTO public.statuses (name, "group", created_at)
VALUES 
  ('status_hr_edited', 'status_hr', CURRENT_TIMESTAMP),
  ('status_hr_edited_compl', 'status_hr', CURRENT_TIMESTAMP),
  ('status_hr_fired_off', 'status_hr', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

