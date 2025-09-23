-- Добавление колонки icon в таблицу projects
ALTER TABLE projects ADD COLUMN icon VARCHAR(50) DEFAULT 'folder';

-- Создание индекса для новой колонки
CREATE INDEX idx_projects_icon ON projects(icon);