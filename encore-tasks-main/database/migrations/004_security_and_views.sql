-- =====================================================
-- МИГРАЦИЯ 004: ПОЛИТИКИ БЕЗОПАСНОСТИ И ПРЕДСТАВЛЕНИЯ
-- =====================================================
-- Дата создания: 2024-01-04
-- Описание: Создание политик Row Level Security (RLS) и полезных представлений

-- =====================================================
-- ВКЛЮЧЕНИЕ ROW LEVEL SECURITY
-- =====================================================

-- Включаем RLS для основных таблиц
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- ПОЛИТИКИ БЕЗОПАСНОСТИ ДЛЯ ПОЛЬЗОВАТЕЛЕЙ
-- =====================================================

-- Пользователи могут видеть только свои данные или данные других пользователей в общих проектах
CREATE POLICY users_select_policy ON users
    FOR SELECT
    USING (
        id = current_setting('app.current_user_id')::UUID OR
        current_setting('app.current_user_role') = 'admin' OR
        EXISTS (
            SELECT 1 FROM project_members pm1
            JOIN project_members pm2 ON pm1.project_id = pm2.project_id
            WHERE pm1.user_id = current_setting('app.current_user_id')::UUID
                AND pm2.user_id = users.id
        )
    );

-- Пользователи могут обновлять только свои данные
CREATE POLICY users_update_policy ON users
    FOR UPDATE
    USING (
        id = current_setting('app.current_user_id')::UUID OR
        current_setting('app.current_user_role') = 'admin'
    );

-- Только администраторы могут создавать и удалять пользователей
CREATE POLICY users_insert_policy ON users
    FOR INSERT
    WITH CHECK (current_setting('app.current_user_role') = 'admin');

CREATE POLICY users_delete_policy ON users
    FOR DELETE
    USING (current_setting('app.current_user_role') = 'admin');

-- =====================================================
-- ПОЛИТИКИ БЕЗОПАСНОСТИ ДЛЯ ПРОЕКТОВ
-- =====================================================

-- Пользователи видят только проекты, в которых они участвуют
CREATE POLICY projects_select_policy ON projects
    FOR SELECT
    USING (
        current_setting('app.current_user_role') = 'admin' OR
        created_by = current_setting('app.current_user_id')::UUID OR
        EXISTS (
            SELECT 1 FROM project_members pm
            WHERE pm.project_id = projects.id
                AND pm.user_id = current_setting('app.current_user_id')::UUID
        )
    );

-- Создавать проекты могут все авторизованные пользователи
CREATE POLICY projects_insert_policy ON projects
    FOR INSERT
    WITH CHECK (created_by = current_setting('app.current_user_id')::UUID);

-- Обновлять проекты могут создатели и администраторы
CREATE POLICY projects_update_policy ON projects
    FOR UPDATE
    USING (
        current_setting('app.current_user_role') = 'admin' OR
        created_by = current_setting('app.current_user_id')::UUID
    );

-- Удалять проекты могут создатели и администраторы
CREATE POLICY projects_delete_policy ON projects
    FOR DELETE
    USING (
        current_setting('app.current_user_role') = 'admin' OR
        created_by = current_setting('app.current_user_id')::UUID
    );

-- =====================================================
-- ПОЛИТИКИ БЕЗОПАСНОСТИ ДЛЯ УЧАСТНИКОВ ПРОЕКТОВ
-- =====================================================

-- Видеть участников могут только участники проекта
CREATE POLICY project_members_select_policy ON project_members
    FOR SELECT
    USING (
        current_setting('app.current_user_role') = 'admin' OR
        user_id = current_setting('app.current_user_id')::UUID OR
        EXISTS (
            SELECT 1 FROM project_members pm
            WHERE pm.project_id = project_members.project_id
                AND pm.user_id = current_setting('app.current_user_id')::UUID
        )
    );

-- Добавлять участников могут создатели проектов и администраторы
CREATE POLICY project_members_insert_policy ON project_members
    FOR INSERT
    WITH CHECK (
        current_setting('app.current_user_role') = 'admin' OR
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_members.project_id
                AND p.created_by = current_setting('app.current_user_id')::UUID
        )
    );

-- Удалять участников могут создатели проектов, администраторы и сами участники
CREATE POLICY project_members_delete_policy ON project_members
    FOR DELETE
    USING (
        current_setting('app.current_user_role') = 'admin' OR
        user_id = current_setting('app.current_user_id')::UUID OR
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_members.project_id
                AND p.created_by = current_setting('app.current_user_id')::UUID
        )
    );

-- =====================================================
-- ПОЛИТИКИ БЕЗОПАСНОСТИ ДЛЯ ДОСОК
-- =====================================================

