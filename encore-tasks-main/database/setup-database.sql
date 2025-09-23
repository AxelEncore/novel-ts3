-- =====================================================
-- ENCORE TASKS - DATABASE SETUP SCRIPT
-- =====================================================

-- Создание пользователя и базы данных
-- Выполните эти команды как суперпользователь PostgreSQL

-- Создание пользователя
CREATE USER encore_user WITH PASSWORD 'secure_password';

-- Создание базы данных
CREATE DATABASE encore_tasks OWNER encore_user;

-- Предоставление привилегий
GRANT ALL PRIVILEGES ON DATABASE encore_tasks TO encore_user;

-- Подключение к базе данных encore_tasks
\c encore_tasks;

-- Предоставление привилегий на схему public
GRANT ALL ON SCHEMA public TO encore_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO encore_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO encore_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO encore_user;

-- Установка владельца схемы
ALTER SCHEMA public OWNER TO encore_user;

-- Предоставление привилегий по умолчанию для будущих объектов
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO encore_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO encore_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO encore_user;

SELECT 'Database setup completed successfully!' as status;