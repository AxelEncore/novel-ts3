// Business Layer Interfaces for Refactored Architecture
// These interfaces define contracts for all business operations

import { Project, Board, Task, User, Comment, Attachment, TaskDependency, SearchFilters, ValidationResult, Column, TimeEntry, SystemEvent, TaskAction } from '../../data/types';
import { SortOptions, PaginationOptions } from '../../../types/core.types';

// Repository Interfaces
export interface IProjectRepository {
  findById(id: string): Promise<Project | null>;
  findByUserId(userId: string, filters$1: SearchFilters): Promise<Project[]>;
  findAll(filters$2: SearchFilters, sort$3: SortOptions, pagination$4: PaginationOptions): Promise<Project[]>;
  create(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project>;
  update(id: string, updates: Partial<Project>): Promise<Project>;
  delete(id: string): Promise<void>;
  archive(id: string): Promise<Project>;
  restore(id: string): Promise<Project>;
  updatePosition(id: string, position: number): Promise<void>;
  getStatistics(id: string): Promise<Project['statistics']>;
  getMembers(id: string): Promise<Project['members']>;
  addMember(projectId: string, member: Project['members'][0]): Promise<void>;
  removeMember(projectId: string, userId: string): Promise<void>;
  updateMemberRole(projectId: string, userId: string, role: Project['members'][0]['role']): Promise<void>;
  checkPermissions(projectId: string, userId: string, permission: string): Promise<boolean>;
}

export interface IBoardRepository {
  findById(id: string): Promise<Board | null>;
  findByProjectId(projectId: string, includeArchived$1: boolean): Promise<Board[]>;
  findAll(filters$2: SearchFilters, sort$3: SortOptions, pagination$4: PaginationOptions): Promise<Board[]>;
  create(board: Omit<Board, 'id' | 'createdAt' | 'updatedAt'>): Promise<Board>;
  update(id: string, updates: Partial<Board>): Promise<Board>;
  delete(id: string): Promise<void>;
  archive(id: string): Promise<Board>;
  restore(id: string): Promise<Board>;
  updatePosition(id: string, position: number): Promise<void>;
  reorderBoards(projectId: string, boardIds: string[]): Promise<void>;
  duplicate(id: string, newName: string): Promise<Board>;
  getStatistics(id: string): Promise<Board['statistics']>;
  search(query: string, projectId$1: string, filters$2: SearchFilters): Promise<Board[]>;
  getRecentlyViewed(userId: string, limit$3: number): Promise<Board[]>;
  markAsViewed(boardId: string, userId: string): Promise<void>;
}

export interface IColumnRepository {
  findById(id: string): Promise<Column | null>;
  findByBoardId(boardId: string): Promise<Column[]>;
  create(column: Omit<Column, 'id' | 'createdAt' | 'updatedAt'>): Promise<Column>;
  update(id: string, updates: Partial<Column>): Promise<Column>;
  delete(id: string): Promise<void>;
  updatePosition(id: string, position: number): Promise<void>;
  reorderColumns(boardId: string, columnIds: string[]): Promise<void>;
}

export interface ITaskRepository {
  findById(id: string): Promise<Task | null>;
  findByColumnId(columnId: string, includeArchived$1: boolean): Promise<Task[]>;
  findByBoardId(boardId: string, includeArchived$2: boolean): Promise<Task[]>;
  findByProjectId(projectId: string, includeArchived$3: boolean): Promise<Task[]>;
  findByAssigneeId(assigneeId: string, includeArchived$4: boolean): Promise<Task[]>;
  findAll(includeArchived$5: boolean, sort$6: SortOptions, pagination$7: PaginationOptions): Promise<Task[]>;
  create(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task>;
  update(id: string, updates: Partial<Task>): Promise<Task>;
  delete(id: string): Promise<void>;
  archive(id: string): Promise<Task>;
  restore(id: string): Promise<Task>;
  move(id: string, columnId: string, position: number): Promise<Task>;
  updatePosition(id: string, position: number): Promise<void>;
  reorderTasks(columnId: string, taskIds: string[]): Promise<void>;
  duplicate(id: string, newTitle: string): Promise<Task>;
  search(query: string, filters$1: SearchFilters): Promise<Task[]>;
  addComment(taskId: string, comment: { content: string; authorId: string }): Promise<void>;
  updateComment(commentId: string, updates: Partial<Comment>): Promise<Comment>;
  deleteComment(commentId: string): Promise<void>;
  addAttachment(taskId: string, attachment: Omit<Attachment, 'id' | 'createdAt' | 'updatedAt' | 'taskId' | 'uploadedBy'>, uploadedBy: string): Promise<Attachment>;
  deleteAttachment(attachmentId: string): Promise<void>;
  addDependency(taskId: string, dependency: Omit<TaskDependency, 'id' | 'createdAt' | 'createdBy'>, createdBy: string): Promise<TaskDependency>;
  removeDependency(dependencyId: string): Promise<void>;
  startTimeTracking(taskId: string, userId: string): Promise<TimeEntry>;
  stopTimeTracking(entryId: string): Promise<TimeEntry>;
  getTimeEntries(taskId: string): Promise<TimeEntry[]>;
  addTimeEntry(taskId: string, timeEntry: Omit<TimeEntry, 'id' | 'createdAt' | 'updatedAt' | 'taskId'>): Promise<TimeEntry>;
  updateTimeEntry(entryId: string, updates: Partial<TimeEntry>): Promise<TimeEntry>;
  deleteTimeEntry(entryId: string): Promise<void>;
  logAction(taskId: string, action: Omit<TaskAction, 'id' | 'createdAt'>): Promise<TaskAction>;
}

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findAll(filters$1: SearchFilters): Promise<User[]>;
  create(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User>;
  update(id: string, updates: Partial<User>): Promise<User>;
  delete(id: string): Promise<void>;
  updateLastLogin(id: string): Promise<void>;

}

// Service Interfaces
export interface IProjectService {
  getById(id: string, userId: string): Promise<Project>;
  getByUserId(userId: string, filters$1: SearchFilters): Promise<Project[]>;
  create(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'members' | 'statistics'>, userId: string): Promise<Project>;
  update(id: string, updates: Partial<Project>, userId: string): Promise<Project>;
  delete(id: string, userId: string): Promise<void>;
  archive(id: string, userId: string): Promise<Project>;
  restore(id: string, userId: string): Promise<Project>;
  duplicate(id: string, newName: string, userId: string): Promise<Project>;
  addMember(projectId: string, memberData: Omit<Project['members'][0], 'joinedAt'>, userId: string): Promise<void>;
  removeMember(projectId: string, memberId: string, userId: string): Promise<void>;
  updateMemberRole(projectId: string, memberId: string, role: Project['members'][0]['role'], userId: string): Promise<void>;
  getStatistics(id: string, userId: string): Promise<Project['statistics']>;
  checkPermissions(projectId: string, userId: string, permission: string): Promise<boolean>;
}

export interface IBoardService {
  getById(id: string, userId: string): Promise<Board>;
  getByProjectId(projectId: string, userId: string, includeArchived$1: boolean): Promise<Board[]>;
  create(boardData: Omit<Board, 'id' | 'createdAt' | 'updatedAt' | 'columns' | 'statistics'>, userId: string): Promise<Board>;
  update(id: string, updates: Partial<Board>, userId: string): Promise<Board>;
  delete(id: string, userId: string): Promise<void>;
  archive(id: string, userId: string): Promise<Board>;
  restore(id: string, userId: string): Promise<Board>;
  reorder(projectId: string, boardIds: string[], userId: string): Promise<void>;
  duplicate(id: string, newName: string, userId: string): Promise<Board>;
  getStatistics(id: string, userId: string): Promise<Board['statistics']>;
  addColumn(boardId: string, columnData: Omit<Column, 'id' | 'createdAt' | 'updatedAt' | 'boardId'>, userId: string): Promise<Column>;
  updateColumn(columnId: string, updates: Partial<Column>, userId: string): Promise<Column>;
  deleteColumn(columnId: string, userId: string): Promise<void>;
  reorderColumns(boardId: string, columnIds: string[], userId: string): Promise<void>;
}

export interface ITaskService {
  getById(id: string, userId: string): Promise<Task>;
  getByColumnId(columnId: string, userId: string, includeArchived$1: boolean): Promise<Task[]>;
  getByBoardId(boardId: string, userId: string, includeArchived$2: boolean): Promise<Task[]>;
  getByProjectId(projectId: string, userId: string, includeArchived$3: boolean): Promise<Task[]>;
  getByAssigneeId(assigneeId: string, userId: string, filters$4: SearchFilters): Promise<Task[]>;
  search(query: string, userId: string, filters$5: SearchFilters): Promise<Task[]>;
  create(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'dependencies' | 'attachments' | 'comments' | 'timeEntries' | 'history'>, userId: string): Promise<Task>;
  update(id: string, updates: Partial<Task>, userId: string): Promise<Task>;
  delete(id: string, userId: string): Promise<void>;
  archive(id: string, userId: string): Promise<Task>;
  restore(id: string, userId: string): Promise<Task>;
  move(id: string, columnId: string, position: number, userId: string): Promise<Task>;
  reorder(columnId: string, taskIds: string[], userId: string): Promise<void>;
  duplicate(id: string, newTitle: string, userId: string): Promise<Task>;
  assign(id: string, assigneeId: string, userId: string): Promise<Task>;
  unassign(id: string, userId: string): Promise<Task>;
  updateStatus(id: string, status: Task['status'], userId: string): Promise<Task>;
  updatePriority(id: string, priority: Task['priority'], userId: string): Promise<Task>;
  addComment(taskId: string, content: string, userId: string): Promise<void>;
  updateComment(commentId: string, content: string, userId: string): Promise<Comment>;
  deleteComment(commentId: string, userId: string): Promise<void>;
  addAttachment(taskId: string, attachmentData: Omit<Attachment, 'id' | 'createdAt' | 'updatedAt' | 'taskId' | 'uploadedBy'>, userId: string): Promise<Attachment>;
  deleteAttachment(attachmentId: string, userId: string): Promise<void>;
  addDependency(taskId: string, dependencyData: Omit<TaskDependency, 'id' | 'createdAt' | 'createdBy'>, userId: string): Promise<TaskDependency>;
  removeDependency(dependencyId: string, userId: string): Promise<void>;
  startTimeTracking(taskId: string, userId: string): Promise<TimeEntry>;
  stopTimeTracking(entryId: string, userId: string): Promise<TimeEntry>;
  getTimeEntries(taskId: string, userId: string): Promise<TimeEntry[]>;
  getHistory(taskId: string, userId: string): Promise<Task['history']>;
}

export interface IUserService {
  getById(id: string): Promise<User>;
  getByEmail(email: string): Promise<User>;
  create(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User>;
  update(id: string, updates: Partial<User>): Promise<User>;
  delete(id: string): Promise<void>;
  updateLastLogin(id: string): Promise<void>;
}

// Validator Interfaces
export interface IProjectValidator {
  validateCreate(data: unknown): ValidationResult;
  validateUpdate(data: unknown): ValidationResult;
  validateMember(data: unknown): ValidationResult;
  validateId(id: string): ValidationResult;
  validateSearchFilters(filters: unknown): ValidationResult;
  validateSortOptions(sort: unknown): ValidationResult;
  validatePaginationOptions(pagination: unknown): ValidationResult;
}

export interface IBoardValidator {
  validateCreate(data: unknown): ValidationResult;
  validateUpdate(data: unknown): ValidationResult;
  validateColumn(data: unknown): ValidationResult;
  validateId(id: string): ValidationResult;
  validateSearchFilters(filters: unknown): ValidationResult;
  validateSortOptions(sort: unknown): ValidationResult;
  validatePaginationOptions(pagination: unknown): ValidationResult;
}

export interface ITaskValidator {
  validateCreate(data: unknown): ValidationResult;
  validateUpdate(data: unknown): ValidationResult;
  validateMove(data: unknown): ValidationResult;
  validateDependency(data: unknown): ValidationResult;
  validateComment(data: unknown): ValidationResult;
  validateAttachment(data: unknown): ValidationResult;
  validateId(id: string): ValidationResult;
  validateSearchFilters(filters: unknown): ValidationResult;
  validateSortOptions(sort: unknown): ValidationResult;
  validatePaginationOptions(pagination: unknown): ValidationResult;
}

export interface IUserValidator {
  validateCreate(data: unknown): ValidationResult;
  validateUpdate(data: unknown): ValidationResult;
  validateEmail(email: string): ValidationResult;
  validatePassword(password: string): ValidationResult;
  validateId(id: string): ValidationResult;
}

// Permission Interfaces
export interface IPermissionService {
  canAccessProject(projectId: string, userId: string): Promise<boolean>;
  canEditProject(projectId: string, userId: string): Promise<boolean>;
  canDeleteProject(projectId: string, userId: string): Promise<boolean>;
  canManageProjectMembers(projectId: string, userId: string): Promise<boolean>;
  canAccessBoard(boardId: string, userId: string): Promise<boolean>;
  canEditBoard(boardId: string, userId: string): Promise<boolean>;
  canDeleteBoard(boardId: string, userId: string): Promise<boolean>;
  canAccessTask(taskId: string, userId: string): Promise<boolean>;
  canEditTask(taskId: string, userId: string): Promise<boolean>;
  canDeleteTask(taskId: string, userId: string): Promise<boolean>;
  canAssignTask(taskId: string, userId: string): Promise<boolean>;
  getUserPermissions(userId: string, entityType: string, entityId: string): Promise<Record<string, boolean>>;
}

// Event Interfaces
export interface IEventService {
  emit(event: Omit<SystemEvent, 'id' | 'timestamp'>): Promise<void>;
  subscribe(eventType: SystemEvent['type'], entityType: SystemEvent['entityType'], callback: (event: SystemEvent) => void): void;
  unsubscribe(eventType: SystemEvent['type'], entityType: SystemEvent['entityType'], callback: (event: SystemEvent) => void): void;
  getHistory(entityType: SystemEvent['entityType'], entityId: string, limit$1: number): Promise<SystemEvent[]>;
}

// Cache Interfaces
export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttl$2: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  exists(key: string): Promise<boolean>;
}

// Notification Interfaces
export interface INotificationService {
  sendEmail(to: string, subject: string, content: string): Promise<void>;
  sendPush(userId: string, title: string, body: string, data$3: Record<string, unknown>): Promise<void>;
  sendTelegram(userId: string, message: string): Promise<void>;
  notifyTaskAssigned(task: Task, assignee: User, assigner: User): Promise<void>;
  notifyTaskCompleted(task: Task, completer: User): Promise<void>;
  notifyTaskOverdue(task: Task, assignee: User): Promise<void>;
  notifyProjectInvitation(project: Project, invitee: User, inviter: User): Promise<void>;
}

// Search Interfaces
export interface ISearchService {
  searchTasks(query: string, userId: string, filters$4: SearchFilters): Promise<Task[]>;
  searchProjects(query: string, userId: string, filters$5: SearchFilters): Promise<Project[]>;
  searchBoards(query: string, userId: string, filters$6: SearchFilters): Promise<Board[]>;
  searchUsers(query: string, userId: string): Promise<User[]>;
  indexEntity(entityType: string, entityId: string, data: Record<string, unknown>): Promise<void>;
  removeFromIndex(entityType: string, entityId: string): Promise<void>;
}

// Import/Export Interfaces
export interface IImportExportService {
  exportProject(projectId: string, userId: string, format: 'json' | 'csv' | 'xlsx'): Promise<Buffer>;
  importProject(data: Buffer, format: 'json' | 'csv' | 'xlsx', userId: string): Promise<Project>;
  exportBoard(boardId: string, userId: string, format: 'json' | 'csv' | 'xlsx'): Promise<Buffer>;
  importBoard(projectId: string, data: Buffer, format: 'json' | 'csv' | 'xlsx', userId: string): Promise<Board>;
  exportTasks(filters: SearchFilters, userId: string, format: 'json' | 'csv' | 'xlsx'): Promise<Buffer>;
}

// Analytics Interfaces
export interface IAnalyticsService {
  getProjectAnalytics(projectId: string, userId: string, period: 'day' | 'week' | 'month' | 'year'): Promise<Record<string, unknown>>;
  getBoardAnalytics(boardId: string, userId: string, period: 'day' | 'week' | 'month' | 'year'): Promise<Record<string, unknown>>;
  getUserAnalytics(userId: string, period: 'day' | 'week' | 'month' | 'year'): Promise<Record<string, unknown>>;
  getTaskCompletionTrends(projectId: string, userId: string, period: 'day' | 'week' | 'month' | 'year'): Promise<Record<string, unknown>>;
  getProductivityMetrics(userId: string, period: 'day' | 'week' | 'month' | 'year'): Promise<Record<string, unknown>>;
}

// Factory Interfaces
export interface IProjectFactory {
  createProject(data: Partial<Project>, userId: string): Project;
  createProjectMember(userId: string, role: Project['members'][0]['role']): Project['members'][0];
}

export interface IBoardFactory {
  createBoard(data: Partial<Board>, projectId: string): Board;
  createColumn(data: Partial<Column>, boardId: string): Column;
}

export interface ITaskFactory {
  createTask(data: Partial<Task>, columnId: string, boardId: string, projectId: string, userId: string): Task;
  createComment(content: string, taskId: string, userId: string): Comment;
  createAttachment(data: Partial<Attachment>, taskId: string, userId: string): Attachment;
  createDependency(taskId: string, dependsOnTaskId: string, type: TaskDependency['type'], userId: string): TaskDependency;
  createTimeEntry(taskId: string, userId: string): TimeEntry;
  createTaskAction(taskId: string, userId: string, action: Task['history'][0]['action'], oldValue$1: unknown, newValue$2: unknown): Task['history'][0];
}

// Database Adapter Interface
export interface IDatabaseAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<{ affectedRows: number; insertId?: string }>;
  transaction<T>(callback: (adapter: IDatabaseAdapter) => Promise<T>): Promise<T>;
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}