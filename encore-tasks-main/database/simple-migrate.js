const fs = require('fs');
const path = require('path');

try {
  // Проверяем установлен ли better-sqlite3
  const Database = require('better-sqlite3');
  console.log('✅ better-sqlite3 is installed');
  
  // Путь к базе данных
  const DB_PATH = path.join(__dirname, 'encore_tasks.db');
  
  // Создаем подключение
  console.log('📁 Database path:', DB_PATH);
  const db = new Database(DB_PATH);
  
  console.log('✅ Database connection established');
  
  // Включаем внешние ключи
  db.pragma('foreign_keys = ON');
  console.log('✅ Foreign keys enabled');
  
  // Создаем таблицы по очереди
  console.log('🔧 Creating tables...');
  
  // Пользователи
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      avatar_url TEXT,
      role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),
      approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
      telegram_chat_id INTEGER,
      telegram_username TEXT,
      notification_settings TEXT DEFAULT '{}',
      last_login_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  console.log('✓ users table created');
  
  // Сессии
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  console.log('✓ sessions table created');
  
  // Проекты
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL,
      description TEXT,
      color TEXT DEFAULT '#6366f1',
      icon TEXT DEFAULT 'folder',
      creator_id TEXT NOT NULL REFERENCES users(id),
      is_archived INTEGER DEFAULT 0,
      telegram_chat_id INTEGER,
      telegram_topic_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  console.log('✓ projects table created');
  
  // Участники проектов
  db.exec(`
    CREATE TABLE IF NOT EXISTS project_members (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
      joined_at TEXT DEFAULT (datetime('now')),
      UNIQUE(project_id, user_id)
    )
  `);
  console.log('✓ project_members table created');
  
  // Доски
  db.exec(`
    CREATE TABLE IF NOT EXISTS boards (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL,
      description TEXT,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      icon TEXT DEFAULT 'kanban',
      is_default INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  console.log('✓ boards table created');
  
  // Колонки
  db.exec(`
    CREATE TABLE IF NOT EXISTS columns (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      title TEXT NOT NULL,
      board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
      position INTEGER NOT NULL DEFAULT 0,
      color TEXT DEFAULT '#6b7280',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  console.log('✓ columns table created');
  
  // Задачи
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'todo',
      priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
      column_id TEXT REFERENCES columns(id) ON DELETE SET NULL,
      reporter_id TEXT NOT NULL REFERENCES users(id),
      position INTEGER DEFAULT 0,
      due_date TEXT,
      completed_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  console.log('✓ tasks table created');
  
  // Назначения задач
  db.exec(`
    CREATE TABLE IF NOT EXISTS task_assignees (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      assigned_at TEXT DEFAULT (datetime('now')),
      UNIQUE(task_id, user_id)
    )
  `);
  console.log('✓ task_assignees table created');
  
  // Комментарии
  db.exec(`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      content TEXT NOT NULL,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      author_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  console.log('✓ comments table created');
  
  // Вложения
  db.exec(`
    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      uploaded_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  console.log('✓ attachments table created');
  
  // Создаем индексы
  console.log('🔧 Creating indexes...');
  
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
    'CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)',
    'CREATE INDEX IF NOT EXISTS idx_projects_creator_id ON projects(creator_id)',
    'CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_boards_project_id ON boards(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_columns_board_id ON columns(board_id)',
    'CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id)',
    'CREATE INDEX IF NOT EXISTS idx_tasks_board_id ON tasks(board_id)',
    'CREATE INDEX IF NOT EXISTS idx_tasks_column_id ON tasks(column_id)',
    'CREATE INDEX IF NOT EXISTS idx_task_assignees_task_id ON task_assignees(task_id)',
    'CREATE INDEX IF NOT EXISTS idx_comments_task_id ON comments(task_id)',
    'CREATE INDEX IF NOT EXISTS idx_attachments_task_id ON attachments(task_id)'
  ];
  
  indexes.forEach((indexSQL, i) => {
    try {
      db.exec(indexSQL);
      console.log(`✓ Index ${i + 1}/${indexes.length} created`);
    } catch (err) {
      console.log(`⚠ Index ${i + 1} skipped (already exists)`);
    }
  });
  
  // Добавляем тестовых пользователей
  console.log('👤 Creating test users...');
  
  const insertAdmin = db.prepare(`
    INSERT OR IGNORE INTO users (email, password_hash, name, role, approval_status) 
    VALUES (?, ?, ?, ?, ?)
  `);
  
  insertAdmin.run(
    'admin@encore-tasks.com',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'Administrator',
    'admin',
    'approved'
  );
  
  insertAdmin.run(
    'user@encore-tasks.com',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'Test User',
    'user',
    'approved'
  );
  
  // Добавляем нужного администратора
  const bcrypt = require('bcryptjs');
  const adminEmail = 'axelencore@mail.ru';
  const adminPassword = 'Ad580dc6axelencore';
  const hashedAdminPassword = bcrypt.hashSync(adminPassword, 12);
  
  insertAdmin.run(
    adminEmail,
    hashedAdminPassword,
    'Axelencore Admin',
    'admin',
    'approved'
  );
  
  console.log('✓ Added custom admin user:', adminEmail);
  
  // Проверяем результат
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();
  
  console.log('\n🎉 Migration completed successfully!');
  console.log(`📊 Created tables: ${tables.map(t => t.name).join(', ')}`);
  console.log(`👥 Users in database: ${userCount.count}`);
  console.log('📁 Database file:', DB_PATH);
  console.log('\n🔑 Login credentials:');
  console.log('   Admin: admin@encore-tasks.com / password');
  console.log('   User:  user@encore-tasks.com / password');
  
  db.close();
  
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  
  if (error.code === 'MODULE_NOT_FOUND' && error.message.includes('better-sqlite3')) {
    console.log('\n📦 Please install better-sqlite3:');
    console.log('   npm install better-sqlite3');
    console.log('   npm install @types/better-sqlite3');
  }
  
  process.exit(1);
}