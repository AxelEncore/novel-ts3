// Unified Validators for Refactored Architecture
// These validators provide consistent validation across all entities

import {
  ValidationResult,
  ValidationError
} from '../../data/types';
import {
  IProjectValidator,
  IBoardValidator,
  ITaskValidator,
  IUserValidator
} from '../interfaces';

// Base Validator Class
abstract class BaseValidator {
  protected createValidationResult(errors: ValidationError[] = []): ValidationResult {
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  protected addError(errors: ValidationError[], field: string, message: string, code: string): void {
    errors.push({ field, message, code });
  }

  protected validateRequired(value: unknown, field: string, errors: ValidationError[]): void {
    if (value === undefined || value === null || value === '') {
      this.addError(errors, field, `${field} is required`, 'REQUIRED');
    }
  }

  protected validateString(value: unknown, field: string, minLength = 0, maxLength = Infinity, errors: ValidationError[]): void {
    if (typeof value !== 'string') {
      this.addError(errors, field, `${field} must be a string`, 'INVALID_TYPE');
      return;
    }

    if (value.length < minLength) {
      this.addError(errors, field, `${field} must be at least ${minLength} characters long`, 'MIN_LENGTH');
    }

    if (value.length > maxLength) {
      this.addError(errors, field, `${field} must be no more than ${maxLength} characters long`, 'MAX_LENGTH');
    }
  }

  protected validateEmail(email: string, field: string, errors: ValidationError[]): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.addError(errors, field, 'Invalid email format', 'INVALID_EMAIL');
    }
  }

  protected validateUrl(url: string, field: string, errors: ValidationError[]): void {
    try {
      new URL(url);
    } catch {
      this.addError(errors, field, 'Invalid URL format', 'INVALID_URL');
    }
  }

  protected validateDate(date: unknown, field: string, errors: ValidationError[]): void {
    if (!(date instanceof Date) && typeof date !== 'string') {
      this.addError(errors, field, `${field} must be a valid date`, 'INVALID_DATE');
      return;
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      this.addError(errors, field, `${field} must be a valid date`, 'INVALID_DATE');
    }
  }

  protected validateNumber(value: unknown, field: string, min = -Infinity, max = Infinity, errors: ValidationError[]): void {
    if (typeof value !== 'number' || isNaN(value)) {
      this.addError(errors, field, `${field} must be a valid number`, 'INVALID_NUMBER');
      return;
    }

    if (value < min) {
      this.addError(errors, field, `${field} must be at least ${min}`, 'MIN_VALUE');
    }

    if (value > max) {
      this.addError(errors, field, `${field} must be no more than ${max}`, 'MAX_VALUE');
    }
  }

  protected validateEnum<T>(value: unknown, field: string, allowedValues: T[], errors: ValidationError[]): void {
    if (!allowedValues.includes(value as T)) {
      this.addError(errors, field, `${field} must be one of: ${allowedValues.join(', ')}`, 'INVALID_ENUM');
    }
  }

  protected validateArray(value: unknown, field: string, minLength = 0, maxLength = Infinity, errors: ValidationError[]): void {
    if (!Array.isArray(value)) {
      this.addError(errors, field, `${field} must be an array`, 'INVALID_TYPE');
      return;
    }

    if (value.length < minLength) {
      this.addError(errors, field, `${field} must have at least ${minLength} items`, 'MIN_ITEMS');
    }

    if (value.length > maxLength) {
      this.addError(errors, field, `${field} must have no more than ${maxLength} items`, 'MAX_ITEMS');
    }
  }

  protected validateUuid(value: string, field: string, errors: ValidationError[]): void {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      this.addError(errors, field, `${field} must be a valid UUID`, 'INVALID_UUID');
    }
  }
}

// Project Validator
export class ProjectValidator extends BaseValidator implements IProjectValidator {
  validateCreate(data: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (typeof data !== 'object' || data === null) {
      this.addError(errors, 'data', 'Data must be an object', 'INVALID_TYPE');
      return this.createValidationResult(errors);
    }

    const projectData = data as any;

    // Required fields
    this.validateRequired(projectData.name, 'name', errors);
    this.validateRequired(projectData.ownerId, 'ownerId', errors);

    // String validations
    if (projectData.name !== undefined) {
      this.validateString(projectData.name, 'name', 1, 100, errors);
    }

    if (projectData.description !== undefined && projectData.description !== null) {
      this.validateString(projectData.description, 'description', 0, 1000, errors);
    }

    if (projectData.color !== undefined) {
      this.validateString(projectData.color, 'color', 3, 7, errors);
      // Validate hex color format
      if (typeof projectData.color === 'string' && !/^#[0-9A-F]{6}$/i.test(projectData.color)) {
        this.addError(errors, 'color', 'Color must be a valid hex color (e.g., #FF0000)', 'INVALID_COLOR');
      }
    }

    // UUID validation
    if (projectData.ownerId !== undefined) {
      this.validateUuid(projectData.ownerId, 'ownerId', errors);
    }

    // Settings validation
    if (projectData.settings) {
      this.validateProjectSettings(projectData.settings, errors);
    }

    return this.createValidationResult(errors);
  }

