const { Pool } = require('pg');

// Настройки подключения к базе данных
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'encore_tasks_db',
  password: 'postgres',
  port: 5432,
});

async function approveUser(email) {
  try {
    console.log(`Одобрение пользователя: ${email}`);
    
    // Обновляем статус пользователя на 'approved'
    const result = await pool.query(
      `UPDATE users SET approval_status = 'approved' WHERE email = $1 RETURNING id, email, approval_status`,
      [email]
    );
    
    if (result.rows.length === 0) {
      console.log(`Пользователь с email ${email} не найден`);
      return;
    }
    
    const user = result.rows[0];
    console.log('Пользователь успешно одобрен:');
    console.log(`ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Статус: ${user.approval_status}`);
    
  } catch (error) {
    console.error('Ошибка при одобрении пользователя:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Получаем email из аргументов командной строки
const email = process.argv[2];
if (!email) {
  console.error('Использование: node approve-user.js <email>');
  process.exit(1);
}

approveUser(email);