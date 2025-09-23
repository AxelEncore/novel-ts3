const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Настройки подключения к базе данных
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'encore_tasks',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Проверка текущей структуры таблицы boards...');
    
    // Проверяем текущую структуру таблицы boards
    const currentStructure = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'boards' 
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Текущие столбцы таблицы boards:');
    currentStructure.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (default: ${row.column_default || 'NULL'}, nullable: ${row.is_nullable})`);
    });
    
    // Читаем файл миграции
    const migrationPath = path.join(__dirname, '007_update_boards_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('\n🚀 Выполнение миграции...');
    
    // Выполняем миграцию
    await client.query(migrationSQL);
    
    console.log('✅ Миграция выполнена успешно!');
    
    // Проверяем обновленную структуру
    const updatedStructure = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'boards' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Обновленные столбцы таблицы boards:');
    updatedStructure.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (default: ${row.column_default || 'NULL'}, nullable: ${row.is_nullable})`);
    });
    
    // Проверяем количество записей
    const countResult = await client.query('SELECT COUNT(*) FROM boards');
    console.log(`\n📊 Количество записей в таблице boards: ${countResult.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Ошибка при выполнении миграции:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Запуск миграции
runMigration()
  .then(() => {
    console.log('\n🎉 Миграция завершена!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Критическая ошибка:', error);
    process.exit(1);
  });