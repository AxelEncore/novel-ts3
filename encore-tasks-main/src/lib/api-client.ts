import { ApiResponse, ErrorHandler, NotificationHandler } from './error-handling';
import { validateData, ValidationResult } from './validation';
import { z } from 'zod';

// API client configuration
interface ApiClientConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  retryDelay: number;
}

const defaultConfig: ApiClientConfig = {
  baseUrl: '/api',
  timeout: 30000,
  retries: 3,
  retryDelay: 1000
};

// Request options
interface RequestOptions {
  method$1: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers$1: Record<string, string>;
  body$2: any;
  timeout$3: number;
  retries$4: number;
  validateResponse$5: z.ZodSchema;
  showLoading$6: boolean;
  showSuccess$7: boolean;
  successMessage$8: string;
  errorContext$9: string;
}

// Pagination parameters
export interface PaginationParams {
  page$10: number;
  limit$11: number;
  sort_by$12: string;
  sort_order$13: 'asc' | 'desc';
}

// Search parameters
export interface SearchParams extends PaginationParams {
  search$1: string;
}

// Filter parameters for different entities
export interface ProjectFilters extends SearchParams {
  archived$2: boolean;
  member_id$3: string;
}

export interface BoardFilters extends SearchParams {
  project_id$4: string;
  visibility$5: 'public' | 'private';
}

export interface TaskFilters extends SearchParams {
  project_id$1: string;
  board_id$2: string;
  column_id$3: string;
  assignee_id$4: string;
  priority$5: 'low' | 'medium' | 'high' | 'urgent';
  status$1: 'todo' | 'in_progress' | 'review' | 'done';
  due_date_from$1: string;
  due_date_to$2: string;
  tags$3: string[];
}

// API client class
export class ApiClient {
  private config: ApiClientConfig;
  private abortControllers: Map<string, AbortController> = new Map();

  constructor(config: Partial<ApiClientConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  // Create abort controller for request
  private createAbortController(key: string): AbortController {
    // Cancel previous request with same key
    const existingController = this.abortControllers.get(key);
    if (existingController) {
      existingController.abort();
    }

    const controller = new AbortController();
    this.abortControllers.set(key, controller);
    return controller;
  }

  // Remove abort controller
  private removeAbortController(key: string): void {
    this.abortControllers.delete(key);
  }

  // Build URL with query parameters
  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    const url = new URL(endpoint, window.location.origin + this.config.baseUrl);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(v => url.searchParams.append(key, String(v)));
          } else {
            url.searchParams.append(key, String(value));
          }
        }
      });
    }

    return url.toString();
  }

  // Make HTTP request
  private async makeRequest<T>(
    endpoint: string,
    options: RequestOptions = {},
    params?: Record<string, any>
  ): Promise<T> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = this.config.timeout,
      retries = this.config.retries,
      validateResponse,
      showLoading = false,
      showSuccess = false,
      successMessage,
      errorContext
    } = options;

    const requestKey = `${method}:${endpoint}`;
    const controller = this.createAbortController(requestKey);
    
    let loadingId: string | number | undefined;
    
    try {
      if (showLoading) {
        loadingId = NotificationHandler.loading('Загрузка...');
      }

      const url = this.buildUrl(endpoint, params);
      
      const requestOptions: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        signal: controller.signal
      };

      if (body && method !== 'GET') {
        requestOptions.body = JSON.stringify(body);
      }

      // Set timeout
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, timeout);

      let lastError: Error;
      
      // Retry logic
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const response = await fetch(url, requestOptions);
          clearTimeout(timeoutId);

          if (!response.ok) {
            const error = await ErrorHandler.handleFetchError(response);
            throw new Error(error.message);
          }

          const data = await response.json();
          
          // Validate response if schema provided
          if (validateResponse) {
            const validation = validateData(validateResponse, data);
            if (!validation.success) {
              throw new Error('Некорректный ответ сервера');
            }
            
            if (loadingId) {
              NotificationHandler.dismiss(loadingId);
            }
            
            if (showSuccess && successMessage) {
              NotificationHandler.success(successMessage);
            }
            
            this.removeAbortController(requestKey);
            return validation.data as T;
          }
          
          if (loadingId) {
            NotificationHandler.dismiss(loadingId);
          }
          
          if (showSuccess && successMessage) {
            NotificationHandler.success(successMessage);
          }
          
          this.removeAbortController(requestKey);
          return data;
        } catch (error) {
          lastError = error as Error;
          
          if (attempt === retries || controller.signal.aborted) {
            break;
          }
          
          // Wait before retry
          await new Promise(resolve => 
            setTimeout(resolve, this.config.retryDelay * attempt)
          );
        }
      }
      
      throw lastError!;
    } catch (error) {
      if (loadingId) {
        NotificationHandler.dismiss(loadingId);
      }
      
      this.removeAbortController(requestKey);
      
      if (controller.signal.aborted) {
        throw new Error('Запрос был отменен');
      }
      
      ErrorHandler.logError(error, errorContext || `${method} ${endpoint}`);
      throw error;
    }
  }

  // GET request
  async get<T>(
    endpoint: string,
    params?: Record<string, any>,
    options: Omit<RequestOptions, 'method' | 'body'> = {}
  ): Promise<T> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'GET' }, params);
  }

  // POST request
  async post<T>(
    endpoint: string,
    body$2: any,
    options: Omit<RequestOptions, 'method'> = {}
  ): Promise<T> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'POST', body });
  }

  // PUT request
  async put<T>(
    endpoint: string,
    body$3: any,
    options: Omit<RequestOptions, 'method'> = {}
  ): Promise<T> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'PUT', body });
  }

  // PATCH request
  async patch<T>(
    endpoint: string,
    body$4: any,
    options: Omit<RequestOptions, 'method'> = {}
  ): Promise<T> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'PATCH', body });
  }

  // DELETE request
  async delete<T>(
    endpoint: string,
    options: Omit<RequestOptions, 'method' | 'body'> = {}
  ): Promise<T> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'DELETE' });
  }

  // Cancel all pending requests
  cancelAllRequests(): void {
    this.abortControllers.forEach(controller => {
      controller.abort();
    });
    this.abortControllers.clear();
  }

  // Cancel specific request
  cancelRequest(key: string): void {
    const controller = this.abortControllers.get(key);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(key);
    }
  }
}

