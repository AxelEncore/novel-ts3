// =====================================================
// КОНФИГУРАЦИЯ БАЗЫ ДАННЫХ
// =====================================================
// Пример конфигурации для подключения к PostgreSQL
// Скопируйте этот файл в config.js и настройте под свою среду

const config = {
  // Настройки подключения к базе данных
  database: {
    // Основное подключение
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'encore_tasks',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    
    // Настройки пула соединений
    pool: {
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      max: parseInt(process.env.DB_POOL_MAX) || 20,
      acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 30000,
      idle: parseInt(process.env.DB_POOL_IDLE) || 10000,
    },
    
    // Настройки для разработки
    development: {
      logging: console.log, // Включить логирование SQL запросов
      benchmark: true,      // Показывать время выполнения запросов
    },
    
    // Настройки для продакшена
    production: {
      logging: false,       // Отключить логирование в продакшене
      benchmark: false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    },
    
    // Настройки для тестирования
    test: {
      database: process.env.DB_TEST_NAME || 'encore_tasks_test',
      logging: false,
    }
  },
  
  // Настройки миграций
  migrations: {
    directory: './migrations',
    pattern: /^\d{3}_.*\.sql$/,
    tableName: 'schema_migrations'
  },
  
  // Настройки безопасности
  security: {
    // Время жизни сессии в секундах (24 часа)
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT) || 86400,
    
    // Максимальное количество активных сессий на пользователя
    maxSessionsPerUser: parseInt(process.env.MAX_SESSIONS_PER_USER) || 5,
    
    // Включить Row Level Security
    enableRLS: process.env.ENABLE_RLS !== 'false',
    
    // Настройки для хеширования паролей
    bcrypt: {
      rounds: parseInt(process.env.BCRYPT_ROUNDS) || 12
    }
  },
  
  // Настройки для очистки данных
  cleanup: {
    // Количество дней хранения логов
    logRetentionDays: parseInt(process.env.LOG_RETENTION_DAYS) || 90,
    
    // Количество дней хранения истекших сессий
    sessionRetentionDays: parseInt(process.env.SESSION_RETENTION_DAYS) || 7,
    
    // Интервал автоматической очистки в часах
    cleanupInterval: parseInt(process.env.CLEANUP_INTERVAL) || 24
  },
  
  // Настройки уведомлений
  notifications: {
    // Размер пакета для отправки уведомлений
    batchSize: parseInt(process.env.NOTIFICATION_BATCH_SIZE) || 100,
    
    // Интервал проверки новых уведомлений в секундах
    checkInterval: parseInt(process.env.NOTIFICATION_CHECK_INTERVAL) || 30,
    
    // Максимальное количество попыток отправки
    maxRetries: parseInt(process.env.NOTIFICATION_MAX_RETRIES) || 3
  },
  
  // Настройки файлов
  files: {
    // Максимальный размер файла в байтах (10MB)
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760,
    
    // Разрешенные типы файлов
    allowedTypes: process.env.ALLOWED_FILE_TYPES ? 
      process.env.ALLOWED_FILE_TYPES.split(',') : 
      ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt'],
    
    // Путь для хранения файлов
    uploadPath: process.env.UPLOAD_PATH || './uploads',
    
    // URL для доступа к файлам
    baseUrl: process.env.FILES_BASE_URL || '/api/files'
  },
  
  // Настройки интеграции с Telegram
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    webhookUrl: process.env.TELEGRAM_WEBHOOK_URL,
    enabled: process.env.TELEGRAM_ENABLED === 'true'
  },
  
  // Настройки Redis для кеширования (опционально)
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB) || 0,
    enabled: process.env.REDIS_ENABLED === 'true'
  },
  
  // Настройки логирования
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/app.log',
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5
  }
};

// Функция для получения конфигурации в зависимости от среды
function getConfig(environment = process.env.NODE_ENV || 'development') {
  const baseConfig = { ...config };
  
  // Применяем настройки для конкретной среды
  if (baseConfig.database[environment]) {
    baseConfig.database = {
      ...baseConfig.database,
      ...baseConfig.database[environment]
    };
  }
  
  return baseConfig;
}

// Функция для валидации конфигурации
function validateConfig(config) {
  const required = [
    'database.host',
    'database.port', 
    'database.database',
    'database.username'
  ];
  
  for (const path of required) {
    const keys = path.split('.');
    let value = config;
    
    for (const key of keys) {
      value = value[key];
      if (value === undefined) {
        throw new Error(`Отсутствует обязательная настройка: ${path}`);
      }
    }
  }
  
  // Проверяем числовые значения
  if (config.database.port < 1 || config.database.port > 65535) {
    throw new Error('Порт базы данных должен быть от 1 до 65535');
  }
  
  if (config.database.pool.min < 0 || config.database.pool.max < config.database.pool.min) {
    throw new Error('Неверные настройки пула соединений');
  }
  
  return true;
}

// Функция для создания строки подключения
function getDatabaseUrl(config) {
  const { host, port, database, username, password } = config.database;
  const auth = password ? `${username}:${password}` : username;
  return `postgresql://${auth}@${host}:${port}/${database}`;
}

// Экспорт
module.exports = {
  getConfig,
  validateConfig,
  getDatabaseUrl,
  default: getConfig()
};

// Пример использования:
// const { getConfig, validateConfig } = require('./config');
// const config = getConfig('production');
// validateConfig(config);
// console.log('Конфигурация валидна:', config);