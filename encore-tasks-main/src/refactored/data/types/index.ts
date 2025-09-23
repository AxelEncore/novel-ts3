// Unified Data Types for Refactored Architecture
// This file consolidates all data types to eliminate duplication

// Base Types
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// User Types
export interface User extends BaseEntity {
  email: string;
  name: string;
  avatar?: string;
  isApproved?: boolean;
  lastLoginAt?: Date;
  role: 'admin' | 'manager' | 'user';
  password_hash$1: string;
}



// Project Types
export interface Project extends BaseEntity {
  name: string;
  description$2: string;
  color: string;
  ownerId: string;
  isArchived: boolean;
  settings: ProjectSettings;
  members: ProjectMember[];
  statistics: ProjectStatistics;
}

export interface ProjectSettings {
  isPublic: boolean;
  allowGuestAccess: boolean;
  defaultTaskPriority: TaskPriority;
  autoArchiveCompletedTasks: boolean;
  enableTimeTracking: boolean;
  enableDependencies: boolean;
}

export interface ProjectMember {
  userId: string;
  role: ProjectRole;
  joinedAt: Date;
  permissions: ProjectPermissions;
}

export type ProjectRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface ProjectPermissions {
  canCreateBoards: boolean;
  canEditProject: boolean;
  canManageMembers: boolean;
  canDeleteProject: boolean;
  canArchiveProject: boolean;
}

export interface ProjectStatistics {
  totalBoards: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  activeMembersCount: number;
}

// Board Types
export interface Board extends BaseEntity {
  name: string;
  description$1: string;
  projectId: string;
  type$2: string;
  position: number;
  color$3: string;
  isArchived: boolean;
  createdBy$4: string;
  settings: BoardSettings;
  viewSettings$5: Record<string, unknown>;
  columns: Column[];
  statistics: BoardStatistics;
}

export interface BoardSettings {
  allowTaskCreation: boolean;
  autoMoveCompletedTasks: boolean;
  enableWipLimits: boolean;
  defaultColumnId$6: string;
}

export interface Column extends BaseEntity {
  name: string;
  boardId: string;
  position: number;
  color$7: string;
  wipLimit$8: number;
  taskLimit$9: number;
  isCollapsed: boolean;
  isArchived$10: boolean;
  createdBy$11: string;
  settings: ColumnSettings;
}

export interface ColumnSettings {
  autoAssignUsers: string[];
  defaultTaskPriority: TaskPriority;
  allowTaskDrop: boolean;
  hideCompletedTasks: boolean;
}

export interface BoardStatistics {
  totalTasks: number;
  completedTasks: number;
  totalColumns: number;
  overdueTasks: number;
  tasksByStatus: Record<TaskStatus, number>;
  tasksByPriority: Record<TaskPriority, number>;
  averageCompletionTime: number;
}

// Task Types
export interface Task extends BaseEntity {
  title: string;
  description$12: string;
  status: TaskStatus;
  priority: TaskPriority;
  columnId: string;
  boardId: string;
  projectId: string;
  position: number;
  assigneeId$13: string;
  assignees$14: User[]; // Array of assigned users
  reporterId: string;
  reporter$15: User; // Reporter user data
  createdBy$16: string;
  dueDate$17: Date;
  estimatedHours$18: number;
  actualHours$19: number;
  progress$20: number; // Progress percentage 0-100
  tags: string[];
  isArchived: boolean;
  metadata: TaskMetadata;
  dependencies: TaskDependency[];
  attachments: Attachment[];
  comments: Comment[];
  timeEntries: TimeEntry[];
  history: TaskAction[];
  // Related entities for display
  project$21: Project;
  board$22: Board;
  column$23: Column;
  // Statistics for display
  statistics$24: {
    totalComments: number;
    totalAttachments: number;
    totalSubtasks: number;
    completedSubtasks: number;
  };
}

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'deferred';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TaskMetadata {
  complexity: number; // 1-10
  businessValue: number; // 1-10
  technicalDebt: boolean;
  blockedReason$1: string;
  completedAt$2: Date;
  archivedAt$3: Date;
}

export interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  type: DependencyType;
  createdAt: Date;
  createdBy: string;
}

export type DependencyType = 'blocks' | 'blocked_by' | 'relates_to' | 'duplicates';

export interface Attachment extends BaseEntity {
  taskId: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  uploadedBy: string;
}

export interface Comment extends BaseEntity {
  taskId: string;
  content: string;
  authorId: string;
  parentCommentId$1: string;
  isEdited: boolean;
  editedAt$2: Date;
}

export interface TimeEntry extends BaseEntity {
  taskId: string;
  userId: string;
  startTime: Date;
  endTime$3: Date;
  duration: number; // in minutes
  description$4: string;
  isActive: boolean;
}

export interface TaskAction extends BaseEntity {
  taskId: string;
  userId: string;
  action: TaskActionType;
  oldValue$5: unknown;
  newValue$6: unknown;
  description: string;
}

export type TaskActionType = 
  | 'created'
  | 'updated'
  | 'deleted'
  | 'moved'
  | 'assigned'
  | 'unassigned'
  | 'status_changed'
  | 'priority_changed'
  | 'due_date_changed'
  | 'archived'
  | 'restored'
  | 'comment_added'
  | 'attachment_added'
  | 'dependency_added'
  | 'dependency_removed';

// Session and Authentication Types
export interface Session extends BaseEntity {
  userId: string;
  token: string;
  expiresAt: Date;
  isActive: boolean;
  userAgent$1: string;
  ipAddress$2: string;
  lastActivityAt: Date;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  session: Session;
  permissions: GlobalPermissions;
}

export interface GlobalPermissions {
  canCreateProjects: boolean;
  canManageUsers: boolean;
  canAccessAdmin: boolean;
  canExportData: boolean;
}

// API Error Types
export interface ApiError {
  code: string;
  message: string;
  details$3: Record<string, unknown>;
  field$4: string;
}

export interface ResponseMeta {
  page$5: number;
  limit$6: number;
  total$7: number;
  hasMore$8: boolean;
}

// Event Types for Real-time Updates
export interface SystemEvent {
  id: string;
  type: EventType;
  entityType: EntityType;
  entityId: string;
  userId: string;
  timestamp: Date;
  data: Record<string, unknown>;
}

export type EventType = 
  | 'created'
  | 'updated'
  | 'deleted'
  | 'archived'
  | 'restored'
  | 'moved'
  | 'assigned';

export type EntityType = 'project' | 'board' | 'column' | 'task' | 'user';

// Drag and Drop Types
export interface DragEndEvent {
  draggableId: string;
  type: string;
  source: {
    droppableId: string;
    index: number;
  };
  destination$1: {
    droppableId: string;
    index: number;
  };
  reason: 'DROP' | 'CANCEL';
}

// Search and Filter Types
export interface SearchFilters {
  query$1: string;
  projectIds$2: string[];
  boardIds$3: string[];
  columnIds$4: string[];
  assigneeIds$5: string[];
  statuses$6: TaskStatus[];
  priorities$7: TaskPriority[];
  tags$8: string[];
  dueDateFrom$9: Date;
  dueDateTo$10: Date;
  createdFrom$11: Date;
  createdTo$12: Date;
  isArchived$13: boolean;
  showArchived$14: boolean;
  isOverdue$15: boolean;
  hasDueDate$16: boolean;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

// Validation Types
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// Cache Types
export interface CacheEntry<T = unknown> {
  key: string;
  data: T;
  expiresAt: Date;
  tags: string[];
}

// Configuration Types
export interface AppConfig {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
  privacy: {
    analytics: boolean;
    cookies: boolean;
  };
}

// Data Transfer Objects for API operations

export interface DatabaseConfig {
  type: 'postgresql';
  url: string;
  poolSize: number;
  timeout: number;
}

export interface AuthConfig {
  sessionDuration: number;
  passwordMinLength: number;
  requireEmailVerification: boolean;
  allowRegistration: boolean;
}

export interface CacheConfig {
  ttl: number;
  maxSize: number;
  strategy: 'lru' | 'fifo';
}

export interface NotificationConfig {
  email: EmailConfig;
  telegram: TelegramConfig;
  push: PushConfig;
}

export interface EmailConfig {
  enabled: boolean;
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
}

export interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  webhookUrl$1: string;
}