  validateUpdate(data: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (typeof data !== 'object' || data === null) {
      this.addError(errors, 'data', 'Data must be an object', 'INVALID_TYPE');
      return this.createValidationResult(errors);
    }

    const projectData = data as any;

    // Optional string validations
    if (projectData.name !== undefined) {
      this.validateString(projectData.name, 'name', 1, 100, errors);
    }

    if (projectData.description !== undefined && projectData.description !== null) {
      this.validateString(projectData.description, 'description', 0, 1000, errors);
    }

    if (projectData.color !== undefined) {
      this.validateString(projectData.color, 'color', 3, 7, errors);
      if (typeof projectData.color === 'string' && !/^#[0-9A-F]{6}$/i.test(projectData.color)) {
        this.addError(errors, 'color', 'Color must be a valid hex color (e.g., #FF0000)', 'INVALID_COLOR');
      }
    }

    if (projectData.settings) {
      this.validateProjectSettings(projectData.settings, errors);
    }

    return this.createValidationResult(errors);
  }

  validateMember(data: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (typeof data !== 'object' || data === null) {
      this.addError(errors, 'data', 'Data must be an object', 'INVALID_TYPE');
      return this.createValidationResult(errors);
    }

    const memberData = data as any;

    this.validateRequired(memberData.userId, 'userId', errors);
    this.validateRequired(memberData.role, 'role', errors);

    if (memberData.userId !== undefined) {
      this.validateUuid(memberData.userId, 'userId', errors);
    }

    if (memberData.role !== undefined) {
      this.validateEnum(memberData.role, 'role', ['owner', 'admin', 'member', 'viewer'], errors);
    }

    return this.createValidationResult(errors);
  }

  validateId(id: string): ValidationResult {
    const errors: ValidationError[] = [];
    
    this.validateRequired(id, 'id', errors);
    if (id !== undefined) {
      this.validateString(id, 'id', 1, undefined, errors);
      this.validateUuid(id, 'id', errors);
    }
    
    return this.createValidationResult(errors);
  }

  validateSearchFilters(filters: unknown): ValidationResult {
    const errors: ValidationError[] = [];
    
    if (filters === undefined || filters === null) {
      return this.createValidationResult(errors);
    }
    
    if (typeof filters !== 'object') {
      this.addError(errors, 'filters', 'Filters must be an object', 'INVALID_TYPE');
      return this.createValidationResult(errors);
    }
    
    const filtersData = filters as any;
    
    // Validate individual filter properties if they exist
    if (filtersData.statuses !== undefined) {
      this.validateArray(filtersData.statuses, 'filters.statuses', 0, 10, errors);
    }
    
    if (filtersData.query !== undefined && filtersData.query !== null) {
      this.validateString(filtersData.query, 'filters.query', 0, 100, errors);
    }
    
    return this.createValidationResult(errors);
  }

  validateSortOptions(sort: unknown): ValidationResult {
    const errors: ValidationError[] = [];
    
    if (sort === undefined || sort === null) {
      return this.createValidationResult(errors);
    }
    
    if (typeof sort !== 'object') {
      this.addError(errors, 'sort', 'Sort options must be an object', 'INVALID_TYPE');
      return this.createValidationResult(errors);
    }
    
    const sortData = sort as any;
    
    if (sortData.field !== undefined) {
      this.validateEnum(sortData.field, 'sort.field', ['name', 'createdAt', 'updatedAt'], errors);
    }
    
    if (sortData.order !== undefined) {
      this.validateEnum(sortData.order, 'sort.order', ['asc', 'desc'], errors);
    }
    
    return this.createValidationResult(errors);
  }

  validatePaginationOptions(pagination: unknown): ValidationResult {
    const errors: ValidationError[] = [];
    
    if (pagination === undefined || pagination === null) {
      return this.createValidationResult(errors);
    }
    
    if (typeof pagination !== 'object') {
      this.addError(errors, 'pagination', 'Pagination options must be an object', 'INVALID_TYPE');
      return this.createValidationResult(errors);
    }
    
    const paginationData = pagination as any;
    
    if (paginationData.page !== undefined) {
      this.validateNumber(paginationData.page, 'pagination.page', 1, 1000, errors);
    }
    
    if (paginationData.limit !== undefined) {
      this.validateNumber(paginationData.limit, 'pagination.limit', 1, 100, errors);
    }
    
    return this.createValidationResult(errors);
  }

