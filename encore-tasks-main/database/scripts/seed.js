#!/usr/bin/env node

/**
 * Скрипт для заполнения базы данных тестовыми данными
 * 
 * Использование:
 *   node scripts/seed.js [--reset]
 * 
 * Опции:
 *   --reset  Очистить существующие данные перед заполнением
 */

const { Pool } = require('pg');
const crypto = require('crypto');
require('dotenv').config();

// Централизованная конфигурация базы данных
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'encore_tasks',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: 20,
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

const pool = new Pool(dbConfig);

// Функция для хеширования паролей
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

// Тестовые данные
const seedData = {
  users: [
    {
      name: 'Администратор',
      email: 'admin@encore-tasks.com',
      password: hashPassword('admin123'),
      role: 'admin',
      is_approved: true
    },
    {
      name: 'Иван Петров',
      email: 'ivan.petrov@example.com',
      password: hashPassword('password123'),
      role: 'user',
      is_approved: true
    },
    {
      name: 'Мария Сидорова',
      email: 'maria.sidorova@example.com',
      password: hashPassword('password123'),
      role: 'user',
      is_approved: true
    },
    {
      name: 'Алексей Козлов',
      email: 'alexey.kozlov@example.com',
      password: hashPassword('password123'),
      role: 'user',
      is_approved: true
    },
    {
      name: 'Елена Новикова',
      email: 'elena.novikova@example.com',
      password: hashPassword('password123'),
      role: 'user',
      is_approved: false
    }
  ],
  
  projects: [
    {
      name: 'Веб-приложение Encore Tasks',
      description: 'Разработка системы управления задачами с современным интерфейсом',
      color: '#3B82F6'
    },
    {
      name: 'Мобильное приложение',
      description: 'Создание мобильной версии для iOS и Android',
      color: '#10B981'
    },
    {
      name: 'API интеграции',
      description: 'Разработка REST API для интеграции с внешними системами',
      color: '#F59E0B'
    }
  ],
  
  boards: [
    {
      name: 'Разработка',
      icon: '💻'
    },
    {
      name: 'Тестирование',
      icon: '🧪'
    },
    {
      name: 'Дизайн',
      icon: '🎨'
    }
  ],
  
  columns: [
    { title: 'К выполнению', color: '#EF4444', position: 0 },
    { title: 'В работе', color: '#F59E0B', position: 1 },
    { title: 'На проверке', color: '#3B82F6', position: 2 },
    { title: 'Выполнено', color: '#10B981', position: 3 }
  ],
  
  tags: [
    { name: 'frontend', color: '#3B82F6' },
    { name: 'backend', color: '#10B981' },
    { name: 'database', color: '#F59E0B' },
    { name: 'ui/ux', color: '#8B5CF6' },
    { name: 'bug', color: '#EF4444' },
    { name: 'feature', color: '#06B6D4' },
    { name: 'urgent', color: '#DC2626' },
    { name: 'documentation', color: '#6B7280' }
  ]
};

// Функция очистки данных
async function clearData(client) {
  console.log('🧹 Очистка существующих данных...');
  
  const tables = [
    'task_tags', 'task_assignees', 'comments', 'attachments',
    'notifications', 'activity_logs', 'user_sessions',
    'tasks', 'columns', 'boards', 'project_members', 
    'projects', 'tags', 'users'
  ];
  
  for (const table of tables) {
    await client.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
    console.log(`  ✓ Таблица ${table} очищена`);
  }
}

