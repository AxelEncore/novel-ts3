/**
 * Реализация сервиса для управления колонками
 * Координирует работу с репозиторием, валидатором и другими сервисами
 */

import {
  Column,
  ColumnId,
  BoardId,
  UserId,
  CreateColumnDto,
  UpdateColumnDto,
  ColumnFilters,
  PaginationOptions
} from '../../refactored/data/types';

import {
  IColumnService,
  IColumnRepository,
  IColumnValidator,
  IColumnWipService,
  IColumnAutomationService,
  IColumnFactory,
  IColumnCacheService,
  IColumnTemplateService,
  IColumnEventService,
  IColumnAnalyticsService
} from '../interfaces/column.service.interface';

/**
 * Реализация сервиса управления колонками
 */
export class ColumnService implements IColumnService {
  constructor(
    private readonly repository: IColumnRepository,
    private readonly validator: IColumnValidator,
    private readonly wipService: IColumnWipService,
    private readonly automationService: IColumnAutomationService,
    private readonly factory: IColumnFactory,
    private readonly eventService: IColumnEventService,
    private readonly analyticsService: IColumnAnalyticsService,
    private readonly cacheService: IColumnCacheService,
    private readonly templateService: IColumnTemplateService
  ) {}

  async getById(id: ColumnId): Promise<ServiceResponse<Column>> {
    try {
      // Проверяем кэш
      if (this.cacheService) {
        const cached = await this.cacheService.get(id);
        if (cached) {
          return { success: true, data: cached };
        }
      }

      const column = await this.repository.findById(id);
      
      if (!column) {
        return {
          success: false,
          error: {
            code: 'COLUMN_NOT_FOUND',
            message: 'Column not found'
          }
        };
      }

      // Кэшируем результат
      if (this.cacheService) {
        await this.cacheService.set(id, column);
      }

      return { success: true, data: column };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  async getByBoardId(boardId: BoardId, filters: ColumnFilters): Promise<ServiceResponse<Column[]>> {
    try {
      const columns = await this.repository.findByBoardId(boardId, filters);
      
      return { success: true, data: columns };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  async getAll(filters: ColumnFilters, sort: SortOptions, pagination: PaginationOptions): Promise<ServiceResponse<PaginatedResponse<Column>>> {
    try {
      const result = await this.repository.findAll(filters, sort, pagination);
      
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  async create(columnData: CreateColumnDto, createdBy: UserId): Promise<ServiceResponse<Column>> {
    try {
      // Валидация данных
      const validation = await this.validator.validateCreate(columnData);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: validation.errors
          }
        };
      }

      // Проверяем лимит колонок на доске
      const existingColumns = await this.repository.findByBoardId(columnData.boardId);
      if (existingColumns.length >= 20) {
        return {
          success: false,
          error: {
            code: 'COLUMN_LIMIT_EXCEEDED',
            message: 'Maximum number of columns per board exceeded (20)'
          }
        };
      }

      // Проверяем уникальность названия
      const titleExists = await this.repository.existsByTitle(columnData.title, columnData.boardId);
      if (titleExists) {
        return {
          success: false,
          error: {
            code: 'COLUMN_TITLE_EXISTS',
            message: 'Column with this title already exists on the board'
          }
        };
      }

      // Создаем колонку
      const column = await this.repository.create({ ...columnData, createdBy });

      // Инвалидируем кэш
      if (this.cacheService) {
        await this.cacheService.invalidateBoard(columnData.boardId);
      }

      // Отправляем событие
      await this.eventService.emit({
        type: 'column_created',
        columnId: column.id,
        boardId: column.boardId,
        userId: createdBy,
        timestamp: new Date(),
        data: { column }
      });

      // Обновляем аналитику
      await this.analyticsService.trackColumnCreated(column.boardId, column.id, createdBy);

      return { success: true, data: column };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  async update(id: ColumnId, columnData: UpdateColumnDto, updatedBy: UserId): Promise<ServiceResponse<Column>> {
    try {
      // Валидация данных
      const validation = await this.validator.validateUpdate(columnData);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: validation.errors
          }
        };
      }

      // Проверяем существование колонки
      const existingColumn = await this.repository.findById(id);
      if (!existingColumn) {
        return {
          success: false,
          error: {
            code: 'COLUMN_NOT_FOUND',
            message: 'Column not found'
          }
        };
      }

      // Проверяем уникальность названия (если изменяется)
      if (columnData.title && columnData.title !== existingColumn.title) {
        const titleExists = await this.repository.existsByTitle(columnData.title, existingColumn.boardId, id);
        if (titleExists) {
          return {
            success: false,
            error: {
              code: 'COLUMN_TITLE_EXISTS',
              message: 'Column with this title already exists on the board'
            }
          };
        }
      }

      // Валидация WIP лимитов
      if (columnData.wipLimit !== undefined) {
        const wipValidation = await this.wipService.validateWipLimit(id, columnData.wipLimit);
        if (!wipValidation.isValid) {
          return {
            success: false,
            error: {
              code: 'WIP_VALIDATION_ERROR',
              message: wipValidation.message || 'WIP limit validation failed'
            }
          };
        }
      }

      // Обновляем колонку
      const updatedColumn = await this.repository.update(id, columnData, updatedBy);
      
      if (!updatedColumn) {
        return {
          success: false,
          error: {
            code: 'UPDATE_FAILED',
            message: 'Failed to update column'
          }
        };
      }

      // Инвалидируем кэш
      if (this.cacheService) {
        await this.cacheService.invalidate(id);
        await this.cacheService.invalidateBoard(updatedColumn.boardId);
      }

      // Отправляем событие
      await this.eventService.emit({
        type: 'column_updated',
        columnId: id,
        boardId: updatedColumn.boardId,
        userId: updatedBy,
        timestamp: new Date(),
        data: { 
          oldColumn: existingColumn,
          newColumn: updatedColumn,
          changes: columnData
        }
      });

      // Обновляем аналитику
      await this.analyticsService.trackColumnUpdated(updatedColumn.boardId, id, updatedBy);

      return { success: true, data: updatedColumn };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error $1 error.message : 'Unknown error'
        }
      };
    }
  }

  async delete(id: ColumnId, deletedBy: UserId): Promise<ServiceResponse<boolean>> {
    try {
      // Валидация
      const validation = await this.validator.validateDelete(id);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: validation.errors
          }
        };
      }

      // Проверяем существование колонки
      const existingColumn = await this.repository.findById(id);
      if (!existingColumn) {
        return {
          success: false,
          error: {
            code: 'COLUMN_NOT_FOUND',
            message: 'Column not found'
          }
        };
      }

      // Проверяем, что это не последняя колонка на доске
      const boardColumns = await this.repository.findByBoardId(existingColumn.boardId);
      if (boardColumns.length <= 1) {
        return {
          success: false,
          error: {
            code: 'CANNOT_DELETE_LAST_COLUMN',
            message: 'Cannot delete the last column on the board'
          }
        };
      }

      // Проверяем наличие задач в колонке
      const taskCount = await this.repository.countTasks(id);
      if (taskCount > 0) {
        return {
          success: false,
          error: {
            code: 'COLUMN_HAS_TASKS',
            message: `Cannot delete column with ${taskCount} tasks. Please move or delete tasks first.`
          }
        };
      }

      // Удаляем колонку
      const deleted = await this.repository.delete(id);
      
      if (!deleted) {
        return {
          success: false,
          error: {
            code: 'DELETE_FAILED',
            message: 'Failed to delete column'
          }
        };
      }

      // Инвалидируем кэш
      if (this.cacheService) {
        await this.cacheService.invalidate(id);
        await this.cacheService.invalidateBoard(existingColumn.boardId);
      }

      // Отправляем событие
      await this.eventService.emit({
        type: 'column_deleted',
        columnId: id,
        boardId: existingColumn.boardId,
        userId: deletedBy,
        timestamp: new Date(),
        data: { deletedColumn: existingColumn }
      });

      // Обновляем аналитику
      await this.analyticsService.trackColumnDeleted(existingColumn.boardId, id, deletedBy);

      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error $1 error.message : 'Unknown error'
        }
      };
    }
  }

  async reorder(boardId: BoardId, columnOrders: Array<{ id: ColumnId; position: number }>): Promise<ServiceResponse<boolean>> {
    try {
      // Валидация
      const validation = await this.validator.validateReorder(boardId, columnOrders);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: validation.errors
          }
        };
      }

      // Проверяем, что все колонки принадлежат указанной доске
      const boardColumns = await this.repository.findByBoardId(boardId);
      const boardColumnIds = new Set(boardColumns.map(c => c.id));
      
      for (const order of columnOrders) {
        if (!boardColumnIds.has(order.id)) {
          return {
            success: false,
            error: {
              code: 'COLUMN_NOT_IN_BOARD',
              message: `Column ${order.id} does not belong to board ${boardId}`
            }
          };
        }
      }

      // Обновляем позиции
      const updated = await this.repository.updatePositions(columnOrders);
      
      if (!updated) {
        return {
          success: false,
          error: {
            code: 'REORDER_FAILED',
            message: 'Failed to reorder columns'
          }
        };
      }

      // Инвалидируем кэш
      if (this.cacheService) {
        await this.cacheService.invalidateBoardColumns(boardId);
        for (const order of columnOrders) {
          await this.cacheService.invalidate(order.id);
        }
      }

      // Отправляем событие
      await this.eventService.emit({
        type: 'columns_reordered',
        columnId: columnOrders[0]?.id || '',
        boardId,
        userId,
        timestamp: new Date(),
        data: { columnOrders }
      });

      // Обновляем аналитику
      await this.analyticsService.trackColumnsReordered(boardId, userId);

      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error $1 error.message : 'Unknown error'
        }
      };
    }
  }

  async duplicate(id: ColumnId, newTitle: string, userId: string): Promise<ServiceResponse<Column>> {
    try {
      // Валидация
      const validation = await this.validator.validateDuplicate(id, newTitle);
      if (!validation.isValid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: validation.errors
          }
        };
      }

      // Проверяем существование исходной колонки
      const sourceColumn = await this.repository.findById(id);
      if (!sourceColumn) {
        return {
          success: false,
          error: {
            code: 'COLUMN_NOT_FOUND',
            message: 'Source column not found'
          }
        };
      }

      // Проверяем уникальность нового названия
      const titleExists = await this.repository.existsByTitle(newTitle, sourceColumn.boardId);
      if (titleExists) {
        return {
          success: false,
          error: {
            code: 'COLUMN_TITLE_EXISTS',
            message: 'Column with this title already exists on the board'
          }
        };
      }

      // Создаем дубликат
      const duplicatedColumn = await this.factory.createFromTemplate({
        title: newTitle,
        boardId: sourceColumn.boardId,
        color: sourceColumn.color,
        wipLimit: sourceColumn.wipLimit,
        isCollapsed: sourceColumn.isCollapsed,
        settings: sourceColumn.settings
      }, userId);

      // Инвалидируем кэш
      if (this.cacheService) {
        await this.cacheService.invalidateBoard(sourceColumn.boardId);
      }

      // Отправляем событие
      await this.eventService.emit({
        type: 'column_duplicated',
        columnId: duplicatedColumn.id,
        boardId: sourceColumn.boardId,
        userId,
        timestamp: new Date(),
        data: { 
          sourceColumn,
          duplicatedColumn
        }
      });

      // Обновляем аналитику
      await this.analyticsService.trackColumnDuplicated(sourceColumn.boardId, id, duplicatedColumn.id, userId);

      return { success: true, data: duplicatedColumn };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error $1 error.message : 'Unknown error'
        }
      };
    }
  }

  async getStatistics(id: ColumnId): Promise<ServiceResponse<ColumnStatistics>> {
    try {
      const statistics = await this.analyticsService.getColumnStatistics(id);
      
      return { success: true, data: statistics };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error $1 error.message : 'Unknown error'
        }
      };
    }
  }

  async getEvents(id: ColumnId, limit: number): Promise<ServiceResponse<ColumnEvent[]>> {
    try {
      const events = await this.eventService.getColumnEvents(id, limit);
      
      return { success: true, data: events };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error $1 error.message : 'Unknown error'
        }
      };
    }
  }

  async createFromTemplate(templateId: string, boardId: BoardId, userId: string): Promise<ServiceResponse<Column>> {
    try {
      if (!this.templateService) {
        return {
          success: false,
          error: {
            code: 'TEMPLATE_SERVICE_NOT_AVAILABLE',
            message: 'Template service is not available'
          }
        };
      }

      const template = await this.templateService.getTemplate(templateId);
      if (!template) {
        return {
          success: false,
          error: {
            code: 'TEMPLATE_NOT_FOUND',
            message: 'Column template not found'
          }
        };
      }

      // Проверяем уникальность названия
      const titleExists = await this.repository.existsByTitle(template.title, boardId);
      if (titleExists) {
        return {
          success: false,
          error: {
            code: 'COLUMN_TITLE_EXISTS',
            message: 'Column with this title already exists on the board'
          }
        };
      }

      const column = await this.factory.createColumnFromTemplate({
        ...template,
        boardId
      }, userId);

      // Инвалидируем кэш
      if (this.cacheService) {
        await this.cacheService.invalidateBoard(boardId);
      }

      // Отправляем событие
      await this.eventService.emit({
        type: 'column_created_from_template',
        columnId: column.id,
        boardId,
        userId,
        timestamp: new Date(),
        data: { column, templateId }
      });

      return { success: true, data: column };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error $1 error.message : 'Unknown error'
        }
      };
    }
  }
}