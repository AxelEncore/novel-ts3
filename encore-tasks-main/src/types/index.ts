export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'manager' | 'user';
  isApproved?: boolean;
  lastLoginAt?: string;
  created_at: string;
  updated_at: string;
  password_hash?: string;
}

export interface UserRole {
  id: string;
  name: string;
  permissions: Permission[];
}

export interface Permission {
  id: string;
  name: string;
  description: string;
}

export interface ProjectMember {
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: string;
  isApproved?: boolean;
  permissions?: {
    canCreateBoards: boolean;
    canEditProject: boolean;
    canManageMembers: boolean;
    canDeleteProject: boolean;
    canArchiveProject: boolean;
  };
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon_url?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  members?: ProjectMember[];
  telegramChatId?: string;
  telegramTopicId?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  project_id: string;
  board_id: string;
  column_id: string;
  assignee_id?: string;
  reporter_id?: string;
  position: number;
  created_at: string;
  updated_at: string;
  due_date?: string;
  column_name?: string;
  board_name?: string;
  project_name?: string;
  creator_id?: string;
  creator_username?: string;
  assignees?: User[];
  tags?: string[];
  settings?: {
    notifications_enabled: boolean;
    auto_archive: boolean;
    time_tracking: boolean;
  };
  attachments?: Attachment[];
  comments?: Comment[];
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: "image" | "document" | "other";
  size: number;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface Comment {
  id: string;
  content: string;
  author: User;
  createdAt: Date;
  updatedAt?: Date;
}

export interface Board {
  id: string;
  name: string;
  description?: string;
  project_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Column {
  id: string;
  name?: string; // Для обратной совместимости
  title?: string; // Основное поле из БД
  board_id: string;
  position: number;
  color?: string;
  status?: TaskStatus;
  created_at: string;
  updated_at: string;
  tasks?: Task[]; // Добавляем поле для задач колонки
}

export type TaskStatus = "todo" | "in_progress" | "review" | "done" | "deferred";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface NotificationSettings {
  projectId: string;
  telegramBotToken: string;
  telegramChatId: string;
  telegramTopicId?: string;
  enabled: boolean;
}

export interface TaskAction {
  id: string;
  taskId: string;
  boardId: string;
  projectId: string;
  userId: string;
  userName: string;
  action: 'created' | 'updated' | 'deleted' | 'moved' | 'assigned' | 'unassigned' | 'status_changed' | 'priority_changed' | 'title_changed' | 'description_changed' | 'deadline_changed' | 'tags_changed';
  description: string;
  timestamp: string;
  oldValue?: string;
  newValue?: string;
  changes?: {
    field: string;
    oldValue: string | number | boolean | Date | null;
    newValue: string | number | boolean | Date | null;
  }[];
}

export interface Session {
  id: string;
  token: string;
  user_id: string;
  expires_at: string;
  created_at: string;
}

export interface DragEndEvent {
  active: {
    id: string;
    data: {
      current?: {
        type: string;
        task?: Task;
        columnId?: string;
      };
    };
  };
  over: {
    id: string;
    data: {
      current?: {
        type: string;
        columnId?: string;
      };
    };
  } | null;
}