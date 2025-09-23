-- =====================================================
-- СТРУКТУРА БАЗЫ ДАННЫХ MySQL ДЛЯ СИСТЕМЫ УПРАВЛЕНИЯ ЗАДАЧАМИ
-- =====================================================
-- Создание базы данных
CREATE DATABASE IF NOT EXISTS encore_tasks_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE encore_tasks_db;

-- =====================================================
-- ТАБЛИЦА ПОЛЬЗОВАТЕЛЕЙ
-- =====================================================
CREATE TABLE users (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'manager', 'user') NOT NULL DEFAULT 'user',
    approval_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    avatar TEXT,
    telegram_chat_id BIGINT,
    telegram_username VARCHAR(255),
    notification_settings JSON DEFAULT (JSON_OBJECT(
        'email', true,
        'telegram', false,
        'browser', true,
        'taskAssigned', true,
        'taskCompleted', true,
        'projectUpdates', true
    )),
    last_login_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    INDEX idx_users_email (email),
    INDEX idx_users_role (role),
    INDEX idx_users_approval_status (approval_status),
    INDEX idx_users_created_at (created_at),
    INDEX idx_users_deleted_at (deleted_at)
);

-- =====================================================
-- ТАБЛИЦА ПРОЕКТОВ
-- =====================================================
CREATE TABLE projects (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6366f1',
    creator_id CHAR(36) NOT NULL,
    telegram_chat_id BIGINT,
    telegram_topic_id INTEGER,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_projects_creator_id (creator_id),
    INDEX idx_projects_created_at (created_at),
    INDEX idx_projects_is_archived (is_archived),
    INDEX idx_projects_deleted_at (deleted_at),
    FULLTEXT idx_projects_name (name)
);

-- =====================================================
-- ТАБЛИЦА УЧАСТНИКОВ ПРОЕКТОВ
-- =====================================================
CREATE TABLE project_members (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    project_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    role ENUM('owner', 'admin', 'member') DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_project_user (project_id, user_id),
    INDEX idx_project_members_project_id (project_id),
    INDEX idx_project_members_user_id (user_id),
    INDEX idx_project_members_role (role)
);

-- =====================================================
-- ТАБЛИЦА ДОСОК
-- =====================================================
CREATE TABLE boards (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    project_id CHAR(36) NOT NULL,
    icon VARCHAR(50) DEFAULT 'kanban',
    position INTEGER DEFAULT 0,
    is_default BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    INDEX idx_boards_project_id (project_id),
    INDEX idx_boards_is_default (is_default),
    INDEX idx_boards_position (position),
    INDEX idx_boards_deleted_at (deleted_at),
    FULLTEXT idx_boards_name (name)
);

-- =====================================================
-- ТАБЛИЦА КОЛОНОК
-- =====================================================
CREATE TABLE columns (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    title VARCHAR(255) NOT NULL,
    board_id CHAR(36) NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    color VARCHAR(7) DEFAULT '#6366f1',
    task_limit INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
    INDEX idx_columns_board_id (board_id),
    INDEX idx_columns_position (position),
    UNIQUE KEY idx_columns_board_position (board_id, position)
);

-- =====================================================
-- ТАБЛИЦА ЗАДАЧ
-- =====================================================
CREATE TABLE tasks (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    title VARCHAR(500) NOT NULL,
    description LONGTEXT,
    status ENUM('todo', 'in-progress', 'review', 'done') NOT NULL DEFAULT 'todo',
    priority ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
    project_id CHAR(36) NOT NULL,
    board_id CHAR(36) NOT NULL,
    column_id CHAR(36),
    reporter_id CHAR(36) NOT NULL,
    parent_task_id CHAR(36),
    position INTEGER NOT NULL DEFAULT 0,
    story_points INTEGER,
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2),
    deadline TIMESTAMP NULL,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    is_archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
    FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE SET NULL,
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    
    INDEX idx_tasks_project_id (project_id),
    INDEX idx_tasks_board_id (board_id),
    INDEX idx_tasks_column_id (column_id),
    INDEX idx_tasks_reporter_id (reporter_id),
    INDEX idx_tasks_parent_task_id (parent_task_id),
    INDEX idx_tasks_status (status),
    INDEX idx_tasks_priority (priority),
    INDEX idx_tasks_deadline (deadline),
    INDEX idx_tasks_is_archived (is_archived),
    INDEX idx_tasks_created_at (created_at),
    INDEX idx_tasks_deleted_at (deleted_at),
    FULLTEXT idx_tasks_title (title),
    FULLTEXT idx_tasks_description (description)
);

