-- =====================================================
-- МИГРАЦИЯ 003: ЖУРНАЛИРОВАНИЕ И СИСТЕМНЫЕ ТАБЛИЦЫ
-- =====================================================
-- Дата создания: 2024-01-03
-- Описание: Создание таблиц для журналирования действий, сессий и системных настроек

-- =====================================================
-- СОЗДАНИЕ СИСТЕМНЫХ ТАБЛИЦ
-- =====================================================

-- Таблица журнала действий
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('user', 'project', 'board', 'task', 'comment', 'attachment')),
    entity_id UUID NOT NULL,
    description TEXT NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Таблица сессий
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Таблица настроек системы
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- СОЗДАНИЕ ИНДЕКСОВ ДЛЯ СИСТЕМНЫХ ТАБЛИЦ
-- =====================================================

-- Индексы для журнала действий
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_action_type ON activity_log(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity_type ON activity_log(entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity_id ON activity_log(entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_log_project_id ON activity_log(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_task_id ON activity_log(task_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_session_id ON activity_log(session_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_created ON activity_log(user_id, created_at DESC);

-- Индексы для сессий
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON user_sessions(last_activity_at);

-- Индексы для настроек системы
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);
CREATE INDEX IF NOT EXISTS idx_system_settings_is_public ON system_settings(is_public);

-- =====================================================
-- ТРИГГЕРЫ ДЛЯ СИСТЕМНЫХ ТАБЛИЦ
-- =====================================================

-- Триггер для настроек системы
DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ФУНКЦИИ ДЛЯ ЖУРНАЛИРОВАНИЯ
-- =====================================================

-- Функция для логирования изменений в задачах
CREATE OR REPLACE FUNCTION log_task_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO activity_log (action_type, entity_type, entity_id, description, new_values, project_id, board_id, task_id)
        VALUES ('task_created', 'task', NEW.id, 'Создана новая задача: ' || NEW.title, to_jsonb(NEW), NEW.project_id, NEW.board_id, NEW.id);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Логируем только значимые изменения
        IF (OLD.title != NEW.title OR 
            OLD.description != NEW.description OR 
            OLD.status != NEW.status OR 
            OLD.priority != NEW.priority OR 
            OLD.deadline != NEW.deadline OR
            OLD.is_archived != NEW.is_archived) THEN
            
            INSERT INTO activity_log (action_type, entity_type, entity_id, description, old_values, new_values, project_id, board_id, task_id)
            VALUES ('task_updated', 'task', NEW.id, 'Обновлена задача: ' || NEW.title, to_jsonb(OLD), to_jsonb(NEW), NEW.project_id, NEW.board_id, NEW.id);
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO activity_log (action_type, entity_type, entity_id, description, old_values, project_id, board_id, task_id)
        VALUES ('task_deleted', 'task', OLD.id, 'Удалена задача: ' || OLD.title, to_jsonb(OLD), OLD.project_id, OLD.board_id, OLD.id);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Триггер для логирования изменений задач
DROP TRIGGER IF EXISTS log_task_changes_trigger ON tasks;
CREATE TRIGGER log_task_changes_trigger
    AFTER INSERT OR UPDATE OR DELETE ON tasks
    FOR EACH ROW EXECUTE FUNCTION log_task_changes();

-- Функция для логирования изменений в проектах
CREATE OR REPLACE FUNCTION log_project_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO activity_log (action_type, entity_type, entity_id, description, new_values, project_id)
        VALUES ('project_created', 'project', NEW.id, 'Создан новый проект: ' || NEW.name, to_jsonb(NEW), NEW.id);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF (OLD.name != NEW.name OR 
            OLD.description != NEW.description OR 
            OLD.is_archived != NEW.is_archived) THEN
            
            INSERT INTO activity_log (action_type, entity_type, entity_id, description, old_values, new_values, project_id)
            VALUES ('project_updated', 'project', NEW.id, 'Обновлен проект: ' || NEW.name, to_jsonb(OLD), to_jsonb(NEW), NEW.id);
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO activity_log (action_type, entity_type, entity_id, description, old_values, project_id)
        VALUES ('project_deleted', 'project', OLD.id, 'Удален проект: ' || OLD.name, to_jsonb(OLD), OLD.id);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Триггер для логирования изменений проектов
DROP TRIGGER IF EXISTS log_project_changes_trigger ON projects;
CREATE TRIGGER log_project_changes_trigger
    AFTER INSERT OR UPDATE OR DELETE ON projects
    FOR EACH ROW EXECUTE FUNCTION log_project_changes();

-- Функция для логирования изменений участников проектов
CREATE OR REPLACE FUNCTION log_project_member_changes()
RETURNS TRIGGER AS $$
DECLARE
    user_name VARCHAR(255);
    project_name VARCHAR(255);
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT u.name, p.name INTO user_name, project_name
        FROM users u, projects p
        WHERE u.id = NEW.user_id AND p.id = NEW.project_id;
        
        INSERT INTO activity_log (action_type, entity_type, entity_id, description, new_values, project_id)
        VALUES ('member_added', 'project', NEW.project_id, 
                'Пользователь ' || user_name || ' добавлен в проект ' || project_name, 
                to_jsonb(NEW), NEW.project_id);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        SELECT u.name, p.name INTO user_name, project_name
        FROM users u, projects p
        WHERE u.id = OLD.user_id AND p.id = OLD.project_id;
        
        INSERT INTO activity_log (action_type, entity_type, entity_id, description, old_values, project_id)
        VALUES ('member_removed', 'project', OLD.project_id, 
                'Пользователь ' || user_name || ' удален из проекта ' || project_name, 
                to_jsonb(OLD), OLD.project_id);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Триггер для логирования изменений участников проектов
DROP TRIGGER IF EXISTS log_project_member_changes_trigger ON project_members;
CREATE TRIGGER log_project_member_changes_trigger
    AFTER INSERT OR DELETE ON project_members
    FOR EACH ROW EXECUTE FUNCTION log_project_member_changes();

-- =====================================================
-- ФУНКЦИИ ДЛЯ РАБОТЫ С СЕССИЯМИ
-- =====================================================

-- Функция для очистки старых сессий
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_sessions 
    WHERE expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Логируем очистку сессий
    INSERT INTO activity_log (action_type, entity_type, entity_id, description)
    VALUES ('sessions_cleanup', 'user', uuid_generate_v4(), 
            'Очищено ' || deleted_count || ' истекших сессий');
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Функция для обновления времени последней активности сессии
CREATE OR REPLACE FUNCTION update_session_activity(
    p_session_token VARCHAR(255)
)
RETURNS BOOLEAN AS $$
DECLARE
    session_exists BOOLEAN;
BEGIN
    UPDATE user_sessions 
    SET last_activity_at = CURRENT_TIMESTAMP
    WHERE session_token = p_session_token 
        AND expires_at > CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS session_exists = FOUND;
    RETURN session_exists;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ФУНКЦИИ ДЛЯ АНАЛИТИКИ И ОТЧЕТОВ
-- =====================================================

-- Функция для получения активности пользователя
CREATE OR REPLACE FUNCTION get_user_activity(
    p_user_id UUID,
    p_date_from TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP - INTERVAL '30 days',
    p_date_to TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE(
    action_date DATE,
    action_type VARCHAR(100),
    entity_type VARCHAR(50),
    description TEXT,
    project_name VARCHAR(255)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.created_at::DATE as action_date,
        al.action_type,
        al.entity_type,
        al.description,
        p.name as project_name
    FROM activity_log al
    LEFT JOIN projects p ON al.project_id = p.id
    WHERE al.user_id = p_user_id
        AND al.created_at >= p_date_from
        AND al.created_at <= p_date_to
    ORDER BY al.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Функция для получения статистики активности проекта
CREATE OR REPLACE FUNCTION get_project_activity_stats(
    p_project_id UUID,
    p_date_from TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP - INTERVAL '30 days',
    p_date_to TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
)
RETURNS TABLE(
    total_actions BIGINT,
    tasks_created BIGINT,
    tasks_completed BIGINT,
    comments_added BIGINT,
    members_added BIGINT,
    active_users BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_actions,
        COUNT(*) FILTER (WHERE action_type = 'task_created') as tasks_created,
        COUNT(*) FILTER (WHERE action_type = 'task_updated' AND new_values->>'status' = 'done') as tasks_completed,
        COUNT(*) FILTER (WHERE action_type = 'comment_added') as comments_added,
        COUNT(*) FILTER (WHERE action_type = 'member_added') as members_added,
        COUNT(DISTINCT user_id) as active_users
    FROM activity_log
    WHERE project_id = p_project_id
        AND created_at >= p_date_from
        AND created_at <= p_date_to;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- НАСТРОЙКИ СИСТЕМЫ ПО УМОЛЧАНИЮ
-- =====================================================

-- Вставка настроек системы по умолчанию
INSERT INTO system_settings (key, value, description, is_public) VALUES
('app_name', '"Encore Tasks"', 'Название приложения', true),
('app_version', '"1.0.0"', 'Версия приложения', true),
('max_file_size', '10485760', 'Максимальный размер файла в байтах (10MB)', false),
('allowed_file_types', '["jpg", "jpeg", "png", "gif", "pdf", "doc", "docx", "xls", "xlsx", "txt"]', 'Разрешенные типы файлов', false),
('session_timeout', '86400', 'Время жизни сессии в секундах (24 часа)', false),
('notification_batch_size', '100', 'Размер пакета для отправки уведомлений', false),
('max_projects_per_user', '10', 'Максимальное количество проектов на пользователя', false),
('max_tasks_per_project', '1000', 'Максимальное количество задач в проекте', false),
('backup_retention_days', '30', 'Количество дней хранения резервных копий', false),
('log_retention_days', '90', 'Количество дней хранения логов', false)
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- СОЗДАНИЕ ЗАДАЧ ДЛЯ АВТОМАТИЧЕСКОЙ ОЧИСТКИ
-- =====================================================

-- Функция для автоматической очистки старых логов
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS INTEGER AS $$
DECLARE
    retention_days INTEGER;
    deleted_count INTEGER;
BEGIN
    -- Получаем настройку времени хранения логов
    SELECT (value::TEXT)::INTEGER INTO retention_days
    FROM system_settings
    WHERE key = 'log_retention_days';
    
    -- Если настройка не найдена, используем значение по умолчанию
    IF retention_days IS NULL THEN
        retention_days := 90;
    END IF;
    
    -- Удаляем старые записи
    DELETE FROM activity_log 
    WHERE created_at < CURRENT_TIMESTAMP - (retention_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Логируем очистку
    INSERT INTO activity_log (action_type, entity_type, entity_id, description)
    VALUES ('logs_cleanup', 'system', uuid_generate_v4(), 
            'Очищено ' || deleted_count || ' старых записей логов (старше ' || retention_days || ' дней)');
    
    RETURN deleted_count;
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
    RAISE NOTICE 'Миграция 003_logging_and_system.sql успешно выполнена';
END
$$;