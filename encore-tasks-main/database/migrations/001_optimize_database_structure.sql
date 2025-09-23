-- Миграция для оптимизации структуры базы данных
-- Исправляет проблемы с производительностью и добавляет недостающие поля

-- Включаем поддержку внешних ключей
PRAGMA foreign_keys = ON;

-- Добавляем недостающие поля в таблицу users
ALTER TABLE users ADD COLUMN last_login_at DATETIME;
ALTER TABLE users ADD COLUMN avatar TEXT;

-- Добавляем недостающие поля в таблицу projects
ALTER TABLE projects ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'completed'));

-- Добавляем недостающие поля в таблицу boards
ALTER TABLE boards ADD COLUMN position INTEGER NOT NULL DEFAULT 0;
ALTER TABLE boards ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE boards ADD COLUMN archived_at DATETIME;

-- Добавляем недостающие поля в таблицу columns
ALTER TABLE columns ADD COLUMN position INTEGER NOT NULL DEFAULT 0;
ALTER TABLE columns ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE columns ADD COLUMN archived_at DATETIME;

-- Добавляем недостающие поля в таблицу tasks
ALTER TABLE tasks ADD COLUMN reporter_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN position INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN due_date DATETIME;
ALTER TABLE tasks ADD COLUMN completed_at DATETIME;
ALTER TABLE tasks ADD COLUMN story_points INTEGER;
ALTER TABLE tasks ADD COLUMN estimated_hours DECIMAL(5,2);
ALTER TABLE tasks ADD COLUMN actual_hours DECIMAL(5,2);
ALTER TABLE tasks ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN archived_at DATETIME;

-- Добавляем недостающие поля в таблицу sessions
ALTER TABLE sessions ADD COLUMN last_used_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE sessions ADD COLUMN user_agent TEXT;
ALTER TABLE sessions ADD COLUMN ip_address TEXT;

-- Добавляем недостающие поля в таблицу comments
ALTER TABLE comments ADD COLUMN parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE;
ALTER TABLE comments ADD COLUMN is_edited BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE comments ADD COLUMN edited_at DATETIME;

-- Создаем таблицу уведомлений, если она не существует
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
    is_read BOOLEAN NOT NULL DEFAULT 0,
    read_at DATETIME,
    related_task_id INTEGER,
    related_project_id INTEGER,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (related_task_id) REFERENCES tasks(id) ON DELETE SET NULL,
    FOREIGN KEY (related_project_id) REFERENCES projects(id) ON DELETE SET NULL
);

-- Создаем основные индексы для производительности
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);
CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name);

CREATE INDEX IF NOT EXISTS idx_boards_project_id ON boards(project_id);
CREATE INDEX IF NOT EXISTS idx_boards_position ON boards(position);
CREATE INDEX IF NOT EXISTS idx_boards_archived ON boards(is_archived);
CREATE INDEX IF NOT EXISTS idx_boards_created_at ON boards(created_at);

CREATE INDEX IF NOT EXISTS idx_columns_board_id ON columns(board_id);
CREATE INDEX IF NOT EXISTS idx_columns_position ON columns(position);
CREATE INDEX IF NOT EXISTS idx_columns_archived ON columns(is_archived);
CREATE UNIQUE INDEX IF NOT EXISTS idx_columns_board_position ON columns(board_id, position) WHERE is_archived = 0;

CREATE INDEX IF NOT EXISTS idx_tasks_column_id ON tasks(column_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_reporter_id ON tasks(reporter_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_position ON tasks(position);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_archived ON tasks(is_archived);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_column_position ON tasks(column_id, position) WHERE is_archived = 0;

CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

CREATE INDEX IF NOT EXISTS idx_task_tags_task_id ON task_tags(task_id);
CREATE INDEX IF NOT EXISTS idx_task_tags_tag_id ON task_tags(tag_id);

CREATE INDEX IF NOT EXISTS idx_comments_task_id ON comments(task_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);

CREATE INDEX IF NOT EXISTS idx_attachments_task_id ON attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_attachments_uploaded_by ON attachments(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_attachments_created_at ON attachments(created_at);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_last_used_at ON sessions(last_used_at);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_related_task ON notifications(related_task_id);
CREATE INDEX IF NOT EXISTS idx_notifications_related_project ON notifications(related_project_id);

-- Создаем составные индексы для сложных запросов
CREATE INDEX IF NOT EXISTS idx_tasks_status_priority ON tasks(status, priority);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status ON tasks(assignee_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_column_status ON tasks(column_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_user_expires ON sessions(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_comments_task_created ON comments(task_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);

-- Создаем триггеры для автоматического обновления updated_at
CREATE TRIGGER IF NOT EXISTS update_users_updated_at
    AFTER UPDATE ON users
    FOR EACH ROW
    WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_projects_updated_at
    AFTER UPDATE ON projects
    FOR EACH ROW
    WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_boards_updated_at
    AFTER UPDATE ON boards
    FOR EACH ROW
    WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE boards SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_columns_updated_at
    AFTER UPDATE ON columns
    FOR EACH ROW
    WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE columns SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_tasks_updated_at
    AFTER UPDATE ON tasks
    FOR EACH ROW
    WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE tasks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_comments_updated_at
    AFTER UPDATE ON comments
    FOR EACH ROW
    WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE comments SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Триггер для автоматической установки completed_at при изменении статуса на 'done'
CREATE TRIGGER IF NOT EXISTS set_task_completed_at
    AFTER UPDATE OF status ON tasks
    FOR EACH ROW
    WHEN NEW.status = 'done' AND OLD.status != 'done'
BEGIN
    UPDATE tasks SET completed_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Триггер для очистки completed_at при изменении статуса с 'done'
CREATE TRIGGER IF NOT EXISTS clear_task_completed_at
    AFTER UPDATE OF status ON tasks
    FOR EACH ROW
    WHEN NEW.status != 'done' AND OLD.status = 'done'
BEGIN
    UPDATE tasks SET completed_at = NULL WHERE id = NEW.id;
END;

-- Обновляем статистику для оптимизатора запросов
ANALYZE;