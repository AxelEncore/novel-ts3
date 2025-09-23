/**
 * Интерфейсы сервисов для управления задачами
 * Следует принципу инверсии зависимостей (DIP)
 */

import {
  Task,
  TaskId,
  BoardId,
  ColumnId,
  ProjectId,
  UserId,
  CreateTaskDto,
  UpdateTaskDto,
  TaskFilters,
  SortOptions,
  PaginationOptions,
  PaginatedResponse,
  OperationResult,
  MoveTaskOperation,
  BulkTaskOperation,
  TaskEvent,
  TaskStatus,
  TaskPriority
} from '../../types/board.types';
import { SearchFilters } from '../../refactored/data/types';

/**
 * Интерфейс репозитория для задач
 * Отвечает только за операции с данными (Single Responsibility)
 */
export interface ITaskRepository {
  // Основные CRUD операции
  findById(id: TaskId): Promise<Task | null>;
  findByIds(ids: TaskId[]): Promise<Task[]>;
  findByBoardId(boardId: BoardId, filters$1: SearchFilters): Promise<Task[]>;
  findByColumnId(columnId: ColumnId, filters$2: SearchFilters): Promise<Task[]>;
  findByProjectId(projectId: ProjectId, filters$3: SearchFilters): Promise<Task[]>;
  findAll(filters$4: SearchFilters, sort$5: SortOptions, pagination$6: PaginationOptions): Promise<PaginatedResponse<Task>>;
  create(taskData: CreateTaskDto & { createdBy: UserId; reporterId: UserId }): Promise<Task>;
  update(id: TaskId, taskData: UpdateTaskDto, updatedBy: UserId): Promise<Task | null>;
  delete(id: TaskId): Promise<boolean>;
  archive(id: TaskId, archivedBy: UserId): Promise<boolean>;
  restore(id: TaskId, restoredBy: UserId): Promise<boolean>;
  
  // Специфичные операции
  updatePosition(id: TaskId, newPosition: number, columnId$7: ColumnId): Promise<boolean>;
  updateStatus(id: TaskId, status: TaskStatus, updatedBy: UserId): Promise<boolean>;
  updatePriority(id: TaskId, priority: TaskPriority, updatedBy: UserId): Promise<boolean>;
  moveToColumn(id: TaskId, columnId: ColumnId, position: number, updatedBy: UserId): Promise<boolean>;
  getMaxPosition(columnId: ColumnId): Promise<number>;
  getTasksByAssignee(assigneeId: UserId, filters$8: SearchFilters): Promise<Task[]>;
  getTasksByReporter(reporterId: UserId, filters$9: SearchFilters): Promise<Task[]>;
  getSubtasks(parentTaskId: TaskId): Promise<Task[]>;
  getTaskDependencies(taskId: TaskId): Promise<Task[]>;
  countByColumn(columnId: ColumnId): Promise<number>;
  countByBoard(boardId: BoardId): Promise<number>;
  countByStatus(boardId: BoardId, status: TaskStatus): Promise<number>;
}

/**
 * Интерфейс валидатора для задач
 * Отвечает только за валидацию (Single Responsibility)
 */
export interface ITaskValidator {
  validateCreateData(data: CreateTaskDto): Promise<OperationResult>;
  validateUpdateData(data: UpdateTaskDto, existingTask: Task): Promise<OperationResult>;
  validateTaskMove(taskId: TaskId, targetColumnId: ColumnId, position: number): Promise<OperationResult>;
  validateTaskAssignment(taskId: TaskId, assigneeIds: UserId[]): Promise<OperationResult>;
  validateTaskDependency(taskId: TaskId, dependsOnTaskId: TaskId): Promise<OperationResult>;
  validateBulkOperation(operation: BulkTaskOperation): Promise<OperationResult>;
  validateColumnCapacity(columnId: ColumnId, additionalTasks$10: number): Promise<OperationResult>;
}

/**
 * Интерфейс для управления назначениями задач
 * Отвечает только за назначения (Single Responsibility)
 */
export interface ITaskAssignmentService {
  assignTask(taskId: TaskId, assigneeIds: UserId[], assignedBy: UserId): Promise<OperationResult>;
  unassignTask(taskId: TaskId, assigneeIds: UserId[], unassignedBy: UserId): Promise<OperationResult>;
  reassignTask(taskId: TaskId, fromUserId: UserId, toUserId: UserId, reassignedBy: UserId): Promise<OperationResult>;
  getTaskAssignees(taskId: TaskId): Promise<OperationResult<UserId[]>>;
  getUserAssignedTasks(userId: UserId, filters$11: SearchFilters): Promise<OperationResult<Task[]>>;
  getAssignmentHistory(taskId: TaskId): Promise<OperationResult<unknown[]>>;
}

