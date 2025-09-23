const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

async function main() {
  const Database = require('better-sqlite3');
  
  // Путь к базе данных
  const DB_PATH = path.join(__dirname, 'encore_tasks.db');
  
  if (!fs.existsSync(DB_PATH)) {
    console.log('❌ Database file not found. Please run migration first:');
    console.log('   npm run db:setup');
    process.exit(1);
  }
  
  const db = new Database(DB_PATH);
  
  // Проверяем существующих пользователей
  console.log('🔍 Checking existing users...');
  const existingUsers = db.prepare('SELECT email, name, role, approval_status FROM users').all();
  
  console.log(`📊 Found ${existingUsers.length} users in database:`);
  existingUsers.forEach(user => {
    console.log(`  - ${user.email} (${user.name}) - ${user.role} - ${user.approval_status}`);
  });
  
  // Добавляем нужного администратора
  const adminEmail = 'axelencore@mail.ru';
  const adminPassword = 'Ad580dc6axelencore';
  
  console.log(`\n👤 Adding admin user: ${adminEmail}`);
  
  // Проверяем, существует ли уже этот пользователь
  const existingAdmin = db.prepare('SELECT * FROM users WHERE email = ?').get(adminEmail);
  
  if (existingAdmin) {
    console.log('⚠️  User already exists. Updating password...');
    
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    const updateUser = db.prepare(`
      UPDATE users 
      SET password_hash = ?, approval_status = 'approved', updated_at = datetime('now')
      WHERE email = ?
    `);
    
    updateUser.run(hashedPassword, adminEmail);
    console.log('✅ User password updated');
  } else {
    console.log('➕ Creating new admin user...');
    
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    const insertUser = db.prepare(`
      INSERT INTO users (email, password_hash, name, role, approval_status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    
    insertUser.run(
      adminEmail,
      hashedPassword,
      'Axelencore Admin',
      'admin',
      'approved'
    );
    
    console.log('✅ Admin user created');
  }
  
  // Проверяем результат
  console.log('\n🔍 Final user list:');
  const finalUsers = db.prepare('SELECT email, name, role, approval_status FROM users').all();
  finalUsers.forEach(user => {
    console.log(`  - ${user.email} (${user.name}) - ${user.role} - ${user.approval_status}`);
  });
  
  console.log('\n🔑 Login credentials:');
  console.log(`   Email: ${adminEmail}`);
  console.log(`   Password: ${adminPassword}`);
  
  db.close();
  
  console.log('\n🎉 User setup completed! You can now login to the application.');
  
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  
  if (error.code === 'MODULE_NOT_FOUND') {
    if (error.message.includes('better-sqlite3')) {
      console.log('\n📦 Please install better-sqlite3:');
      console.log('   npm install better-sqlite3');
    } else if (error.message.includes('bcryptjs')) {
      console.log('\n📦 Please install bcryptjs:');
      console.log('   npm install bcryptjs');
    }
  }
  
  process.exit(1);
});
