#!/usr/bin/env node

/**
 * Скрипт для создания резервных копий базы данных Encore Tasks
 * 
 * Использование:
 *   node scripts/backup.js [options]
 * 
 * Опции:
 *   --compress     Сжать резервную копию (по умолчанию: true)
 *   --schema-only  Создать резервную копию только схемы
 *   --data-only    Создать резервную копию только данных
 *   --output DIR   Директория для сохранения (по умолчанию: ./backups)
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { createWriteStream } = require('fs');
const { createGzip } = require('zlib');
require('dotenv').config();

// Конфигурация
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'encore_tasks',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  backupPath: process.env.BACKUP_PATH || './backups',
  compress: process.env.BACKUP_COMPRESS !== 'false',
  retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS) || 30
};

// Парсинг аргументов командной строки
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    compress: config.compress,
    schemaOnly: false,
    dataOnly: false,
    output: config.backupPath
  };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--compress':
        options.compress = true;
        break;
      case '--no-compress':
        options.compress = false;
        break;
      case '--schema-only':
        options.schemaOnly = true;
        break;
      case '--data-only':
        options.dataOnly = true;
        break;
      case '--output':
        if (i + 1 < args.length) {
          options.output = args[++i];
        }
        break;
    }
  }
  
  return options;
}

// Создание директории для резервных копий
async function ensureBackupDirectory(backupPath) {
  try {
    await fs.access(backupPath);
  } catch (error) {
    console.log(`📁 Создание директории: ${backupPath}`);
    await fs.mkdir(backupPath, { recursive: true });
  }
}

// Генерация имени файла резервной копии
function generateBackupFilename(options) {
  const timestamp = new Date().toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .slice(0, -5); // Убираем миллисекунды и Z
  
  let suffix = '';
  if (options.schemaOnly) suffix = '_schema';
  else if (options.dataOnly) suffix = '_data';
  
  const extension = options.compress ? '.sql.gz' : '.sql';
  
  return `${config.database}_${timestamp}${suffix}${extension}`;
}

// Выполнение pg_dump
function createBackup(outputPath, options) {
  return new Promise((resolve, reject) => {
    const args = [
      '--host', config.host,
      '--port', config.port.toString(),
      '--username', config.username,
      '--dbname', config.database,
      '--verbose',
      '--no-password'
    ];
    
    // Добавляем опции
    if (options.schemaOnly) {
      args.push('--schema-only');
    } else if (options.dataOnly) {
      args.push('--data-only');
    }
    
    // Добавляем дополнительные опции для полной резервной копии
    if (!options.schemaOnly && !options.dataOnly) {
      args.push('--create', '--clean', '--if-exists');
    }
    
    console.log(`🔄 Выполнение pg_dump...`);
    console.log(`   Команда: pg_dump ${args.join(' ')}`);
    
    const pgDump = spawn('pg_dump', args, {
      env: {
        ...process.env,
        PGPASSWORD: config.password
      }
    });
    
    let outputStream;
    
    if (options.compress) {
      const gzip = createGzip({ level: 9 });
      outputStream = createWriteStream(outputPath);
      pgDump.stdout.pipe(gzip).pipe(outputStream);
    } else {
      outputStream = createWriteStream(outputPath);
      pgDump.stdout.pipe(outputStream);
    }
    
    let errorOutput = '';
    
    pgDump.stderr.on('data', (data) => {
      const message = data.toString();
      if (message.includes('NOTICE') || message.includes('pg_dump:')) {
        // Игнорируем информационные сообщения
        return;
      }
      errorOutput += message;
    });
    
    pgDump.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`pg_dump завершился с кодом ${code}\n${errorOutput}`));
      }
    });
    
    pgDump.on('error', (error) => {
      reject(new Error(`Ошибка запуска pg_dump: ${error.message}`));
    });
  });
}

// Получение размера файла в человекочитаемом формате
async function getFileSize(filePath) {
  const stats = await fs.stat(filePath);
  const bytes = stats.size;
  
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Очистка старых резервных копий
async function cleanupOldBackups(backupPath, retentionDays) {
  console.log(`🧹 Очистка резервных копий старше ${retentionDays} дней...`);
  
  try {
    const files = await fs.readdir(backupPath);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    let deletedCount = 0;
    
    for (const file of files) {
      if (!file.startsWith(config.database) || (!file.endsWith('.sql') && !file.endsWith('.sql.gz'))) {
        continue;
      }
      
      const filePath = path.join(backupPath, file);
      const stats = await fs.stat(filePath);
      
      if (stats.mtime < cutoffDate) {
        await fs.unlink(filePath);
        console.log(`  ✓ Удален: ${file}`);
        deletedCount++;
      }
    }
    
    if (deletedCount === 0) {
      console.log('  ✓ Старых резервных копий не найдено');
    } else {
      console.log(`  ✓ Удалено ${deletedCount} старых резервных копий`);
    }
    
  } catch (error) {
    console.warn(`⚠️  Ошибка при очистке старых резервных копий: ${error.message}`);
  }
}

// Проверка доступности pg_dump
function checkPgDump() {
  return new Promise((resolve, reject) => {
    const pgDump = spawn('pg_dump', ['--version']);
    
    pgDump.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error('pg_dump не найден в PATH'));
      }
    });
    
    pgDump.on('error', (error) => {
      reject(new Error(`pg_dump не доступен: ${error.message}`));
    });
  });
}

// Основная функция создания резервной копии
async function createDatabaseBackup(options) {
  console.log('💾 Создание резервной копии базы данных\n');
  
  // Проверяем доступность pg_dump
  await checkPgDump();
  
  // Создаем директорию для резервных копий
  await ensureBackupDirectory(options.output);
  
  // Генерируем имя файла
  const filename = generateBackupFilename(options);
  const outputPath = path.join(options.output, filename);
  
  console.log('📊 Параметры резервного копирования:');
  console.log(`   База данных: ${config.database}`);
  console.log(`   Хост: ${config.host}:${config.port}`);
  console.log(`   Файл: ${filename}`);
  console.log(`   Сжатие: ${options.compress ? 'включено' : 'отключено'}`);
  
  if (options.schemaOnly) {
    console.log(`   Режим: только схема`);
  } else if (options.dataOnly) {
    console.log(`   Режим: только данные`);
  } else {
    console.log(`   Режим: полная резервная копия`);
  }
  
  console.log('');
  
  const startTime = Date.now();
  
  try {
    // Создаем резервную копию
    await createBackup(outputPath, options);
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    const fileSize = await getFileSize(outputPath);
    
    console.log('\n✅ Резервная копия успешно создана!');
    console.log(`   Файл: ${outputPath}`);
    console.log(`   Размер: ${fileSize}`);
    console.log(`   Время: ${duration} секунд`);
    
    // Очищаем старые резервные копии
    await cleanupOldBackups(options.output, config.retentionDays);
    
  } catch (error) {
    console.error('❌ Ошибка при создании резервной копии:', error.message);
    
    // Удаляем неполный файл
    try {
      await fs.unlink(outputPath);
    } catch (unlinkError) {
      // Игнорируем ошибку удаления
    }
    
    throw error;
  }
}

// Проверка переменных окружения
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
  console.log('🚀 Система резервного копирования Encore Tasks\n');
  
  validateEnvironment();
  
  const options = parseArgs();
  
  try {
    await createDatabaseBackup(options);
    
    console.log('\n🎉 Резервное копирование завершено успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    
    if (error.message.includes('pg_dump не найден')) {
      console.error('\n💡 Установите PostgreSQL client tools');
      console.error('   Windows: https://www.postgresql.org/download/windows/');
      console.error('   macOS: brew install postgresql');
      console.error('   Ubuntu: sudo apt-get install postgresql-client');
    }
    
    process.exit(1);
  }
}

// Запускаем скрипт
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Неожиданная ошибка:', error);
    process.exit(1);
  });
}

module.exports = { createDatabaseBackup };