#!/usr/bin/env node

// =====================================================
// СКРИПТ ДЛЯ ВЫПОЛНЕНИЯ МИГРАЦИЙ БАЗЫ ДАННЫХ PostgreSQL
// =====================================================
// Этот скрипт позволяет выполнять миграции PostgreSQL
// для проекта Encore Tasks

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class DatabaseMigrator {
    constructor() {
        this.pool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432'),
            database: process.env.DB_NAME || 'encore_tasks',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD,
            max: 20,
            min: 2,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
        this.migrationsDir = path.join(__dirname, 'migrations');
    }

    async connect() {
        try {
            // Проверяем подключение
            const client = await this.pool.connect();
            client.release();
            console.log('✅ Подключение к базе данных установлено');
        } catch (error) {
            console.error('❌ Ошибка подключения к базе данных:', error.message);
            throw error;
        }
    }

    async disconnect() {
        if (this.pool) {
            await this.pool.end();
            console.log('✅ Соединение с базой данных закрыто');
        }
    }

    // Создаем таблицу для отслеживания миграций
    async createMigrationsTable() {
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS migrations (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) NOT NULL UNIQUE,
                applied_at TIMESTAMP NOT NULL DEFAULT NOW(),
                checksum TEXT NOT NULL
            )
        `;
        
        try {
            await this.pool.query(createTableSQL);
            console.log('✅ Таблица миграций создана или уже существует');
        } catch (error) {
            console.error('❌ Ошибка создания таблицы миграций:', error.message);
            throw error;
        }
    }

    // Получаем список примененных миграций
    async getAppliedMigrations() {
        try {
            const result = await this.pool.query('SELECT filename FROM migrations ORDER BY id');
            return result.rows.map(row => row.filename);
        } catch (error) {
            console.error('❌ Ошибка получения списка миграций:', error.message);
            return [];
        }
    }

    // Получаем список файлов миграций
    getMigrationFiles() {
        try {
            if (!fs.existsSync(this.migrationsDir)) {
                console.log('📁 Папка миграций не найдена, создаем...');
                fs.mkdirSync(this.migrationsDir, { recursive: true });
                return [];
            }

            return fs.readdirSync(this.migrationsDir)
                .filter(file => file.endsWith('.sql'))
                .sort();
        } catch (error) {
            console.error('❌ Ошибка чтения папки миграций:', error.message);
            return [];
        }
    }

    // Вычисляем контрольную сумму файла
    calculateChecksum(content) {
        const crypto = require('crypto');
        return crypto.createHash('md5').update(content).digest('hex');
    }

    // Проверяем, нужно ли добавить недостающие колонки
    async checkAndAddMissingColumns() {
        try {
            // Проверяем наличие колонки checksum
            const tableInfo = await this.pool.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'migrations' AND table_schema = 'public'
            `);
            const columns = tableInfo.rows.map(row => row.column_name);
            const hasChecksum = columns.includes('checksum');
            
            if (!hasChecksum) {
                console.log('🔧 Добавляем колонку checksum в таблицу миграций...');
                await this.pool.query('ALTER TABLE migrations ADD COLUMN checksum TEXT');
                
                // Обновляем существующие записи
                const existingMigrations = await this.pool.query('SELECT id, filename FROM migrations');
                
                for (const migration of existingMigrations.rows) {
                    const migrationPath = path.join(this.migrationsDir, migration.filename);
                    if (fs.existsSync(migrationPath)) {
                        const content = fs.readFileSync(migrationPath, 'utf8');
                        const checksum = this.calculateChecksum(content);
                        await this.pool.query('UPDATE migrations SET checksum = $1 WHERE id = $2', [checksum, migration.id]);
                    }
                }
                
                console.log('✅ Колонка checksum добавлена и заполнена');
            }
            
        } catch (error) {
            console.error('❌ Ошибка при проверке/добавлении колонок:', error.message);
            throw error;
        }
    }

    // Применяем миграцию
    async applyMigration(filename) {
        const filePath = path.join(this.migrationsDir, filename);
        
        if (!fs.existsSync(filePath)) {
            throw new Error(`Файл миграции не найден: ${filename}`);
        }
        
        const client = await this.pool.connect();
        
        try {
            console.log(`🔄 Применяем миграцию: ${filename}`);
            
            const content = fs.readFileSync(filePath, 'utf8');
            const checksum = this.calculateChecksum(content);
            
            // Начинаем транзакцию
            await client.query('BEGIN');
            
            try {
                // Выполняем миграцию
                await client.query(content);
                
                // Записываем информацию о примененной миграции
                await client.query(
                    'INSERT INTO migrations (filename, checksum, applied_at) VALUES ($1, $2, NOW()) ON CONFLICT (filename) DO NOTHING',
                    [filename, checksum]
                );
                
                await client.query('COMMIT');
                console.log(`✅ Миграция ${filename} успешно применена`);
                
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            }
            
        } catch (error) {
            console.error(`❌ Ошибка применения миграции ${filename}:`, error.message);
            throw error;
        } finally {
            client.release();
        }
    }

    // Запускаем все непримененные миграции
    async migrate() {
        try {
            console.log('🚀 Начинаем процесс миграции...');
            
            await this.connect();
            await this.createMigrationsTable();
            
            // Сначала проверяем и добавляем недостающие колонки
            console.log('🔍 Проверяем структуру таблиц...');
            await this.checkAndAddMissingColumns();
            
            const appliedMigrations = await this.getAppliedMigrations();
            const migrationFiles = this.getMigrationFiles();
            
            console.log(`📋 Найдено миграций: ${migrationFiles.length}`);
            console.log(`📋 Применено миграций: ${appliedMigrations.length}`);
            
            const pendingMigrations = migrationFiles.filter(
                file => !appliedMigrations.includes(file)
            );
            
            if (pendingMigrations.length === 0) {
                console.log('✅ Все миграции уже применены');
                return;
            }
            
            console.log(`🔄 Применяем ${pendingMigrations.length} миграций...`);
            
            for (const migration of pendingMigrations) {
                await this.applyMigration(migration);
            }
            
            // Обновляем статистику
            console.log('📊 Обновляем статистику базы данных...');
            await this.pool.query('ANALYZE');
            
            console.log('🎉 Миграция завершена успешно!');
            
        } catch (error) {
            console.error('❌ Ошибка миграции:', error.message);
            throw error;
        } finally {
            await this.disconnect();
        }
    }

    // Откат последней миграции (осторожно!)
    async rollback() {
        try {
            console.log('⚠️  Начинаем откат последней миграции...');
            
            await this.connect();
            
            const result = await this.pool.query(
                'SELECT filename FROM migrations ORDER BY id DESC LIMIT 1'
            );
            
            if (result.rows.length === 0) {
                console.log('ℹ️  Нет миграций для отката');
                return;
            }
            
            const lastMigration = result.rows[0];
            console.log(`🔄 Откатываем миграцию: ${lastMigration.filename}`);
            
            // Удаляем запись о миграции
            await this.pool.query('DELETE FROM migrations WHERE filename = $1', [lastMigration.filename]);
            
            console.log('⚠️  Откат завершен. ВНИМАНИЕ: Структурные изменения не отменены!');
            console.log('⚠️  Для полного отката может потребоваться восстановление из резервной копии.');
            
        } catch (error) {
            console.error('❌ Ошибка отката:', error.message);
            throw error;
        } finally {
            await this.disconnect();
        }
    }
}

// Использование скрипта
if (require.main === module) {
    const migrator = new DatabaseMigrator();

    const command = process.argv[2] || 'migrate';

    switch (command) {
        case 'migrate':
        case 'up':
            migrator.migrate()
                .then(() => process.exit(0))
                .catch(error => {
                    console.error('❌ Ошибка миграции:', error.message);
                    process.exit(1);
                });
            break;

        case 'rollback':
        case 'down':
            migrator.rollback()
                .then(() => process.exit(0))
                .catch(error => {
                    console.error('❌ Ошибка отката:', error.message);
                    process.exit(1);
                });
            break;

        default:
            console.log('Использование: node migrate.js [migrate|rollback]');
            process.exit(1);
    }
}

module.exports = DatabaseMigrator;