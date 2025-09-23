-- Увеличение размера поля session_token для поддержки длинных JWT токенов
-- Миграция 005: Увеличение длины session_token

BEGIN;

-- Увеличиваем размер поля session_token с VARCHAR(255) до TEXT
ALTER TABLE user_sessions 
ALTER COLUMN session_token TYPE TEXT;

-- Также увеличиваем refresh_token на всякий случай
ALTER TABLE user_sessions 
ALTER COLUMN refresh_token TYPE TEXT;

-- Обновляем комментарий к таблице
COMMENT ON COLUMN user_sessions.session_token IS 'JWT токен сессии (может быть длинным)';
COMMENT ON COLUMN user_sessions.refresh_token IS 'Refresh токен для обновления сессии';

COMMIT;