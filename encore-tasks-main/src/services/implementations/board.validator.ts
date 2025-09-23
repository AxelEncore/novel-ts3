/**
 * Валидатор для досок
 * Отвечает только за валидацию данных (Single Responsibility)
 */

import {
  BoardId,
  ProjectId,
  CreateBoardDto,
  UpdateBoardDto,
  BoardVisibility,
  ValidationResult,
  ValidationError
} from '../../types/board.types';

import { IBoardValidator } from '../interfaces/board.service.interface';

/**
 * Реализация валидатора досок
 */
export class BoardValidator implements IBoardValidator {
  
  async validateCreate(data: CreateBoardDto): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    
    // Валидация названия
    const nameValidation = this.validateName(data.name);
    if (!nameValidation.isValid) {
      errors.push(...nameValidation.errors);
    }
    
    // Валидация проекта
    const projectValidation = this.validateProjectId(data.projectId);
    if (!projectValidation.isValid) {
      errors.push(...projectValidation.errors);
    }
    
    // Валидация описания
    if (data.description !== undefined) {
      const descriptionValidation = this.validateDescription(data.description);
      if (!descriptionValidation.isValid) {
        errors.push(...descriptionValidation.errors);
      }
    }
    
    // Валидация видимости
    if (data.visibility !== undefined) {
      const visibilityValidation = this.validateVisibility(data.visibility);
      if (!visibilityValidation.isValid) {
        errors.push(...visibilityValidation.errors);
      }
    }
    
    // Валидация цвета
    if (data.color !== undefined) {
      const colorValidation = this.validateColor(data.color);
      if (!colorValidation.isValid) {
        errors.push(...colorValidation.errors);
      }
    }
    
    // Валидация иконки
    if (data.icon !== undefined) {
      const iconValidation = this.validateIcon(data.icon);
      if (!iconValidation.isValid) {
        errors.push(...iconValidation.errors);
      }
    }
    
