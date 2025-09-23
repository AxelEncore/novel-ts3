const fs = require('fs');
const path = require('path');

console.log('🧹 Cleaning up temporary files...');

const filesToRemove = [
  'fix-user.bat',
  'add-user.bat', 
  'run-migration.bat',
  'FIX_LOGIN_PROBLEM.txt',
  'QUICK_START.md',
  'SQLITE_MIGRATION.md',
  'simple-test.ps1',
  'database/fix-user.js',
  'database/add-user.js',
  'database/migrate-sqlite.js',
  'database/simple-migrate.js',
  'scripts/debug-cookies.js',
  'scripts/apply-migration.js'
];

let removedCount = 0;
let notFoundCount = 0;

filesToRemove.forEach(file => {
  const fullPath = path.join(__dirname, file);
  
  if (fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath);
      console.log(`✅ Removed: ${file}`);
      removedCount++;
    } catch (error) {
      console.log(`❌ Failed to remove: ${file} - ${error.message}`);
    }
  } else {
    console.log(`⚪ Not found: ${file}`);
    notFoundCount++;
  }
});

console.log(`\n📊 Summary:`);
console.log(`  ✅ Removed: ${removedCount} files`);
console.log(`  ⚪ Not found: ${notFoundCount} files`);

// Также удалим временные скрипты из package.json
try {
  const packagePath = path.join(__dirname, 'package.json');
  if (fs.existsSync(packagePath)) {
    let packageContent = fs.readFileSync(packagePath, 'utf-8');
    
    // Удаляем временные скрипты
    const scriptsToRemove = [
      '"db:migrate-sqlite": "node database/migrate-sqlite.js",\n        ',
      '"db:setup": "node database/simple-migrate.js",\n        ',
      '"db:add-user": "node database/add-user.js",\n        ',
      '"db:fix-user": "node database/fix-user.js",\n        ',
      '"db:fix-user": "node database/fix-user.js"'
    ];
    
    scriptsToRemove.forEach(script => {
      packageContent = packageContent.replace(script, '');
    });
    
    // Очищаем лишние запятые и пробелы
    packageContent = packageContent.replace(/,(\s*),/g, ',');
    packageContent = packageContent.replace(/,(\s*)\}/g, '\n    }');
    
    fs.writeFileSync(packagePath, packageContent);
    console.log('✅ Cleaned up package.json scripts');
  }
} catch (error) {
  console.log('⚠️  Could not clean package.json:', error.message);
}

console.log('\n🎉 Cleanup completed!');