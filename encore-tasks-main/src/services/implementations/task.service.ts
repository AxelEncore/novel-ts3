/**
 * Реализация сервиса управления задачами
 * Координирует работу всех компонентов системы задач (Facade pattern)
 */

import {
  Task,
  TaskId,
  ColumnId,
  BoardId,
  UserId,
  CreateTaskDto,
  UpdateTaskDto,
  TaskFilters,
  PaginationOptions,
  OperationResult,
  TaskEvent,
  ServiceResponse,
  PaginatedResponse,
  SortOptions,

  MoveTaskOperation
} from '../../types/board.types';

import {
  ITaskService,
  ITaskRepository,
  ITaskValidator,
  ITaskAssignmentService,
  ITaskDependencyService,
  ITaskTimeTrackingService,
  ITaskEventService,
  ITaskNotificationService,
  ITaskCacheService
} from '../interfaces/task.service.interface';

/**
 * Основной сервис для управления задачами
 */
export class TaskService implements ITaskService {
  constructor(
    private readonly repository: ITaskRepository,
    private readonly validator: ITaskValidator,
    private readonly assignmentService: ITaskAssignmentService,
    private readonly dependencyService: ITaskDependencyService,
    private readonly timeTrackingService: ITaskTimeTrackingService,
    private readonly eventService: ITaskEventService,
    private readonly notificationService: ITaskNotificationService,
    private readonly cacheService: ITaskCacheService
  ) {}

