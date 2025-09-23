-- =====================================================
-- POSTGRESQL DATABASE INITIALIZATION SCRIPT
-- =====================================================
-- Этот скрипт создает базу данных и пользователя для Encore Tasks
-- Запустите его от имени суперпользователя PostgreSQL

-- Создание базы данных
CREATE DATABASE encore_tasks;

-- Создание пользователя
CREATE USER encore_user WITH PASSWORD 'secure_password';

-- Предоставление прав пользователю
GRANT ALL PRIVILEGES ON DATABASE encore_tasks TO encore_user;

-- Подключение к базе данных encore_tasks
\c encore_tasks;

-- Предоставление прав на схему public
GRANT ALL ON SCHEMA public TO encore_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO encore_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO encore_user;

-- Установка прав по умолчанию для будущих объектов
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO encore_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO encore_user;

ECHO 'База данных encore_tasks успешно создана!';
ECHO 'Пользователь encore_user создан с паролем: secure_password';
ECHO 'Теперь запустите: psql -U encore_user -d encore_tasks -f postgresql_schema.sql';