  private validateProjectSettings(settings: unknown, errors: ValidationError[]): void {
    if (typeof settings !== 'object' || settings === null) {
      this.addError(errors, 'settings', 'Settings must be an object', 'INVALID_TYPE');
      return;
    }

    const settingsData = settings as any;

    if (settingsData.defaultTaskPriority !== undefined) {
      this.validateEnum(settingsData.defaultTaskPriority, 'settings.defaultTaskPriority', ['low', 'medium', 'high', 'urgent'], errors);
    }
  }
}

// Board Validator
export class BoardValidator extends BaseValidator implements IBoardValidator {
  validateCreate(data: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (typeof data !== 'object' || data === null) {
      this.addError(errors, 'data', 'Data must be an object', 'INVALID_TYPE');
      return this.createValidationResult(errors);
    }

    const boardData = data as any;

    // Required fields
    this.validateRequired(boardData.name, 'name', errors);
    this.validateRequired(boardData.projectId, 'projectId', errors);

    // String validations
    if (boardData.name !== undefined) {
      this.validateString(boardData.name, 'name', 1, 100, errors);
    }

    if (boardData.description !== undefined && boardData.description !== null) {
      this.validateString(boardData.description, 'description', 0, 1000, errors);
    }

    // UUID validation
    if (boardData.projectId !== undefined) {
      this.validateUuid(boardData.projectId, 'projectId', errors);
    }

    // Number validation
    if (boardData.position !== undefined) {
      this.validateNumber(boardData.position, 'position', 0, undefined, errors);
    }

    // Settings validation
    if (boardData.settings) {
      this.validateBoardSettings(boardData.settings, errors);
    }

    return this.createValidationResult(errors);
  }

  validateUpdate(data: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (typeof data !== 'object' || data === null) {
      this.addError(errors, 'data', 'Data must be an object', 'INVALID_TYPE');
      return this.createValidationResult(errors);
    }

    const boardData = data as any;

    // Optional validations
    if (boardData.name !== undefined) {
      this.validateString(boardData.name, 'name', 1, 100, errors);
    }

    if (boardData.description !== undefined && boardData.description !== null) {
      this.validateString(boardData.description, 'description', 0, 1000, errors);
    }

    if (boardData.position !== undefined) {
      this.validateNumber(boardData.position, 'position', 0, undefined, errors);
    }

    if (boardData.settings) {
      this.validateBoardSettings(boardData.settings, errors);
    }

    return this.createValidationResult(errors);
  }

  validateColumn(data: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (typeof data !== 'object' || data === null) {
      this.addError(errors, 'data', 'Data must be an object', 'INVALID_TYPE');
      return this.createValidationResult(errors);
    }

    const columnData = data as any;

    // Required fields
    this.validateRequired(columnData.name, 'name', errors);
    this.validateRequired(columnData.boardId, 'boardId', errors);

    // String validations
    if (columnData.name !== undefined) {
      this.validateString(columnData.name, 'name', 1, 50, errors);
    }

    // UUID validation
    if (columnData.boardId !== undefined) {
      this.validateUuid(columnData.boardId, 'boardId', errors);
    }

    // Number validations
    if (columnData.position !== undefined) {
      this.validateNumber(columnData.position, 'position', 0, undefined, errors);
    }

    if (columnData.wipLimit !== undefined && columnData.wipLimit !== null) {
      this.validateNumber(columnData.wipLimit, 'wipLimit', 1, 100, errors);
    }

    // Color validation
    if (columnData.color !== undefined && columnData.color !== null) {
      this.validateString(columnData.color, 'color', 3, 7, errors);
      if (typeof columnData.color === 'string' && !/^#[0-9A-F]{6}$/i.test(columnData.color)) {
        this.addError(errors, 'color', 'Color must be a valid hex color (e.g., #FF0000)', 'INVALID_COLOR');
      }
    }

    return this.createValidationResult(errors);
  }

  private validateBoardSettings(settings: unknown, errors: ValidationError[]): void {
    if (typeof settings !== 'object' || settings === null) {
      this.addError(errors, 'settings', 'Settings must be an object', 'INVALID_TYPE');
      return;
    }

    const settingsData = settings as any;

    if (settingsData.defaultColumnId !== undefined && settingsData.defaultColumnId !== null) {
      this.validateUuid(settingsData.defaultColumnId, 'settings.defaultColumnId', errors);
    }
  }

  // Static methods for compatibility with existing components
  static validateName(name: string): ValidationResult {
    const validator = new BoardValidator();
    const errors: ValidationError[] = [];
    validator.validateString(name, 'name', 1, 100, errors);
    return validator.createValidationResult(errors);
  }

