-- Миграция для исправления ограничений статусов задач
-- Обновляет CHECK constraint для поддержки стандартизированных статусов

-- Удаляем старое ограничение
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

-- Добавляем новое ограничение с правильными статусами
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
    CHECK (status IN ('todo', 'in_progress', 'review', 'done', 'blocked'));

-- Обновляем существующие записи с неправильными статусами
UPDATE tasks SET status = 'in_progress' WHERE status = 'in-progress';
UPDATE tasks SET status = 'done' WHERE status = 'completed';
UPDATE tasks SET status = 'done' WHERE status = 'archived';

-- Добавляем комментарий
COMMENT ON CONSTRAINT tasks_status_check ON tasks IS 'Ограничение для статусов задач: todo, in_progress, review, done, blocked';