-- =====================================================
-- ТАБЛИЦА НАЗНАЧЕНИЙ ЗАДАЧ
-- =====================================================
CREATE TABLE task_assignees (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    task_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by CHAR(36),
    
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_task_user (task_id, user_id),
    INDEX idx_task_assignees_task_id (task_id),
    INDEX idx_task_assignees_user_id (user_id),
    INDEX idx_task_assignees_assigned_by (assigned_by)
);

-- =====================================================
-- ТАБЛИЦА ТЕГОВ
-- =====================================================
CREATE TABLE tags (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#6366f1',
    project_id CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE KEY unique_name_project (name, project_id),
    INDEX idx_tags_project_id (project_id),
    INDEX idx_tags_name (name)
);

-- =====================================================
-- ТАБЛИЦА СВЯЗЕЙ ЗАДАЧ И ТЕГОВ
-- =====================================================
CREATE TABLE task_tags (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    task_id CHAR(36) NOT NULL,
    tag_id CHAR(36) NOT NULL,
    
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    UNIQUE KEY unique_task_tag (task_id, tag_id),
    INDEX idx_task_tags_task_id (task_id),
    INDEX idx_task_tags_tag_id (tag_id)
);

-- =====================================================
-- ТАБЛИЦА ВЛОЖЕНИЙ
-- =====================================================
CREATE TABLE attachments (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    task_id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(255) NOT NULL,
    uploader_id CHAR(36) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_attachments_task_id (task_id),
    INDEX idx_attachments_uploader_id (uploader_id),
    INDEX idx_attachments_uploaded_at (uploaded_at)
);

-- =====================================================
-- ТАБЛИЦА КОММЕНТАРИЕВ
-- =====================================================
CREATE TABLE comments (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    task_id CHAR(36) NOT NULL,
    author_id CHAR(36) NOT NULL,
    content LONGTEXT NOT NULL,
    parent_comment_id CHAR(36),
    is_edited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (parent_comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    INDEX idx_comments_task_id (task_id),
    INDEX idx_comments_author_id (author_id),
    INDEX idx_comments_parent_comment_id (parent_comment_id),
    INDEX idx_comments_created_at (created_at),
    INDEX idx_comments_deleted_at (deleted_at)
);

-- =====================================================
-- ТАБЛИЦА УВЕДОМЛЕНИЙ
-- =====================================================
CREATE TABLE notifications (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message LONGTEXT NOT NULL,
    type ENUM('task_assigned', 'task_completed', 'task_updated', 'project_updated', 'comment_added', 'deadline_reminder') NOT NULL,
    related_task_id CHAR(36),
    related_project_id CHAR(36),
    is_read BOOLEAN DEFAULT FALSE,
    sent_via_email BOOLEAN DEFAULT FALSE,
    sent_via_telegram BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (related_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (related_project_id) REFERENCES projects(id) ON DELETE CASCADE,
    INDEX idx_notifications_user_id (user_id),
    INDEX idx_notifications_type (type),
    INDEX idx_notifications_is_read (is_read),
    INDEX idx_notifications_created_at (created_at),
    INDEX idx_notifications_related_task_id (related_task_id),
    INDEX idx_notifications_related_project_id (related_project_id)
);

-- =====================================================
-- ТАБЛИЦА ЖУРНАЛА ДЕЙСТВИЙ
-- =====================================================
CREATE TABLE activity_log (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36),
    action_type VARCHAR(100) NOT NULL,
    entity_type ENUM('user', 'project', 'board', 'task', 'comment', 'attachment') NOT NULL,
    entity_id CHAR(36) NOT NULL,
    description LONGTEXT NOT NULL,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(255),
    project_id CHAR(36),
    board_id CHAR(36),
    task_id CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    
    INDEX idx_activity_log_user_id (user_id),
    INDEX idx_activity_log_action_type (action_type),
    INDEX idx_activity_log_entity_type (entity_type),
    INDEX idx_activity_log_entity_id (entity_id),
    INDEX idx_activity_log_created_at (created_at),
    INDEX idx_activity_log_project_id (project_id),
    INDEX idx_activity_log_task_id (task_id),
    INDEX idx_activity_log_session_id (session_id),
    INDEX idx_activity_log_user_created (user_id, created_at)
);

-- =====================================================
-- ТАБЛИЦА СЕССИЙ
-- =====================================================
CREATE TABLE user_sessions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_sessions_user_id (user_id),
    INDEX idx_user_sessions_session_token (session_token),
    INDEX idx_user_sessions_expires_at (expires_at),
    INDEX idx_user_sessions_last_activity (last_activity_at)
);

