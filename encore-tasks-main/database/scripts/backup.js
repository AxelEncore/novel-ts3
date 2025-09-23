#!/usr/bin/env node

/**
 * SQLite Backup Script (replaces PostgreSQL pg_dump-based backup)
 * Creates a timestamped copy of the SQLite database file with optional gzip compression.
 */

const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const { createGzip } = require('zlib');
require('dotenv').config();

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'encore_tasks.db');
const BACKUP_DIR = process.env.BACKUP_PATH || path.join(process.cwd(), 'backups');
const COMPRESS = process.env.BACKUP_COMPRESS !== 'false';
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10);

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

// Ensure backup directory exists
async function ensureBackupDirectory(dir) {
  try {
    await fsp.access(dir);
  } catch {
    console.log(`📁 Создание директории: ${dir}`);
    await fsp.mkdir(dir, { recursive: true });
  }
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, -5);
}

async function copyFile(src, dest) {
  await fsp.copyFile(src, dest);
}

async function gzipFile(src, destGz) {
  return new Promise((resolve, reject) => {
    const rs = fs.createReadStream(src);
    const ws = fs.createWriteStream(destGz);
    const gz = createGzip({ level: 9 });
    rs.pipe(gz).pipe(ws);
    ws.on('close', resolve);
    ws.on('error', reject);
    rs.on('error', reject);
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
    const files = await fsp.readdir(backupPath);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    let deletedCount = 0;
    
    for (const file of files) {
      const isBackup = file.endsWith('.db') || file.endsWith('.db.gz');
      if (!isBackup) continue;
      
      const filePath = path.join(backupPath, file);
      const stats = await fsp.stat(filePath);
      
      if (stats.mtime < cutoffDate) {
        await fsp.unlink(filePath);
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

// No external tools required for SQLite backup

async function createDatabaseBackup() {
  console.log('💾 Создание резервной копии SQLite базы данных\n');

  await ensureBackupDirectory(BACKUP_DIR);

  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Не найден файл базы данных: ${DB_PATH}`);
  }

  const baseName = `encore_tasks_${timestamp()}.db`;
  const destPath = path.join(BACKUP_DIR, baseName);

  console.log('📊 Параметры резервного копирования:');
  console.log(`   Файл БД: ${DB_PATH}`);
  console.log(`   Файл копии: ${destPath}${COMPRESS ? ' (gz)' : ''}`);

  await copyFile(DB_PATH, destPath);
  if (COMPRESS) {
    await gzipFile(destPath, `${destPath}.gz`);
    await fsp.unlink(destPath);
  }

  console.log('✅ Резервная копия создана успешно');
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
    await cleanupOldBackups(BACKUP_DIR, RETENTION_DAYS);
    
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
  // No required env vars for SQLite backup
}

// Основная функция
async function main() {
  console.log('🚀 Система резервного копирования Encore Tasks\n');
  
  validateEnvironment();
  
  const options = parseArgs();
  
try {
    await createDatabaseBackup();
    
    console.log('\n🎉 Резервное копирование завершено успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    
    
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