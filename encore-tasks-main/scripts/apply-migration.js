#!/usr/bin/env node

/**
 * Скрипт для применения миграций к PostgreSQL базе данных
 * Использование: node scripts/apply-migration.js [migration-file]
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Конфигурация PostgreSQL
const pgConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'encore_tasks',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};

async function applyMigration(migrationFile) {
  const pool = new Pool(pgConfig);
  
  try {
    console.log('🔗 Подключение к PostgreSQL...');
    console.log(`📊 База данных: ${pgConfig.database}`);
    console.log(`🏠 Хост: ${pgConfig.host}:${pgConfig.port}`);
    
    // Проверяем подключение
    const client = await pool.connect();
    console.log('✅ Подключение установлено');
    
    // Читаем файл миграции
    const migrationPath = path.resolve(migrationFile);
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Файл миграции не найден: ${migrationPath}`);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log(`📄 Применяем миграцию: ${path.basename(migrationFile)}`);
    
    // Применяем миграцию
    await client.query(migrationSQL);
    console.log('✅ Миграция успешно применена!');
    
    // Проверяем результат
    const result = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'projects' AND column_name = 'icon'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Колонка icon успешно добавлена в таблицу projects:');
      console.log(result.rows[0]);
    } else {
      console.log('⚠️  Колонка icon не найдена в таблице projects');
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Ошибка при применении миграции:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Получаем файл миграции из аргументов командной строки
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('❌ Укажите файл миграции:');
  console.error('Использование: node scripts/apply-migration.js <migration-file>');
  console.error('Пример: node scripts/apply-migration.js database/migrations/002_add_icon_to_projects.sql');
  process.exit(1);
}

applyMigration(migrationFile);