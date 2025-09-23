const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkSessions() {
  try {
    console.log('🔍 Проверка сессий в базе данных...');
    
    // Проверяем все сессии
    const sessionsResult = await pool.query('SELECT * FROM sessions ORDER BY created_at DESC LIMIT 10');
    console.log('📊 Найдено сессий:', sessionsResult.rows.length);
    
    if (sessionsResult.rows.length > 0) {
      console.log('\n📋 Последние сессии:');
      sessionsResult.rows.forEach((session, index) => {
        console.log(`${index + 1}. ID: ${session.id}`);
        console.log(`   Token: ${session.session_token ? session.session_token.substring(0, 20) + '...' : 'null'}`);
        console.log(`   User ID: ${session.user_id}`);
        console.log(`   Expires: ${session.expires_at}`);
        console.log(`   Created: ${session.created_at}`);
        console.log('---');
      });
      
      // Проверяем активные сессии
      const activeSessionsResult = await pool.query('SELECT * FROM sessions WHERE expires_at > NOW()');
      console.log(`\n✅ Активных сессий: ${activeSessionsResult.rows.length}`);
      
      if (activeSessionsResult.rows.length > 0) {
        console.log('\n🔑 Активные токены:');
        activeSessionsResult.rows.forEach((session, index) => {
          console.log(`${index + 1}. Token: ${session.session_token}`);
          console.log(`   User ID: ${session.user_id}`);
          console.log(`   Expires: ${session.expires_at}`);
        });
      }
    } else {
      console.log('❌ Сессии не найдены в базе данных');
    }
    
  } catch (error) {
    console.error('❌ Ошибка при проверке сессий:', error.message);
  } finally {
    await pool.end();
  }
}

checkSessions();