// Create default API client instance
export const apiClient = new ApiClient();

// API service classes
export class ProjectsApi {
  private client: ApiClient;

  constructor(client: ApiClient = apiClient) {
    this.client = client;
  }

  async getProjects(filters: ProjectFilters = {}) {
    return this.client.get('/projects', filters, {
      errorContext: 'Загрузка проектов'
    });
  }

  async getProject(id: string) {
    return this.client.get(`/projects/${id}`, undefined, {
      errorContext: 'Загрузка проекта'
    });
  }

  async createProject(data: any) {
    return this.client.post('/projects', data, {
      showLoading: true,
      showSuccess: true,
      successMessage: 'Проект создан успешно',
      errorContext: 'Создание проекта'
    });
  }

  async updateProject(id: string, data: any) {
    return this.client.put(`/projects/${id}`, data, {
      showLoading: true,
      showSuccess: true,
      successMessage: 'Проект обновлен успешно',
      errorContext: 'Обновление проекта'
    });
  }

  async deleteProject(id: string) {
    return this.client.delete(`/projects/${id}`, {
      showLoading: true,
      showSuccess: true,
      successMessage: 'Проект удален успешно',
      errorContext: 'Удаление проекта'
    });
  }

  async archiveProject(id: string) {
    return this.client.patch(`/projects/${id}/archive`, undefined, {
      showLoading: true,
      showSuccess: true,
      successMessage: 'Проект архивирован',
      errorContext: 'Архивирование проекта'
    });
  }

  async restoreProject(id: string) {
    return this.client.patch(`/projects/${id}/restore`, undefined, {
      showLoading: true,
      showSuccess: true,
      successMessage: 'Проект восстановлен',
      errorContext: 'Восстановление проекта'
    });
  }
}

export class BoardsApi {
  private client: ApiClient;

  constructor(client: ApiClient = apiClient) {
    this.client = client;
  }

  async getBoards(filters: BoardFilters = {}) {
    return this.client.get('/boards', filters, {
      errorContext: 'Загрузка досок'
    });
  }

