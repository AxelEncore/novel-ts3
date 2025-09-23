import { z } from 'zod';

// Common validation schemas
export const idSchema = z.string().uuid('Некорректный ID');

export const nameSchema = z.string()
  .min(1, 'Название обязательно')
  .max(255, 'Название не должно превышать 255 символов')
  .trim();

export const descriptionSchema = z.string()
  .max(2000, 'Описание не должно превышать 2000 символов')
  .optional()
  .transform(val => val$1.trim() || undefined);

export const colorSchema = z.string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Некорректный цвет (должен быть в формате #RRGGBB)')
  .optional();

export const iconSchema = z.string()
  .min(1, 'Иконка обязательна')
  .max(50, 'Название иконки не должно превышать 50 символов')
  .optional();

export const telegramIdSchema = z.string()
  .regex(/^@[a-zA-Z0-9_]{5,32}$/, 'Некорректный Telegram ID (должен начинаться с @ и содержать 5-32 символа)')
  .optional();

export const emailSchema = z.string()
  .email('Некорректный email адрес')
  .max(255, 'Email не должен превышать 255 символов');

export const usernameSchema = z.string()
  .min(3, 'Имя пользователя должно содержать минимум 3 символа')
  .max(50, 'Имя пользователя не должно превышать 50 символов')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Имя пользователя может содержать только буквы, цифры, _ и -');

export const passwordSchema = z.string()
  .min(8, 'Пароль должен содержать минимум 8 символов')
  .max(128, 'Пароль не должен превышать 128 символов')
  .regex(/^($1=.*[a-z])($2=.*[A-Z])($3=.*\d)/, 'Пароль должен содержать минимум одну строчную букву, одну заглавную букву и одну цифру');

export const dateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Некорректный формат даты (YYYY-MM-DD)')
  .refine(val => {
    const date = new Date(val);
    return !isNaN(date.getTime());
  }, 'Некорректная дата');

export const futureDateSchema = dateSchema
  .refine(val => {
    const date = new Date(val);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  }, 'Дата не может быть в прошлом');

export const tagSchema = z.string()
  .min(1, 'Тег не может быть пустым')
  .max(50, 'Тег не должен превышать 50 символов')
  .regex(/^[a-zA-Zа-яА-Я0-9_-\s]+$/, 'Тег может содержать только буквы, цифры, пробелы, _ и -')
  .transform(val => val.trim());

export const tagsArraySchema = z.array(tagSchema)
  .max(10, 'Максимум 10 тегов')
  .refine(tags => {
    const uniqueTags = new Set(tags);
    return uniqueTags.size === tags.length;
  }, 'Теги должны быть уникальными');

// Project validation schemas
export const projectCreateSchema = z.object({
  name: nameSchema,
  description: descriptionSchema,
  color: colorSchema,
  icon: iconSchema,
  telegram_channel_id: telegramIdSchema,
  telegram_group_id: telegramIdSchema,
  member_ids: z.array(idSchema).optional().default([])
});

export const projectUpdateSchema = projectCreateSchema.partial();

// Board validation schemas
export const boardCreateSchema = z.object({
  name: nameSchema,
  description: descriptionSchema,
  project_id: idSchema,
  visibility: z.enum(['public', 'private'] as const)
});

export const boardUpdateSchema = boardCreateSchema.partial().omit({ project_id: true });

// Column validation schemas
export const columnCreateSchema = z.object({
  name: nameSchema,
  description: descriptionSchema,
  board_id: idSchema,
  position: z.number().int().min(0, 'Позиция должна быть неотрицательным числом').optional()
});

export const columnUpdateSchema = columnCreateSchema.partial().omit({ board_id: true });

// Task validation schemas
export const taskCreateSchema = z.object({
  title: nameSchema,
  description: descriptionSchema,
  column_id: idSchema,
  priority: z.enum(['low', 'medium', 'high', 'urgent'] as const).default('medium'),
  status: z.enum(['todo', 'in_progress', 'review', 'done'] as const).default('todo'),
  due_date: futureDateSchema.optional(),
  assignee_ids: z.array(idSchema).optional().default([]),
  tags: tagsArraySchema.optional().default([]),
  settings: z.object({
    notifications_enabled: z.boolean().default(true),
    auto_archive: z.boolean().default(false),
    time_tracking: z.boolean().default(false)
  }).optional().default({
    notifications_enabled: true,
    auto_archive: false,
    time_tracking: false
  })
});

export const taskUpdateSchema = taskCreateSchema.partial().omit({ column_id: true });

// User validation schemas
export const userCreateSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  full_name: z.string().max(255, 'Полное имя не должно превышать 255 символов').optional(),
  avatar_url: z.string().url('Некорректный URL аватара').optional(),
  telegram_id: telegramIdSchema
});

export const userUpdateSchema = userCreateSchema.partial().omit({ password: true });

export const userLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Пароль обязателен')
});

