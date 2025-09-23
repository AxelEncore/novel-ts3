import { ApiClient } from '@/lib/api';

// Интерфейсы для типизации
export interface ProjectMember {
  id: string;
  email: string;
  name?: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  joinedAt: Date;
}

export interface BoardColumn {
  id?: string;
  name: string;
  status: string;
  order: number;
  boardId?: string;
}

export interface Board {
  id: string;
  name: string;
  description: string;
  color: string;
  projectId: string;
  columns: BoardColumn[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  ownerId: string;
  members?: ProjectMember[];
  boards?: Board[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProjectData {
  name: string;
  description?: string;
  color?: string;
  members?: string[];
  telegramIntegration?: {
    enabled: boolean;
    chatId?: string;
    botToken?: string;
  };
}

export interface CreateBoardData {
  name: string;
  description?: string;
  color?: string;
  columns?: {
    name: string;
    status: string;
    order: number;
  }[];
}

export interface CreateProjectWithBoardsData {
  project: CreateProjectData;
  boards?: CreateBoardData[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any;
}

/**
 * Сервис для управления проектами
 */
export class ProjectService {
  private apiClient: ApiClient;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  /**
   * Создание проекта с досками
   */
  async createProjectWithBoards(data: CreateProjectWithBoardsData): Promise<ApiResponse<{ project: Project; boards: Board[] }>> {
    try {
      const response = await this.apiClient.request('/api/projects/create', {
        method: 'POST',
        body: JSON.stringify(data)
      });

      return response;
    } catch (error) {
      console.error('Ошибка создания проекта с досками:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }

  /**
   * Получение всех проектов пользователя
   */
  async getUserProjects(): Promise<ApiResponse<Project[]>> {
    try {
      const response = await this.apiClient.request('/api/projects', {
        method: 'GET'
      });

      return response;
    } catch (error) {
      console.error('Ошибка получения проектов:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }

  /**
   * Получение проекта по ID
   */
  async getProject(projectId: string): Promise<ApiResponse<Project>> {
    try {
      const response = await this.apiClient.request(`/api/projects/${projectId}`, {
        method: 'GET'
      });

      return response;
    } catch (error) {
      console.error('Ошибка получения проекта:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }

  /**
   * Обновление проекта
   */
  async updateProject(projectId: string, data: Partial<CreateProjectData>): Promise<ApiResponse<Project>> {
    try {
      const response = await this.apiClient.request(`/api/projects/${projectId}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });

      return response;
    } catch (error) {
      console.error('Ошибка обновления проекта:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }

  /**
   * Удаление проекта
   */
  async deleteProject(projectId: string): Promise<ApiResponse<void>> {
    try {
      const response = await this.apiClient.request(`/api/projects/${projectId}`, {
        method: 'DELETE'
      });

      return response;
    } catch (error) {
      console.error('Ошибка удаления проекта:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }

  /**
   * Добавление участника в проект
   */
  async addProjectMember(projectId: string, email: string, role: 'ADMIN' | 'MEMBER' = 'MEMBER'): Promise<ApiResponse<ProjectMember>> {
    try {
      const response = await this.apiClient.request(`/api/projects/${projectId}/members`, {
        method: 'POST',
        body: JSON.stringify({ email, role })
      });

      return response;
    } catch (error) {
      console.error('Ошибка добавления участника:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }

  /**
   * Удаление участника из проекта
   */
  async removeProjectMember(projectId: string, userId: string): Promise<ApiResponse<void>> {
    try {
      const response = await this.apiClient.request(`/api/projects/${projectId}/members/${userId}`, {
        method: 'DELETE'
      });

      return response;
    } catch (error) {
      console.error('Ошибка удаления участника:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }

  /**
   * Получение досок проекта
   */
  async getProjectBoards(
    projectId: string, 
    options: {
      includeColumns?: boolean;
      includeTasks?: boolean;
    } = {}
  ): Promise<ApiResponse<Board[]>> {
    try {
      const params = new URLSearchParams();
      if (options.includeColumns) params.set('includeColumns', 'true');
      if (options.includeTasks) params.set('includeTasks', 'true');
      
      const url = `/api/projects/${projectId}/boards${params.toString() ? '?' + params.toString() : ''}`;
      const response = await this.apiClient.request(url, {
        method: 'GET'
      });

      return response;
    } catch (error) {
      console.error('Ошибка получения досок проекта:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }

  /**
   * Получение колонок доски
   */
  async getBoardColumns(
    boardId: string,
    includeTasks: boolean = false
  ): Promise<ApiResponse<BoardColumn[]>> {
    try {
      const params = new URLSearchParams();
      if (includeTasks) params.set('includeTasks', 'true');
      
      const url = `/api/boards/${boardId}/columns${params.toString() ? '?' + params.toString() : ''}`;
      const response = await this.apiClient.request(url, {
        method: 'GET'
      });
      
      return response;
    } catch (error) {
      console.error('Ошибка получения колонок доски:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }

  /**
   * Создание новой колонки
   */
  async createColumn(
    boardId: string,
    columnData: {
      name: string;
      status: string;
      order?: number;
    }
  ): Promise<ApiResponse<BoardColumn>> {
    try {
      const response = await this.apiClient.request(`/api/boards/${boardId}/columns`, {
        method: 'POST',
        body: JSON.stringify(columnData)
      });

      return response;
    } catch (error) {
      console.error('Ошибка создания колонки:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }

  /**
   * Обновление позиций колонок
   */
  async updateColumnPositions(
    boardId: string,
    columns: { id: string; order: number }[]
  ): Promise<ApiResponse<void>> {
    try {
      const response = await this.apiClient.request(`/api/boards/${boardId}/columns/reorder`, {
        method: 'PATCH',
        body: JSON.stringify({ columns })
      });

      return response;
    } catch (error) {
      console.error('Ошибка обновления позиций колонок:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }

  /**
   * Обновление позиций задач в колонке
   */
  async updateTaskPositions(
    columnId: string,
    taskPositions: { taskId: string; position: number }[]
  ): Promise<ApiResponse<void>> {
    try {
      const response = await this.apiClient.request(`/api/columns/${columnId}/tasks/reorder`, {
        method: 'PATCH',
        body: JSON.stringify({ taskPositions })
      });

      return response;
    } catch (error) {
      console.error('Ошибка обновления позиций задач:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }

  /**
   * Обновление задачи
   */
  async updateTask(taskId: string, updates: any): Promise<ApiResponse<any>> {
    try {
      const response = await this.apiClient.request(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });

      return response;
    } catch (error) {
      console.error('Ошибка обновления задачи:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }

  /**
   * Удаление задачи
   */
  async deleteTask(taskId: string): Promise<ApiResponse<void>> {
    try {
      const response = await this.apiClient.request(`/api/tasks/${taskId}`, {
        method: 'DELETE'
      });

      return response;
    } catch (error) {
      console.error('Ошибка удаления задачи:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }

  /**
   * Получение детальной информации о задаче
   */
  async getTask(taskId: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.apiClient.request(`/api/tasks/${taskId}`, {
        method: 'GET'
      });

      return response;
    } catch (error) {
      console.error('Ошибка получения задачи:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }

  /**
   * Получение комментариев задачи
   */
  async getTaskComments(taskId: string): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.apiClient.request(`/api/tasks/${taskId}/comments`, {
        method: 'GET'
      });

      return response;
    } catch (error) {
      console.error('Ошибка получения комментариев:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }

  /**
   * Создание комментария к задаче
   */
  async createTaskComment(taskId: string, data: {
    content: string;
    parentId?: string;
  }): Promise<ApiResponse<any>> {
    try {
      const response = await this.apiClient.request(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        body: JSON.stringify(data)
      });

      return response;
    } catch (error) {
      console.error('Ошибка создания комментария:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }

  /**
   * Создание доски в проекте
   */
  async createBoard(projectId: string, data: CreateBoardData): Promise<ApiResponse<Board>> {
    try {
      const response = await this.apiClient.request(`/api/projects/${projectId}/boards`, {
        method: 'POST',
        body: JSON.stringify(data)
      });

      return response;
    } catch (error) {
      console.error('Ошибка создания доски:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }

  /**
   * Обновление доски
   */
  async updateBoard(boardId: string, data: Partial<CreateBoardData>): Promise<ApiResponse<Board>> {
    try {
      const response = await this.apiClient.request(`/api/boards/${boardId}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });

      return response;
    } catch (error) {
      console.error('Ошибка обновления доски:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }

  /**
   * Удаление доски
   */
  async deleteBoard(boardId: string): Promise<ApiResponse<void>> {
    try {
      const response = await this.apiClient.request(`/api/boards/${boardId}`, {
        method: 'DELETE'
      });

      return response;
    } catch (error) {
      console.error('Ошибка удаления доски:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }

  /**
   * Валидация данных проекта
   */
  validateProjectData(data: CreateProjectData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.name || data.name.trim().length === 0) {
      errors.push('Название проекта обязательно');
    }

    if (data.name && data.name.length > 100) {
      errors.push('Название проекта слишком длинное (максимум 100 символов)');
    }

    if (data.description && data.description.length > 500) {
      errors.push('Описание проекта слишком длинное (максимум 500 символов)');
    }

    if (data.color && !/^#[0-9A-F]{6}$/i.test(data.color)) {
      errors.push('Неверный формат цвета');
    }

    if (data.members) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      data.members.forEach(email => {
        if (!emailRegex.test(email)) {
          errors.push(`Неверный формат email: ${email}`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Валидация данных доски
   */
  validateBoardData(data: CreateBoardData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.name || data.name.trim().length === 0) {
      errors.push('Название доски обязательно');
    }

    if (data.name && data.name.length > 100) {
      errors.push('Название доски слишком длинное (максимум 100 символов)');
    }

    if (data.description && data.description.length > 500) {
      errors.push('Описание доски слишком длинное (максимум 500 символов)');
    }

    if (data.color && !/^#[0-9A-F]{6}$/i.test(data.color)) {
      errors.push('Неверный формат цвета');
    }

    if (data.columns) {
      data.columns.forEach((column, index) => {
        if (!column.name || column.name.trim().length === 0) {
          errors.push(`Название колонки ${index + 1} обязательно`);
        }
        if (!column.status || column.status.trim().length === 0) {
          errors.push(`Статус колонки ${index + 1} обязателен`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Генерация уникального имени проекта
   */
  generateProjectName(): string {
    const adjectives = ['Новый', 'Важный', 'Срочный', 'Основной', 'Главный', 'Активный', 'Приоритетный'];
    const nouns = ['Проект', 'План', 'Задача', 'Цель', 'Инициатива', 'Программа', 'Разработка'];
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const number = Math.floor(Math.random() * 1000) + 1;
    return `${adjective} ${noun} ${number}`;
  }

  /**
   * Генерация цвета по умолчанию
   */
  getDefaultColors(): string[] {
    return [
      '#3B82F6', // Blue
      '#10B981', // Green
      '#F59E0B', // Yellow
      '#EF4444', // Red
      '#8B5CF6', // Purple
      '#06B6D4', // Cyan
      '#84CC16', // Lime
      '#F97316', // Orange
      '#EC4899', // Pink
      '#6B7280'  // Gray
    ];
  }

  /**
   * Получение колонок по умолчанию
   */
  getDefaultColumns(): { name: string; status: string; order: number }[] {
    return [
      { name: 'К выполнению', status: 'TODO', order: 0 },
      { name: 'В работе', status: 'IN_PROGRESS', order: 1 },
      { name: 'На проверке', status: 'REVIEW', order: 2 },
      { name: 'Выполнено', status: 'DONE', order: 3 }
    ];
  }
}

// Экспорт экземпляра сервиса для использования в компонентах
export const createProjectService = (apiClient: ApiClient) => new ProjectService(apiClient);