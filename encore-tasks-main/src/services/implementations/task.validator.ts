/**
 * Валидатор для задач
 * Отвечает только за валидацию данных (Single Responsibility)
 */

import {
  TaskId,
  ColumnId,
  CreateTaskDto,
  UpdateTaskDto,
  TaskStatus,
  TaskPriority,
  ValidationResult,
  ValidationError
} from '../../refactored/data/types';

import { ITaskValidator } from '../interfaces/task.service.interface';

/**
 * Реализация валидатора задач
 */
export class TaskValidator implements ITaskValidator {
  async validateCreate(data: CreateTaskDto): Promise<ValidationResult> {
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
      } else if (data.title.length > 255) {
        errors.push({
          field: 'title',
          message: 'Title must be less than 255 characters',
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

    if (!data.columnId || typeof data.columnId !== 'string') {
      errors.push({
        field: 'columnId',
        message: 'Column ID is required and must be a string',
        code: 'REQUIRED_FIELD'
      });
    }

    if (!data.projectId || typeof data.projectId !== 'string') {
      errors.push({
        field: 'projectId',
        message: 'Project ID is required and must be a string',
        code: 'REQUIRED_FIELD'
      });
    }

    // Валидация описания
    if (data.description !== undefined) {
      if (typeof data.description !== 'string') {
        errors.push({
          field: 'description',
          message: 'Description must be a string',
          code: 'INVALID_TYPE'
        });
      } else if (data.description.length > 5000) {
        errors.push({
          field: 'description',
          message: 'Description must be less than 5000 characters',
          code: 'INVALID_LENGTH'
        });
      }
    }

    // Валидация статуса
    if (data.status !== undefined) {
      if (!this.isValidTaskStatus(data.status)) {
        errors.push({
          field: 'status',
          message: 'Invalid task status',
          code: 'INVALID_VALUE'
        });
      }
    }

    // Валидация приоритета
    if (data.priority !== undefined) {
      if (!this.isValidTaskPriority(data.priority)) {
        errors.push({
          field: 'priority',
          message: 'Invalid task priority',
          code: 'INVALID_VALUE'
        });
      }
    }

    // Валидация тегов
    if (data.tags !== undefined) {
      if (!Array.isArray(data.tags)) {
        errors.push({
          field: 'tags',
          message: 'Tags must be an array',
          code: 'INVALID_TYPE'
        });
      } else {
        for (let i = 0; i < data.tags.length; i++) {
          const tag = data.tags[i];
          if (typeof tag !== 'string') {
            errors.push({
              field: `tags[${i}]`,
              message: 'Each tag must be a string',
              code: 'INVALID_TYPE'
            });
          } else if (tag.length > 50) {
            errors.push({
              field: `tags[${i}]`,
              message: 'Each tag must be less than 50 characters',
              code: 'INVALID_LENGTH'
            });
          }
        }
        
        if (data.tags.length > 20) {
          errors.push({
            field: 'tags',
            message: 'Maximum 20 tags allowed',
            code: 'INVALID_LENGTH'
          });
        }
      }
    }

    // Валидация оценки времени
    if (data.estimatedHours !== undefined) {
      if (typeof data.estimatedHours !== 'number' || data.estimatedHours < 0) {
        errors.push({
          field: 'estimatedHours',
          message: 'Estimated hours must be a non-negative number',
          code: 'INVALID_VALUE'
        });
      } else if (data.estimatedHours > 10000) {
        errors.push({
          field: 'estimatedHours',
          message: 'Estimated hours cannot exceed 10000',
          code: 'INVALID_VALUE'
        });
      }
    }

    // Валидация дедлайна
    if (data.deadline !== undefined) {
      if (!(data.deadline instanceof Date) && typeof data.deadline !== 'string') {
        errors.push({
          field: 'deadline',
          message: 'Deadline must be a valid date',
          code: 'INVALID_TYPE'
        });
      } else {
        const deadlineDate = data.deadline instanceof Date $1 data.deadline : new Date(data.deadline);
        if (isNaN(deadlineDate.getTime())) {
          errors.push({
            field: 'deadline',
            message: 'Deadline must be a valid date',
            code: 'INVALID_VALUE'
          });
        }
      }
    }

    // Валидация назначенных пользователей
    if (data.assigneeIds !== undefined) {
      if (!Array.isArray(data.assigneeIds)) {
        errors.push({
          field: 'assigneeIds',
          message: 'Assignee IDs must be an array',
          code: 'INVALID_TYPE'
        });
      } else {
        for (let i = 0; i < data.assigneeIds.length; i++) {
          const assigneeId = data.assigneeIds[i];
          if (typeof assigneeId !== 'string') {
            errors.push({
              field: `assigneeIds[${i}]`,
              message: 'Each assignee ID must be a string',
              code: 'INVALID_TYPE'
            });
          }
        }
        
        if (data.assigneeIds.length > 10) {
          errors.push({
            field: 'assigneeIds',
            message: 'Maximum 10 assignees allowed',
            code: 'INVALID_LENGTH'
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async validateUpdate(data: UpdateTaskDto): Promise<ValidationResult> {
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
      } else if (data.title.length > 255) {
        errors.push({
          field: 'title',
          message: 'Title must be less than 255 characters',
          code: 'INVALID_LENGTH'
        });
      }
    }

    // Валидация описания
    if (data.description !== undefined) {
      if (typeof data.description !== 'string') {
        errors.push({
          field: 'description',
          message: 'Description must be a string',
          code: 'INVALID_TYPE'
        });
      } else if (data.description.length > 5000) {
        errors.push({
          field: 'description',
          message: 'Description must be less than 5000 characters',
          code: 'INVALID_LENGTH'
        });
      }
    }

    // Валидация ID колонки
    if (data.columnId !== undefined) {
      if (typeof data.columnId !== 'string') {
        errors.push({
          field: 'columnId',
          message: 'Column ID must be a string',
          code: 'INVALID_TYPE'
        });
      }
    }

    // Валидация статуса
    if (data.status !== undefined) {
      if (!this.isValidTaskStatus(data.status)) {
        errors.push({
          field: 'status',
          message: 'Invalid task status',
          code: 'INVALID_VALUE'
        });
      }
    }

    // Валидация приоритета
    if (data.priority !== undefined) {
      if (!this.isValidTaskPriority(data.priority)) {
        errors.push({
          field: 'priority',
          message: 'Invalid task priority',
          code: 'INVALID_VALUE'
        });
      }
    }

    // Валидация тегов
    if (data.tags !== undefined) {
      if (!Array.isArray(data.tags)) {
        errors.push({
          field: 'tags',
          message: 'Tags must be an array',
          code: 'INVALID_TYPE'
        });
      } else {
        for (let i = 0; i < data.tags.length; i++) {
          const tag = data.tags[i];
          if (typeof tag !== 'string') {
            errors.push({
              field: `tags[${i}]`,
              message: 'Each tag must be a string',
              code: 'INVALID_TYPE'
            });
          } else if (tag.length > 50) {
            errors.push({
              field: `tags[${i}]`,
              message: 'Each tag must be less than 50 characters',
              code: 'INVALID_LENGTH'
            });
          }
        }
        
        if (data.tags.length > 20) {
          errors.push({
            field: 'tags',
            message: 'Maximum 20 tags allowed',
            code: 'INVALID_LENGTH'
          });
        }
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

    // Валидация оценки времени
    if (data.estimatedHours !== undefined) {
      if (typeof data.estimatedHours !== 'number' || data.estimatedHours < 0) {
        errors.push({
          field: 'estimatedHours',
          message: 'Estimated hours must be a non-negative number',
          code: 'INVALID_VALUE'
        });
      } else if (data.estimatedHours > 10000) {
        errors.push({
          field: 'estimatedHours',
          message: 'Estimated hours cannot exceed 10000',
          code: 'INVALID_VALUE'
        });
      }
    }

    // Валидация фактического времени
    if (data.actualHours !== undefined) {
      if (typeof data.actualHours !== 'number' || data.actualHours < 0) {
        errors.push({
          field: 'actualHours',
          message: 'Actual hours must be a non-negative number',
          code: 'INVALID_VALUE'
        });
      } else if (data.actualHours > 10000) {
        errors.push({
          field: 'actualHours',
          message: 'Actual hours cannot exceed 10000',
          code: 'INVALID_VALUE'
        });
      }
    }

    // Валидация дедлайна
    if (data.deadline !== undefined) {
      if (data.deadline !== null) {
        if (!(data.deadline instanceof Date) && typeof data.deadline !== 'string') {
          errors.push({
            field: 'deadline',
            message: 'Deadline must be a valid date or null',
            code: 'INVALID_TYPE'
          });
        } else {
          const deadlineDate = data.deadline instanceof Date $1 data.deadline : new Date(data.deadline);
          if (isNaN(deadlineDate.getTime())) {
            errors.push({
              field: 'deadline',
              message: 'Deadline must be a valid date',
              code: 'INVALID_VALUE'
            });
          }
        }
      }
    }

    // Валидация назначенных пользователей
    if (data.assigneeIds !== undefined) {
      if (!Array.isArray(data.assigneeIds)) {
        errors.push({
          field: 'assigneeIds',
          message: 'Assignee IDs must be an array',
          code: 'INVALID_TYPE'
        });
      } else {
        for (let i = 0; i < data.assigneeIds.length; i++) {
          const assigneeId = data.assigneeIds[i];
          if (typeof assigneeId !== 'string') {
            errors.push({
              field: `assigneeIds[${i}]`,
              message: 'Each assignee ID must be a string',
              code: 'INVALID_TYPE'
            });
          }
        }
        
        if (data.assigneeIds.length > 10) {
          errors.push({
            field: 'assigneeIds',
            message: 'Maximum 10 assignees allowed',
            code: 'INVALID_LENGTH'
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async validateDelete(id: TaskId): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    if (!id || typeof id !== 'string') {
      errors.push({
        field: 'id',
        message: 'Task ID is required and must be a string',
        code: 'REQUIRED_FIELD'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async validateMove(id: TaskId, targetColumnId: ColumnId, newPosition: number): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    if (!id || typeof id !== 'string') {
      errors.push({
        field: 'id',
        message: 'Task ID is required and must be a string',
        code: 'REQUIRED_FIELD'
      });
    }

    if (!targetColumnId || typeof targetColumnId !== 'string') {
      errors.push({
        field: 'targetColumnId',
        message: 'Target column ID is required and must be a string',
        code: 'REQUIRED_FIELD'
      });
    }

    if (typeof newPosition !== 'number' || newPosition < 0) {
      errors.push({
        field: 'newPosition',
        message: 'New position must be a non-negative number',
        code: 'INVALID_VALUE'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async validateArchive(id: TaskId): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    if (!id || typeof id !== 'string') {
      errors.push({
        field: 'id',
        message: 'Task ID is required and must be a string',
        code: 'REQUIRED_FIELD'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async validateRestore(id: TaskId): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    if (!id || typeof id !== 'string') {
      errors.push({
        field: 'id',
        message: 'Task ID is required and must be a string',
        code: 'REQUIRED_FIELD'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async validateDuplicate(id: TaskId, newTitle$1: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    if (!id || typeof id !== 'string') {
      errors.push({
        field: 'id',
        message: 'Task ID is required and must be a string',
        code: 'REQUIRED_FIELD'
      });
    }

    if (newTitle !== undefined) {
      if (typeof newTitle !== 'string') {
        errors.push({
          field: 'newTitle',
          message: 'New title must be a string',
          code: 'INVALID_TYPE'
        });
      } else if (newTitle.trim().length === 0) {
        errors.push({
          field: 'newTitle',
          message: 'New title cannot be empty',
          code: 'INVALID_LENGTH'
        });
      } else if (newTitle.length > 255) {
        errors.push({
          field: 'newTitle',
          message: 'New title must be less than 255 characters',
          code: 'INVALID_LENGTH'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private isValidTaskStatus(status: string): status is TaskStatus {
    const validStatuses: TaskStatus[] = ['todo', 'in_progress', 'review', 'done', 'blocked'];
    return validStatuses.includes(status as TaskStatus);
  }

  private isValidTaskPriority(priority: string): priority is TaskPriority {
    const validPriorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
    return validPriorities.includes(priority as TaskPriority);
  }
}