-- Видеть доски могут только участники проекта
CREATE POLICY boards_select_policy ON boards
    FOR SELECT
    USING (
        current_setting('app.current_user_role') = 'admin' OR
        EXISTS (
            SELECT 1 FROM project_members pm
            WHERE pm.project_id = boards.project_id
                AND pm.user_id = current_setting('app.current_user_id')::UUID
        )
    );

-- Создавать доски могут участники проекта
CREATE POLICY boards_insert_policy ON boards
    FOR INSERT
    WITH CHECK (
        current_setting('app.current_user_role') = 'admin' OR
        EXISTS (
            SELECT 1 FROM project_members pm
            WHERE pm.project_id = boards.project_id
                AND pm.user_id = current_setting('app.current_user_id')::UUID
        )
    );

-- Обновлять и удалять доски могут участники проекта
CREATE POLICY boards_update_policy ON boards
    FOR UPDATE
    USING (
        current_setting('app.current_user_role') = 'admin' OR
        EXISTS (
            SELECT 1 FROM project_members pm
            WHERE pm.project_id = boards.project_id
                AND pm.user_id = current_setting('app.current_user_id')::UUID
        )
    );

CREATE POLICY boards_delete_policy ON boards
    FOR DELETE
    USING (
        current_setting('app.current_user_role') = 'admin' OR
        EXISTS (
            SELECT 1 FROM project_members pm
            WHERE pm.project_id = boards.project_id
                AND pm.user_id = current_setting('app.current_user_id')::UUID
        )
    );

-- =====================================================
-- ПОЛИТИКИ БЕЗОПАСНОСТИ ДЛЯ ЗАДАЧ
-- =====================================================

-- Видеть задачи могут только участники проекта
CREATE POLICY tasks_select_policy ON tasks
    FOR SELECT
    USING (
        current_setting('app.current_user_role') = 'admin' OR
        EXISTS (
            SELECT 1 FROM project_members pm
            WHERE pm.project_id = tasks.project_id
                AND pm.user_id = current_setting('app.current_user_id')::UUID
        )
    );

-- Создавать задачи могут участники проекта
CREATE POLICY tasks_insert_policy ON tasks
    FOR INSERT
    WITH CHECK (
        current_setting('app.current_user_role') = 'admin' OR
        reporter_id = current_setting('app.current_user_id')::UUID AND
        EXISTS (
            SELECT 1 FROM project_members pm
            WHERE pm.project_id = tasks.project_id
                AND pm.user_id = current_setting('app.current_user_id')::UUID
        )
    );

-- Обновлять задачи могут участники проекта
CREATE POLICY tasks_update_policy ON tasks
    FOR UPDATE
    USING (
        current_setting('app.current_user_role') = 'admin' OR
        EXISTS (
            SELECT 1 FROM project_members pm
            WHERE pm.project_id = tasks.project_id
                AND pm.user_id = current_setting('app.current_user_id')::UUID
        )
    );

-- Удалять задачи могут создатели задач и администраторы
CREATE POLICY tasks_delete_policy ON tasks
    FOR DELETE
    USING (
        current_setting('app.current_user_role') = 'admin' OR
        reporter_id = current_setting('app.current_user_id')::UUID
    );

-- =====================================================
-- ПОЛИТИКИ БЕЗОПАСНОСТИ ДЛЯ КОММЕНТАРИЕВ
-- =====================================================

-- Видеть комментарии могут участники проекта
CREATE POLICY comments_select_policy ON comments
    FOR SELECT
    USING (
        current_setting('app.current_user_role') = 'admin' OR
        EXISTS (
            SELECT 1 FROM tasks t
            JOIN project_members pm ON pm.project_id = t.project_id
            WHERE t.id = comments.task_id
                AND pm.user_id = current_setting('app.current_user_id')::UUID
        )
    );

-- Создавать комментарии могут участники проекта
CREATE POLICY comments_insert_policy ON comments
    FOR INSERT
    WITH CHECK (
        current_setting('app.current_user_role') = 'admin' OR
        author_id = current_setting('app.current_user_id')::UUID AND
        EXISTS (
            SELECT 1 FROM tasks t
            JOIN project_members pm ON pm.project_id = t.project_id
            WHERE t.id = comments.task_id
                AND pm.user_id = current_setting('app.current_user_id')::UUID
        )
    );

-- Обновлять комментарии могут только их авторы и администраторы
CREATE POLICY comments_update_policy ON comments
    FOR UPDATE
    USING (
        current_setting('app.current_user_role') = 'admin' OR
        author_id = current_setting('app.current_user_id')::UUID
    );

