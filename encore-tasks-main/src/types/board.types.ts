/**
 * Типы для системы управления досками
 * Следует принципам SOLID и обеспечивает строгую типизацию
 */

// Базовые типы
export type BoardId = string;
export type ColumnId = string;
export type TaskId = string;
export type ProjectId = string;
export type UserId = string;

// Статусы и приоритеты
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'deferred';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type BoardVisibility = 'private' | 'team' | 'public';

// Базовые интерфейсы
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  isArchived?: boolean;
  archivedAt?: Date;
}

export interface AuditableEntity extends BaseEntity {
  createdBy: UserId;
  updatedBy?: UserId;
}

// Интерфейсы для досок
export interface BoardSettings {
  allowTaskCreation: boolean;
  allowColumnReordering: boolean;
  enableTaskLimits: boolean;
  defaultTaskPriority: TaskPriority;
  autoArchiveCompletedTasks: boolean;
  taskLimitPerColumn?: number;
}

export interface BoardPermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canCreateTasks: boolean;
  canManageColumns: boolean;
  canAssignTasks: boolean;
}

export interface Board extends AuditableEntity {
  name: string;
  description?: string;
  projectId: ProjectId;
  visibility: BoardVisibility;
  settings: BoardSettings;
  icon?: string;
  color?: string;
  position: number;
}

// Интерфейсы для колонок
export interface ColumnSettings {
  taskLimit?: number;
  autoMoveRules?: AutoMoveRule[];
  allowTaskCreation: boolean;
}

export interface AutoMoveRule {
  id: string;
  condition: 'all_subtasks_completed' | 'deadline_reached' | 'priority_changed';
  targetColumnId: ColumnId;
  isActive: boolean;
}

export interface Column extends AuditableEntity {
  name: string;
  boardId: BoardId;
  position: number;
  color: string;
  settings: ColumnSettings;
  wipLimit?: number;
}

// Интерфейсы для задач
export interface TaskAssignment {
  userId: UserId;
  assignedAt: Date;
  assignedBy: UserId;
}

export interface TaskDependency {
  id: string;
  dependsOnTaskId: TaskId;
  type: 'blocks' | 'relates_to' | 'duplicates';
  createdAt: Date;
}

export interface TaskTimeTracking {
  estimatedHours?: number;
  actualHours?: number;
  startedAt?: Date;
  completedAt?: Date;
}

export interface TaskMetadata {
  storyPoints?: number;
  epicId?: string;
  sprintId?: string;
  labels: string[];
  customFields: Record<string, unknown>;
}

export interface Task extends AuditableEntity {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: ProjectId;
  boardId: BoardId;
  columnId: ColumnId;
  reporterId: UserId;
  assignments: TaskAssignment[];
  parentTaskId?: TaskId;
  position: number;
  deadline?: Date;
  timeTracking: TaskTimeTracking;
  metadata: TaskMetadata;
  dependencies: TaskDependency[];
}

// DTO интерфейсы для API
export interface CreateBoardDto {
  name: string;
  description?: string;
  projectId: ProjectId;
  visibility?: BoardVisibility;
  settings?: Partial<BoardSettings>;
  icon?: string;
  color?: string;
}

export interface UpdateBoardDto {
  name?: string;
  description?: string;
  visibility?: BoardVisibility;
  settings?: Partial<BoardSettings>;
  icon?: string;
  color?: string;
  position?: number;
}

export interface CreateColumnDto {
  name: string;
  boardId: BoardId;
  color?: string;
  position?: number;
  settings?: Partial<ColumnSettings>;
  wipLimit?: number;
}

export interface UpdateColumnDto {
  name?: string;
  color?: string;
  position?: number;
  settings?: Partial<ColumnSettings>;
  wipLimit?: number;
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  priority?: TaskPriority;
  projectId: ProjectId;
  boardId: BoardId;
  columnId: ColumnId;
  assigneeIds?: UserId[];
  parentTaskId?: TaskId;
  deadline?: Date;
  estimatedHours?: number;
  labels?: string[];
  customFields?: Record<string, unknown>;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  columnId?: ColumnId;
  assigneeIds?: UserId[];
  deadline?: Date;
  estimatedHours?: number;
  actualHours?: number;
  labels?: string[];
  customFields?: Record<string, unknown>;
  position?: number;
}

// Интерфейсы для фильтрации и поиска
export interface BoardFilters {
  projectIds?: string[];
  visibility?: BoardVisibility;
  createdBy?: string;
  isArchived?: boolean;
  query?: string;
}

export interface TaskFilters {
  boardId?: BoardId;
  columnId?: ColumnId;
  projectId?: ProjectId;
  status?: TaskStatus[];
  priority?: TaskPriority[];
  assigneeId?: UserId;
  reporterId?: UserId;
  hasDeadline?: boolean;
  isOverdue?: boolean;
  labels?: string[];
  search?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface SortOptions {
  field: 'createdAt' | 'updatedAt' | 'priority' | 'deadline' | 'position' | 'title';
  direction: 'asc' | 'desc';
}

// Интерфейсы для пагинации
export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Интерфейсы для операций
export interface MoveTaskOperation {
  taskId: TaskId;
  sourceColumnId: ColumnId;
  targetColumnId: ColumnId;
  newPosition: number;
}

export interface BulkTaskOperation {
  taskIds: TaskId[];
  operation: 'archive' | 'delete' | 'assign' | 'move' | 'update_priority';
  params?: Record<string, unknown>;
}

// Интерфейсы для событий
export interface BoardEvent {
  id: string;
  type: 'board_created' | 'board_updated' | 'board_deleted' | 'board_archived';
  boardId: BoardId;
  userId: UserId;
  timestamp: Date;
  data?: Record<string, unknown>;
}

export interface TaskEvent {
  id: string;
  type: 'task_created' | 'task_updated' | 'task_moved' | 'task_assigned' | 'task_completed' | 'task_deleted';
  taskId: TaskId;
  boardId: BoardId;
  userId: UserId;
  timestamp: Date;
  data?: Record<string, unknown>;
}

// Интерфейсы для валидации
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Интерфейсы для результатов операций
export interface OperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: ValidationError[];
}

export interface ServiceResponse<T = unknown> extends OperationResult<T> {
  statusCode?: number;
  message?: string;
}