/**
 * Интерфейс для управления зависимостями задач
 * Отвечает только за зависимости (Single Responsibility)
 */
export interface ITaskDependencyService {
  addDependency(taskId: TaskId, dependsOnTaskId: TaskId, type: string, createdBy: UserId): Promise<OperationResult>;
  removeDependency(taskId: TaskId, dependsOnTaskId: TaskId): Promise<OperationResult>;
  getDependencies(taskId: TaskId): Promise<OperationResult<Task[]>>;
  getDependents(taskId: TaskId): Promise<OperationResult<Task[]>>;
  validateDependencyChain(taskId: TaskId, dependsOnTaskId: TaskId): Promise<OperationResult>;
  getBlockedTasks(taskId: TaskId): Promise<OperationResult<Task[]>>;
}

/**
 * Интерфейс для отслеживания времени
 * Отвечает только за время (Single Responsibility)
 */
export interface ITaskTimeTrackingService {
  startTimer(taskId: TaskId, userId: UserId): Promise<OperationResult>;
  stopTimer(taskId: TaskId, userId: UserId): Promise<OperationResult>;
  logTime(taskId: TaskId, hours: number, description: string, userId: UserId): Promise<OperationResult>;
  getTimeEntries(taskId: TaskId): Promise<OperationResult<unknown[]>>;
  getTotalTime(taskId: TaskId): Promise<OperationResult<number>>;
  getUserTimeEntries(userId: UserId, dateFrom$12: Date, dateTo$13: Date): Promise<OperationResult<unknown[]>>;
  updateEstimate(taskId: TaskId, estimatedHours: number, updatedBy: UserId): Promise<OperationResult>;
}

/**
 * Интерфейс для событий задач
 * Отвечает только за события (Single Responsibility)
 */
export interface ITaskEventService {
  emitTaskCreated(task: Task, userId: UserId): Promise<void>;
  emitTaskUpdated(task: Task, userId: UserId, changes: Partial<Task>): Promise<void>;
  emitTaskMoved(task: Task, fromColumnId: ColumnId, toColumnId: ColumnId, userId: UserId): Promise<void>;
  emitTaskAssigned(task: Task, assigneeIds: UserId[], userId: UserId): Promise<void>;
  emitTaskCompleted(task: Task, userId: UserId): Promise<void>;
  emitTaskDeleted(taskId: TaskId, userId: UserId): Promise<void>;
  getTaskEvents(taskId: TaskId, limit$14: number): Promise<TaskEvent[]>;
}

/**
 * Интерфейс для уведомлений о задачах
 * Отвечает только за уведомления (Single Responsibility)
 */
export interface ITaskNotificationService {
  notifyTaskAssigned(task: Task, assigneeIds: UserId[], assignedBy: UserId): Promise<void>;
  notifyTaskDue(task: Task): Promise<void>;
  notifyTaskOverdue(task: Task): Promise<void>;
  notifyTaskCompleted(task: Task, completedBy: UserId): Promise<void>;
  notifyTaskCommented(task: Task, commentedBy: UserId, comment: string): Promise<void>;
  notifyTaskStatusChanged(task: Task, oldStatus: TaskStatus, newStatus: TaskStatus, changedBy: UserId): Promise<void>;
}

/**
 * Основной интерфейс сервиса задач
 * Координирует работу других сервисов (Facade pattern)
 */
export interface ITaskService {
  // Основные операции
  getTaskById(id: TaskId, userId: UserId): Promise<OperationResult<Task>>;
  getTasksByBoard(boardId: BoardId, userId: UserId, filters$15: SearchFilters): Promise<OperationResult<Task[]>>;
  getTasksByColumn(columnId: ColumnId, userId: UserId, filters$16: SearchFilters): Promise<OperationResult<Task[]>>;
  getAllTasks(userId: UserId, filters$17: SearchFilters, sort$18: SortOptions, pagination$19: PaginationOptions): Promise<OperationResult<PaginatedResponse<Task>>>;
  createTask(taskData: CreateTaskDto, userId: UserId): Promise<OperationResult<Task>>;
  updateTask(id: TaskId, taskData: UpdateTaskDto, userId: UserId): Promise<OperationResult<Task>>;
  deleteTask(id: TaskId, userId: UserId): Promise<OperationResult<boolean>>;
  archiveTask(id: TaskId, userId: UserId): Promise<OperationResult<boolean>>;
  restoreTask(id: TaskId, userId: UserId): Promise<OperationResult<boolean>>;
  