-- Удалять комментарии могут авторы и администраторы
CREATE POLICY comments_delete_policy ON comments
    FOR DELETE
    USING (
        current_setting('app.current_user_role') = 'admin' OR
        author_id = current_setting('app.current_user_id')::UUID
    );

-- =====================================================
-- ПОЛИТИКИ БЕЗОПАСНОСТИ ДЛЯ УВЕДОМЛЕНИЙ
-- =====================================================

-- Пользователи видят только свои уведомления
CREATE POLICY notifications_select_policy ON notifications
    FOR SELECT
    USING (
        user_id = current_setting('app.current_user_id')::UUID OR
        current_setting('app.current_user_role') = 'admin'
    );

-- Обновлять уведомления могут только их получатели
CREATE POLICY notifications_update_policy ON notifications
    FOR UPDATE
    USING (
        user_id = current_setting('app.current_user_id')::UUID OR
        current_setting('app.current_user_role') = 'admin'
    );

-- Удалять уведомления могут только их получатели
CREATE POLICY notifications_delete_policy ON notifications
    FOR DELETE
    USING (
        user_id = current_setting('app.current_user_id')::UUID OR
        current_setting('app.current_user_role') = 'admin'
    );

-- =====================================================
-- ПОЛИТИКИ БЕЗОПАСНОСТИ ДЛЯ СЕССИЙ
-- =====================================================

-- Пользователи видят только свои сессии
CREATE POLICY user_sessions_select_policy ON user_sessions
    FOR SELECT
    USING (
        user_id = current_setting('app.current_user_id')::UUID OR
        current_setting('app.current_user_role') = 'admin'
    );

-- Пользователи могут удалять только свои сессии
CREATE POLICY user_sessions_delete_policy ON user_sessions
    FOR DELETE
    USING (
        user_id = current_setting('app.current_user_id')::UUID OR
        current_setting('app.current_user_role') = 'admin'
    );

-- =====================================================
-- ПОЛИТИКИ БЕЗОПАСНОСТИ ДЛЯ ЛОГОВ
-- =====================================================

-- Пользователи видят только свои действия или действия в своих проектах
CREATE POLICY activity_log_select_policy ON activity_log
    FOR SELECT
    USING (
        current_setting('app.current_user_role') = 'admin' OR
        user_id = current_setting('app.current_user_id')::UUID OR
        EXISTS (
            SELECT 1 FROM project_members pm
            WHERE pm.project_id = activity_log.project_id
                AND pm.user_id = current_setting('app.current_user_id')::UUID
        )
    );

-- =====================================================
-- СОЗДАНИЕ ПОЛЕЗНЫХ ПРЕДСТАВЛЕНИЙ
-- =====================================================

-- Представление для полной информации о задачах
CREATE OR REPLACE VIEW task_details AS
SELECT 
    t.id,
    t.title,
    t.description,
    t.status,
    t.priority,
    t.deadline,
    t.position,
    t.is_archived,
    t.created_at,
    t.updated_at,
    p.name as project_name,
    p.color as project_color,
    b.name as board_name,
    c.title as column_title,
    c.color as column_color,
    reporter.name as reporter_name,
    reporter.email as reporter_email,
    parent_task.title as parent_task_title,
    (
        SELECT COUNT(*)
        FROM tasks subtasks
        WHERE subtasks.parent_task_id = t.id
    ) as subtasks_count,
    (
        SELECT COUNT(*)
        FROM comments
        WHERE comments.task_id = t.id
    ) as comments_count,
    (
        SELECT COUNT(*)
        FROM attachments
        WHERE attachments.task_id = t.id
    ) as attachments_count,
    (
        SELECT ARRAY_AGG(u.name ORDER BY u.name)
        FROM task_assignees ta
        JOIN users u ON ta.user_id = u.id
        WHERE ta.task_id = t.id
    ) as assignee_names,
    (
        SELECT ARRAY_AGG(tag.name ORDER BY tag.name)
        FROM task_tags tt
        JOIN tags tag ON tt.tag_id = tag.id
        WHERE tt.task_id = t.id
    ) as tag_names
FROM tasks t
JOIN projects p ON t.project_id = p.id
JOIN boards b ON t.board_id = b.id
JOIN columns c ON t.column_id = c.id
JOIN users reporter ON t.reporter_id = reporter.id
LEFT JOIN tasks parent_task ON t.parent_task_id = parent_task.id;

