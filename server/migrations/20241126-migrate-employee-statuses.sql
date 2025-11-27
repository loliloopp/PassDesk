-- Вставляем все возможные статусы в таблицу справочника
INSERT INTO statuses (name, "group") VALUES
-- Группа "status"
('status_draft', 'status'),
('status_new', 'status'),
('status_tb_passed', 'status'),
('status_processed', 'status'),
-- Группа "status_card"
('status_card_draft', 'status_card'),
('status_card_completed', 'status_card'),
-- Группа "status_active" (employed - для активного сотрудника)
('status_active_employed', 'status_active'),
('status_active_fired', 'status_active'),
('status_active_inactive', 'status_active'),
('status_active_fired_compl', 'status_active'),
-- Группа "status_secure"
('status_secure_allow', 'status_secure'),
('status_secure_block', 'status_secure'),
('status_secure_block_compl', 'status_secure');

-- Переносим статусы из employees в маппинг
-- Для группы "status" (если status_card = 'draft', то status = 'draft')
INSERT INTO employees_statuses_mapping (employee_id, status_id, status_group, created_by, updated_by, created_at, updated_at, is_active)
SELECT 
    e.id,
    s.id,
    'status',
    e.created_by,
    e.updated_by,
    e.created_at,
    e.updated_at,
    true
FROM employees e
JOIN statuses s ON 
    s.name = CASE 
        WHEN e.status_card = 'draft' THEN 'status_draft'
        ELSE 'status_' || e.status 
    END AND s."group" = 'status';

-- Для группы "status_card"
INSERT INTO employees_statuses_mapping (employee_id, status_id, status_group, created_by, updated_by, created_at, updated_at, is_active)
SELECT 
    e.id,
    s.id,
    'status_card',
    e.created_by,
    e.updated_by,
    e.created_at,
    e.updated_at,
    true
FROM employees e
JOIN statuses s ON s.name = 'status_card_' || e.status_card AND s."group" = 'status_card';

-- Для группы "status_active" (NULL означает активный сотрудник)
INSERT INTO employees_statuses_mapping (employee_id, status_id, status_group, created_by, updated_by, created_at, updated_at, is_active)
SELECT 
    e.id,
    s.id,
    'status_active',
    e.created_by,
    e.updated_by,
    e.created_at,
    e.updated_at,
    true
FROM employees e
JOIN statuses s ON 
    s.name = CASE 
        WHEN e.status_active IS NULL THEN 'status_active_employed'
        ELSE 'status_active_' || e.status_active 
    END AND s."group" = 'status_active';

-- Для группы "status_secure"
INSERT INTO employees_statuses_mapping (employee_id, status_id, status_group, created_by, updated_by, created_at, updated_at, is_active)
SELECT 
    e.id,
    s.id,
    'status_secure',
    e.created_by,
    e.updated_by,
    e.created_at,
    e.updated_at,
    true
FROM employees e
JOIN statuses s ON s.name = 'status_secure_' || e.status_secure AND s."group" = 'status_secure';