  // Операции с перемещением
  moveTask(operation: MoveTaskOperation, userId: UserId): Promise<OperationResult<boolean>>;
  reorderTasks(columnId: ColumnId, taskIds: TaskId[], userId: UserId): Promise<OperationResult<boolean>>;
  
  // Массовые операции
  bulkUpdateTasks(operation: BulkTaskOperation, userId: UserId): Promise<OperationResult<boolean>>;
  bulkDeleteTasks(taskIds: TaskId[], userId: UserId): Promise<OperationResult<boolean>>;
  bulkArchiveTasks(taskIds: TaskId[], userId: UserId): Promise<OperationResult<boolean>>;
  
  // Операции с назначениями
  assignTask(taskId: TaskId, assigneeIds: UserId[], userId: UserId): Promise<OperationResult>;
  unassignTask(taskId: TaskId, assigneeIds: UserId[], userId: UserId): Promise<OperationResult>;
  
  // Операции с зависимостями
  addTaskDependency(taskId: TaskId, dependsOnTaskId: TaskId, type: string, userId: UserId): Promise<OperationResult>;
  removeTaskDependency(taskId: TaskId, dependsOnTaskId: TaskId, userId: UserId): Promise<OperationResult>;
  
  // Операции со временем
  startTimeTracking(taskId: TaskId, userId: UserId): Promise<OperationResult>;
  stopTimeTracking(taskId: TaskId, userId: UserId): Promise<OperationResult>;
  logTime(taskId: TaskId, hours: number, description: string, userId: UserId): Promise<OperationResult>;
  
  // Статистика и отчеты
  getTaskStatistics(boardId: BoardId, userId: UserId): Promise<OperationResult<unknown>>;
  getUserTaskStatistics(userId: UserId, dateFrom$20: Date, dateTo$21: Date): Promise<OperationResult<unknown>>;
  
  // События
  getTaskEvents(taskId: TaskId, userId: UserId, limit$22: number): Promise<OperationResult<TaskEvent[]>>;
}

/**
 * Интерфейс фабрики для создания задач
 * Применяет паттерн Factory (Open/Closed Principle)
 */
export interface ITaskFactory {
  createTask(data: CreateTaskDto, createdBy: UserId, reporterId: UserId): Task;
  createSubtask(parentTask: Task, data: Partial<CreateTaskDto>, createdBy: UserId): Task;
  createTaskFromTemplate(templateId: string, data: Partial<CreateTaskDto>, createdBy: UserId): Task;
  duplicateTask(originalTask: Task, newTitle: string, createdBy: UserId): Task;
}

/**
 * Интерфейс для кэширования задач
 * Отвечает только за кэширование (Single Responsibility)
 */
export interface ITaskCacheService {
  getTask(id: TaskId): Promise<Task | null>;
  setTask(task: Task): Promise<void>;
  deleteTask(id: TaskId): Promise<void>;
  getTasksByBoard(boardId: BoardId): Promise<Task[] | null>;
  setTasksByBoard(boardId: BoardId, tasks: Task[]): Promise<void>;
  getTasksByColumn(columnId: ColumnId): Promise<Task[] | null>;
  setTasksByColumn(columnId: ColumnId, tasks: Task[]): Promise<void>;
  invalidateBoardTasks(boardId: BoardId): Promise<void>;
  invalidateColumnTasks(columnId: ColumnId): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Интерфейс для поиска задач
 * Отвечает только за поиск (Single Responsibility)
 */
export interface ITaskSearchService {
  searchTasks(query: string, userId: UserId, filters$23: SearchFilters): Promise<OperationResult<Task[]>>;
  indexTask(task: Task): Promise<void>;
  removeFromIndex(taskId: TaskId): Promise<void>;
  updateIndex(task: Task): Promise<void>;
  suggestTasks(query: string, userId: UserId, limit$24: number): Promise<OperationResult<Task[]>>;
}

/**
 * Интерфейс для экспорта/импорта задач
 * Отвечает только за импорт/экспорт (Single Responsibility)
 */
export interface ITaskImportExportService {
  exportTasks(boardId: BoardId, format: 'json' | 'csv' | 'excel', filters$1: SearchFilters): Promise<OperationResult<Buffer>>;
  importTasks(data: Buffer, format: 'json' | 'csv' | 'excel', boardId: BoardId, userId: UserId): Promise<OperationResult<Task[]>>;
  validateImportData(data: Buffer, format: 'json' | 'csv' | 'excel'): Promise<OperationResult>;
  exportTasksToJira(boardId: BoardId, jiraConfig: Record<string, unknown>): Promise<OperationResult>;
  importTasksFromJira(jiraConfig: Record<string, unknown>, boardId: BoardId, userId: UserId): Promise<OperationResult<Task[]>>;
}