-- Представление для статистики проектов
CREATE OR REPLACE VIEW project_statistics AS
SELECT 
    p.id,
    p.name,
    p.description,
    p.color,
    p.is_archived,
    p.created_at,
    creator.name as creator_name,
    (
        SELECT COUNT(*)
        FROM project_members pm
        WHERE pm.project_id = p.id
    ) as members_count,
    (
        SELECT COUNT(*)
        FROM boards b
        WHERE b.project_id = p.id
    ) as boards_count,
    (
        SELECT COUNT(*)
        FROM tasks t
        WHERE t.project_id = p.id
    ) as total_tasks,
    (
        SELECT COUNT(*)
        FROM tasks t
        WHERE t.project_id = p.id AND t.status = 'todo'
    ) as todo_tasks,
    (
        SELECT COUNT(*)
        FROM tasks t
        WHERE t.project_id = p.id AND t.status = 'in_progress'
    ) as in_progress_tasks,
    (
        SELECT COUNT(*)
        FROM tasks t
        WHERE t.project_id = p.id AND t.status = 'done'
    ) as completed_tasks,
    (
        SELECT COUNT(*)
        FROM tasks t
        WHERE t.project_id = p.id AND t.is_archived = true
    ) as archived_tasks,
    (
        SELECT COUNT(*)
        FROM tasks t
        WHERE t.project_id = p.id AND t.deadline < CURRENT_TIMESTAMP AND t.status != 'done'
    ) as overdue_tasks
FROM projects p
JOIN users creator ON p.created_by = creator.id;

-- Представление для статистики пользователей
CREATE OR REPLACE VIEW user_statistics AS
SELECT 
    u.id,
    u.name,
    u.email,
    u.role,
    u.is_approved,
    u.created_at,
    (
        SELECT COUNT(*)
        FROM project_members pm
        WHERE pm.user_id = u.id
    ) as projects_count,
    (
        SELECT COUNT(*)
        FROM tasks t
        WHERE t.reporter_id = u.id
    ) as created_tasks,
    (
        SELECT COUNT(*)
        FROM task_assignees ta
        WHERE ta.user_id = u.id
    ) as assigned_tasks,
    (
        SELECT COUNT(*)
        FROM task_assignees ta
        JOIN tasks t ON ta.task_id = t.id
        WHERE ta.user_id = u.id AND t.status = 'done'
    ) as completed_tasks,
    (
        SELECT COUNT(*)
        FROM comments c
        WHERE c.author_id = u.id
    ) as comments_count,
    (
        SELECT MAX(al.created_at)
        FROM activity_log al
        WHERE al.user_id = u.id
    ) as last_activity
FROM users u;

-- Представление для активности в реальном времени
CREATE OR REPLACE VIEW recent_activity AS
SELECT 
    al.id,
    al.action_type,
    al.entity_type,
    al.description,
    al.created_at,
    u.name as user_name,
    u.email as user_email,
    p.name as project_name,
    p.color as project_color,
    CASE 
        WHEN al.entity_type = 'task' THEN (
            SELECT t.title
            FROM tasks t
            WHERE t.id = al.entity_id
        )
        WHEN al.entity_type = 'project' THEN (
            SELECT pr.name
            FROM projects pr
            WHERE pr.id = al.entity_id
        )
        ELSE NULL
    END as entity_name
FROM activity_log al
LEFT JOIN users u ON al.user_id = u.id
LEFT JOIN projects p ON al.project_id = p.id
ORDER BY al.created_at DESC;

-- Представление для уведомлений с дополнительной информацией
CREATE OR REPLACE VIEW notification_details AS
SELECT 
    n.id,
    n.type,
    n.title,
    n.message,
    n.is_read,
    n.created_at,
    u.name as user_name,
    u.email as user_email,
    p.name as project_name,
    CASE 
        WHEN n.task_id IS NOT NULL THEN (
            SELECT t.title
            FROM tasks t
            WHERE t.id = n.task_id
        )
        ELSE NULL
    END as task_title
FROM notifications n
JOIN users u ON n.user_id = u.id
LEFT JOIN projects p ON n.project_id = p.id;

-- =====================================================
-- ФУНКЦИИ ДЛЯ РАБОТЫ С КОНТЕКСТОМ БЕЗОПАСНОСТИ
-- =====================================================

-- Функция для установки контекста пользователя
CREATE OR REPLACE FUNCTION set_user_context(
    p_user_id UUID,
    p_user_role VARCHAR(50)
)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_user_id', p_user_id::TEXT, true);
    PERFORM set_config('app.current_user_role', p_user_role, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для очистки контекста пользователя
CREATE OR REPLACE FUNCTION clear_user_context()
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_user_id', '', true);
    PERFORM set_config('app.current_user_role', '', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ЗАВЕРШЕНИЕ МИГРАЦИИ
-- =====================================================

-- Обновление статистики для оптимизатора
ANALYZE;

-- Запись в лог о выполнении миграции
DO $$
BEGIN
    RAISE NOTICE 'Миграция 004_security_and_views.sql успешно выполнена';
END
$$;