// Функция создания пользователей
async function seedUsers(client) {
  console.log('👥 Создание пользователей...');
  
  const userIds = [];
  
  for (const user of seedData.users) {
    const result = await client.query(`
      INSERT INTO users (name, email, password_hash, role, is_approved)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [user.name, user.email, user.password, user.role, user.is_approved]);
    
    userIds.push(result.rows[0].id);
    console.log(`  ✓ Пользователь "${user.name}" создан`);
  }
  
  return userIds;
}

// Функция создания проектов
async function seedProjects(client, userIds) {
  console.log('📁 Создание проектов...');
  
  const projectIds = [];
  
  for (let i = 0; i < seedData.projects.length; i++) {
    const project = seedData.projects[i];
    const creatorId = userIds[i % userIds.length];
    
    const result = await client.query(`
      INSERT INTO projects (name, description, color, creator_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [project.name, project.description, project.color, creatorId]);
    
    const projectId = result.rows[0].id;
    projectIds.push(projectId);
    
    // Добавляем участников проекта
    const memberIds = userIds.slice(0, Math.min(3, userIds.length));
    for (const memberId of memberIds) {
      await client.query(`
        INSERT INTO project_members (project_id, user_id, role)
        VALUES ($1, $2, $3)
      `, [projectId, memberId, memberId === creatorId ? 'admin' : 'member']);
    }
    
    console.log(`  ✓ Проект "${project.name}" создан с ${memberIds.length} участниками`);
  }
  
  return projectIds;
}

// Функция создания досок
async function seedBoards(client, projectIds) {
  console.log('📋 Создание досок...');
  
  const boardIds = [];
  
  for (const projectId of projectIds) {
    for (const board of seedData.boards) {
      const result = await client.query(`
        INSERT INTO boards (name, project_id, icon)
        VALUES ($1, $2, $3)
        RETURNING id
      `, [board.name, projectId, board.icon]);
      
      boardIds.push(result.rows[0].id);
    }
  }
  
  console.log(`  ✓ Создано ${boardIds.length} досок`);
  return boardIds;
}

// Функция создания колонок
async function seedColumns(client, boardIds) {
  console.log('📊 Создание колонок...');
  
  const columnIds = [];
  
  for (const boardId of boardIds) {
    for (const column of seedData.columns) {
      const result = await client.query(`
        INSERT INTO columns (title, board_id, position, color)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [column.title, boardId, column.position, column.color]);
      
      columnIds.push(result.rows[0].id);
    }
  }
  
  console.log(`  ✓ Создано ${columnIds.length} колонок`);
  return columnIds;
}

// Функция создания тегов
async function seedTags(client) {
  console.log('🏷️  Создание тегов...');
  
  const tagIds = [];
  
  for (const tag of seedData.tags) {
    const result = await client.query(`
      INSERT INTO tags (name, color)
      VALUES ($1, $2)
      RETURNING id
    `, [tag.name, tag.color]);
    
    tagIds.push(result.rows[0].id);
    console.log(`  ✓ Тег "${tag.name}" создан`);
  }
  
  return tagIds;
}

// Функция создания задач
async function seedTasks(client, projectIds, columnIds, userIds, tagIds) {
  console.log('📝 Создание задач...');
  
  const tasks = [
    {
      title: 'Настройка базы данных',
      description: 'Создать схему базы данных и настроить миграции',
      status: 'done',
      priority: 'high',
      tags: ['backend', 'database']
    },
    {
      title: 'Дизайн главной страницы',
      description: 'Создать макет главной страницы приложения',
      status: 'in_progress',
      priority: 'medium',
      tags: ['ui/ux', 'frontend']
    },
    {
      title: 'API для управления задачами',
      description: 'Разработать REST API для CRUD операций с задачами',
      status: 'todo',
      priority: 'high',
      tags: ['backend', 'feature']
    },
    {
      title: 'Система уведомлений',
      description: 'Реализовать отправку уведомлений пользователям',
      status: 'todo',
      priority: 'medium',
      tags: ['backend', 'feature']
    },
    {
      title: 'Мобильная адаптация',
      description: 'Адаптировать интерфейс для мобильных устройств',
      status: 'review',
      priority: 'low',
      tags: ['frontend', 'ui/ux']
    },
    {
      title: 'Исправление бага с авторизацией',
      description: 'Пользователи не могут войти в систему после обновления',
      status: 'in_progress',
      priority: 'urgent',
      tags: ['bug', 'backend', 'urgent']
    }
  ];
  
  const taskIds = [];
  
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const projectId = projectIds[i % projectIds.length];
    const reporterId = userIds[i % userIds.length];
    
    // Находим подходящую колонку по статусу
    const statusColumnMap = {
      'todo': 0,
      'in_progress': 1,
      'review': 2,
      'done': 3
    };
    
    const columnIndex = statusColumnMap[task.status] || 0;
    const columnId = columnIds.filter((_, idx) => idx % 4 === columnIndex)[0];
    
    const result = await client.query(`
      INSERT INTO tasks (
        title, description, status, priority, 
        project_id, column_id, reporter_id, position
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [
      task.title, task.description, task.status, task.priority,
      projectId, columnId, reporterId, i
    ]);
    
    const taskId = result.rows[0].id;
    taskIds.push(taskId);
    
    // Назначаем исполнителей
    const assigneeCount = Math.floor(Math.random() * 2) + 1;
    const assignees = userIds.slice(0, assigneeCount);
    
    for (const assigneeId of assignees) {
      await client.query(`
        INSERT INTO task_assignees (task_id, user_id)
        VALUES ($1, $2)
      `, [taskId, assigneeId]);
    }
    
    // Добавляем теги
    for (const tagName of task.tags) {
      const tagIndex = seedData.tags.findIndex(t => t.name === tagName);
      if (tagIndex !== -1) {
        await client.query(`
          INSERT INTO task_tags (task_id, tag_id)
          VALUES ($1, $2)
        `, [taskId, tagIds[tagIndex]]);
      }
    }
    
    console.log(`  ✓ Задача "${task.title}" создана`);
  }
  
  return taskIds;
}

// Функция создания комментариев
async function seedComments(client, taskIds, userIds) {
  console.log('💬 Создание комментариев...');
  
  const comments = [
    'Отличная работа! Продолжайте в том же духе.',
    'Нужно добавить валидацию данных.',
    'Предлагаю использовать другой подход.',
    'Задача выполнена качественно.',
    'Есть замечания по дизайну.',
    'Требуется дополнительное тестирование.'
  ];
  
  let commentCount = 0;
  
  for (const taskId of taskIds) {
    const numComments = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < numComments; i++) {
      const authorId = userIds[Math.floor(Math.random() * userIds.length)];
      const content = comments[Math.floor(Math.random() * comments.length)];
      
      await client.query(`
        INSERT INTO comments (task_id, author_id, content)
        VALUES ($1, $2, $3)
      `, [taskId, authorId, content]);
      
      commentCount++;
    }
  }
  
  console.log(`  ✓ Создано ${commentCount} комментариев`);
}

// Основная функция заполнения
async function seedDatabase(reset = false) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    if (reset) {
      await clearData(client);
    }
    
    const userIds = await seedUsers(client);
    const projectIds = await seedProjects(client, userIds);
    const boardIds = await seedBoards(client, projectIds);
    const columnIds = await seedColumns(client, boardIds);
    const tagIds = await seedTags(client);
    const taskIds = await seedTasks(client, projectIds, columnIds, userIds, tagIds);
    await seedComments(client, taskIds, userIds);
    
    await client.query('COMMIT');
    
    console.log('\n🎉 База данных успешно заполнена тестовыми данными!');
    console.log('\n📊 Статистика:');
    console.log(`   👥 Пользователей: ${userIds.length}`);
    console.log(`   📁 Проектов: ${projectIds.length}`);
    console.log(`   📋 Досок: ${boardIds.length}`);
    console.log(`   📊 Колонок: ${columnIds.length}`);
    console.log(`   🏷️  Тегов: ${tagIds.length}`);
    console.log(`   📝 Задач: ${taskIds.length}`);
    
    console.log('\n🔑 Тестовые аккаунты:');
    console.log('   admin@encore-tasks.com / admin123 (Администратор)');
    console.log('   ivan.petrov@example.com / password123 (Пользователь)');
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Основная функция
async function main() {
  console.log('🌱 Заполнение базы данных тестовыми данными\n');
  
  const reset = process.argv.includes('--reset');
  
  if (reset) {
    console.log('⚠️  Режим сброса: все существующие данные будут удалены\n');
  }
  
  try {
    await seedDatabase(reset);
  } catch (error) {
    console.error('❌ Ошибка при заполнении базы данных:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Запускаем скрипт
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Неожиданная ошибка:', error);
    process.exit(1);
  });
}

module.exports = { seedDatabase };