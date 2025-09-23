-- =====================================================
-- МИГРАЦИЯ 002: ДОПОЛНИТЕЛЬНЫЕ ТАБЛИЦЫ
-- =====================================================
-- Дата создания: 2024-01-02
-- Описание: Создание таблиц для тегов, вложений, комментариев и уведомлений

-- =====================================================
-- СОЗДАНИЕ ДОПОЛНИТЕЛЬНЫХ ТАБЛИЦ
-- =====================================================

-- Таблица тегов
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#6366f1',
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, project_id)
);

-- Таблица связей задач и тегов
CREATE TABLE IF NOT EXISTS task_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    UNIQUE(task_id, tag_id)
);

-- Таблица вложений
CREATE TABLE IF NOT EXISTS attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(255) NOT NULL,
    uploader_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Таблица комментариев
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    content TEXT NOT NULL,
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    is_edited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Таблица уведомлений
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('task_assigned', 'task_completed', 'task_updated', 'project_updated', 'comment_added', 'deadline_reminder')),
    related_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    related_project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    sent_via_email BOOLEAN DEFAULT FALSE,
    sent_via_telegram BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- СОЗДАНИЕ ИНДЕКСОВ ДЛЯ НОВЫХ ТАБЛИЦ
-- =====================================================

-- Индексы для тегов
CREATE INDEX IF NOT EXISTS idx_tags_project_id ON tags(project_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

-- Индексы для связей задач и тегов
CREATE INDEX IF NOT EXISTS idx_task_tags_task_id ON task_tags(task_id);
CREATE INDEX IF NOT EXISTS idx_task_tags_tag_id ON task_tags(tag_id);

-- Индексы для вложений
CREATE INDEX IF NOT EXISTS idx_attachments_task_id ON attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_attachments_uploader_id ON attachments(uploader_id);
CREATE INDEX IF NOT EXISTS idx_attachments_uploaded_at ON attachments(uploaded_at);

-- Индексы для комментариев
CREATE INDEX IF NOT EXISTS idx_comments_task_id ON comments(task_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_comment_id ON comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);
CREATE INDEX IF NOT EXISTS idx_comments_deleted_at ON comments(deleted_at) WHERE deleted_at IS NULL;

-- Индексы для уведомлений
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_related_task_id ON notifications(related_task_id);
CREATE INDEX IF NOT EXISTS idx_notifications_related_project_id ON notifications(related_project_id);

-- =====================================================
-- ДОБАВЛЕНИЕ ТРИГГЕРОВ ДЛЯ НОВЫХ ТАБЛИЦ
-- =====================================================

-- Триггер для комментариев
DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ФУНКЦИИ ДЛЯ РАБОТЫ С УВЕДОМЛЕНИЯМИ
-- =====================================================

-- Функция для создания уведомления о назначении задачи
CREATE OR REPLACE FUNCTION create_task_assignment_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Создаем уведомление для назначенного пользователя
    INSERT INTO notifications (user_id, title, message, type, related_task_id, related_project_id)
    SELECT 
        NEW.user_id,
        'Вам назначена новая задача',
        'Вам назначена задача "' || t.title || '" в проекте "' || p.name || '"',
        'task_assigned',
        NEW.task_id,
        t.project_id
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    WHERE t.id = NEW.task_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для создания уведомлений при назначении задач
DROP TRIGGER IF EXISTS task_assignment_notification ON task_assignees;
CREATE TRIGGER task_assignment_notification
    AFTER INSERT ON task_assignees
    FOR EACH ROW EXECUTE FUNCTION create_task_assignment_notification();

-- Функция для создания уведомления о новом комментарии
CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Создаем уведомления для всех участников задачи (кроме автора комментария)
    INSERT INTO notifications (user_id, title, message, type, related_task_id, related_project_id)
    SELECT DISTINCT
        ta.user_id,
        'Новый комментарий к задаче',
        'Пользователь ' || u.name || ' добавил комментарий к задаче "' || t.title || '"',
        'comment_added',
        NEW.task_id,
        t.project_id
    FROM task_assignees ta
    JOIN tasks t ON ta.task_id = t.id
    JOIN users u ON NEW.author_id = u.id
    WHERE ta.task_id = NEW.task_id 
        AND ta.user_id != NEW.author_id;
    
    -- Также уведомляем автора задачи, если он не автор комментария
    INSERT INTO notifications (user_id, title, message, type, related_task_id, related_project_id)
    SELECT 
        t.reporter_id,
        'Новый комментарий к задаче',
        'Пользователь ' || u.name || ' добавил комментарий к задаче "' || t.title || '"',
        'comment_added',
        NEW.task_id,
        t.project_id
    FROM tasks t
    JOIN users u ON NEW.author_id = u.id
    WHERE t.id = NEW.task_id 
        AND t.reporter_id != NEW.author_id
        AND NOT EXISTS (
            SELECT 1 FROM task_assignees ta 
            WHERE ta.task_id = NEW.task_id AND ta.user_id = t.reporter_id
        );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для создания уведомлений при добавлении комментариев
DROP TRIGGER IF EXISTS comment_notification ON comments;
CREATE TRIGGER comment_notification
    AFTER INSERT ON comments
    FOR EACH ROW EXECUTE FUNCTION create_comment_notification();

-- =====================================================
-- ФУНКЦИИ ДЛЯ РАБОТЫ С ТЕГАМИ
-- =====================================================

-- Функция для получения или создания тега
CREATE OR REPLACE FUNCTION get_or_create_tag(
    p_name VARCHAR(100),
    p_color VARCHAR(7) DEFAULT '#6366f1',
    p_project_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    tag_id UUID;
BEGIN
    -- Попытка найти существующий тег
    SELECT id INTO tag_id
    FROM tags
    WHERE name = p_name AND project_id = p_project_id;
    
    -- Если тег не найден, создаем новый
    IF tag_id IS NULL THEN
        INSERT INTO tags (name, color, project_id)
        VALUES (p_name, p_color, p_project_id)
        RETURNING id INTO tag_id;
    END IF;
    
    RETURN tag_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ФУНКЦИИ ДЛЯ СТАТИСТИКИ
-- =====================================================

-- Функция для получения статистики пользователя
CREATE OR REPLACE FUNCTION get_user_statistics(
    p_user_id UUID,
    p_date_from TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_date_to TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE(
    total_tasks BIGINT,
    completed_tasks BIGINT,
    in_progress_tasks BIGINT,
    overdue_tasks BIGINT,
    comments_count BIGINT,
    attachments_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) FILTER (WHERE ta.task_id IS NOT NULL) as total_tasks,
        COUNT(*) FILTER (WHERE t.status = 'done') as completed_tasks,
        COUNT(*) FILTER (WHERE t.status = 'in-progress') as in_progress_tasks,
        COUNT(*) FILTER (WHERE t.deadline < CURRENT_TIMESTAMP AND t.status != 'done') as overdue_tasks,
        COALESCE(comment_stats.comments_count, 0) as comments_count,
        COALESCE(attachment_stats.attachments_count, 0) as attachments_count
    FROM task_assignees ta
    JOIN tasks t ON ta.task_id = t.id
    LEFT JOIN (
        SELECT COUNT(*) as comments_count
        FROM comments c
        WHERE c.author_id = p_user_id
            AND c.deleted_at IS NULL
            AND (p_date_from IS NULL OR c.created_at >= p_date_from)
            AND (p_date_to IS NULL OR c.created_at <= p_date_to)
    ) comment_stats ON true
    LEFT JOIN (
        SELECT COUNT(*) as attachments_count
        FROM attachments a
        WHERE a.uploader_id = p_user_id
            AND (p_date_from IS NULL OR a.uploaded_at >= p_date_from)
            AND (p_date_to IS NULL OR a.uploaded_at <= p_date_to)
    ) attachment_stats ON true
    WHERE ta.user_id = p_user_id
        AND t.deleted_at IS NULL
        AND (p_date_from IS NULL OR t.created_at >= p_date_from)
        AND (p_date_to IS NULL OR t.created_at <= p_date_to);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ЗАВЕРШЕНИЕ МИГРАЦИИ
-- =====================================================

-- Обновление статистики для оптимизатора
ANALYZE;

-- Запись в лог о выполнении миграции
DO $$
BEGIN
    RAISE NOTICE 'Миграция 002_additional_tables.sql успешно выполнена';
END
$$;