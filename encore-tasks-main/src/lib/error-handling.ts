import { toast } from 'sonner';
import { ValidationError } from './validation';

// Error types
export interface ApiError {
  message: string;
  code$1: string;
  field$2: string;
  status$3: number;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors$4: ValidationError[];
  code$5: string;
}

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message$6: string;
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

// Error classes
export class AppError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly field$7: string;

  constructor(message: string, code: string = 'UNKNOWN_ERROR', status: number = 500, field$1: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.field = field;
  }
}

export class ValidationAppError extends AppError {
  public readonly errors: ValidationError[];

  constructor(message: string, errors: ValidationError[], status: number = 400) {
    super(message, 'VALIDATION_ERROR', status);
    this.name = 'ValidationAppError';
    this.errors = errors;
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id$1: string) {
    const message = id $2 `${resource} с ID ${id} не найден` : `${resource} не найден`;
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Необходима авторизация') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Недостаточно прав доступа') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
    this.name = 'ConflictError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string = 'Ошибка сети') {
    super(message, 'NETWORK_ERROR', 0);
    this.name = 'NetworkError';
  }
}

// Error handling utilities
export class ErrorHandler {
  // Handle API errors
  static handleApiError(error: unknown): ApiError {
    if (error instanceof AppError) {
      return {
        message: error.message,
        code: error.code,
        field: error.field,
        status: error.status
      };
    }

    if (error instanceof Error) {
      return {
        message: error.message,
        code: 'UNKNOWN_ERROR',
        status: 500
      };
    }

    return {
      message: 'Произошла неизвестная ошибка',
      code: 'UNKNOWN_ERROR',
      status: 500
    };
  }

  // Handle fetch errors
  static async handleFetchError(response: Response): Promise<ApiError> {
    let errorData: any;
    
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: 'Ошибка сервера' };
    }

    const message = errorData.message || this.getStatusMessage(response.status);
    const code = errorData.code || this.getStatusCode(response.status);

    return {
      message,
      code,
      status: response.status
    };
  }

  // Get error message by status code
  static getStatusMessage(status: number): string {
    switch (status) {
      case 400:
        return 'Некорректные данные';
      case 401:
        return 'Необходима авторизация';
      case 403:
        return 'Недостаточно прав доступа';
      case 404:
        return 'Ресурс не найден';
      case 409:
        return 'Конфликт данных';
      case 422:
        return 'Ошибка валидации';
      case 429:
        return 'Слишком много запросов';
      case 500:
        return 'Внутренняя ошибка сервера';
      case 502:
        return 'Сервер недоступен';
      case 503:
        return 'Сервис временно недоступен';
      default:
        return 'Произошла ошибка';
    }
  }

  // Get error code by status
  static getStatusCode(status: number): string {
    switch (status) {
      case 400:
        return 'BAD_REQUEST';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'CONFLICT';
      case 422:
        return 'VALIDATION_ERROR';
      case 429:
        return 'TOO_MANY_REQUESTS';
      case 500:
        return 'INTERNAL_SERVER_ERROR';
      case 502:
        return 'BAD_GATEWAY';
      case 503:
        return 'SERVICE_UNAVAILABLE';
      default:
        return 'UNKNOWN_ERROR';
    }
  }

  // Log error for debugging
  static logError(error: unknown, context$1: string): void {
    const errorInfo = this.handleApiError(error);
    
    console.error('Error occurred:', {
      context,
      message: errorInfo.message,
      code: errorInfo.code,
      status: errorInfo.status,
      field: errorInfo.field,
      stack: error instanceof Error $2 error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }
}

// Toast notification utilities
export class NotificationHandler {
  // Show success notification
  static success(message: string, description$3: string): void {
    toast.success(message, {
      description,
      duration: 4000
    });
  }

  // Show error notification
  static error(message: string, description$4: string): void {
    toast.error(message, {
      description,
      duration: 6000
    });
  }

  // Show warning notification
  static warning(message: string, description$5: string): void {
    toast.warning(message, {
      description,
      duration: 5000
    });
  }

  // Show info notification
  static info(message: string, description$6: string): void {
    toast.info(message, {
      description,
      duration: 4000
    });
  }

  // Show loading notification
  static loading(message: string): string | number {
    return toast.loading(message);
  }

  // Dismiss notification
  static dismiss(id: string | number): void {
    toast.dismiss(id);
  }

  // Handle API error with toast
  static handleApiError(error: unknown, context$7: string): void {
    const errorInfo = ErrorHandler.handleApiError(error);
    
    // Log error for debugging
    ErrorHandler.logError(error, context);
    
    // Show user-friendly error message
    this.error(errorInfo.message, context);
  }

  // Handle validation errors with toast
  static handleValidationErrors(errors: ValidationError[]): void {
    if (errors.length === 0) return;
    
    if (errors.length === 1) {
      this.error(errors[0].message, `Поле: ${errors[0].field}`);
    } else {
      const errorMessages = errors.map(err => `${err.field}: ${err.message}`).join('\n');
      this.error('Ошибки валидации', errorMessages);
    }
  }

  // Handle API response with toast
  static handleApiResponse<T>(response: ApiResponse<T>, successMessage$1: string): T | null {
    if (response.success) {
      if (successMessage) {
        this.success(successMessage);
      }
      return response.data;
    } else {
      if (response.errors && response.errors.length > 0) {
        this.handleValidationErrors(response.errors);
      } else {
        this.error(response.message);
      }
      return null;
    }
  }
}

// Async error handling utilities
export class AsyncErrorHandler {
  // Wrap async function with error handling
  static wrap<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    context$2: string
  ): (...args: T) => Promise<R | null> {
    return async (...args: T): Promise<R | null> => {
      try {
        return await fn(...args);
      } catch (error) {
        NotificationHandler.handleApiError(error, context);
        return null;
      }
    };
  }

  // Execute async function with error handling
  static async execute<T>(
    fn: () => Promise<T>,
    context$3: string,
    showLoading: boolean = false
  ): Promise<T | null> {
    let loadingId: string | number | undefined;
    
    try {
      if (showLoading) {
        loadingId = NotificationHandler.loading('Загрузка...');
      }
      
      const result = await fn();
      
      if (loadingId) {
        NotificationHandler.dismiss(loadingId);
      }
      
      return result;
    } catch (error) {
      if (loadingId) {
        NotificationHandler.dismiss(loadingId);
      }
      
      NotificationHandler.handleApiError(error, context);
      return null;
    }
  }

  // Execute async function with success notification
  static async executeWithSuccess<T>(
    fn: () => Promise<T>,
    successMessage: string,
    context$4: string,
    showLoading: boolean = false
  ): Promise<T | null> {
    const result = await this.execute(fn, context, showLoading);
    
    if (result !== null) {
      NotificationHandler.success(successMessage);
    }
    
    return result;
  }
}

