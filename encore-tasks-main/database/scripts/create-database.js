#!/usr/bin/env node

/**
 * Скрипт для создания базы данных Encore Tasks
 * 
 * Использование:
 *   node scripts/create-database.js [database_name]
 * 
 * Примеры:
 *   node scripts/create-database.js
 *   node scripts/create-database.js encore_tasks_test
 */

const { Client } = require('pg');
require('dotenv').config();

// Конфигурация подключения
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  // Подключаемся к системной базе postgres для создания новой БД
  database: 'postgres'
};

// Имя создаваемой базы данных
const databaseName = process.argv[2] || process.env.DB_NAME || 'encore_tasks';

async function createDatabase() {
  const client = new Client(config);
  
  try {
    console.log('🔌 Подключение к PostgreSQL...');
    await client.connect();
    
    // Проверяем, существует ли база данных
    const checkQuery = `
      SELECT 1 FROM pg_database 
      WHERE datname = $1
    `;
    
    const result = await client.query(checkQuery, [databaseName]);
    
    if (result.rows.length > 0) {
      console.log(`⚠️  База данных "${databaseName}" уже существует`);
      return;
    }
    
    // Создаем базу данных
    console.log(`🏗️  Создание базы данных "${databaseName}"...`);
    await client.query(`CREATE DATABASE "${databaseName}"`);
    
    console.log(`✅ База данных "${databaseName}" успешно создана`);
    
    // Подключаемся к новой базе данных для создания расширений
    await client.end();
    
    const newClient = new Client({
      ...config,
      database: databaseName
    });
    
    await newClient.connect();
    
    console.log('🔧 Установка необходимых расширений...');
    
    // Создаем расширения
    const extensions = [
      'uuid-ossp',    // Для генерации UUID
      'pgcrypto',     // Для криптографических функций
      'pg_trgm'       // Для полнотекстового поиска
    ];
    
    for (const extension of extensions) {
      try {
        await newClient.query(`CREATE EXTENSION IF NOT EXISTS "${extension}"`);
        console.log(`  ✓ Расширение "${extension}" установлено`);
      } catch (error) {
        console.warn(`  ⚠️  Не удалось установить расширение "${extension}": ${error.message}`);
      }
    }
    
    await newClient.end();
    
    console.log('\n🎉 База данных готова к использованию!');
    console.log(`\n📋 Следующие шаги:`);
    console.log(`   1. Запустите миграции: npm run migrate`);
    console.log(`   2. Заполните тестовыми данными: npm run db:seed`);
    
  } catch (error) {
    console.error('❌ Ошибка при создании базы данных:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Убедитесь, что PostgreSQL запущен и доступен');
    } else if (error.code === '28P01') {
      console.error('\n💡 Проверьте правильность пароля в переменных окружения');
    } else if (error.code === '3D000') {
      console.error('\n💡 Проверьте настройки подключения к PostgreSQL');
    }
    
    process.exit(1);
  }
}

// Проверяем наличие обязательных переменных окружения
function validateEnvironment() {
  const required = ['DB_PASSWORD'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Отсутствуют обязательные переменные окружения:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\n💡 Создайте файл .env на основе .env.example');
    process.exit(1);
  }
}

// Основная функция
async function main() {
  console.log('🚀 Создание базы данных Encore Tasks\n');
  
  validateEnvironment();
  
  console.log('📊 Параметры подключения:');
  console.log(`   Хост: ${config.host}:${config.port}`);
  console.log(`   Пользователь: ${config.user}`);
  console.log(`   База данных: ${databaseName}\n`);
  
  await createDatabase();
}

// Запускаем скрипт
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Неожиданная ошибка:', error);
    process.exit(1);
  });
}

module.exports = { createDatabase };