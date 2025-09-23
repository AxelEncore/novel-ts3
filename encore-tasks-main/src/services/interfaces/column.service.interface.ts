/**
 * Интерфейсы сервисов для управления колонками
 * Следует принципу инверсии зависимостей (DIP)
 */

import {
  Column,
  ColumnId,
  BoardId,
  UserId,
  CreateColumnDto,
  UpdateColumnDto,
  OperationResult,
  Task
} from '../../types/board.types';

/**
 * Интерфейс репозитория для колонок
 * Отвечает только за операции с данными (Single Responsibility)
 */
export interface IColumnRepository {
  // Основные CRUD операции
  findById(id: ColumnId): Promise<Column | null>;
  findByBoardId(boardId: BoardId): Promise<Column[]>;
  findByIds(ids: ColumnId[]): Promise<Column[]>;
  create(columnData: CreateColumnDto & { createdBy: UserId }): Promise<Column>;
  update(id: ColumnId, columnData: UpdateColumnDto, updatedBy: UserId): Promise<Column | null>;
  delete(id: ColumnId): Promise<boolean>;
  archive(id: ColumnId, archivedBy: UserId): Promise<boolean>;
  restore(id: ColumnId, restoredBy: UserId): Promise<boolean>;
  
  // Специфичные операции
  updatePosition(id: ColumnId, newPosition: number): Promise<boolean>;
  updatePositions(updates: Array<{ id: ColumnId; position: number }>): Promise<boolean>;
  getMaxPosition(boardId: BoardId): Promise<number>;
  existsByName(name: string, boardId: BoardId, excludeId?: ColumnId): Promise<boolean>;
  existsByTitle(title: string, boardId: BoardId, excludeId?: ColumnId): Promise<boolean>;
  countByBoard(boardId: BoardId): Promise<number>;
  getColumnWithTasks(id: ColumnId): Promise<(Column & { tasks: Task[] }) | null>;
}

/**
 * Интерфейс валидатора для колонок
 * Отвечает только за валидацию (Single Responsibility)
 */
export interface IColumnValidator {
  validateCreateData(data: CreateColumnDto): Promise<OperationResult>;
  validateUpdateData(data: UpdateColumnDto, existingColumn: Column): Promise<OperationResult>;
  validateColumnName(name: string, boardId: BoardId, excludeId?: ColumnId): Promise<OperationResult>;
  validateColumnDeletion(columnId: ColumnId): Promise<OperationResult>;
  validateWipLimit(columnId: ColumnId, wipLimit: number): Promise<OperationResult>;
  validateColumnReorder(boardId: BoardId, columnIds: ColumnId[]): Promise<OperationResult>;
}

/**
 * Интерфейс для управления WIP лимитами
 * Отвечает только за WIP лимиты (Single Responsibility)
 */
export interface IColumnWipService {
  checkWipLimit(columnId: ColumnId): Promise<OperationResult<{ isExceeded: boolean; current: number; limit: number }>>;
  setWipLimit(columnId: ColumnId, limit: number, updatedBy: UserId): Promise<OperationResult>;
  removeWipLimit(columnId: ColumnId, updatedBy: UserId): Promise<OperationResult>;
  getWipStatus(boardId: BoardId): Promise<OperationResult<Array<{ columnId: ColumnId; current: number; limit: number; isExceeded: boolean }>>>;
  canAddTaskToColumn(columnId: ColumnId): Promise<OperationResult<boolean>>;
}

/**
 * Интерфейс для автоматических правил колонок
 * Отвечает только за автоматизацию (Single Responsibility)
 */
export interface IColumnAutomationService {
  executeAutoMoveRules(columnId: ColumnId, taskId: string): Promise<OperationResult>;
  addAutoMoveRule(columnId: ColumnId, rule: Record<string, unknown>, createdBy: UserId): Promise<OperationResult>;
  removeAutoMoveRule(columnId: ColumnId, ruleId: string, removedBy: UserId): Promise<OperationResult>;
  getColumnRules(columnId: ColumnId): Promise<OperationResult<Record<string, unknown>[]>>;
  validateRule(rule: Record<string, unknown>): Promise<OperationResult>;
  executeRulesForTask(taskId: string): Promise<OperationResult>;
}

/**
 * Основной интерфейс сервиса колонок
 * Координирует работу других сервисов (Facade pattern)
 */
export interface IColumnService {
  // Основные операции
  getColumnById(id: ColumnId, userId: UserId): Promise<OperationResult<Column>>;
  getColumnsByBoard(boardId: BoardId, userId: UserId): Promise<OperationResult<Column[]>>;
  createColumn(columnData: CreateColumnDto, userId: UserId): Promise<OperationResult<Column>>;
  updateColumn(id: ColumnId, columnData: UpdateColumnDto, userId: UserId): Promise<OperationResult<Column>>;
  deleteColumn(id: ColumnId, userId: UserId): Promise<OperationResult<boolean>>;
  archiveColumn(id: ColumnId, userId: UserId): Promise<OperationResult<boolean>>;
  restoreColumn(id: ColumnId, userId: UserId): Promise<OperationResult<boolean>>;
  
  // Операции с позиционированием
  reorderColumns(boardId: BoardId, columnIds: ColumnId[], userId: UserId): Promise<OperationResult<boolean>>;
  moveColumn(columnId: ColumnId, newPosition: number, userId: UserId): Promise<OperationResult<boolean>>;
  
