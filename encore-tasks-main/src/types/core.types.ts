// =====================================================
// БАЗОВЫЕ ТИПЫ И ИНТЕРФЕЙСЫ
// =====================================================

export type UUID = string;
export type Timestamp = string;

// Базовые статусы и приоритеты
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'deferred';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ProjectStatus = 'active' | 'archived' | 'completed';
export type Visibility = 'private' | 'public';
export type UserRole = 'admin' | 'user';
export type ProjectMemberRole = 'owner' | 'admin' | 'member' | 'viewer';

// =====================================================
// БАЗОВЫЕ ИНТЕРФЕЙСЫ
// =====================================================

export interface BaseEntity {
  id: UUID;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface AuditableEntity extends BaseEntity {
  created_by: UUID;
}

// =====================================================
// ПОЛЬЗОВАТЕЛИ
// =====================================================

export interface User extends BaseEntity {
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  role: UserRole;
  is_active: boolean;
  email_verified: boolean;
  last_login_at?: Timestamp;
}

export interface CreateUserDto {
  email: string;
  username: string;
  password: string;
  first_name?: string;
  last_name?: string;
  role?: UserRole;
}

export interface UpdateUserDto {
  username?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  is_active?: boolean;
}

export interface UserProfile extends Omit<User, 'password_hash'> {
  full_name: string;
}

// =====================================================
// ПРОЕКТЫ
// =====================================================

export interface Project extends AuditableEntity {
  name: string;
  description?: string;
  color: string;
  icon: string;
  status: ProjectStatus;
  visibility: Visibility;
  telegram_chat_id?: string;
  telegram_topic_id?: string;
  settings: Record<string, unknown>;
}

export interface CreateProjectDto {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  visibility?: Visibility;
  telegram_chat_id?: string | null;
  telegram_topic_id?: string | null;
  member_ids?: UUID[];
}

export interface UpdateProjectDto {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  status?: ProjectStatus;
  visibility?: Visibility;
  telegram_chat_id?: string;
  telegram_topic_id?: string;
  settings?: Record<string, unknown>;
}

export interface ProjectWithStats extends Project {
  created_by_username: string;
  members_count: number;
  boards_count: number;
  tasks_count: number;
}

// =====================================================
// УЧАСТНИКИ ПРОЕКТОВ
// =====================================================

export interface ProjectMember extends BaseEntity {
  project_id: UUID;
  user_id: UUID;
  role: ProjectMemberRole;
  permissions: Record<string, unknown>;
  joined_at: Timestamp;
}

export interface ProjectMemberWithUser extends ProjectMember {
  user: User;
}

export interface AddProjectMemberDto {
  user_id: UUID;
  role?: ProjectMemberRole;
  permissions?: Record<string, unknown>;
}

export interface UpdateProjectMemberDto {
  role?: ProjectMemberRole;
  permissions?: Record<string, unknown>;
}

// =====================================================
// ДОСКИ
// =====================================================

export interface Board extends AuditableEntity {
  project_id: UUID;
  name: string;
  description?: string;
  icon: string;
  color: string;
  position: number;
  visibility: Visibility;
  is_default: boolean;
  settings: Record<string, unknown>;
}

export interface CreateBoardDto {
  project_id: UUID;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  position?: number;
  visibility?: Visibility;
  create_default_columns?: boolean;
}

export interface UpdateBoardDto {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  position?: number;
  visibility?: Visibility;
  settings?: Record<string, unknown>;
}

export interface BoardWithColumns extends Board {
  columns: Column[];
}

export interface BoardWithStats extends Board {
  project_name: string;
  created_by_username: string;
  columns_count: number;
  tasks_count: number;
  completed_tasks_count: number;
}

// =====================================================
// КОЛОНКИ
// =====================================================

export interface Column extends BaseEntity {
  board_id: UUID;
  name: string;
  color: string;
  position: number;
  task_limit?: number;
  is_done_column: boolean;
  settings: Record<string, unknown>;
}

export interface CreateColumnDto {
  board_id: UUID;
  name: string;
  color?: string;
  position?: number;
  task_limit?: number;
  is_done_column?: boolean;
  settings?: Record<string, unknown>;
}

export interface UpdateColumnDto {
  name?: string;
  color?: string;
  position?: number;
  task_limit?: number;
  is_done_column?: boolean;
  settings?: Record<string, unknown>;
}

export interface ColumnWithTasks extends Column {
  tasks: Task[];
  task_count: number;
}

// =====================================================
// ЗАДАЧИ
// =====================================================

export interface Task extends AuditableEntity {
  project_id: UUID;
  board_id: UUID;
  column_id: UUID;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  position: number;
  story_points?: number;
  estimated_hours?: number;
  actual_hours?: number;
  due_date?: Timestamp;
  start_date?: Timestamp;
  completed_at?: Timestamp;
  assigned_to?: UUID;
  parent_task_id?: UUID;
  metadata: Record<string, unknown>;
}

export interface CreateTaskDto {
  project_id: UUID;
  board_id: UUID;
  column_id: UUID;
  title: string;
  description?: string;
  priority?: TaskPriority;
  story_points?: number;
  estimated_hours?: number;
  due_date?: Timestamp;
  start_date?: Timestamp;
  assigned_to?: UUID;
  parent_task_id?: UUID;
  assignee_ids?: UUID[];
  tag_ids?: UUID[];
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  position?: number;
  story_points?: number;
  estimated_hours?: number;
  actual_hours?: number;
  due_date?: Timestamp;
  start_date?: Timestamp;
  assigned_to?: UUID;
  column_id?: UUID;
  parent_task_id?: UUID;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

export interface TaskWithDetails extends Task {
  project_name: string;
  board_name: string;
  column_name: string;
  created_by_username: string;
  assigned_to_username?: string;
  assigned_to_first_name?: string;
  assigned_to_last_name?: string;
  assignees: User[];
  tags: Tag[];
  comments_count: number;
  attachments_count: number;
  subtasks_count: number;
}

export interface MoveTaskDto {
  column_id: UUID;
  position: number;
}

// =====================================================
// НАЗНАЧЕНИЯ ЗАДАЧ
// =====================================================

export interface TaskAssignee extends BaseEntity {
  task_id: UUID;
  user_id: UUID;
  assigned_by: UUID;
  assigned_at: Timestamp;
}

export interface TaskAssigneeWithUser extends TaskAssignee {
  user: User;
  assigned_by_user: User;
}

// =====================================================
// ТЕГИ
// =====================================================

export interface Tag extends AuditableEntity {
  project_id: UUID;
  name: string;
  color: string;
}

export interface CreateTagDto {
  project_id: UUID;
  name: string;
  color?: string;
}

export interface UpdateTagDto {
  name?: string;
  color?: string;
}

export interface TaskTag extends BaseEntity {
  task_id: UUID;
  tag_id: UUID;
}

// =====================================================
// КОММЕНТАРИИ
// =====================================================

export interface Comment extends AuditableEntity {
  task_id: UUID;
  author_id: UUID;
  content: string;
  parent_comment_id?: UUID;
  is_edited: boolean;
  deleted_at?: Timestamp;
}

export interface CreateCommentDto {
  task_id: UUID;
  content: string;
  parent_comment_id?: UUID;
}

export interface UpdateCommentDto {
  content: string;
}

export interface CommentWithAuthor extends Comment {
  author: User;
  replies?: CommentWithAuthor[];
}

// =====================================================
// ВЛОЖЕНИЯ
// =====================================================

export interface Attachment extends BaseEntity {
  task_id: UUID;
  name: string;
  original_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploader_id: UUID;
  uploaded_at: Timestamp;
}

export interface CreateAttachmentDto {
  task_id: UUID;
  name: string;
  original_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
}

export interface AttachmentWithUploader extends Attachment {
  uploader: User;
}

// =====================================================
// API ОТВЕТЫ
// =====================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = unknown> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// =====================================================
// ФИЛЬТРЫ И СОРТИРОВКА
// =====================================================

export interface TaskFilters {
  project_id?: UUID;
  board_id?: UUID;
  column_id?: UUID;
  status?: TaskStatus[];
  priority?: TaskPriority[];
  assigned_to?: UUID[];
  created_by?: UUID;
  due_date_from?: Timestamp;
  due_date_to?: Timestamp;
  search?: string;
  tag_ids?: UUID[];
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

// =====================================================
// DRAG & DROP
// =====================================================

export interface DragEndEvent {
  draggableId: string;
  type: string;
  source: {
    droppableId: string;
    index: number;
  };
  destination?: {
    droppableId: string;
    index: number;
  };
}

// =====================================================
// УВЕДОМЛЕНИЯ
// =====================================================

export type NotificationType = 
  | 'task_assigned'
  | 'task_completed'
  | 'task_updated'
  | 'project_updated'
  | 'comment_added'
  | 'deadline_reminder';

export interface Notification extends BaseEntity {
  user_id: UUID;
  title: string;
  message: string;
  type: NotificationType;
  related_task_id?: UUID;
  related_project_id?: UUID;
  is_read: boolean;
  sent_via_email: boolean;
  sent_via_telegram: boolean;
  read_at?: Timestamp;
}

// =====================================================
// СЕССИИ И АУТЕНТИФИКАЦИЯ
// =====================================================

export interface Session extends BaseEntity {
  user_id: UUID;
  session_token: string;
  refresh_token?: string;
  ip_address?: string;
  user_agent?: string;
  expires_at: Timestamp;
  last_activity_at: Timestamp;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface LoginDto {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface RegisterDto {
  email: string;
  username: string;
  password: string;
  first_name?: string;
  last_name?: string;
}