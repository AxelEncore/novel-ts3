const { Pool } = require('pg');

// Настройки подключения к базе данных
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'encore_tasks_db',
  password: 'postgres',
  port: 5432,
});

async function checkUsersTable() {
  try {
    console.log('🔍 Проверяем структуру таблицы users...');
    
    // Получаем информацию о столбцах таблицы users
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position;
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ Таблица users не найдена');
      return;
    }
    
    console.log('📋 Структура таблицы users:');
    console.log('┌─────────────────────┬─────────────────┬─────────────┬─────────────────────┐');
    console.log('│ Столбец             │ Тип данных      │ Nullable    │ По умолчанию        │');
    console.log('├─────────────────────┼─────────────────┼─────────────┼─────────────────────┤');
    
    result.rows.forEach(row => {
      const column = row.column_name.padEnd(19);
      const type = row.data_type.padEnd(15);
      const nullable = row.is_nullable.padEnd(11);
      const defaultValue = (row.column_default || 'NULL').padEnd(19);
      console.log(`│ ${column} │ ${type} │ ${nullable} │ ${defaultValue} │`);
    });
    
    console.log('└─────────────────────┴─────────────────┴─────────────┴─────────────────────┘');
    
    // Проверяем количество пользователей
    const countResult = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log(`\n👥 Количество пользователей в таблице: ${countResult.rows[0].count}`);
    
    // Показываем существующих пользователей
    if (countResult.rows[0].count > 0) {
      const usersResult = await pool.query('SELECT id, name, email, role FROM users LIMIT 10');
      console.log('\n📋 Существующие пользователи:');
      usersResult.rows.forEach(user => {
        console.log(`  - ID: ${user.id}, Name: ${user.name}, Email: ${user.email}, Role: ${user.role}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Ошибка при проверке таблицы users:', error.message);
  } finally {
    await pool.end();
  }
}

// Запускаем проверку
checkUsersTable();