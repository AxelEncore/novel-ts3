const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

// Настройки подключения к базе данных
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'encore_tasks_db',
  password: 'postgres',
  port: 5432,
});

async function resetAdmin() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Начинаем сброс пользователей и создание нового администратора...');
    
    // Начинаем транзакцию
    await client.query('BEGIN');
    
    // 1. Удаляем все сессии
    console.log('🗑️ Удаляем все сессии...');
    const sessionsResult = await client.query('DELETE FROM user_sessions');
    console.log(`✅ Удалено сессий: ${sessionsResult.rowCount}`);
    
    // 2. Удаляем всех пользователей
    console.log('🗑️ Удаляем всех пользователей...');
    const usersResult = await client.query('DELETE FROM users');
    console.log(`✅ Удалено пользователей: ${usersResult.rowCount}`);
    
    // 3. Создаем нового администратора
    console.log('👤 Создаем нового администратора...');
    
    const adminData = {
      id: uuidv4(),
      name: 'Administrator',
      email: 'axelencore@mail.ru',
      password: 'Ad580dc6axelencore',
      role: 'admin'
    };
    
    // Хешируем пароль
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(adminData.password, saltRounds);
    
    // Вставляем нового администратора
    const insertResult = await client.query(`
      INSERT INTO users (
        id, name, email, password_hash, role, 
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, 
        NOW(), NOW()
      ) RETURNING id, name, email, role
    `, [
      adminData.id,
      adminData.name,
      adminData.email,
      hashedPassword,
      adminData.role
    ]);
    
    const newAdmin = insertResult.rows[0];
    
    // Подтверждаем транзакцию
    await client.query('COMMIT');
    
    console.log('\n🎉 Администратор успешно создан:');
    console.log(`📧 Email: ${newAdmin.email}`);
    console.log(`👤 Имя: ${newAdmin.name}`);
    console.log(`🔑 Роль: ${newAdmin.role}`);
    console.log(`✅ Статус: ${newAdmin.approval_status}`);
    console.log(`🟢 Активен: ${newAdmin.is_active}`);
    console.log(`\n🔐 Данные для входа:`);
    console.log(`📧 Email: ${adminData.email}`);
    console.log(`🔑 Пароль: ${adminData.password}`);
    
  } catch (error) {
    // Откатываем транзакцию в случае ошибки
    await client.query('ROLLBACK');
    console.error('❌ Ошибка при сбросе администратора:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Запускаем скрипт
resetAdmin();