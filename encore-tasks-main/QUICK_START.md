# Быстрый запуск SQLite версии

## 🚀 Простые шаги для запуска:

### 1. Установить зависимости
Откройте командную строку в папке проекта и выполните:
```bash
npm install
```

### 2. Создать базу данных SQLite
Выберите один из способов:

#### Способ A: Через npm
```bash
npm run db:setup
```

#### Способ B: Через bat файл
Дважды щелкните на файл `run-migration.bat` в папке проекта

#### Способ C: Прямо через node
```bash
node database/simple-migrate.js
```

### 3. Запустить приложение
```bash
npm run dev
```

## 🔑 Данные для входа

После создания базы данных используйте эти данные:

- **Основной админ**: `axelencore@mail.ru` / `Ad580dc6axelencore`
- **Тестовые учетные записи**:
  - `admin@encore-tasks.com` / `password`
  - `user@encore-tasks.com` / `password`

## 📁 Файлы

- База данных: `database/encore_tasks.db`
- Скрипт миграции: `database/simple-migrate.js`
- Bat файл: `run-migration.bat`

## ❓ Если что-то не работает

### 💻 Общие проблемы:
1. Убедитесь, что Node.js установлен
2. Запустите `npm install` еще раз
3. Проверьте, что нет ошибок при установке `better-sqlite3`
4. Запустите миграцию через bat файл

### 👤 Проблемы с логином ("не найден пользователь"):

#### Способ 1: Через bat файл
Дважды щелкните на `add-user.bat`

#### Способ 2: Через npm
```bash
npm run db:add-user
```

#### Способ 3: Пересоздать базу
```bash
# Удалить старую базу (если есть)
del database\encore_tasks.db

# Создать новую
npm run db:setup
```

Все готово! 🎉