-- =====================================================
-- ТАБЛИЦА НАСТРОЕК СИСТЕМЫ
-- =====================================================
CREATE TABLE system_settings (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    setting_key VARCHAR(255) UNIQUE NOT NULL,
    setting_value JSON NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_system_settings_key (setting_key),
    INDEX idx_system_settings_is_public (is_public)
);

-- =====================================================
-- ПРЕДСТАВЛЕНИЯ ДЛЯ УДОБНОГО ДОСТУПА К ДАННЫМ
-- =====================================================

-- Представление для задач с полной информацией
CREATE VIEW tasks_full AS
SELECT 
    t.*,
    p.name as project_name,
    b.name as board_name,
    c.title as column_title,
    r.name as reporter_name,
    r.email as reporter_email,
    pt.title as parent_task_title,
    COALESCE(assignee_list.assignees, JSON_ARRAY()) as assignees,
    COALESCE(tag_list.tags, JSON_ARRAY()) as tags,
    COALESCE(attachment_count.count, 0) as attachment_count,
    COALESCE(comment_count.count, 0) as comment_count,
    COALESCE(subtask_count.count, 0) as subtask_count
FROM tasks t
LEFT JOIN projects p ON t.project_id = p.id
LEFT JOIN boards b ON t.board_id = b.id
LEFT JOIN columns c ON t.column_id = c.id
LEFT JOIN users r ON t.reporter_id = r.id
LEFT JOIN tasks pt ON t.parent_task_id = pt.id
LEFT JOIN (
    SELECT 
        ta.task_id,
        JSON_ARRAYAGG(JSON_OBJECT('id', u.id, 'name', u.name, 'email', u.email)) as assignees
    FROM task_assignees ta
    JOIN users u ON ta.user_id = u.id
    GROUP BY ta.task_id
) assignee_list ON t.id = assignee_list.task_id
LEFT JOIN (
    SELECT 
        tt.task_id,
        JSON_ARRAYAGG(JSON_OBJECT('id', tg.id, 'name', tg.name, 'color', tg.color)) as tags
    FROM task_tags tt
    JOIN tags tg ON tt.tag_id = tg.id
    GROUP BY tt.task_id
) tag_list ON t.id = tag_list.task_id
LEFT JOIN (
    SELECT task_id, COUNT(*) as count
    FROM attachments
    GROUP BY task_id
) attachment_count ON t.id = attachment_count.task_id
LEFT JOIN (
    SELECT task_id, COUNT(*) as count
    FROM comments
    WHERE deleted_at IS NULL
    GROUP BY task_id
) comment_count ON t.id = comment_count.task_id
LEFT JOIN (
    SELECT parent_task_id, COUNT(*) as count
    FROM tasks
    WHERE parent_task_id IS NOT NULL AND deleted_at IS NULL
    GROUP BY parent_task_id
) subtask_count ON t.id = subtask_count.task_id
WHERE t.deleted_at IS NULL;

-- Представление для проектов с дополнительной информацией
CREATE VIEW projects_full AS
SELECT 
    p.*,
    u.name as creator_name,
    u.email as creator_email,
    COALESCE(member_count.count, 0) as members_count,
    COALESCE(task_count.count, 0) as tasks_count,
    COALESCE(board_count.count, 0) as boards_count