  async getBoard(id: string) {
    return this.client.get(`/boards/${id}`, undefined, {
      errorContext: 'Загрузка доски'
    });
  }

  async createBoard(data: any) {
    return this.client.post('/boards', data, {
      showLoading: true,
      showSuccess: true,
      successMessage: 'Доска создана успешно',
      errorContext: 'Создание доски'
    });
  }

  async updateBoard(id: string, data: any) {
    return this.client.put(`/boards/${id}`, data, {
      showLoading: true,
      showSuccess: true,
      successMessage: 'Доска обновлена успешно',
      errorContext: 'Обновление доски'
    });
  }

  async deleteBoard(id: string) {
    return this.client.delete(`/boards/${id}`, {
      showLoading: true,
      showSuccess: true,
      successMessage: 'Доска удалена успешно',
      errorContext: 'Удаление доски'
    });
  }
}

export class TasksApi {
  private client: ApiClient;

  constructor(client: ApiClient = apiClient) {
    this.client = client;
  }

  async getTasks(filters: TaskFilters = {}) {
    return this.client.get('/tasks', filters, {
      errorContext: 'Загрузка задач'
    });
  }

  async getTask(id: string) {
    return this.client.get(`/tasks/${id}`, undefined, {
      errorContext: 'Загрузка задачи'
    });
  }

  async createTask(data: any) {
    return this.client.post('/tasks', data, {
      showLoading: true,
      showSuccess: true,
      successMessage: 'Задача создана успешно',
      errorContext: 'Создание задачи'
    });
  }

  async updateTask(id: string, data: any) {
    return this.client.put(`/tasks/${id}`, data, {
      showLoading: true,
      showSuccess: true,
      successMessage: 'Задача обновлена успешно',
      errorContext: 'Обновление задачи'
    });
  }

  async deleteTask(id: string) {
    return this.client.delete(`/tasks/${id}`, {
      showLoading: true,
      showSuccess: true,
      successMessage: 'Задача удалена успешно',
      errorContext: 'Удаление задачи'
    });
  }
}

export class ColumnsApi {
  private client: ApiClient;

  constructor(client: ApiClient = apiClient) {
    this.client = client;
  }

  async getColumns(boardId$1: string) {
    const params = boardId $2 { board_id: boardId } : {};
    return this.client.get('/columns', params, {
      errorContext: 'Загрузка колонок'
    });
  }

  async getColumn(id: string) {
    return this.client.get(`/columns/${id}`, undefined, {
      errorContext: 'Загрузка колонки'
    });
  }

  async createColumn(data: any) {
    return this.client.post('/columns', data, {
      showLoading: true,
      showSuccess: true,
      successMessage: 'Колонка создана успешно',
      errorContext: 'Создание колонки'
    });
  }

  async updateColumn(id: string, data: any) {
    return this.client.put(`/columns/${id}`, data, {
      showLoading: true,
      showSuccess: true,
      successMessage: 'Колонка обновлена успешно',
      errorContext: 'Обновление колонки'
    });
  }

  async deleteColumn(id: string) {
    return this.client.delete(`/columns/${id}`, {
      showLoading: true,
      showSuccess: true,
      successMessage: 'Колонка удалена успешно',
      errorContext: 'Удаление колонки'
    });
  }
}

export class UsersApi {
  private client: ApiClient;

  constructor(client: ApiClient = apiClient) {
    this.client = client;
  }

  async getUsers(projectId$1: string) {
    const params = projectId $2 { project_id: projectId } : {};
    return this.client.get('/users', params, {
      errorContext: 'Загрузка пользователей'
    });
  }

  async getUser(id: string) {
    return this.client.get(`/users/${id}`, undefined, {
      errorContext: 'Загрузка пользователя'
    });
  }

  async updateUser(id: string, data: any) {
    return this.client.put(`/users/${id}`, data, {
      showLoading: true,
      showSuccess: true,
      successMessage: 'Профиль обновлен успешно',
      errorContext: 'Обновление профиля'
    });
  }
}

// Create API service instances
export const projectsApi = new ProjectsApi();
export const boardsApi = new BoardsApi();
export const tasksApi = new TasksApi();
export const columnsApi = new ColumnsApi();
export const usersApi = new UsersApi();

// Export default API client
export default apiClient;