  static validateDescription(description: string): ValidationResult {
    const validator = new BoardValidator();
    const errors: ValidationError[] = [];
    if (description) {
      validator.validateString(description, 'description', 0, 1000, errors);
    }
    return validator.createValidationResult(errors);
  }

  static validateProjectId(projectId: string): ValidationResult {
    const validator = new BoardValidator();
    const errors: ValidationError[] = [];
    validator.validateUuid(projectId, 'projectId', errors);
    return validator.createValidationResult(errors);
  }

  validateId(id: string): ValidationResult {
    const errors: ValidationError[] = [];
    
    this.validateRequired(id, 'id', errors);
    if (id !== undefined) {
      this.validateString(id, 'id', 1, undefined, errors);
      this.validateUuid(id, 'id', errors);
    }
    
    return this.createValidationResult(errors);
  }

  validateSearchFilters(filters: unknown): ValidationResult {
    const errors: ValidationError[] = [];
    
    if (filters === undefined || filters === null) {
      return this.createValidationResult(errors);
    }
    
    if (typeof filters !== 'object') {
      this.addError(errors, 'filters', 'Filters must be an object', 'INVALID_TYPE');
      return this.createValidationResult(errors);
    }
    
    const filtersData = filters as any;
    
    // Validate individual filter properties if they exist
    if (filtersData.status !== undefined) {
      this.validateEnum(filtersData.status, 'filters.status', ['active', 'archived'], errors);
    }
    
    if (filtersData.projectId !== undefined) {
      this.validateUuid(filtersData.projectId, 'filters.projectId', errors);
    }
    
    if (filtersData.search !== undefined && filtersData.search !== null) {
      this.validateString(filtersData.search, 'filters.search', 0, 100, errors);
    }
    
    return this.createValidationResult(errors);
  }

  validateSortOptions(sort: unknown): ValidationResult {
    const errors: ValidationError[] = [];
    
    if (sort === undefined || sort === null) {
      return this.createValidationResult(errors);
    }
    
    if (typeof sort !== 'object') {
      this.addError(errors, 'sort', 'Sort options must be an object', 'INVALID_TYPE');
      return this.createValidationResult(errors);
    }
    
    const sortData = sort as any;
    
    if (sortData.field !== undefined) {
      this.validateEnum(sortData.field, 'sort.field', ['name', 'createdAt', 'updatedAt', 'position'], errors);
    }
    
    if (sortData.order !== undefined) {
      this.validateEnum(sortData.order, 'sort.order', ['asc', 'desc'], errors);
    }
    
    return this.createValidationResult(errors);
  }

  validatePaginationOptions(pagination: unknown): ValidationResult {
    const errors: ValidationError[] = [];
    
    if (pagination === undefined || pagination === null) {
      return this.createValidationResult(errors);
    }
    
    if (typeof pagination !== 'object') {
      this.addError(errors, 'pagination', 'Pagination options must be an object', 'INVALID_TYPE');
      return this.createValidationResult(errors);
    }
    
    const paginationData = pagination as any;
    
    if (paginationData.page !== undefined) {
      this.validateNumber(paginationData.page, 'pagination.page', 1, undefined, errors);
    }
    
    if (paginationData.limit !== undefined) {
      this.validateNumber(paginationData.limit, 'pagination.limit', 1, 100, errors);
    }
    
    if (paginationData.offset !== undefined) {
      this.validateNumber(paginationData.offset, 'pagination.offset', 0, undefined, errors);
    }
    
    return this.createValidationResult(errors);
  }

}