FROM projects p
LEFT JOIN users u ON p.creator_id = u.id
LEFT JOIN (
    SELECT project_id, COUNT(*) as count
    FROM project_members
    GROUP BY project_id
) member_count ON p.id = member_count.project_id
LEFT JOIN (
    SELECT project_id, COUNT(*) as count
    FROM tasks
    WHERE deleted_at IS NULL
    GROUP BY project_id
) task_count ON p.id = task_count.project_id
LEFT JOIN (
    SELECT project_id, COUNT(*) as count
    FROM boards
    WHERE deleted_at IS NULL
    GROUP BY project_id
) board_count ON p.id = board_count.project_id
WHERE p.deleted_at IS NULL;

-- =====================================================
-- ПРОЦЕДУРЫ ДЛЯ ОЧИСТКИ УСТАРЕВШИХ ДАННЫХ
-- =====================================================

-- Процедура для очистки истекших сессий
DELIMITER //
CREATE PROCEDURE CleanExpiredSessions()
BEGIN
    DELETE FROM user_sessions WHERE expires_at < NOW();
END //
DELIMITER ;

-- Процедура для архивации старых записей журнала
DELIMITER //
CREATE PROCEDURE ArchiveOldActivityLog(IN days_to_keep INT)
BEGIN
    DELETE FROM activity_log 
    WHERE created_at < DATE_SUB(NOW(), INTERVAL days_to_keep DAY);
END //
DELIMITER ;

-- =====================================================
-- СОБЫТИЯ ДЛЯ АВТОМАТИЧЕСКОЙ ОЧИСТКИ
-- =====================================================

-- Включение планировщика событий
SET GLOBAL event_scheduler = ON;

-- Событие для ежедневной очистки истекших сессий
CREATE EVENT IF NOT EXISTS clean_expired_sessions
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP
DO
  CALL CleanExpiredSessions();

-- Событие для еженедельной архивации старых логов (старше 90 дней)
CREATE EVENT IF NOT EXISTS archive_old_logs
ON SCHEDULE EVERY 1 WEEK
STARTS CURRENT_TIMESTAMP
DO
  CALL ArchiveOldActivityLog(90);

-- =====================================================
-- ВСТАВКА НАЧАЛЬНЫХ ДАННЫХ
-- =====================================================

-- Создание администратора по умолчанию
INSERT INTO users (id, name, email, password_hash, role, approval_status, created_at, updated_at) VALUES
('admin-user-id', 'Администратор', 'admin@encore-tasks.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'approved', NOW(), NOW());

-- Создание проекта по умолчанию
INSERT INTO projects (id, name, description, creator_id, created_at, updated_at) VALUES
('default-project-id', 'Проект по умолчанию', 'Основной проект для задач', 'admin-user-id', NOW(), NOW());

-- Создание доски по умолчанию
INSERT INTO boards (id, name, description, project_id, is_default, created_at, updated_at) VALUES
('default-board-id', 'Основная доска', 'Доска для управления задачами', 'default-project-id', TRUE, NOW(), NOW());

-- Создание колонок по умолчанию
INSERT INTO columns (id, title, board_id, position, color, created_at, updated_at) VALUES
('column-todo-id', 'К выполнению', 'default-board-id', 0, '#e3f2fd', NOW(), NOW()),
('column-progress-id', 'В процессе', 'default-board-id', 1, '#fff3e0', NOW(), NOW()),
('column-done-id', 'Выполнено', 'default-board-id', 2, '#e8f5e8', NOW(), NOW());

-- Создание базовых настроек системы
INSERT INTO system_settings (setting_key, setting_value, description, is_public) VALUES
('app_name', JSON_QUOTE('Encore Tasks'), 'Название приложения', TRUE),
('app_version', JSON_QUOTE('1.0.0'), 'Версия приложения', TRUE),
('max_file_size', '10485760', 'Максимальный размер файла в байтах', FALSE),
('session_timeout', '86400', 'Время жизни сессии в секундах', FALSE);

-- Анализ таблиц для оптимизации планировщика запросов
ANALYZE TABLE users, projects, project_members, boards, columns, tasks, task_assignees, tags, task_tags, attachments, comments, notifications, activity_log, user_sessions, system_settings;

-- Вывод информации о созданной схеме
SELECT 'База данных MySQL успешно создана!' as status;
SELECT TABLE_NAME, TABLE_TYPE 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'encore_tasks_db' 
ORDER BY TABLE_NAME;