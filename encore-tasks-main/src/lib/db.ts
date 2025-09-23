// Условный импорт database-adapter в зависимости от окружения
let databaseAdapter: any;

if (typeof window === 'undefined') {
  // Серверная сторона - используем полный database-adapter
  const { dbAdapter } = eval('require("./database-adapter")');
  databaseAdapter = dbAdapter;
} else {
  // Клиентская сторона - используем заглушку
  const { dbAdapter } = eval('require("./database-adapter-client")');
  databaseAdapter = dbAdapter;
}

// Флаг доступности PostgreSQL
let postgreSQLConnectionStatus = false;

// Проверка подключения к PostgreSQL
async function checkPostgreSQLConnection() {
  try {
    await databaseAdapter.initialize();
    postgreSQLConnectionStatus = true;
    console.log('✅ PostgreSQL подключение установлено');
    return true;
  } catch (error) {
    postgreSQLConnectionStatus = false;
    console.log('❌ PostgreSQL недоступен:', (error as Error).message);
    return false;
  }
}

// Функция для получения статуса PostgreSQL
export function getPostgreSQLAvailability(): boolean {
  return postgreSQLConnectionStatus;
}

// Функция для выполнения запросов (PostgreSQL API)
export async function query(text: string, params?: any[]) {
  try {
    if (!postgreSQLConnectionStatus) {
      await checkPostgreSQLConnection();
    }
    
    if (!postgreSQLConnectionStatus) {
      // Возвращаем пустой результат, если PostgreSQL недоступен
      return { rows: [], rowCount: 0 };
    }
    
    // Выполняем SQL запрос через PostgreSQL адаптер
    const result = await databaseAdapter.query(text, params);
    return { rows: result, rowCount: result.length };
  } catch (error) {
    console.error('Database query error:', error);
    postgreSQLConnectionStatus = false;
    // Возвращаем пустой результат для fallback
    return { rows: [], rowCount: 0 };
  }
}

// Функция для выполнения транзакций (PostgreSQL)
export async function transaction(callback: (client: any) => Promise<any>) {
  try {
    // PostgreSQL транзакции через адаптер
    const mockClient = {
      query: async (text: string, params?: any[]) => {
        const result = await databaseAdapter.query(text, params);
        return { rows: result, rowCount: result.length };
      }
    };
    return await callback(mockClient);
  } catch (error) {
    throw error;
  }
}

// Инициализация подключения при загрузке модуля
checkPostgreSQLConnection();

// Экспорт для совместимости
export const pool = null;
export const dbConfig = null;

// Новые экспорты для PostgreSQL
export { databaseAdapter };
export function isPostgreSQLAvailable(): boolean {
  return postgreSQLConnectionStatus;
}

// Обратная совместимость (deprecated)
export function getSQLiteAvailability(): boolean {
  console.warn('getSQLiteAvailability() is deprecated, use getPostgreSQLAvailability() instead');
  return postgreSQLConnectionStatus;
}

export function isSQLiteAvailable(): boolean {
  console.warn('isSQLiteAvailable() is deprecated, use isPostgreSQLAvailable() instead');
  return isPostgreSQLAvailable();
}