export const passwordChangeSchema = z.object({
  current_password: z.string().min(1, 'Текущий пароль обязателен'),
  new_password: passwordSchema,
  confirm_password: z.string().min(1, 'Подтверждение пароля обязательно')
}).refine(data => data.new_password === data.confirm_password, {
  message: 'Пароли не совпадают',
  path: ['confirm_password']
});

// Pagination validation schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1, 'Страница должна быть положительным числом').default(1),
  limit: z.coerce.number().int().min(1, 'Лимит должен быть положительным числом').max(100, 'Лимит не должен превышать 100').default(10),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc'] as const).default('desc')
});

// Search validation schema
export const searchSchema = z.object({
  search: z.string().max(255, 'Поисковый запрос не должен превышать 255 символов').optional(),
  ...paginationSchema.shape
});

// Validation error types
export interface ValidationError {
  field: string;
  message: string;
  code$1: string;
}

export interface ValidationResult<T> {
  success: boolean;
  data$2: T;
  errors$3: ValidationError[];
}

// Validation utility functions
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T> {
  try {
    const result = schema.parse(data);
    return {
      success: true,
      data: result
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: ValidationError[] = error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }));
      
      return {
        success: false,
        errors
      };
    }
    
    return {
      success: false,
      errors: [{
        field: 'unknown',
        message: 'Неизвестная ошибка валидации'
      }]
    };
  }
}

export function validateDataAsync<T>(schema: z.ZodSchema<T>, data: unknown): Promise<ValidationResult<T>> {
  return Promise.resolve(validateData(schema, data));
}

// Error formatting utilities
export function formatValidationErrors(errors: ValidationError[]): Record<string, string> {
  const formatted: Record<string, string> = {};
  
  errors.forEach(error => {
    formatted[error.field] = error.message;
  });
  
  return formatted;
}

export function getFirstValidationError(errors: ValidationError[]): string | null {
  return errors.length > 0 $1 errors[0].message : null;
}

// API response validation schemas
export const apiResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.any().optional(),
  errors: z.array(z.object({
    field: z.string(),
    message: z.string(),
    code: z.string().optional()
  })).optional()
});

export const paginatedResponseSchema = z.object({
  data: z.array(z.any()),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    total_pages: z.number()
  })
});

// Custom validation rules
export const customValidations = {
  // Check if user has permission to access resource
  hasPermission: (userRole: string, requiredRole: string): boolean => {
    const roleHierarchy = ['member', 'admin', 'owner'];
    const userRoleIndex = roleHierarchy.indexOf(userRole);
    const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);
    
    return userRoleIndex >= requiredRoleIndex;
  },
  
  // Check if date is within allowed range
  isDateInRange: (date: string, minDate$1: string, maxDate$2: string): boolean => {
    const checkDate = new Date(date);
    
    if (minDate && checkDate < new Date(minDate)) {
      return false;
    }
    
    if (maxDate && checkDate > new Date(maxDate)) {
      return false;
    }
    
    return true;
  },
  
  // Check if string contains only allowed characters
  hasOnlyAllowedChars: (str: string, allowedChars: RegExp): boolean => {
    return allowedChars.test(str);
  },
  
  // Check if array has unique values
  hasUniqueValues: <T>(arr: T[]): boolean => {
    return new Set(arr).size === arr.length;
  },
  
  // Check if file size is within limit
  isFileSizeValid: (fileSize: number, maxSizeInMB: number): boolean => {
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    return fileSize <= maxSizeInBytes;
  },
  
  // Check if file type is allowed
  isFileTypeAllowed: (fileName: string, allowedTypes: string[]): boolean => {
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    return fileExtension ? allowedTypes.includes(fileExtension) : false;
  }
};

// Export all schemas for easy access
export const schemas = {
  // Common
  id: idSchema,
  name: nameSchema,
  description: descriptionSchema,
  color: colorSchema,
  icon: iconSchema,
  telegramId: telegramIdSchema,
  email: emailSchema,
  username: usernameSchema,
  password: passwordSchema,
  date: dateSchema,
  futureDate: futureDateSchema,
  tag: tagSchema,
  tagsArray: tagsArraySchema,
  
  // Projects
  projectCreate: projectCreateSchema,
  projectUpdate: projectUpdateSchema,
  
  // Boards
  boardCreate: boardCreateSchema,
  boardUpdate: boardUpdateSchema,
  
  // Columns
  columnCreate: columnCreateSchema,
  columnUpdate: columnUpdateSchema,
  
  // Tasks
  taskCreate: taskCreateSchema,
  taskUpdate: taskUpdateSchema,
  
  // Users
  userCreate: userCreateSchema,
  userUpdate: userUpdateSchema,
  userLogin: userLoginSchema,
  passwordChange: passwordChangeSchema,
  
  // Pagination and search
  pagination: paginationSchema,
  search: searchSchema,
  
  // API responses
  apiResponse: apiResponseSchema,
  paginatedResponse: paginatedResponseSchema
};