    // Валидация настроек
    if (data.settings !== undefined) {
      const settingsValidation = this.validateSettings(data.settings);
      if (!settingsValidation.isValid) {
        errors.push(...settingsValidation.errors);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async validateCreateData(data: CreateBoardDto): Promise<{ success: boolean; error$1: string }> {
    const validationResult = await this.validateCreate(data);
    
    if (validationResult.isValid) {
      return { success: true };
    }
    
    const errorMessages = validationResult.errors.map(error => error.message).join(', ');
    return {
      success: false,
      error: errorMessages
    };
  }
  
  async validateUpdate(id: BoardId, data: UpdateBoardDto): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    
    // Валидация ID
    const idValidation = this.validateId(id);
    if (!idValidation.isValid) {
      errors.push(...idValidation.errors);
    }
    
    // Валидация названия (если предоставлено)
    if (data.name !== undefined) {
      const nameValidation = this.validateName(data.name);
      if (!nameValidation.isValid) {
        errors.push(...nameValidation.errors);
      }
    }
    
    // Валидация описания (если предоставлено)
    if (data.description !== undefined) {
      const descriptionValidation = this.validateDescription(data.description);
      if (!descriptionValidation.isValid) {
        errors.push(...descriptionValidation.errors);
      }
    }
    
    // Валидация видимости (если предоставлено)
    if (data.visibility !== undefined) {
      const visibilityValidation = this.validateVisibility(data.visibility);
      if (!visibilityValidation.isValid) {
        errors.push(...visibilityValidation.errors);
      }
    }
    
    // Валидация цвета (если предоставлено)
    if (data.color !== undefined) {
      const colorValidation = this.validateColor(data.color);
      if (!colorValidation.isValid) {
        errors.push(...colorValidation.errors);
      }
    }
    
    // Валидация иконки (если предоставлено)
    if (data.icon !== undefined) {
      const iconValidation = this.validateIcon(data.icon);
      if (!iconValidation.isValid) {
        errors.push(...iconValidation.errors);
      }
    }
    
    // Валидация позиции (если предоставлено)
    if (data.position !== undefined) {
      const positionValidation = this.validatePosition(data.position);
      if (!positionValidation.isValid) {
        errors.push(...positionValidation.errors);
      }
    }
    
    // Валидация настроек (если предоставлено)
    if (data.settings !== undefined) {
      const settingsValidation = this.validateSettings(data.settings);
      if (!settingsValidation.isValid) {
        errors.push(...settingsValidation.errors);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  async validateDelete(id: BoardId): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    
    // Валидация ID
    const idValidation = this.validateId(id);
    if (!idValidation.isValid) {
      errors.push(...idValidation.errors);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  async validateArchive(id: BoardId): Promise<ValidationResult> {
    return this.validateDelete(id); // Те же правила валидации
  }
  
  async validateRestore(id: BoardId): Promise<ValidationResult> {
    return this.validateDelete(id); // Те же правила валидации
  }
  
  async validateReorder(boardIds: BoardId[], positions: number[]): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    
    // Проверяем, что количество досок и позиций совпадает
    if (boardIds.length !== positions.length) {
      errors.push({
        field: 'reorder',
        message: 'Количество досок и позиций должно совпадать',
        code: 'REORDER_MISMATCH'
      });
    }
    
    // Валидация каждого ID доски
    for (const id of boardIds) {
      const idValidation = this.validateId(id);
      if (!idValidation.isValid) {
        errors.push(...idValidation.errors);
      }
    }
    
    // Валидация каждой позиции
    for (const position of positions) {
      const positionValidation = this.validatePosition(position);
      if (!positionValidation.isValid) {
        errors.push(...positionValidation.errors);
      }
    }
    
    // Проверяем уникальность позиций
    const uniquePositions = new Set(positions);
    if (uniquePositions.size !== positions.length) {
      errors.push({
        field: 'positions',
        message: 'Позиции должны быть уникальными',
        code: 'DUPLICATE_POSITIONS'
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  async validateDuplicate(id: BoardId, newName$1: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    
    // Валидация исходного ID
    const idValidation = this.validateId(id);
    if (!idValidation.isValid) {
      errors.push(...idValidation.errors);
    }
    
    // Валидация нового названия (если предоставлено)
    if (newName !== undefined) {
      const nameValidation = this.validateName(newName);
      if (!nameValidation.isValid) {
        errors.push(...nameValidation.errors);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  // Приватные методы для валидации отдельных полей
  
  private validateId(id: BoardId): ValidationResult {
    const errors: ValidationError[] = [];
    
    if (!id) {
      errors.push({
        field: 'id',
        message: 'ID доски обязателен',
        code: 'REQUIRED'
      });
    } else if (typeof id !== 'string') {
      errors.push({
        field: 'id',
        message: 'ID доски должен быть строкой',
        code: 'INVALID_TYPE'
      });
    } else if (id.trim().length === 0) {
      errors.push({
        field: 'id',
        message: 'ID доски не может быть пустым',
        code: 'EMPTY'
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  private validateName(name: string): ValidationResult {
    const errors: ValidationError[] = [];
    
    if (!name) {
      errors.push({
        field: 'name',
        message: 'Название доски обязательно',
        code: 'REQUIRED'
      });
    } else if (typeof name !== 'string') {
      errors.push({
        field: 'name',
        message: 'Название доски должно быть строкой',
        code: 'INVALID_TYPE'
      });
    } else {
      const trimmedName = name.trim();
      
      if (trimmedName.length === 0) {
        errors.push({
          field: 'name',
          message: 'Название доски не может быть пустым',
          code: 'EMPTY'
        });
      } else if (trimmedName.length < 2) {
        errors.push({
          field: 'name',
          message: 'Название доски должно содержать минимум 2 символа',
          code: 'TOO_SHORT'
        });
      } else if (trimmedName.length > 100) {
        errors.push({
          field: 'name',
          message: 'Название доски не может превышать 100 символов',
          code: 'TOO_LONG'
        });
      }
      
      // Проверка на недопустимые символы
      const invalidChars = /[<>"'&]/;
      if (invalidChars.test(trimmedName)) {
        errors.push({
          field: 'name',
          message: 'Название доски содержит недопустимые символы',
          code: 'INVALID_CHARACTERS'
        });
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  private validateDescription(description: string | null): ValidationResult {
    const errors: ValidationError[] = [];
    
    if (description !== null && description !== undefined) {
      if (typeof description !== 'string') {
        errors.push({
          field: 'description',
          message: 'Описание доски должно быть строкой',
          code: 'INVALID_TYPE'
        });
      } else if (description.length > 1000) {
        errors.push({
          field: 'description',
          message: 'Описание доски не может превышать 1000 символов',
          code: 'TOO_LONG'
        });
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  private validateProjectId(projectId: ProjectId): ValidationResult {
    const errors: ValidationError[] = [];
    
    if (!projectId) {
      errors.push({
        field: 'projectId',
        message: 'ID проекта обязателен',
        code: 'REQUIRED'
      });
    } else if (typeof projectId !== 'string') {
      errors.push({
        field: 'projectId',
        message: 'ID проекта должен быть строкой',
        code: 'INVALID_TYPE'
      });
    } else if (projectId.trim().length === 0) {
      errors.push({
        field: 'projectId',
        message: 'ID проекта не может быть пустым',
        code: 'EMPTY'
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  private validateVisibility(visibility: BoardVisibility): ValidationResult {
    const errors: ValidationError[] = [];
    
    const validVisibilities: BoardVisibility[] = ['private', 'team', 'public'];
    
    if (!validVisibilities.includes(visibility)) {
      errors.push({
        field: 'visibility',
        message: `Видимость доски должна быть одной из: ${validVisibilities.join(', ')}`,
        code: 'INVALID_VALUE'
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  private validateColor(color: string): ValidationResult {
    const errors: ValidationError[] = [];
    
    if (typeof color !== 'string') {
      errors.push({
        field: 'color',
        message: 'Цвет доски должен быть строкой',
        code: 'INVALID_TYPE'
      });
    } else {
      // Проверка формата HEX цвета
      const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      if (!hexColorRegex.test(color)) {
        errors.push({
          field: 'color',
          message: 'Цвет доски должен быть в формате HEX (#RRGGBB или #RGB)',
          code: 'INVALID_FORMAT'
        });
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  private validateIcon(icon: string | null): ValidationResult {
    const errors: ValidationError[] = [];
    
    if (icon !== null && icon !== undefined) {
      if (typeof icon !== 'string') {
        errors.push({
          field: 'icon',
          message: 'Иконка доски должна быть строкой',
          code: 'INVALID_TYPE'
        });
      } else if (icon.length > 50) {
        errors.push({
          field: 'icon',
          message: 'Иконка доски не может превышать 50 символов',
          code: 'TOO_LONG'
        });
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  private validatePosition(position: number): ValidationResult {
    const errors: ValidationError[] = [];
    
    if (typeof position !== 'number') {
      errors.push({
        field: 'position',
        message: 'Позиция доски должна быть числом',
        code: 'INVALID_TYPE'
      });
    } else if (!Number.isInteger(position)) {
      errors.push({
        field: 'position',
        message: 'Позиция доски должна быть целым числом',
        code: 'INVALID_VALUE'
      });
    } else if (position < 0) {
      errors.push({
        field: 'position',
        message: 'Позиция доски не может быть отрицательной',
        code: 'INVALID_VALUE'
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  private validateSettings(settings: Record<string, unknown>): ValidationResult {
    const errors: ValidationError[] = [];
    
    if (settings !== null && settings !== undefined) {
      if (typeof settings !== 'object') {
        errors.push({
          field: 'settings',
          message: 'Настройки доски должны быть объектом',
          code: 'INVALID_TYPE'
        });
      } else {
        // Валидация конкретных настроек
        if (settings.allowTaskCreation !== undefined && typeof settings.allowTaskCreation !== 'boolean') {
          errors.push({
            field: 'settings.allowTaskCreation',
            message: 'allowTaskCreation должно быть булевым значением',
            code: 'INVALID_TYPE'
          });
        }
        
        if (settings.allowColumnReordering !== undefined && typeof settings.allowColumnReordering !== 'boolean') {
          errors.push({
            field: 'settings.allowColumnReordering',
            message: 'allowColumnReordering должно быть булевым значением',
            code: 'INVALID_TYPE'
          });
        }
        
        if (settings.enableTaskLimits !== undefined && typeof settings.enableTaskLimits !== 'boolean') {
          errors.push({
            field: 'settings.enableTaskLimits',
            message: 'enableTaskLimits должно быть булевым значением',
            code: 'INVALID_TYPE'
          });
        }
        
        if (settings.defaultTaskPriority !== undefined) {
          const validPriorities = ['low', 'medium', 'high', 'urgent'];
          if (!validPriorities.includes(settings.defaultTaskPriority)) {
            errors.push({
              field: 'settings.defaultTaskPriority',
              message: `defaultTaskPriority должно быть одним из: ${validPriorities.join(', ')}`,
              code: 'INVALID_VALUE'
            });
          }
        }
        
        if (settings.autoArchiveCompletedTasks !== undefined && typeof settings.autoArchiveCompletedTasks !== 'boolean') {
          errors.push({
            field: 'settings.autoArchiveCompletedTasks',
            message: 'autoArchiveCompletedTasks должно быть булевым значением',
            code: 'INVALID_TYPE'
          });
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}