// Task Validator
export class TaskValidator extends BaseValidator implements ITaskValidator {
  validateCreate(data: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (!data || typeof data !== 'object') {
      this.addError(errors, 'data', 'Invalid data object', 'INVALID_TYPE');
      return this.createValidationResult(errors);
    }

    const taskData = data as any;

    // Required fields
    this.validateRequired(taskData.title, 'title', errors);
    this.validateRequired(taskData.columnId, 'columnId', errors);
    this.validateRequired(taskData.boardId, 'boardId', errors);
    this.validateRequired(taskData.projectId, 'projectId', errors);
    this.validateRequired(taskData.reporterId, 'reporterId', errors);
    this.validateRequired(taskData.status, 'status', errors);
    this.validateRequired(taskData.priority, 'priority', errors);

    // String validations
    if (taskData.title !== undefined) {
      this.validateString(taskData.title, 'title', 1, 200, errors);
    }

    if (taskData.description !== undefined && taskData.description !== null) {
      this.validateString(taskData.description, 'description', 0, 5000, errors);
    }

    // UUID validations
    if (taskData.columnId !== undefined) {
      this.validateUuid(taskData.columnId, 'columnId', errors);
    }

    if (taskData.boardId !== undefined) {
      this.validateUuid(taskData.boardId, 'boardId', errors);
    }

    if (taskData.projectId !== undefined) {
      this.validateUuid(taskData.projectId, 'projectId', errors);
    }

    if (taskData.reporterId !== undefined) {
      this.validateUuid(taskData.reporterId, 'reporterId', errors);
    }

    if (taskData.assigneeId !== undefined && taskData.assigneeId !== null) {
      this.validateUuid(taskData.assigneeId, 'assigneeId', errors);
    }

    // Enum validations
    if (taskData.status !== undefined) {
      this.validateEnum(taskData.status, 'status', ['todo', 'in_progress', 'review', 'done', 'blocked'], errors);
    }

    if (taskData.priority !== undefined) {
      this.validateEnum(taskData.priority, 'priority', ['low', 'medium', 'high', 'urgent'], errors);
    }

    // Number validations
    if (taskData.position !== undefined) {
      this.validateNumber(taskData.position, 'position', 0, undefined, errors);
    }

    if (taskData.estimatedHours !== undefined && taskData.estimatedHours !== null) {
      this.validateNumber(taskData.estimatedHours, 'estimatedHours', 0, 1000, errors);
    }

    if (taskData.actualHours !== undefined && taskData.actualHours !== null) {
      this.validateNumber(taskData.actualHours, 'actualHours', 0, 1000, errors);
    }

    // Date validations
    if (taskData.dueDate !== undefined && taskData.dueDate !== null) {
      this.validateDate(taskData.dueDate, 'dueDate', errors);
    }

    // Array validations
    if (taskData.tags !== undefined) {
      this.validateArray(taskData.tags, 'tags', 0, 20, errors);
      if (Array.isArray(taskData.tags)) {
        taskData.tags.forEach((tag: unknown, index: number) => {
          this.validateString(tag, `tags[${index}]`, 1, 50, errors);
        });
      }
    }

    return this.createValidationResult(errors);
  }

  validateUpdate(data: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (!data || typeof data !== 'object') {
      this.addError(errors, 'data', 'Invalid data object', 'INVALID_TYPE');
      return this.createValidationResult(errors);
    }

    const taskData = data as any;

    // Optional validations
    if (taskData.title !== undefined) {
      this.validateString(taskData.title, 'title', 1, 200, errors);
    }

    if (taskData.description !== undefined && taskData.description !== null) {
      this.validateString(taskData.description, 'description', 0, 5000, errors);
    }

    if (taskData.assigneeId !== undefined && taskData.assigneeId !== null) {
      this.validateUuid(taskData.assigneeId, 'assigneeId', errors);
    }

    if (taskData.status !== undefined) {
      this.validateEnum(taskData.status, 'status', ['todo', 'in_progress', 'review', 'done', 'blocked'], errors);
    }

    if (taskData.priority !== undefined) {
      this.validateEnum(taskData.priority, 'priority', ['low', 'medium', 'high', 'urgent'], errors);
    }

    if (taskData.position !== undefined) {
      this.validateNumber(taskData.position, 'position', 0, undefined, errors);
    }

    if (taskData.estimatedHours !== undefined && taskData.estimatedHours !== null) {
      this.validateNumber(taskData.estimatedHours, 'estimatedHours', 0, 1000, errors);
    }

    if (taskData.actualHours !== undefined && taskData.actualHours !== null) {
      this.validateNumber(taskData.actualHours, 'actualHours', 0, 1000, errors);
    }

    if (taskData.dueDate !== undefined && taskData.dueDate !== null) {
      this.validateDate(taskData.dueDate, 'dueDate', errors);
    }

    if (taskData.tags !== undefined) {
      this.validateArray(taskData.tags, 'tags', 0, 20, errors);
      if (Array.isArray(taskData.tags)) {
        taskData.tags.forEach((tag: unknown, index: number) => {
          this.validateString(tag, `tags[${index}]`, 1, 50, errors);
        });
      }
    }

    return this.createValidationResult(errors);
  }

  validateMove(data: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (!data || typeof data !== 'object') {
      this.addError(errors, 'data', 'Invalid data object', 'INVALID_TYPE');
      return this.createValidationResult(errors);
    }

    const moveData = data as any;

    this.validateRequired(moveData.taskId, 'taskId', errors);
    this.validateRequired(moveData.columnId, 'columnId', errors);
    this.validateRequired(moveData.position, 'position', errors);

    if (moveData.taskId !== undefined) {
      this.validateUuid(moveData.taskId, 'taskId', errors);
    }

    if (moveData.columnId !== undefined) {
      this.validateUuid(moveData.columnId, 'columnId', errors);
    }

    if (moveData.position !== undefined) {
      this.validateNumber(moveData.position, 'position', 0, undefined, errors);
    }

    return this.createValidationResult(errors);
  }

