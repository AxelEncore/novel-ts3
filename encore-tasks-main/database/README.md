# PostgreSQL Setup для Encore Tasks

## Установка PostgreSQL

### Windows
1. Скачайте PostgreSQL с официального сайта: https://www.postgresql.org/download/windows/
2. Запустите установщик и следуйте инструкциям
3. Запомните пароль для пользователя `postgres`
4. Убедитесь, что PostgreSQL добавлен в PATH

### Проверка установки
```bash
psql --version
```

## Настройка базы данных

### 1. Создание базы данных и пользователя
```bash
# Подключитесь к PostgreSQL как суперпользователь
psql -U postgres

# Выполните скрипт инициализации
\i database/init-database.sql
```

### 2. Создание схемы
```bash
# Подключитесь к базе данных encore_tasks
psql -U encore_user -d encore_tasks

# Выполните скрипт создания схемы
\i database/postgresql_schema.sql
```

### 3. Обновление конфигурации
Обновите файл `.env` с правильными параметрами подключения:

```env
# PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=encore_tasks
POSTGRES_USER=encore_user
POSTGRES_PASSWORD=secure_password

# Database URL
DATABASE_URL=postgresql://encore_user:secure_password@localhost:5432/encore_tasks
```

## Тестовые данные

После выполнения скриптов в базе данных будут созданы:

### Пользователи
- **Администратор**: admin@encore-tasks.com / password
- **Пользователь**: user1@encore-tasks.com / password

### Структура проекта
- Демо проект с основной доской
- Три колонки: "К выполнению", "В работе", "Выполнено"
- Две тестовые задачи

## Запуск приложения

```bash
npm run dev
```

Приложение будет доступно по адресу: http://localhost:3000

## Устранение неполадок

### Ошибка подключения
1. Убедитесь, что PostgreSQL запущен
2. Проверьте параметры подключения в `.env`
3. Убедитесь, что пользователь `encore_user` имеет права доступа

### Ошибки прав доступа
```sql
-- Подключитесь как суперпользователь и выполните:
GRANT ALL PRIVILEGES ON DATABASE encore_tasks TO encore_user;
GRANT ALL ON SCHEMA public TO encore_user;
```

### Сброс базы данных
```bash
# Удаление базы данных
psql -U postgres -c "DROP DATABASE IF EXISTS encore_tasks;"

# Повторное создание
psql -U postgres -f database/init-database.sql
psql -U encore_user -d encore_tasks -f database/postgresql_schema.sql
```