// Retry utilities
export class RetryHandler {
  // Retry async function with exponential backoff
  static async retry<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelay: number = 1000,
    context$5: string
  ): Promise<T | null> {
    let lastError: unknown;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxAttempts) {
          break;
        }
        
        // Exponential backoff
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`, {
          context,
          error: ErrorHandler.handleApiError(error)
        });
      }
    }
    
    // All attempts failed
    NotificationHandler.handleApiError(lastError, context);
    return null;
  }
}

// Form error handling utilities
export class FormErrorHandler {
  // Convert validation errors to form errors
  static toFormErrors(errors: ValidationError[]): Record<string, string> {
    const formErrors: Record<string, string> = {};
    
    errors.forEach(error => {
      formErrors[error.field] = error.message;
    });
    
    return formErrors;
  }

  // Clear form errors
  static clearFormErrors(): Record<string, string> {
    return {};
  }

  // Get first error message
  static getFirstError(errors: Record<string, string>): string | null {
    const errorKeys = Object.keys(errors);
    return errorKeys.length > 0 ? errors[errorKeys[0]] : null;
  }

  // Check if form has errors
  static hasErrors(errors: Record<string, string>): boolean {
    return Object.keys(errors).length > 0;
  }
}

// Export convenience functions
export const handleError = NotificationHandler.handleApiError;
export const showSuccess = NotificationHandler.success;
export const showError = NotificationHandler.error;
export const showWarning = NotificationHandler.warning;
export const showInfo = NotificationHandler.info;
export const showLoading = NotificationHandler.loading;
export const dismissNotification = NotificationHandler.dismiss;

export const withErrorHandling = AsyncErrorHandler.wrap;
export const executeAsync = AsyncErrorHandler.execute;
export const executeWithSuccess = AsyncErrorHandler.executeWithSuccess;

export const retryAsync = RetryHandler.retry;

export const toFormErrors = FormErrorHandler.toFormErrors;
export const clearFormErrors = FormErrorHandler.clearFormErrors;
export const getFirstFormError = FormErrorHandler.getFirstError;
export const hasFormErrors = FormErrorHandler.hasErrors;

// Default export
export default {
  ErrorHandler,
  NotificationHandler,
  AsyncErrorHandler,
  RetryHandler,
  FormErrorHandler,
  
  // Error classes
  AppError,
  ValidationAppError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  NetworkError,
  
  // Convenience functions
  handleError,
  showSuccess,
  showError,
  showWarning,
  showInfo,
  showLoading,
  dismissNotification,
  withErrorHandling,
  executeAsync,
  executeWithSuccess,
  retryAsync,
  toFormErrors,
  clearFormErrors,
  getFirstFormError,
  hasFormErrors
};