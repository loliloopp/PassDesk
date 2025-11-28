-- Добавление новой группы статусов для HR системы
-- Добавляем статусы: status_hr_fired_compl и status_hr_new_compl в группу status_hr

INSERT INTO public.statuses (name, "group", created_at)
VALUES 
  ('status_hr_fired_compl', 'status_hr', CURRENT_TIMESTAMP),
  ('status_hr_new_compl', 'status_hr', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

