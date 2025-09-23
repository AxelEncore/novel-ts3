-- Миграция 007: Обновление схемы таблицы boards
-- Добавление недостающих столбцов: visibility, color, settings, created_by

-- Добавляем столбец visibility (если не существует)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'boards' AND column_name = 'visibility') THEN
        ALTER TABLE boards ADD COLUMN visibility VARCHAR(20) DEFAULT 'private';
        ALTER TABLE boards ADD CONSTRAINT boards_visibility_check 
            CHECK (visibility IN ('public', 'private', 'team'));
    END IF;
END $$;

-- Добавляем столбец color (если не существует)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'boards' AND column_name = 'color') THEN
        ALTER TABLE boards ADD COLUMN color VARCHAR(7) DEFAULT '#3B82F6';
    END IF;
END $$;

-- Добавляем столбец settings (если не существует)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'boards' AND column_name = 'settings') THEN
        ALTER TABLE boards ADD COLUMN settings JSONB DEFAULT '{}';
    END IF;
END $$;

-- Добавляем столбец created_by (если не существует)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'boards' AND column_name = 'created_by') THEN
        ALTER TABLE boards ADD COLUMN created_by UUID;
        -- Добавляем внешний ключ
        ALTER TABLE boards ADD CONSTRAINT fk_boards_created_by 
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Обновляем существующие записи значениями по умолчанию
UPDATE boards SET 
    visibility = COALESCE(visibility, 'private'),
    color = COALESCE(color, '#3B82F6'),
    settings = COALESCE(settings, '{}'::jsonb)
WHERE visibility IS NULL OR color IS NULL OR settings IS NULL;

-- Выводим информацию о выполненной миграции
DO $$
BEGIN
    RAISE NOTICE 'Миграция 007 выполнена успешно. Таблица boards обновлена.';
END $$;