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

// Флаг доступности SQLite
let sqliteConnectionStatus = false;

// Проверка подключения к SQLite
async function checkSQLiteConnection() {
  try {
    await databaseAdapter.initialize();
    sqliteConnectionStatus = true;
    console.log('✅ SQLite подключение установлено');
    return true;
  } catch (error) {
    sqliteConnectionStatus = false;
    console.log('❌ SQLite недоступен:', (error as Error).message);
    return false;
  }
}

// Функция для получения статуса SQLite
export function getSQLiteAvailability(): boolean {
  return sqliteConnectionStatus;
}

// Функция для выполнения запросов (SQLite API)
export async function query(text: string, params?: any[]) {
  try {
    if (!sqliteConnectionStatus) {
      await checkSQLiteConnection();
    }
    
    if (!sqliteConnectionStatus) {
      // Возвращаем пустой результат, если SQLite недоступен
      return { rows: [], rowCount: 0 };
    }
    
    // Выполняем SQL запрос через SQLite адаптер
    const result = await databaseAdapter.query(text, params);
    return { rows: result.rows || result, rowCount: result.rowCount || result.length };
  } catch (error) {
    console.error('Database query error:', error);
    sqliteConnectionStatus = false;
    // Возвращаем пустой результат для fallback
    return { rows: [], rowCount: 0 };
  }
}

// Функция для выполнения транзакций (SQLite)
export async function transaction(callback: (client: any) => Promise<any>) {
  try {
    // SQLite транзакции через адаптер
    const mockClient = {
      query: async (text: string, params?: any[]) => {
        const result = await databaseAdapter.query(text, params);
        return { rows: result.rows || result, rowCount: result.rowCount || result.length };
      }
    };
    return await callback(mockClient);
  } catch (error) {
    throw error;
  }
}

// Инициализация подключения при загрузке модуля
checkSQLiteConnection();

// Экспорт для совместимости
export const pool = null;
export const dbConfig = null;

// Новые экспорты для SQLite
export { databaseAdapter };
export function isSQLiteAvailable(): boolean {
  return sqliteConnectionStatus;
}

// Обратная совместимость (deprecated) - теперь они указывают на SQLite
export function getPostgreSQLAvailability(): boolean {
  console.warn('getPostgreSQLAvailability() is deprecated, use getSQLiteAvailability() instead');
  return sqliteConnectionStatus;
}

export function isPostgreSQLAvailable(): boolean {
  console.warn('isPostgreSQLAvailable() is deprecated, use isSQLiteAvailable() instead');
  return isSQLiteAvailable();
}
