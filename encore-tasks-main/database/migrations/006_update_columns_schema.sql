-- Миграция для обновления схемы таблицы columns
-- Добавляем недостающие колонки и переименовываем name в title

-- Переименовываем колонку name в title
ALTER TABLE columns RENAME COLUMN name TO title;

-- Добавляем колонку settings
ALTER TABLE columns ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- Добавляем колонку created_by
ALTER TABLE columns ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);