  validateDependency(data: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (!data || typeof data !== 'object') {
      this.addError(errors, 'data', 'Invalid data object', 'INVALID_TYPE');
      return this.createValidationResult(errors);
    }

    const dependencyData = data as any;

    this.validateRequired(dependencyData.taskId, 'taskId', errors);
    this.validateRequired(dependencyData.dependsOnTaskId, 'dependsOnTaskId', errors);
    this.validateRequired(dependencyData.type, 'type', errors);

    if (dependencyData.taskId !== undefined) {
      this.validateUuid(dependencyData.taskId, 'taskId', errors);
    }

    if (dependencyData.dependsOnTaskId !== undefined) {
      this.validateUuid(dependencyData.dependsOnTaskId, 'dependsOnTaskId', errors);
    }

    if (dependencyData.type !== undefined) {
      this.validateEnum(dependencyData.type, 'type', ['blocks', 'blocked_by', 'relates_to', 'duplicates'], errors);
    }

    // Prevent self-dependency
    if (dependencyData.taskId === dependencyData.dependsOnTaskId) {
      this.addError(errors, 'dependsOnTaskId', 'Task cannot depend on itself', 'SELF_DEPENDENCY');
    }

    return this.createValidationResult(errors);
  }

  validateComment(data: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (!data || typeof data !== 'object') {
      this.addError(errors, 'data', 'Invalid data object', 'INVALID_TYPE');
      return this.createValidationResult(errors);
    }

    const commentData = data as any;

    this.validateRequired(commentData.content, 'content', errors);
    this.validateRequired(commentData.taskId, 'taskId', errors);
    this.validateRequired(commentData.authorId, 'authorId', errors);

    if (commentData.content !== undefined) {
      this.validateString(commentData.content, 'content', 1, 2000, errors);
    }

    if (commentData.taskId !== undefined) {
      this.validateUuid(commentData.taskId, 'taskId', errors);
    }

    if (commentData.authorId !== undefined) {
      this.validateUuid(commentData.authorId, 'authorId', errors);
    }

    if (commentData.parentCommentId !== undefined && commentData.parentCommentId !== null) {
      this.validateUuid(commentData.parentCommentId, 'parentCommentId', errors);
    }

    return this.createValidationResult(errors);
  }

  validateAttachment(data: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (!data || typeof data !== 'object') {
      this.addError(errors, 'data', 'Invalid data object', 'INVALID_TYPE');
      return this.createValidationResult(errors);
    }

    const attachmentData = data as any;

    this.validateRequired(attachmentData.fileName, 'fileName', errors);
    this.validateRequired(attachmentData.fileSize, 'fileSize', errors);
    this.validateRequired(attachmentData.mimeType, 'mimeType', errors);
    this.validateRequired(attachmentData.url, 'url', errors);

    if (attachmentData.fileName !== undefined) {
      this.validateString(attachmentData.fileName, 'fileName', 1, 255, errors);
    }

    if (attachmentData.fileSize !== undefined) {
      this.validateNumber(attachmentData.fileSize, 'fileSize', 1, 100 * 1024 * 1024, errors); // Max 100MB
    }

    if (attachmentData.mimeType !== undefined) {
      this.validateString(attachmentData.mimeType, 'mimeType', 1, 100, errors);
    }

    if (attachmentData.url !== undefined) {
      this.validateString(attachmentData.url, 'url', 1, 500, errors);
      this.validateUrl(attachmentData.url, 'url', errors);
    }

    return this.createValidationResult(errors);
  }

  // Static methods for compatibility with existing components
  static validateTitle(title: string): ValidationResult {
    const validator = new TaskValidator();
    const errors: ValidationError[] = [];
    validator.validateString(title, 'title', 1, 200, errors);
    return validator.createValidationResult(errors);
  }

  static validateDescription(description: string): ValidationResult {
    const validator = new TaskValidator();
    const errors: ValidationError[] = [];
    if (description) {
      validator.validateString(description, 'description', 0, 5000, errors);
    }
    return validator.createValidationResult(errors);
  }

  static validateDueDate(dueDate: Date | string): ValidationResult {
    const validator = new TaskValidator();
    const errors: ValidationError[] = [];
    validator.validateDate(dueDate, 'dueDate', errors);
    return validator.createValidationResult(errors);
  }

  validateId(id: string): ValidationResult {
    const errors: ValidationError[] = [];
    
    this.validateRequired(id, 'id', errors);
    if (id !== undefined) {
      this.validateString(id, 'id', 1, undefined, errors);
      this.validateUuid(id, 'id', errors);
    }
    
    return this.createValidationResult(errors);
  }