export interface PushConfig {
  enabled: boolean;
  vapidKeys: {
    publicKey: string;
    privateKey: string;
  };
}

export interface FeatureFlags {
  enableTimeTracking: boolean;
  enableDependencies: boolean;
  enableTelegramIntegration: boolean;
  enableRealTimeUpdates: boolean;
  enableAdvancedSearch: boolean;
  enableDataExport: boolean;
}

// Create and Update Data Types
export interface CreateProjectData {
  name: string;
  description$2: string;
  color$3: string;
  icon$4: string;
}

export interface UpdateProjectData {
  name$5: string;
  description$6: string;
  color$7: string;
  icon$8: string;
  status$9: ProjectStatus;
  isArchived$10: boolean;
}

export interface CreateBoardData {
  name: string;
  description$11: string;
  projectId: string;
  color$12: string;
  icon$13: string;
}

export interface UpdateBoardData {
  name$14: string;
  description$15: string;
  projectId$16: string;
  color$17: string;
  icon$18: string;
  status$19: BoardStatus;
  isArchived$20: boolean;
}

export interface DuplicateBoardData {
  name: string;
  projectId: string;
  includeTasks$21: boolean;
}

export interface CreateTaskData {
  title: string;
  description$22: string;
  columnId: string;
  projectId$23: string;
  boardId$24: string;
  assigneeId$25: string;
  assigneeIds$26: string[]; // Support for multiple assignees
  priority$27: TaskPriority;
  dueDate$28: Date;
  tags$29: string[];
  estimatedHours$30: number;
}

export interface UpdateTaskData {
  title$31: string;
  description$32: string;
  columnId$33: string;
  projectId$34: string;
  boardId$35: string;
  assigneeId$36: string;
  assigneeIds$37: string[]; // Support for multiple assignees
  priority$38: TaskPriority;
  status$39: TaskStatus;
  dueDate$40: Date;
  tags$41: string[];
  estimatedHours$42: number;
  actualHours$43: number;
  position$44: number;
  progress$45: number;
}

// Legacy type aliases for backward compatibility
export type UserId = string;
export type CreateTaskDto = CreateTaskData;
export type UpdateTaskDto = UpdateTaskData;
export type TaskFilters = SearchFilters;

// Service Response Types
export interface ServiceResponse<T = unknown> {
  success: boolean;
  data$46: T;
  error$47: string;
  message$48: string;
}

// Additional missing types
export type ProjectStatus = 'active' | 'archived' | 'completed';
export type BoardStatus = 'active' | 'archived';
export type UserRole = 'admin' | 'manager' | 'user';

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data$1: T;
  error$2: string;
  message$3: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface QueryOptions {
  page$4: number;
  limit$5: number;
  sortBy$6: string;
  sortOrder$7: 'asc' | 'desc';
  filters$1: Record<string, any>;
}

// Task Statistics
export interface TaskStatistics {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  averageCompletionTime: number;
}
export type ProjectSortBy = 'name' | 'createdAt' | 'updatedAt' | 'status' | 'memberCount' | 'taskCount';
export type BoardSortBy = 'name' | 'created_at' | 'updated_at' | 'task_count';
export type BoardSortField = 'name' | 'createdAt' | 'updatedAt' | 'position';
export type TaskSortField = 'title' | 'status' | 'priority' | 'dueDate' | 'createdAt' | 'updatedAt' | 'position' | 'progress';
export type SortOrder = 'asc' | 'desc';

// Filter types
export interface BoardFilters {
  search$1: string;
  projectId$2: string;
  showArchived$3: boolean;
}

// Pagination types
export interface PaginationParams {
  page$4: number;
  limit$5: number;
  sort_by$6: string;
  sort_order$7: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Type aliases for components
export type TaskComment = Comment;

// Export all types for easy importing