  async getTask(id: TaskId): Promise<ServiceResponse<Task>> {
    try {
      // Проверяем кэш
      if (this.cacheService) {
        const cached = await this.cacheService.getTask(id);
        if (cached) {
          return { success: true, data: cached };
        }
      }

      const task = await this.repository.findById(id);
      if (!task) {
        return {
          success: false,
          error: 'Задача не найдена'
        };
      }

      // Кэшируем результат
      if (this.cacheService) {
        await this.cacheService.setTask(task);
      }

      return { success: true, data: task };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Внутренняя ошибка сервера'
      };
    }
  }

  async getTasks(
    filters: TaskFilters,
    sort: SortOptions,
    pagination: PaginationOptions
  ): Promise<ServiceResponse<PaginatedResponse<Task>>> {
    try {
      const result = await this.repository.findAll(filters, sort, pagination);
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Внутренняя ошибка сервера'
      };
    }
  }

  async getTasksByBoard(boardId: BoardId): Promise<ServiceResponse<Task[]>> {
    try {
      const tasks = await this.repository.findByBoardId(boardId);
      return { success: true, data: tasks };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error $1 error.message : 'Внутренняя ошибка сервера'
      };
    }
  }

  async getTasksByColumn(columnId: ColumnId): Promise<ServiceResponse<Task[]>> {
    try {
      const tasks = await this.repository.findByColumnId(columnId);
      return { success: true, data: tasks };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error $1 error.message : 'Внутренняя ошибка сервера'
      };
    }
  }

  async getTasksByAssignee(assigneeId: UserId): Promise<ServiceResponse<Task[]>> {
    try {
      const tasks = await this.repository.getTasksByAssignee(assigneeId);
      return { success: true, data: tasks };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error $1 error.message : 'Внутренняя ошибка сервера'
      };
    }
  }

  async createTask(taskData: CreateTaskDto, createdBy: UserId): Promise<ServiceResponse<Task>> {
    try {
      // Валидация данных
      const validation = await this.validator.validateCreateData(taskData);
      if (!validation.success) {
        return {
          success: false,
          error: validation.error || 'Ошибка валидации данных'
        };
      }

      // Создаем задачу
      const task = await this.repository.create({ ...taskData, createdBy, reporterId: createdBy });

      // Обрабатываем назначения
      if (taskData.assigneeIds && taskData.assigneeIds.length > 0) {
        await this.assignmentService.assignTask(task.id, taskData.assigneeIds, createdBy);
      }

      // Зависимости будут добавлены отдельно через addTaskDependency

      // Инвалидируем кэш
      if (this.cacheService) {
        await this.cacheService.invalidateBoardTasks(task.boardId);
        await this.cacheService.invalidateColumnTasks(task.columnId);
      }

      // Отправляем событие
      await this.eventService.emitTaskCreated(task, createdBy);

      // Отправляем уведомления
      if (taskData.assigneeIds) {
        await this.notificationService.notifyTaskAssigned(task, taskData.assigneeIds, createdBy);
      }

      return { success: true, data: task };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error $1 error.message : 'Внутренняя ошибка сервера'
      };
    }
  }

  async updateTask(id: TaskId, taskData: UpdateTaskDto, updatedBy: UserId): Promise<ServiceResponse<Task>> {
    try {
      // Получаем текущую задачу
      const currentTask = await this.repository.findById(id);


      if (!currentTask) {
        return {
          success: false,
          error: 'Задача не найдена'
        };
      }

      // Валидация данных
      const validation = await this.validator.validateUpdateData(taskData, currentTask);
      if (!validation.success) {
        return {
          success: false,
          error: validation.error || 'Ошибка валидации данных'
        };
      }

      // Обновляем задачу
      const updatedTask = await this.repository.update(id, taskData, updatedBy);
      if (!updatedTask) {
        return {
          success: false,
          error: 'Не удалось обновить задачу'
        };
      }

      // Обрабатываем изменения в назначениях
      if (taskData.assigneeIds !== undefined && Array.isArray(taskData.assigneeIds)) {
        const currentAssigneesResult = await this.assignmentService.getTaskAssignees(id);
        const currentAssigneeIds = currentAssigneesResult.success && currentAssigneesResult.data ? currentAssigneesResult.data : [];
        
        // Удаляем старые назначения
        const toUnassign = currentAssigneeIds.filter(assigneeId => !taskData.assigneeIds!.includes(assigneeId));
        if (toUnassign.length > 0) {
          await this.assignmentService.unassignTask(id, toUnassign, updatedBy);
        }
        
        // Добавляем новые назначения
        const toAssign = taskData.assigneeIds.filter(assigneeId => !currentAssigneeIds.includes(assigneeId));
        if (toAssign.length > 0) {
          await this.assignmentService.assignTask(id, toAssign, updatedBy);
        }
      }

      // Инвалидируем кэш
      if (this.cacheService) {
        await this.cacheService.deleteTask(id);
        await this.cacheService.invalidateBoardTasks(updatedTask.boardId);
        await this.cacheService.invalidateColumnTasks(updatedTask.columnId);
        
        if (currentTask.columnId !== updatedTask.columnId) {
          await this.cacheService.invalidateColumnTasks(currentTask.columnId);
        }
      }

      // Отправляем событие
      await this.eventService.emitTaskUpdated(updatedTask, updatedBy, taskData);

      // Отправляем уведомления об изменениях
      if (currentTask.status !== updatedTask.status) {
        await this.notificationService.notifyTaskStatusChanged(updatedTask, currentTask.status, updatedTask.status, updatedBy);
      }

      return { success: true, data: updatedTask };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Внутренняя ошибка сервера'
      };
    }
  }

  async deleteTask(id: TaskId, deletedBy: UserId): Promise<ServiceResponse<boolean>> {
    try {
      // Получаем задачу перед удалением
      const task = await this.repository.findById(id);
      if (!task) {
        return {
          success: false,
          error: 'Задача не найдена'
        };
      }

      // Получаем назначения и зависимости для удаления
      const assigneesResult = await this.assignmentService.getTaskAssignees(id);
      if (assigneesResult.success && assigneesResult.data) {
        await this.assignmentService.unassignTask(id, assigneesResult.data, deletedBy);
      }
      
      const dependenciesResult = await this.dependencyService.getDependencies(id);
      if (dependenciesResult.success && dependenciesResult.data) {
        for (const dep of dependenciesResult.data) {
          await this.dependencyService.removeDependency(id, dep.id);
        }
      }

      // Удаляем задачу
      const deleted = await this.repository.delete(id);
      if (!deleted) {
        return {
          success: false,
          error: 'Не удалось удалить задачу'
        };
      }

      // Инвалидируем кэш
      if (this.cacheService) {
        await this.cacheService.deleteTask(id);
        await this.cacheService.invalidateBoardTasks(task.boardId);
        await this.cacheService.invalidateColumnTasks(task.columnId);
      }

      // Отправляем событие
      await this.eventService.emitTaskDeleted(id, deletedBy);

      return { success: true, data: true };
    } catch (error) {
      return {
          success: false,
          error: error instanceof Error $1 error.message : 'Внутренняя ошибка сервера'
        };
    }
  }

  async moveTask(operation: MoveTaskOperation, userId: UserId): Promise<OperationResult<boolean>> {
    try {
      const { taskId, targetColumnId, newPosition } = operation;
      const position = newPosition || 0;
      const task = await this.repository.findById(taskId);
      if (!task) {
        return {
          success: false,
          error: 'Задача не найдена'
        };
      }

      const oldColumnId = task.columnId;
      
      // Обновляем позицию задачи
      const updatedTask = await this.repository.update(taskId, {
        columnId: targetColumnId,
        position: position
      }, userId);

      if (!updatedTask) {
        return {
          success: false,
          error: 'Не удалось переместить задачу'
        };
      }

      // Инвалидируем кэш
      if (this.cacheService) {
        await this.cacheService.deleteTask(taskId);
        await this.cacheService.invalidateColumnTasks(oldColumnId);
        await this.cacheService.invalidateColumnTasks(targetColumnId);
      }

      // Отправляем событие
      await this.eventService.emitTaskMoved(updatedTask, oldColumnId, targetColumnId, userId);

      return { success: true, data: true };
    } catch (error) {
      return {
          success: false,
          error: error instanceof Error $1 error.message : 'Внутренняя ошибка сервера'
        };
    }
  }

  async archiveTask(id: TaskId, archivedBy: UserId): Promise<ServiceResponse<boolean>> {
    try {
      // Проверяем существование задачи
      const existingTask = await this.repository.findById(id);
      if (!existingTask) {
        return {
          success: false,
          error: 'Задача не найдена'
        };
      }

      const validation = { success: true, errors: [] };
      if (!validation.success) {
        return {
          success: false,
          error: 'Ошибка валидации данных'
        };
      }

      const archived = await this.repository.archive(id, archivedBy);
      if (!archived) {
        return {
          success: false,
          error: 'Не удалось архивировать задачу'
        };
      }

      // Инвалидируем кэш
      if (this.cacheService) {
        await this.cacheService.deleteTask(id);
        await this.cacheService.invalidateBoardTasks(existingTask.boardId);
        await this.cacheService.invalidateColumnTasks(existingTask.columnId);
      }

      // Отправляем событие
      await this.eventService.emitTaskDeleted(id, archivedBy);

      return { success: true, data: true };
    } catch (error) {
      return {
          success: false,
          error: error instanceof Error $1 error.message : 'Внутренняя ошибка сервера'
        };
    }
  }

  async restoreTask(id: TaskId, restoredBy: UserId): Promise<ServiceResponse<boolean>> {
    try {
      // Проверяем существование задачи
      const existingTask = await this.repository.findById(id);
      if (!existingTask) {
        return {
          success: false,
          error: 'Задача не найдена'
        };
      }

      const validation = { success: true, errors: [] };
      if (!validation.success) {
        return {
          success: false,
          error: 'Ошибка валидации данных'
        };
      }

      const restored = await this.repository.restore(id, restoredBy);
      if (!restored) {
        return {
          success: false,
          error: 'Не удалось восстановить задачу'
        };
      }

      // Инвалидируем кэш
      if (this.cacheService) {
        await this.cacheService.deleteTask(id);
        await this.cacheService.invalidateBoardTasks(existingTask.boardId);
        await this.cacheService.invalidateColumnTasks(existingTask.columnId);
      }

      // Отправляем событие
      await this.eventService.emitTaskUpdated(existingTask, restoredBy, { isArchived: false });

      return { success: true, data: true };
    } catch (error) {
      return {
          success: false,
          error: error instanceof Error $1 error.message : 'Внутренняя ошибка сервера'
        };
    }
  }

  async duplicateTask(id: TaskId, duplicatedBy: UserId, newTitle: string): Promise<ServiceResponse<Task>> {
    try {
      // Простая валидация
      const validation = { success: true, errors: [] };
      if (!validation.success) {
        return {
          success: false,
          error: 'Ошибка валидации данных'
        };
      }

      const originalTask = await this.repository.findById(id);
      if (!originalTask) {
        return {
          success: false,
          error: 'Исходная задача не найдена'
        };
      }

      // Создаем дубликат
      const duplicateData: CreateTaskDto = {
        title: newTitle || `${originalTask.title} (копия)`,
        description: originalTask.description,
        boardId: originalTask.boardId,
        columnId: originalTask.columnId,
        priority: originalTask.priority,
        projectId: originalTask.projectId
      };

      const duplicatedTask = await this.repository.create({ ...duplicateData, createdBy: duplicatedBy, reporterId: duplicatedBy });

      // Копируем назначения
      const assignmentsResult = await this.assignmentService.getTaskAssignees(id);
      if (assignmentsResult.success && assignmentsResult.data) {
        for (const assigneeId of assignmentsResult.data) {
          await this.assignmentService.assignTask(duplicatedTask.id, [assigneeId], duplicatedBy);
        }
      }

      // Инвалидируем кэш
      if (this.cacheService) {
        await this.cacheService.invalidateBoardTasks(duplicatedTask.boardId);
        await this.cacheService.invalidateColumnTasks(duplicatedTask.columnId);
      }

      // Отправляем событие
      await this.eventService.emitTaskCreated(duplicatedTask, duplicatedBy);

      return { success: true, data: duplicatedTask };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error $1 error.message : 'Внутренняя ошибка сервера'
      };
    }
  }

  async getTaskAssignments(id: TaskId): Promise<ServiceResponse<UserId[]>> {
    try {
      const assignmentsResult = await this.assignmentService.getTaskAssignees(id);
      if (!assignmentsResult.success) {
        return { success: false, error: assignmentsResult.error };
      }
      return { success: true, data: assignmentsResult.data || [] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error $2 error.message : 'Внутренняя ошибка сервера'
      };
    }
  }

  async getTaskDependencies(id: TaskId): Promise<ServiceResponse<Task[]>> {
    try {
      const dependenciesResult = await this.dependencyService.getDependencies(id);
      if (!dependenciesResult.success) {
        return { success: false, error: dependenciesResult.error };
      }
      return { success: true, data: dependenciesResult.data || [] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Внутренняя ошибка сервера'
      };
    }
  }

  async getTaskTimeEntries(id: TaskId): Promise<ServiceResponse<unknown[]>> {
    try {
      const entriesResult = await this.timeTrackingService.getTimeEntries(id);
      if (!entriesResult.success) {
        return { success: false, error: entriesResult.error };
      }
      return { success: true, data: entriesResult.data || [] };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Внутренняя ошибка сервера'
      };
    }
  }

  async getTaskEvents(id: TaskId): Promise<ServiceResponse<TaskEvent[]>> {
    try {
      const events = await this.eventService.getTaskEvents(id);
      return { success: true, data: events };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Внутренняя ошибка сервера'
      };
    }
  }

  async getTaskStatistics(taskId: TaskId): Promise<ServiceResponse<Record<string, unknown>>> {
    try {
      const task = await this.repository.findById(taskId);
      if (!task) {
        return {
          success: false,
          error: 'Task not found'
        };
      }
      
      const assignmentsResult = await this.assignmentService.getTaskAssignees(taskId);
      const timeEntriesResult = await this.timeTrackingService.getTimeEntries(taskId);
      const dependenciesResult = await this.dependencyService.getDependencies(taskId);
      
      const assignments = assignmentsResult.success ? assignmentsResult.data || [] : [];
      const timeEntries = timeEntriesResult.success ? timeEntriesResult.data || [] : [];
      const dependencies = dependenciesResult.success ? dependenciesResult.data || [] : [];
      
      return {
        success: true,
        data: {
          assignmentsCount: assignments.length,
          totalTimeSpent: timeEntries.reduce((sum: number, entry: any) => sum + (entry.duration || 0), 0),
          dependenciesCount: dependencies.length,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Внутренняя ошибка сервера'
      };
    }
  }

  async generateTaskReport(filters: TaskFilters): Promise<unknown> {
    try {
      const tasks = await this.repository.findAll(filters);
      
      return {
        totalTasks: tasks.data.length,
        tasksByStatus: tasks.data.reduce((acc, task) => {
          acc[task.status] = (acc[task.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        tasksByPriority: tasks.data.reduce((acc, task) => {
          acc[task.priority] = (acc[task.priority] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        generatedAt: new Date()
      };
    } catch (error) {
      throw error;
    }
  }

  // Недостающие методы из интерфейса ITaskService
  async getTaskById(id: TaskId, _userId: UserId): Promise<OperationResult<Task>> {
    try {
      const task = await this.repository.findById(id);
      if (!task) {
        return { success: false, error: 'Задача не найдена' };
      }
      return { success: true, data: task };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Внутренняя ошибка сервера'
      };
    }
  }

  async getAllTasks(_userId: UserId, filters: TaskFilters, sort: SortOptions, pagination: PaginationOptions): Promise<OperationResult<PaginatedResponse<Task>>> {
    try {
      const result = await this.repository.findAll(filters, sort, pagination);
      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Внутренняя ошибка сервера'
      };
    }
  }

  async archiveTask(id: TaskId, userId: UserId): Promise<OperationResult<boolean>> {
    try {
      const task = await this.repository.findById(id);
      if (!task) {
        return { success: false, error: 'Задача не найдена' };
      }

      const updated = await this.repository.update(id, { isArchived: true });
      if (!updated) {
        return { success: false, error: 'Не удалось архивировать задачу' };
      }

      await this.eventService.emitTaskUpdated(updated, userId, { isArchived: true });
      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Внутренняя ошибка сервера'
      };
    }
  }

  async reorderTasks(_columnId: ColumnId, taskIds: TaskId[], _userId: UserId): Promise<OperationResult<boolean>> {
    try {
      for (let i = 0; i < taskIds.length; i++) {
        await this.repository.update(taskIds[i], { position: i });
      }
      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Внутренняя ошибка сервера'
      };
    }
  }

  async bulkUpdateTasks(operation: BulkTaskOperation, _userId: UserId): Promise<OperationResult<boolean>> {
    try {
      // Простая реализация - обновляем каждую задачу
      for (const taskId of operation.taskIds) {
        await this.repository.update(taskId, operation.updates);
      }
      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Внутренняя ошибка сервера'
      };
    }
  }

  async bulkDeleteTasks(taskIds: TaskId[], _userId: UserId): Promise<OperationResult<boolean>> {
    try {
      for (const taskId of taskIds) {
        await this.repository.delete(taskId);
      }
      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Внутренняя ошибка сервера'
      };
    }
  }

  async bulkArchiveTasks(taskIds: TaskId[], _userId: UserId): Promise<OperationResult<boolean>> {
    try {
      for (const taskId of taskIds) {
        await this.repository.update(taskId, { isArchived: true });
      }
      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Внутренняя ошибка сервера'
      };
    }
  }

  async assignTask(taskId: TaskId, assigneeIds: UserId[], userId: UserId): Promise<OperationResult> {
    return await this.assignmentService.assignTask(taskId, assigneeIds, userId);
  }

  async unassignTask(taskId: TaskId, assigneeIds: UserId[], userId: UserId): Promise<OperationResult> {
    return await this.assignmentService.unassignTask(taskId, assigneeIds, userId);
  }

  async addTaskDependency(taskId: TaskId, dependsOnTaskId: TaskId, type: string, userId: UserId): Promise<OperationResult> {
    return await this.dependencyService.addDependency(taskId, dependsOnTaskId, type, userId);
  }

  async removeTaskDependency(taskId: TaskId, dependsOnTaskId: TaskId, userId: UserId): Promise<OperationResult> {
    return await this.dependencyService.removeDependency(taskId, dependsOnTaskId);
  }

  async startTimeTracking(taskId: TaskId, userId: UserId): Promise<OperationResult> {
    return await this.timeTrackingService.startTimer(taskId, userId);
  }

  async stopTimeTracking(taskId: TaskId, userId: UserId): Promise<OperationResult> {
    return await this.timeTrackingService.stopTimer(taskId, userId);
  }

  async logTime(taskId: TaskId, hours: number, description: string, userId: UserId): Promise<OperationResult> {
    return await this.timeTrackingService.logTime(taskId, hours, description, userId);
  }

  async getUserTaskStatistics(userId: UserId, dateFrom: Date, dateTo: Date): Promise<OperationResult<unknown>> {
    try {
      const timeEntries = await this.timeTrackingService.getUserTimeEntries(userId, dateFrom, dateTo);
      return timeEntries;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Внутренняя ошибка сервера'
      };
    }
  }

  async getTaskEvents(taskId: TaskId, userId: UserId, limit: number): Promise<OperationResult<TaskEvent[]>> {
    try {
      const events = await this.eventService.getTaskEvents(taskId, limit);
      return { success: true, data: events };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Внутренняя ошибка сервера'
      };
    }
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}