  validateSearchFilters(filters: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (filters === undefined || filters === null) {
      return this.createValidationResult(errors);
    }

    if (typeof filters !== 'object') {
      this.addError(errors, 'filters', 'Filters must be an object', 'INVALID_TYPE');
      return this.createValidationResult(errors);
    }

    const f = filters as Record<string, unknown>;

    // Validate status filter
    if (f.status !== undefined) {
      if (Array.isArray(f.status)) {
        f.status.forEach((status: unknown, index: number) => {
          this.validateEnum(status, `status[${index}]`, ['todo', 'in_progress', 'review', 'done', 'blocked'], errors);
        });
      } else {
        this.validateEnum(f.status, 'status', ['todo', 'in_progress', 'review', 'done', 'blocked'], errors);
      }
    }

    // Validate priority filter
    if (f.priority !== undefined) {
      if (Array.isArray(f.priority)) {
        f.priority.forEach((priority: unknown, index: number) => {
          this.validateEnum(priority, `priority[${index}]`, ['low', 'medium', 'high', 'urgent'], errors);
        });
      } else {
        this.validateEnum(f.priority, 'priority', ['low', 'medium', 'high', 'urgent'], errors);
      }
    }

    // Validate assigneeId filter
    if (f.assigneeId !== undefined) {
      if (Array.isArray(f.assigneeId)) {
        f.assigneeId.forEach((id: unknown, index: number) => {
          if (typeof id === 'string') {
            this.validateUuid(id, `assigneeId[${index}]`, errors);
          } else {
            this.addError(errors, `assigneeId[${index}]`, 'assigneeId must be a string', 'INVALID_TYPE');
          }
        });
      } else {
        if (typeof f.assigneeId === 'string') {
          this.validateUuid(f.assigneeId, 'assigneeId', errors);
        } else {
          this.addError(errors, 'assigneeId', 'assigneeId must be a string', 'INVALID_TYPE');
        }
      }
    }

    // Validate tags filter
    if (f.tags !== undefined) {
      this.validateArray(f.tags, 'tags', 0, 20, errors);
      if (Array.isArray(f.tags)) {
        f.tags.forEach((tag: unknown, index: number) => {
          this.validateString(tag, `tags[${index}]`, 1, 50, errors);
        });
      }
    }

    // Validate date filters
    if (f.dueDateFrom !== undefined && f.dueDateFrom !== null) {
      this.validateDate(f.dueDateFrom, 'dueDateFrom', errors);
    }

    if (f.dueDateTo !== undefined && f.dueDateTo !== null) {
      this.validateDate(f.dueDateTo, 'dueDateTo', errors);
    }

    // Validate createdAt filters
    if (f.createdAtFrom !== undefined && f.createdAtFrom !== null) {
      this.validateDate(f.createdAtFrom, 'createdAtFrom', errors);
    }

    if (f.createdAtTo !== undefined && f.createdAtTo !== null) {
      this.validateDate(f.createdAtTo, 'createdAtTo', errors);
    }

    // Validate includeArchived
    if (f.includeArchived !== undefined) {
      if (typeof f.includeArchived !== 'boolean') {
        this.addError(errors, 'includeArchived', 'includeArchived must be a boolean', 'INVALID_TYPE');
      }
    }

    return this.createValidationResult(errors);
  }

  validateSortOptions(sort: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (sort === undefined || sort === null) {
      return this.createValidationResult(errors);
    }

    if (typeof sort !== 'object') {
      this.addError(errors, 'sort', 'Sort options must be an object', 'INVALID_TYPE');
      return this.createValidationResult(errors);
    }

    const s = sort as Record<string, unknown>;

    // Validate field
    if (s.field !== undefined) {
      this.validateEnum(s.field, 'field', [
        'title', 'status', 'priority', 'assigneeId', 'dueDate', 
        'createdAt', 'updatedAt', 'position', 'estimatedHours', 'actualHours'
      ], errors);
    }

    // Validate direction
    if (s.direction !== undefined) {
      this.validateEnum(s.direction, 'direction', ['asc', 'desc'], errors);
    }

    return this.createValidationResult(errors);
  }

  validatePaginationOptions(pagination: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (pagination === undefined || pagination === null) {
      return this.createValidationResult(errors);
    }

    if (typeof pagination !== 'object') {
      this.addError(errors, 'pagination', 'Pagination options must be an object', 'INVALID_TYPE');
      return this.createValidationResult(errors);
    }

    const p = pagination as Record<string, unknown>;

    // Validate limit
    if (p.limit !== undefined) {
      this.validateNumber(p.limit, 'pagination.limit', 1, 100, errors);
    }

    // Validate offset
    if (p.offset !== undefined) {
      this.validateNumber(p.offset, 'pagination.offset', 0, undefined, errors);
    }
    
    return this.createValidationResult(errors);
  }
}

