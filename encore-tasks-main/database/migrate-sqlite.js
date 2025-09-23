#!/usr/bin/env node

// =====================================================
// SQLITE MIGRATION SCRIPT FOR ENCORE TASKS
// =====================================================

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// Путь к базе данных
const DB_PATH = path.join(__dirname, 'encore_tasks.db');
const SCHEMA_PATH = path.join(__dirname, 'sqlite_schema.sql');

async function runMigration() {
  console.log('🚀 Starting SQLite database migration...');
  
  try {
    // Создаем директорию если её нет
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Подключаемся к SQLite
    const db = new Database(DB_PATH);
    
    // Включаем внешние ключи
    db.pragma('foreign_keys = ON');
    
    console.log('📋 Creating database schema...');
    
    // Читаем схему
    if (!fs.existsSync(SCHEMA_PATH)) {
      throw new Error(`Schema file not found: ${SCHEMA_PATH}`);
    }
    
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    
    // Выполняем всю схему как один блок
    console.log('📋 Executing schema...');
    
    try {
      // Выполняем всю схему целиком
      db.exec(schema);
      console.log('✅ Schema executed successfully');
    } catch (error) {
      console.error('❌ Schema execution failed:', error);
      
      // Попробуем выполнить по частям
      console.log('🔄 Trying to execute statements individually...');
      
      // Просто разделяем по ';' и очищаем
      let statements = schema
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => {
          // Отфильтровываем пустые строки, комментарии и PRAGMA
          return stmt && 
                 !stmt.startsWith('--') && 
                 !stmt.startsWith('PRAGMA') &&
                 stmt.length > 5;
        })
        .map(stmt => {
          // Убираем комментарии из строк
          return stmt.split('\n')
            .filter(line => {
              const trimmed = line.trim();
              return trimmed && !trimmed.startsWith('--');
            })
            .join('\n');
        })
        .filter(stmt => stmt.trim());
      
      console.log(`📄 Found ${statements.length} SQL statements to execute`);
      
      // Сначала выполняем PRAGMA
      try {
        db.pragma('foreign_keys = ON');
        console.log('✓ Enabled foreign keys');
      } catch (err) {
        console.warn('⚠️  Could not enable foreign keys:', err.message);
      }
      
      // Выполняем каждую команду
      let executed = 0;
      for (const statement of statements) {
        try {
          db.exec(statement);
          executed++;
          console.log(`✓ Executed: ${statement.substring(0, 50)}...`);
        } catch (error) {
          if (!error.message.includes('already exists')) {
            console.warn('⚠️  Warning:', statement.substring(0, 50) + '...', error.message);
          }
        }
      }
      
      console.log(`✅ Successfully executed ${executed} statements individually`);
    }
    
    // Проверяем созданные таблицы
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all();
    
    console.log('📊 Created tables:', tables.map(t => t.name).join(', '));
    
    // Проверяем есть ли данные в таблице users
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    console.log(`👥 Users in database: ${userCount.count}`);
    
    if (userCount.count > 0) {
      const users = db.prepare('SELECT email, name, role FROM users LIMIT 5').all();
      console.log('👤 Sample users:', users);
    }
    
    // Закрываем соединение
    db.close();
    
    console.log('🎉 SQLite migration completed successfully!');
    console.log('📁 Database location:', DB_PATH);
    console.log('🔑 Default login: admin@encore-tasks.com / password');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Запуск миграции
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };