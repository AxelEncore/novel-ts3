/**
 * Валидатор для колонок
 * Отвечает только за валидацию данных (Single Responsibility)
 */

import {
  ColumnId,
  BoardId,
  CreateColumnDto,
  UpdateColumnDto,
  ValidationResult,
  ValidationError
} from '../../refactored/data/types';

import { IColumnValidator } from '../interfaces/column.service.interface';

/**
 * Реализация валидатора колонок
 */
export class ColumnValidator implements IColumnValidator {
  async validateCreate(data: CreateColumnDto): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    // Валидация обязательных полей
    if (!data.title || typeof data.title !== 'string') {
      errors.push({
        field: 'title',
        message: 'Title is required and must be a string',
        code: 'REQUIRED_FIELD'
      });
    } else {
      // Валидация длины заголовка
      if (data.title.trim().length === 0) {
        errors.push({
          field: 'title',
          message: 'Title cannot be empty',
          code: 'INVALID_LENGTH'
        });
      } else if (data.title.length > 100) {
        errors.push({
          field: 'title',
          message: 'Title must be less than 100 characters',
          code: 'INVALID_LENGTH'
        });
      }
    }

    if (!data.boardId || typeof data.boardId !== 'string') {
      errors.push({
        field: 'boardId',
        message: 'Board ID is required and must be a string',
        code: 'REQUIRED_FIELD'
      });
    }

    // Валидация цвета
    if (data.color !== undefined) {
      if (typeof data.color !== 'string') {
        errors.push({
          field: 'color',
          message: 'Color must be a string',
          code: 'INVALID_TYPE'
        });
      } else if (!this.isValidHexColor(data.color)) {
        errors.push({
          field: 'color',
          message: 'Color must be a valid hex color (e.g., #FF0000)',
          code: 'INVALID_FORMAT'
        });
      }
    }

    // Валидация WIP лимита
    if (data.wipLimit !== undefined) {
      if (data.wipLimit !== null) {
        if (typeof data.wipLimit !== 'number' || data.wipLimit < 1) {
          errors.push({
            field: 'wipLimit',
            message: 'WIP limit must be a positive number or null',
            code: 'INVALID_VALUE'
          });
        } else if (data.wipLimit > 1000) {
          errors.push({
            field: 'wipLimit',
            message: 'WIP limit cannot exceed 1000',
            code: 'INVALID_VALUE'
          });
        }
      }
    }

    // Валидация состояния свернутости
    if (data.isCollapsed !== undefined) {
      if (typeof data.isCollapsed !== 'boolean') {
        errors.push({
          field: 'isCollapsed',
          message: 'isCollapsed must be a boolean',
          code: 'INVALID_TYPE'
        });
      }
    }

    // Валидация настроек
    if (data.settings !== undefined) {
      if (data.settings !== null && typeof data.settings !== 'object') {
        errors.push({
          field: 'settings',
          message: 'Settings must be an object or null',
          code: 'INVALID_TYPE'
        });
      } else if (data.settings) {
        // Валидация специфических настроек
        const settingsValidation = this.validateColumnSettings(data.settings);
        if (!settingsValidation.isValid) {
          errors.push(...settingsValidation.errors);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async validateUpdate(data: UpdateColumnDto): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    // Валидация заголовка (если предоставлен)
    if (data.title !== undefined) {
      if (typeof data.title !== 'string') {
        errors.push({
          field: 'title',
          message: 'Title must be a string',
          code: 'INVALID_TYPE'
        });
      } else if (data.title.trim().length === 0) {
        errors.push({
          field: 'title',
          message: 'Title cannot be empty',
          code: 'INVALID_LENGTH'
        });
      } else if (data.title.length > 100) {
        errors.push({
          field: 'title',
          message: 'Title must be less than 100 characters',
          code: 'INVALID_LENGTH'
        });
      }
    }

    // Валидация цвета
    if (data.color !== undefined) {
      if (typeof data.color !== 'string') {
        errors.push({
          field: 'color',
          message: 'Color must be a string',
          code: 'INVALID_TYPE'
        });
      } else if (!this.isValidHexColor(data.color)) {
        errors.push({
          field: 'color',
          message: 'Color must be a valid hex color (e.g., #FF0000)',
          code: 'INVALID_FORMAT'
        });
      }
    }

    // Валидация позиции
    if (data.position !== undefined) {
      if (typeof data.position !== 'number' || data.position < 0) {
        errors.push({
          field: 'position',
          message: 'Position must be a non-negative number',
          code: 'INVALID_VALUE'
        });
      }
    }

    // Валидация WIP лимита
    if (data.wipLimit !== undefined) {
      if (data.wipLimit !== null) {
        if (typeof data.wipLimit !== 'number' || data.wipLimit < 1) {
          errors.push({
            field: 'wipLimit',
            message: 'WIP limit must be a positive number or null',
            code: 'INVALID_VALUE'
          });
        } else if (data.wipLimit > 1000) {
          errors.push({
            field: 'wipLimit',
            message: 'WIP limit cannot exceed 1000',
            code: 'INVALID_VALUE'
          });
        }
      }
    }

    // Валидация состояния свернутости
    if (data.isCollapsed !== undefined) {
      if (typeof data.isCollapsed !== 'boolean') {
        errors.push({
          field: 'isCollapsed',
          message: 'isCollapsed must be a boolean',
          code: 'INVALID_TYPE'
        });
      }
    }

    // Валидация настроек
    if (data.settings !== undefined) {
      if (data.settings !== null && typeof data.settings !== 'object') {
        errors.push({
          field: 'settings',
          message: 'Settings must be an object or null',
          code: 'INVALID_TYPE'
        });
      } else if (data.settings) {
        // Валидация специфических настроек
        const settingsValidation = this.validateColumnSettings(data.settings);
        if (!settingsValidation.isValid) {
          errors.push(...settingsValidation.errors);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async validateDelete(id: ColumnId): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    if (!id || typeof id !== 'string') {
      errors.push({
        field: 'id',
        message: 'Column ID is required and must be a string',
        code: 'REQUIRED_FIELD'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async validateReorder(boardId: BoardId, columnOrders: Array<{ id: ColumnId; position: number }>): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    if (!boardId || typeof boardId !== 'string') {
      errors.push({
        field: 'boardId',
        message: 'Board ID is required and must be a string',
        code: 'REQUIRED_FIELD'
      });
    }

    if (!Array.isArray(columnOrders)) {
      errors.push({
        field: 'columnOrders',
        message: 'Column orders must be an array',
        code: 'INVALID_TYPE'
      });
    } else {
      if (columnOrders.length === 0) {
        errors.push({
          field: 'columnOrders',
          message: 'Column orders array cannot be empty',
          code: 'INVALID_LENGTH'
        });
      }

      // Валидация каждого элемента
      for (let i = 0; i < columnOrders.length; i++) {
        const order = columnOrders[i];
        
        if (!order || typeof order !== 'object') {
          errors.push({
            field: `columnOrders[${i}]`,
            message: 'Each column order must be an object',
            code: 'INVALID_TYPE'
          });
          continue;
        }

        if (!order.id || typeof order.id !== 'string') {
          errors.push({
            field: `columnOrders[${i}].id`,
            message: 'Column ID is required and must be a string',
            code: 'REQUIRED_FIELD'
          });
        }

        if (typeof order.position !== 'number' || order.position < 0) {
          errors.push({
            field: `columnOrders[${i}].position`,
            message: 'Position must be a non-negative number',
            code: 'INVALID_VALUE'
          });
        }
      }

      // Проверка уникальности ID
      const ids = columnOrders.map(order => order.id);
      const uniqueIds = new Set(ids);
      if (ids.length !== uniqueIds.size) {
        errors.push({
          field: 'columnOrders',
          message: 'Column IDs must be unique',
          code: 'DUPLICATE_VALUES'
        });
      }

      // Проверка уникальности позиций
      const positions = columnOrders.map(order => order.position);
      const uniquePositions = new Set(positions);
      if (positions.length !== uniquePositions.size) {
        errors.push({
          field: 'columnOrders',
          message: 'Positions must be unique',
          code: 'DUPLICATE_VALUES'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async validateDuplicate(id: ColumnId, newTitle: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    if (!id || typeof id !== 'string') {
      errors.push({
        field: 'id',
        message: 'Column ID is required and must be a string',
        code: 'REQUIRED_FIELD'
      });
    }

    if (!newTitle || typeof newTitle !== 'string') {
      errors.push({
        field: 'newTitle',
        message: 'New title is required and must be a string',
        code: 'REQUIRED_FIELD'
      });
    } else {
      if (newTitle.trim().length === 0) {
        errors.push({
          field: 'newTitle',
          message: 'New title cannot be empty',
          code: 'INVALID_LENGTH'
        });
      } else if (newTitle.length > 100) {
        errors.push({
          field: 'newTitle',
          message: 'New title must be less than 100 characters',
          code: 'INVALID_LENGTH'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private validateColumnSettings(settings: Record<string, unknown>): ValidationResult {
    const errors: ValidationError[] = [];

    // Валидация автоматических правил
    if (settings.autoMoveRules !== undefined) {
      if (!Array.isArray(settings.autoMoveRules)) {
        errors.push({
          field: 'settings.autoMoveRules',
          message: 'Auto move rules must be an array',
          code: 'INVALID_TYPE'
        });
      } else {
        for (let i = 0; i < settings.autoMoveRules.length; i++) {
          const rule = settings.autoMoveRules[i];
          
          if (!rule || typeof rule !== 'object') {
            errors.push({
              field: `settings.autoMoveRules[${i}]`,
              message: 'Each auto move rule must be an object',
              code: 'INVALID_TYPE'
            });
            continue;
          }

          if (!rule.condition || typeof rule.condition !== 'string') {
            errors.push({
              field: `settings.autoMoveRules[${i}].condition`,
              message: 'Rule condition is required and must be a string',
              code: 'REQUIRED_FIELD'
            });
          }

          if (!rule.targetColumnId || typeof rule.targetColumnId !== 'string') {
            errors.push({
              field: `settings.autoMoveRules[${i}].targetColumnId`,
              message: 'Target column ID is required and must be a string',
              code: 'REQUIRED_FIELD'
            });
          }
        }
      }
    }

    // Валидация уведомлений
    if (settings.notifications !== undefined) {
      if (typeof settings.notifications !== 'object' || settings.notifications === null) {
        errors.push({
          field: 'settings.notifications',
          message: 'Notifications settings must be an object',
          code: 'INVALID_TYPE'
        });
      } else {
        if (settings.notifications.onTaskAdded !== undefined && typeof settings.notifications.onTaskAdded !== 'boolean') {
          errors.push({
            field: 'settings.notifications.onTaskAdded',
            message: 'onTaskAdded must be a boolean',
            code: 'INVALID_TYPE'
          });
        }

        if (settings.notifications.onTaskMoved !== undefined && typeof settings.notifications.onTaskMoved !== 'boolean') {
          errors.push({
            field: 'settings.notifications.onTaskMoved',
            message: 'onTaskMoved must be a boolean',
            code: 'INVALID_TYPE'
          });
        }

        if (settings.notifications.onWipLimitExceeded !== undefined && typeof settings.notifications.onWipLimitExceeded !== 'boolean') {
          errors.push({
            field: 'settings.notifications.onWipLimitExceeded',
            message: 'onWipLimitExceeded must be a boolean',
            code: 'INVALID_TYPE'
          });
        }
      }
    }

    // Валидация шаблонов задач
    if (settings.taskTemplate !== undefined) {
      if (typeof settings.taskTemplate !== 'object' || settings.taskTemplate === null) {
        errors.push({
          field: 'settings.taskTemplate',
          message: 'Task template must be an object',
          code: 'INVALID_TYPE'
        });
      } else {
        if (settings.taskTemplate.defaultPriority !== undefined) {
          const validPriorities = ['low', 'medium', 'high', 'urgent'];
          if (!validPriorities.includes(settings.taskTemplate.defaultPriority)) {
            errors.push({
              field: 'settings.taskTemplate.defaultPriority',
              message: 'Default priority must be one of: low, medium, high, urgent',
              code: 'INVALID_VALUE'
            });
          }
        }

        if (settings.taskTemplate.defaultTags !== undefined) {
          if (!Array.isArray(settings.taskTemplate.defaultTags)) {
            errors.push({
              field: 'settings.taskTemplate.defaultTags',
              message: 'Default tags must be an array',
              code: 'INVALID_TYPE'
            });
          } else {
            for (let i = 0; i < settings.taskTemplate.defaultTags.length; i++) {
              const tag = settings.taskTemplate.defaultTags[i];
              if (typeof tag !== 'string') {
                errors.push({
                  field: `settings.taskTemplate.defaultTags[${i}]`,
                  message: 'Each default tag must be a string',
                  code: 'INVALID_TYPE'
                });
              }
            }
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private isValidHexColor(color: string): boolean {
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexColorRegex.test(color);
  }
}