// User Validator
export class UserValidator extends BaseValidator implements IUserValidator {
  validateCreate(data: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (!data || typeof data !== 'object') {
      this.addError(errors, 'data', 'Invalid data object', 'INVALID_TYPE');
      return this.createValidationResult(errors);
    }

    const userData = data as any;

    // Required fields
    this.validateRequired(userData.email, 'email', errors);
    this.validateRequired(userData.name, 'name', errors);

    // String validations
    if (userData.email !== undefined) {
      this.validateString(userData.email, 'email', 1, 255, errors);
      super.validateEmail(userData.email, 'email', errors);
    }

    if (userData.name !== undefined) {
      this.validateString(userData.name, 'name', 1, 100, errors);
    }

    if (userData.avatar !== undefined && userData.avatar !== null) {
      this.validateString(userData.avatar, 'avatar', 1, 500, errors);
      this.validateUrl(userData.avatar, 'avatar', errors);
    }

    return this.createValidationResult(errors);
  }

  validateUpdate(data: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (!data || typeof data !== 'object') {
      this.addError(errors, 'data', 'Invalid data object', 'INVALID_TYPE');
      return this.createValidationResult(errors);
    }

    const userData = data as any;

    // Optional validations
    if (userData.email !== undefined) {
      this.validateString(userData.email, 'email', 1, 255, errors);
      super.validateEmail(userData.email, 'email', errors);
    }

    if (userData.name !== undefined) {
      this.validateString(userData.name, 'name', 1, 100, errors);
    }

    if (userData.avatar !== undefined && userData.avatar !== null) {
      this.validateString(userData.avatar, 'avatar', 1, 500, errors);
      this.validateUrl(userData.avatar, 'avatar', errors);
    }

    return this.createValidationResult(errors);
  }

  validateEmail(email: string): ValidationResult {
    const errors: ValidationError[] = [];

    this.validateRequired(email, 'email', errors);
    if (email !== undefined) {
      this.validateString(email, 'email', 1, 255, errors);
      super.validateEmail(email, 'email', errors);
    }

    return this.createValidationResult(errors);
  }

  validatePassword(password: string): ValidationResult {
    const errors: ValidationError[] = [];

    this.validateRequired(password, 'password', errors);
    if (password !== undefined) {
      this.validateString(password, 'password', 8, 128, errors);

      // Password complexity validation
      if (typeof password === 'string') {
        if (!/[a-z]/.test(password)) {
          this.addError(errors, 'password', 'Password must contain at least one lowercase letter', 'PASSWORD_LOWERCASE');
        }
        if (!/[A-Z]/.test(password)) {
          this.addError(errors, 'password', 'Password must contain at least one uppercase letter', 'PASSWORD_UPPERCASE');
        }
        if (!/\d/.test(password)) {
          this.addError(errors, 'password', 'Password must contain at least one number', 'PASSWORD_NUMBER');
        }
        if (!/[!@#$%^&*(),.$1":{}|<>]/.test(password)) {
          this.addError(errors, 'password', 'Password must contain at least one special character', 'PASSWORD_SPECIAL');
        }
      }
    }

    return this.createValidationResult(errors);
  }

  validateId(id: string): ValidationResult {
    const errors: ValidationError[] = [];
    
    this.validateRequired(id, 'id', errors);
    if (id !== undefined) {
      this.validateString(id, 'id', 1, undefined, errors);
      this.validateUuid(id, 'id', errors);
    }
    
    return this.createValidationResult(errors);
  }
}

// Export validator instances
export const projectValidator = new ProjectValidator();
export const boardValidator = new BoardValidator();
export const taskValidator = new TaskValidator();
export const userValidator = new UserValidator();

// Export validation helper functions
export function validateId(id: string): ValidationResult {
  const errors: ValidationError[] = [];
  const validator = new ProjectValidator();
  
  validator['validateRequired'](id, 'id', errors);
  if (id !== undefined) {
    validator['validateUuid'](id, 'id', errors);
  }
  
  return validator['createValidationResult'](errors);
}

export function validatePagination(page$1: number, limit$2: number): ValidationResult {
  const errors: ValidationError[] = [];
  const validator = new ProjectValidator();
  
  if (page !== undefined) {
    validator['validateNumber'](page, 'page', 1, 1000, errors);
  }
  
  if (limit !== undefined) {
    validator['validateNumber'](limit, 'limit', 1, 100, errors);
  }
  
  return validator['createValidationResult'](errors);
}

export function validateSearchQuery(query$1: string): ValidationResult {
  const errors: ValidationError[] = [];
  const validator = new ProjectValidator();
  
  if (query !== undefined && query !== null && query !== '') {
    validator['validateString'](query, 'query', 1, 500, errors);
  }
  
  return validator['createValidationResult'](errors);
}