  // Операции с WIP лимитами
  setWipLimit(columnId: ColumnId, limit: number, userId: UserId): Promise<OperationResult>;
  removeWipLimit(columnId: ColumnId, userId: UserId): Promise<OperationResult>;
  checkWipLimit(columnId: ColumnId): Promise<OperationResult<{ isExceeded: boolean; current: number; limit: number }>>;
  
  // Операции с автоматизацией
  addAutoMoveRule(columnId: ColumnId, rule: Record<string, unknown>, userId: UserId): Promise<OperationResult>;
  removeAutoMoveRule(columnId: ColumnId, ruleId: string, userId: UserId): Promise<OperationResult>;
  getColumnRules(columnId: ColumnId, userId: UserId): Promise<OperationResult<Record<string, unknown>[]>>;
  
  // Специальные операции
  duplicateColumn(columnId: ColumnId, newName: string, userId: UserId): Promise<OperationResult<Column>>;
  getColumnStatistics(columnId: ColumnId, userId: UserId): Promise<OperationResult<Record<string, unknown>>>;
  getColumnWithTasks(columnId: ColumnId, userId: UserId): Promise<OperationResult<Column & { tasks: Task[] }>>;
  
  // Операции с шаблонами
  createColumnFromTemplate(templateId: string, boardId: BoardId, userId: UserId): Promise<OperationResult<Column>>;
  saveAsTemplate(columnId: ColumnId, templateName: string, userId: UserId): Promise<OperationResult>;
}

/**
 * Интерфейс фабрики для создания колонок
 * Применяет паттерн Factory (Open/Closed Principle)
 */
export interface IColumnFactory {
  createColumn(data: CreateColumnDto, createdBy: UserId): Column;
  createDefaultColumn(boardId: BoardId, name: string, position: number, createdBy: UserId): Column;
  createColumnFromTemplate(templateId: string, boardId: BoardId, createdBy: UserId): Column;
  duplicateColumn(originalColumn: Column, newName: string, createdBy: UserId): Column;
}

/**
 * Интерфейс для кэширования колонок
 * Отвечает только за кэширование (Single Responsibility)
 */
export interface IColumnCacheService {
  getColumn(id: ColumnId): Promise<Column | null>;
  setColumn(column: Column): Promise<void>;
  deleteColumn(id: ColumnId): Promise<void>;
  getColumnsByBoard(boardId: BoardId): Promise<Column[] | null>;
  setColumnsByBoard(boardId: BoardId, columns: Column[]): Promise<void>;
  invalidateBoardColumns(boardId: BoardId): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Интерфейс для шаблонов колонок
 * Отвечает только за шаблоны (Single Responsibility)
 */
export interface IColumnTemplateService {
  getTemplates(userId: UserId): Promise<OperationResult<Record<string, unknown>[]>>;
  getTemplate(templateId: string): Promise<OperationResult<Record<string, unknown>>>;
  createTemplate(name: string, columnData: Partial<Column>, userId: UserId): Promise<OperationResult<Record<string, unknown>>>;
  updateTemplate(templateId: string, data: Record<string, unknown>, userId: UserId): Promise<OperationResult<Record<string, unknown>>>;
  deleteTemplate(templateId: string, userId: UserId): Promise<OperationResult<boolean>>;
  applyTemplate(templateId: string, boardId: BoardId, userId: UserId): Promise<OperationResult<Column[]>>;
}

/**
 * Интерфейс для событий колонок
 * Отвечает только за события (Single Responsibility)
 */
export interface IColumnEventService {
  emitColumnCreated(column: Column, userId: UserId): Promise<void>;
  emitColumnUpdated(column: Column, userId: UserId, changes: Partial<Column>): Promise<void>;
  emitColumnDeleted(columnId: ColumnId, boardId: BoardId, userId: UserId): Promise<void>;
  emitColumnReordered(boardId: BoardId, columnIds: ColumnId[], userId: UserId): Promise<void>;
  emitWipLimitChanged(columnId: ColumnId, oldLimit: number | undefined, newLimit: number | undefined, userId: UserId): Promise<void>;
  getColumnEvents(columnId: ColumnId, limit?: number): Promise<Record<string, unknown>[]>;
}

/**
 * Интерфейс для аналитики колонок
 * Отвечает только за аналитику (Single Responsibility)
 */
export interface IColumnAnalyticsService {
  getColumnMetrics(columnId: ColumnId, dateFrom?: Date, dateTo?: Date): Promise<OperationResult<Record<string, unknown>>>;
  getBoardColumnMetrics(boardId: BoardId, dateFrom?: Date, dateTo?: Date): Promise<OperationResult<Record<string, unknown>>>;
  getColumnThroughput(columnId: ColumnId, dateFrom?: Date, dateTo?: Date): Promise<OperationResult<Record<string, unknown>>>;
  getColumnCycleTime(columnId: ColumnId, dateFrom?: Date, dateTo?: Date): Promise<OperationResult<Record<string, unknown>>>;
  getColumnWipTrends(columnId: ColumnId, dateFrom?: Date, dateTo?: Date): Promise<OperationResult<Record<string, unknown>>>;
  generateColumnReport(columnId: ColumnId, reportType: string, dateFrom?: Date, dateTo?: Date): Promise<OperationResult<Record<string, unknown>>>;
}