// Task Service Implementation
// Handles business logic for task management

import { ITaskService, ITaskRepository, ITaskValidator } from '../interfaces';
import {
  Task,
  SearchFilters,
  SortOptions,
  PaginationOptions,
  Comment,
  Attachment,
  TimeEntry,
  TaskAction,
  TaskDependency
} from '../../data/types';
import { taskRepository } from '../../data/repositories';
import { TaskValidator } from '../validators';

export class TaskService implements ITaskService {
  private repository: ITaskRepository;
  private validator: ITaskValidator;

  constructor(
    repository: ITaskRepository = taskRepository,
    validator: ITaskValidator = new TaskValidator()
  ) {
    this.repository = repository;
    this.validator = validator;
  }

  async getById(id: string, userId: string): Promise<Task> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid task ID: ${validation.errors.join(', ')}`);
    }

    const userValidation = this.validator.validateId(userId);
    if (!userValidation.isValid) {
      throw new Error(`Invalid user ID: ${userValidation.errors.join(', ')}`);
    }

    const task = await this.repository.findById(id);
    if (!task) {
      throw new Error('Task not found');
    }

    // TODO: Add permission check here
    // const hasAccess = await this.canUserAccess(id, userId);
    // if (!hasAccess) {
    //   throw new Error('Access denied');
    // }

    return task;
  }

  async getByColumnId(
    columnId: string,
    userId: string,
    includeArchived$1: boolean
  ): Promise<Task[]> {
    const validation = this.validator.validateId(columnId);
    if (!validation.isValid) {
      throw new Error(`Invalid column ID: ${validation.errors.join(', ')}`);
    }

    const userValidation = this.validator.validateId(userId);
    if (!userValidation.isValid) {
      throw new Error(`Invalid user ID: ${userValidation.errors.join(', ')}`);
    }

    return await this.repository.findByColumnId(columnId, includeArchived);
  }

  async getByBoardId(
    boardId: string,
    userId: string,
    includeArchived$1: boolean
  ): Promise<Task[]> {
    const validation = this.validator.validateId(boardId);
    if (!validation.isValid) {
      throw new Error(`Invalid board ID: ${validation.errors.join(', ')}`);
    }

    const userValidation = this.validator.validateId(userId);
    if (!userValidation.isValid) {
      throw new Error(`Invalid user ID: ${userValidation.errors.join(', ')}`);
    }

    return await this.repository.findByBoardId(boardId, includeArchived);
  }

  async getByProjectId(
    projectId: string,
    userId: string,
    includeArchived$1: boolean
  ): Promise<Task[]> {
    const validation = this.validator.validateId(projectId);
    if (!validation.isValid) {
      throw new Error(`Invalid project ID: ${validation.errors.join(', ')}`);
    }

    const userValidation = this.validator.validateId(userId);
    if (!userValidation.isValid) {
      throw new Error(`Invalid user ID: ${userValidation.errors.join(', ')}`);
    }

    return await this.repository.findByProjectId(projectId, includeArchived);
  }

  async getByAssigneeId(
    assigneeId: string,
    userId: string,
    filters$1: SearchFilters
  ): Promise<Task[]> {
    const validation = this.validator.validateId(assigneeId);
    if (!validation.isValid) {
      throw new Error(`Invalid assignee ID: ${validation.errors.join(', ')}`);
    }

    const userValidation = this.validator.validateId(userId);
    if (!userValidation.isValid) {
      throw new Error(`Invalid user ID: ${userValidation.errors.join(', ')}`);
    }

    return await this.repository.findByAssigneeId(assigneeId);
  }

  async getAll(
    userId: string,
    filters$1: SearchFilters,
    sort$2: SortOptions,
    pagination$3: PaginationOptions
  ): Promise<Task[]> {
    const userValidation = this.validator.validateId(userId);
    if (!userValidation.isValid) {
      throw new Error(`Invalid user ID: ${userValidation.errors.join(', ')}`);
    }
    if (filters) {
      const validation = this.validator.validateSearchFilters(filters);
      if (!validation.isValid) {
        throw new Error(`Invalid search filters: ${validation.errors.join(', ')}`);
      }
    }

    if (sort) {
      const validation = this.validator.validateSortOptions(sort);
      if (!validation.isValid) {
        throw new Error(`Invalid sort options: ${validation.errors.join(', ')}`);
      }
    }

    if (pagination) {
      const validation = this.validator.validatePaginationOptions(pagination);
      if (!validation.isValid) {
        throw new Error(`Invalid pagination options: ${validation.errors.join(', ')}`);
      }
    }

    // Extract includeArchived from filters if present
    const includeArchived = filters$1.isArchived || false;
    return await this.repository.findAll(includeArchived, sort, pagination);
  }

  async create(
    taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'dependencies' | 'attachments' | 'comments' | 'timeEntries' | 'history'>,
    userId: string
  ): Promise<Task> {
    const userValidation = this.validator.validateId(userId);
    if (!userValidation.isValid) {
      throw new Error(`Invalid user ID: ${userValidation.errors.join(', ')}`);
    }
    const validation = this.validator.validateCreate(taskData);
    if (!validation.isValid) {
      throw new Error(`Invalid task data: ${validation.errors.join(', ')}`);
    }

    // Business logic: Set default values
    const taskWithDefaults = {
      ...taskData,
      status: taskData.status || 'todo',
      priority: taskData.priority || 'medium',
      isArchived: taskData.isArchived || false,
      tags: taskData.tags || [],
      dependencies: [],
      attachments: [],
      comments: [],
      timeEntries: [],
      history: [],
      metadata: taskData.metadata || {
        complexity: 1,
        businessValue: 1,
        technicalDebt: false
      }
    };

    // Business logic: Validate due date
    if (taskWithDefaults.dueDate && taskWithDefaults.dueDate < new Date()) {
      console.warn('Task created with due date in the past');
    }

    return await this.repository.create(taskWithDefaults);
  }

  async update(
    id: string,
    updates: Partial<Task>,
    userId: string
  ): Promise<Task> {
    const userValidation = this.validator.validateId(userId);
    if (!userValidation.isValid) {
      throw new Error(`Invalid user ID: ${userValidation.errors.join(', ')}`);
    }
    const idValidation = this.validator.validateId(id);
    if (!idValidation.isValid) {
      throw new Error(`Invalid task ID: ${idValidation.errors.join(', ')}`);
    }

    const updateValidation = this.validator.validateUpdate(updates);
    if (!updateValidation.isValid) {
      throw new Error(`Invalid update data: ${updateValidation.errors.join(', ')}`);
    }

    // Check if task exists
    const existingTask = await this.repository.findById(id);
    if (!existingTask) {
      throw new Error('Task not found');
    }

    // Business logic: Prevent certain updates on archived tasks
    if (existingTask.isArchived && (updates.title || updates.description || updates.status)) {
      throw new Error('Cannot update title, description, or status of archived task');
    }

    // Business logic: Auto-complete task if status is set to done
    if (updates.status === 'done' && existingTask.status !== 'done') {
      updates.metadata = {
        ...existingTask.metadata,
        completedAt: new Date()
      };
    }

    // Business logic: Reset completion date if status changes from done
    if (updates.status && updates.status !== 'done' && existingTask.status === 'done') {
      updates.metadata = {
        ...existingTask.metadata,
        completedAt: undefined
      };
    }

    return await this.repository.update(id, updates);
  }

  async delete(id: string, userId: string): Promise<void> {
    const userValidation = this.validator.validateId(userId);
    if (!userValidation.isValid) {
      throw new Error(`Invalid user ID: ${userValidation.errors.join(', ')}`);
    }
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid task ID: ${validation.errors.join(', ')}`);
    }

    // Check if task exists
    const existingTask = await this.repository.findById(id);
    if (!existingTask) {
      throw new Error('Task not found');
    }

    // Business logic: Check for dependencies
    if (existingTask.dependencies && existingTask.dependencies.length > 0) {
      throw new Error('Cannot delete task with dependencies. Remove dependencies first.');
    }

    await this.repository.delete(id);
  }

  async archive(id: string, userId: string): Promise<Task> {
    const userValidation = this.validator.validateId(userId);
    if (!userValidation.isValid) {
      throw new Error(`Invalid user ID: ${userValidation.errors.join(', ')}`);
    }
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid task ID: ${validation.errors.join(', ')}`);
    }

    // Check if task exists
    const existingTask = await this.repository.findById(id);
    if (!existingTask) {
      throw new Error('Task not found');
    }

    if (existingTask.isArchived) {
      throw new Error('Task is already archived');
    }

    return await this.repository.archive(id);
  }

  async restore(id: string, userId: string): Promise<Task> {
    const userValidation = this.validator.validateId(userId);
    if (!userValidation.isValid) {
      throw new Error(`Invalid user ID: ${userValidation.errors.join(', ')}`);
    }
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid task ID: ${validation.errors.join(', ')}`);
    }

    // Check if task exists
    const existingTask = await this.repository.findById(id);
    if (!existingTask) {
      throw new Error('Task not found');
    }

    if (!existingTask.isArchived) {
      throw new Error('Task is not archived');
    }

    return await this.repository.restore(id);
  }

  async updatePosition(
    id: string,
    newColumnId: string,
    position: number
  ): Promise<void> {
    const idValidation = this.validator.validateId(id);
    if (!idValidation.isValid) {
      throw new Error(`Invalid task ID: ${idValidation.errors.join(', ')}`);
    }

    const columnValidation = this.validator.validateId(newColumnId);
    if (!columnValidation.isValid) {
      throw new Error(`Invalid column ID: ${columnValidation.errors.join(', ')}`);
    }

    if (position < 0) {
      throw new Error('Position must be non-negative');
    }

    // Check if task exists
    const existingTask = await this.repository.findById(id);
    if (!existingTask) {
      throw new Error('Task not found');
    }

    // Business logic: Cannot move archived tasks
    if (existingTask.isArchived) {
      throw new Error('Cannot move archived task');
    }

    // Update task position in the new column
    await this.repository.updatePosition(id, position);
    
    // Update the column assignment if different
    if (newColumnId) {
      await this.repository.update(id, { columnId: newColumnId });
    }
  }

  async updateStatus(id: string, status: Task['status'], userId: string): Promise<Task> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid task ID: ${validation.errors.join(', ')}`);
    }

    const userValidation = this.validator.validateId(userId);
    if (!userValidation.isValid) {
      throw new Error(`Invalid user ID: ${userValidation.errors.join(', ')}`);
    }

    if (!['todo', 'in_progress', 'review', 'done'].includes(status)) {
      throw new Error('Invalid status');
    }

    // Check if task exists
    const existingTask = await this.repository.findById(id);
    if (!existingTask) {
      throw new Error('Task not found');
    }

    // Business logic: Cannot change status of archived tasks
    if (existingTask.isArchived) {
      throw new Error('Cannot change status of archived task');
    }

    const updates: Partial<Task> = { status };

    // Business logic: Set completion date when marking as done
    if (status === 'done' && existingTask.status !== 'done') {
      updates.metadata = {
        ...existingTask.metadata,
        completedAt: new Date()
      };
    }

    // Business logic: Clear completion date when moving from done
    if (status !== 'done' && existingTask.status === 'done') {
      updates.metadata = {
        ...existingTask.metadata,
        completedAt: undefined
      };
    }

    return await this.repository.update(id, updates);
  }

  async updatePriority(id: string, priority: Task['priority'], userId: string): Promise<Task> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid task ID: ${validation.errors.join(', ')}`);
    }

    const userValidation = this.validator.validateId(userId);
    if (!userValidation.isValid) {
      throw new Error(`Invalid user ID: ${userValidation.errors.join(', ')}`);
    }

    if (!['low', 'medium', 'high', 'urgent'].includes(priority)) {
      throw new Error('Invalid priority');
    }

    // Check if task exists
    const existingTask = await this.repository.findById(id);
    if (!existingTask) {
      throw new Error('Task not found');
    }

    // Business logic: Cannot change priority of archived tasks
    if (existingTask.isArchived) {
      throw new Error('Cannot change priority of archived task');
    }

    return await this.repository.update(id, { priority });
  }

  async move(id: string, columnId: string, position: number, userId: string): Promise<Task> {
    const idValidation = this.validator.validateId(id);
    if (!idValidation.isValid) {
      throw new Error(`Invalid task ID: ${idValidation.errors.join(', ')}`);
    }

    const columnValidation = this.validator.validateId(columnId);
    if (!columnValidation.isValid) {
      throw new Error(`Invalid column ID: ${columnValidation.errors.join(', ')}`);
    }

    const userValidation = this.validator.validateId(userId);
    if (!userValidation.isValid) {
      throw new Error(`Invalid user ID: ${userValidation.errors.join(', ')}`);
    }

    if (position < 0) {
      throw new Error('Position must be non-negative');
    }

    // Check if task exists
    const existingTask = await this.repository.findById(id);
    if (!existingTask) {
      throw new Error('Task not found');
    }

    // Business logic: Cannot move archived tasks
    if (existingTask.isArchived) {
      throw new Error('Cannot move archived task');
    }

    return await this.repository.move(id, columnId, position);
  }

  async reorder(columnId: string, taskIds: string[], userId: string): Promise<void> {
    const columnValidation = this.validator.validateId(columnId);
    if (!columnValidation.isValid) {
      throw new Error(`Invalid column ID: ${columnValidation.errors.join(', ')}`);
    }

    const userValidation = this.validator.validateId(userId);
    if (!userValidation.isValid) {
      throw new Error(`Invalid user ID: ${userValidation.errors.join(', ')}`);
    }

    if (!taskIds || taskIds.length === 0) {
      throw new Error('Task IDs are required');
    }

    // Validate all task IDs
    for (const taskId of taskIds) {
      const validation = this.validator.validateId(taskId);
      if (!validation.isValid) {
        throw new Error(`Invalid task ID: ${taskId}`);
      }
    }

    await this.repository.reorderTasks(columnId, taskIds);
  }

  async duplicate(id: string, newTitle: string, userId: string): Promise<Task> {
    const idValidation = this.validator.validateId(id);
    if (!idValidation.isValid) {
      throw new Error(`Invalid task ID: ${idValidation.errors.join(', ')}`);
    }

    const userValidation = this.validator.validateId(userId);
    if (!userValidation.isValid) {
      throw new Error(`Invalid user ID: ${userValidation.errors.join(', ')}`);
    }

    if (!newTitle || newTitle.trim().length === 0) {
      throw new Error('New title is required');
    }

    // Check if task exists
    const existingTask = await this.repository.findById(id);
    if (!existingTask) {
      throw new Error('Task not found');
    }

    return await this.repository.duplicate(id, newTitle.trim());
  }

  async assign(id: string, assigneeId: string, userId: string): Promise<Task> {
    const idValidation = this.validator.validateId(id);
    if (!idValidation.isValid) {
      throw new Error(`Invalid task ID: ${idValidation.errors.join(', ')}`);
    }

    const assigneeValidation = this.validator.validateId(assigneeId);
    if (!assigneeValidation.isValid) {
      throw new Error(`Invalid assignee ID: ${assigneeValidation.errors.join(', ')}`);
    }

    const userValidation = this.validator.validateId(userId);
    if (!userValidation.isValid) {
      throw new Error(`Invalid user ID: ${userValidation.errors.join(', ')}`);
    }

    // Check if task exists
    const existingTask = await this.repository.findById(id);
    if (!existingTask) {
      throw new Error('Task not found');
    }

    // Business logic: Cannot assign users to archived tasks
    if (existingTask.isArchived) {
      throw new Error('Cannot assign users to archived task');
    }

    // Business logic: Check if user is already assigned
    if (existingTask.assigneeId === assigneeId) {
      throw new Error('User is already assigned to this task');
    }

    return await this.repository.update(id, { assigneeId });
  }

  async unassign(id: string, userId: string): Promise<Task> {
    const idValidation = this.validator.validateId(id);
    if (!idValidation.isValid) {
      throw new Error(`Invalid task ID: ${idValidation.errors.join(', ')}`);
    }

    const userValidation = this.validator.validateId(userId);
    if (!userValidation.isValid) {
      throw new Error(`Invalid user ID: ${userValidation.errors.join(', ')}`);
    }

    // Check if task exists
    const existingTask = await this.repository.findById(id);
    if (!existingTask) {
      throw new Error('Task not found');
    }

    // Business logic: Cannot unassign users from archived tasks
    if (existingTask.isArchived) {
      throw new Error('Cannot unassign users from archived task');
    }

    return await this.repository.update(id, { assigneeId: undefined });
  }



  async addComment(
    taskId: string,
    content: string,
    userId: string
  ): Promise<void> {
    const validation = this.validator.validateId(taskId);
    if (!validation.isValid) {
      throw new Error(`Invalid task ID: ${validation.errors.join(', ')}`);
    }

    if (!content || content.trim().length === 0) {
      throw new Error('Comment content is required');
    }

    // Check if task exists
    const existingTask = await this.repository.findById(taskId);
    if (!existingTask) {
      throw new Error('Task not found');
    }

    // Business logic: Cannot add comments to archived tasks
    if (existingTask.isArchived) {
      throw new Error('Cannot add comments to archived task');
    }

    const comment = {
      content,
      authorId: userId
    };

    await this.repository.addComment(taskId, comment);
  }

  async updateComment(
    commentId: string,
    content: string,
    userId: string
  ): Promise<Comment> {
    const commentIdValidation = this.validator.validateId(commentId);
    if (!commentIdValidation.isValid) {
      throw new Error(`Invalid comment ID: ${commentIdValidation.errors.join(', ')}`);
    }

    const userIdValidation = this.validator.validateId(userId);
    if (!userIdValidation.isValid) {
      throw new Error(`Invalid user ID: ${userIdValidation.errors.join(', ')}`);
    }

    if (!content || content.trim().length === 0) {
      throw new Error('Comment content is required');
    }

    const updates = {
      content: content.trim(),
      isEdited: true,
      updatedAt: new Date()
    };

    return await this.repository.updateComment(commentId, updates);
  }

  async deleteComment(commentId: string, userId: string): Promise<void> {
    const commentIdValidation = this.validator.validateId(commentId);
    if (!commentIdValidation.isValid) {
      throw new Error(`Invalid comment ID: ${commentIdValidation.errors.join(', ')}`);
    }

    const userIdValidation = this.validator.validateId(userId);
    if (!userIdValidation.isValid) {
      throw new Error(`Invalid user ID: ${userIdValidation.errors.join(', ')}`);
    }

    await this.repository.deleteComment(commentId);
  }

  async addAttachment(
    id: string,
    attachment: Omit<Attachment, 'id' | 'createdAt'>,
    userId: string
  ): Promise<Attachment> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid task ID: ${validation.errors.join(', ')}`);
    }

    const userValidation = this.validator.validateId(userId);
    if (!userValidation.isValid) {
      throw new Error(`Invalid user ID: ${userValidation.errors.join(', ')}`);
    }

    if (!attachment.fileName || !attachment.url) {
      throw new Error('Attachment filename and URL are required');
    }

    // Check if task exists
    const existingTask = await this.repository.findById(id);
    if (!existingTask) {
      throw new Error('Task not found');
    }

    // Business logic: Cannot add attachments to archived tasks
    if (existingTask.isArchived) {
      throw new Error('Cannot add attachments to archived task');
    }

    return await this.repository.addAttachment(id, attachment, userId);
  }

  async addDependency(taskId: string, dependencyData: Omit<TaskDependency, 'id' | 'createdAt' | 'createdBy'>, userId: string): Promise<TaskDependency> {
    const validation = this.validator.validateId(taskId);
    if (!validation.isValid) {
      throw new Error(`Invalid task ID: ${validation.errors.join(', ')}`);
    }

    const userValidation = this.validator.validateId(userId);
    if (!userValidation.isValid) {
      throw new Error(`Invalid user ID: ${userValidation.errors.join(', ')}`);
    }

    // Check if task exists
    const existingTask = await this.repository.findById(taskId);
    if (!existingTask) {
      throw new Error('Task not found');
    }

    // Business logic: Cannot add dependencies to archived tasks
    if (existingTask.isArchived) {
      throw new Error('Cannot add dependencies to archived task');
    }

    return await this.repository.addDependency(taskId, dependencyData, userId);
  }

  async removeDependency(dependencyId: string, userId: string): Promise<void> {
    const depValidation = this.validator.validateId(dependencyId);
    if (!depValidation.isValid) {
      throw new Error(`Invalid dependency ID: ${depValidation.errors.join(', ')}`);
    }

    const userValidation = this.validator.validateId(userId);
    if (!userValidation.isValid) {
      throw new Error(`Invalid user ID: ${userValidation.errors.join(', ')}`);
    }

    await this.repository.removeDependency(dependencyId);
  }

  async startTimeTracking(taskId: string, userId: string): Promise<TimeEntry> {
    const validation = this.validator.validateId(taskId);
    if (!validation.isValid) {
      throw new Error(`Invalid task ID: ${validation.errors.join(', ')}`);
    }

    const userValidation = this.validator.validateId(userId);
    if (!userValidation.isValid) {
      throw new Error(`Invalid user ID: ${userValidation.errors.join(', ')}`);
    }

    // Check if task exists
    const existingTask = await this.repository.findById(taskId);
    if (!existingTask) {
      throw new Error('Task not found');
    }

    // Business logic: Cannot track time on archived tasks
    if (existingTask.isArchived) {
      throw new Error('Cannot track time on archived task');
    }

    return await this.repository.startTimeTracking(taskId, userId);
  }

  async stopTimeTracking(entryId: string, userId: string): Promise<TimeEntry> {
    const validation = this.validator.validateId(entryId);
    if (!validation.isValid) {
      throw new Error(`Invalid entry ID: ${validation.errors.join(', ')}`);
    }

    const userValidation = this.validator.validateId(userId);
    if (!userValidation.isValid) {
      throw new Error(`Invalid user ID: ${userValidation.errors.join(', ')}`);
    }

    return await this.repository.stopTimeTracking(entryId);
  }

  async getTimeEntries(taskId: string, userId: string): Promise<TimeEntry[]> {
    const validation = this.validator.validateId(taskId);
    if (!validation.isValid) {
      throw new Error(`Invalid task ID: ${validation.errors.join(', ')}`);
    }

    const userValidation = this.validator.validateId(userId);
    if (!userValidation.isValid) {
      throw new Error(`Invalid user ID: ${userValidation.errors.join(', ')}`);
    }

    // Check if task exists
    const existingTask = await this.repository.findById(taskId);
    if (!existingTask) {
      throw new Error('Task not found');
    }

    return await this.repository.getTimeEntries(taskId);
  }

  async getHistory(taskId: string, userId: string): Promise<Task['history']> {
    const validation = this.validator.validateId(taskId);
    if (!validation.isValid) {
      throw new Error(`Invalid task ID: ${validation.errors.join(', ')}`);
    }

    const userValidation = this.validator.validateId(userId);
    if (!userValidation.isValid) {
      throw new Error(`Invalid user ID: ${userValidation.errors.join(', ')}`);
    }

    // Check if task exists
    const existingTask = await this.repository.findById(taskId);
    if (!existingTask) {
      throw new Error('Task not found');
    }

    // Return the task's history property
    return existingTask.history || [];
  }

  async deleteAttachment(taskId: string, attachmentId: string): Promise<void> {
    const taskIdValidation = this.validator.validateId(taskId);
    if (!taskIdValidation.isValid) {
      throw new Error(`Invalid task ID: ${taskIdValidation.errors.join(', ')}`);
    }

    const attachmentIdValidation = this.validator.validateId(attachmentId);
    if (!attachmentIdValidation.isValid) {
      throw new Error(`Invalid attachment ID: ${attachmentIdValidation.errors.join(', ')}`);
    }

    await this.repository.deleteAttachment(attachmentId);
  }

  async addTimeEntry(
    taskId: string,
    timeEntry: Omit<TimeEntry, 'id' | 'createdAt'>
  ): Promise<TimeEntry> {
    const validation = this.validator.validateId(taskId);
    if (!validation.isValid) {
      throw new Error(`Invalid task ID: ${validation.errors.join(', ')}`);
    }

    if (!timeEntry.duration || timeEntry.duration <= 0) {
      throw new Error('Time entry duration must be positive');
    }

    // Check if task exists
    const existingTask = await this.repository.findById(taskId);
    if (!existingTask) {
      throw new Error('Task not found');
    }

    return await this.repository.addTimeEntry(taskId, timeEntry);
  }

  async updateTimeEntry(
    taskId: string,
    timeEntryId: string,
    updates: Partial<TimeEntry>
  ): Promise<TimeEntry> {
    const taskIdValidation = this.validator.validateId(taskId);
    if (!taskIdValidation.isValid) {
      throw new Error(`Invalid task ID: ${taskIdValidation.errors.join(', ')}`);
    }

    const timeEntryIdValidation = this.validator.validateId(timeEntryId);
    if (!timeEntryIdValidation.isValid) {
      throw new Error(`Invalid time entry ID: ${timeEntryIdValidation.errors.join(', ')}`);
    }

    if (updates.duration !== undefined && updates.duration <= 0) {
      throw new Error('Time entry duration must be positive');
    }

    return await this.repository.updateTimeEntry(timeEntryId, updates);
  }

  async deleteTimeEntry(taskId: string, timeEntryId: string): Promise<void> {
    const taskIdValidation = this.validator.validateId(taskId);
    if (!taskIdValidation.isValid) {
      throw new Error(`Invalid task ID: ${taskIdValidation.errors.join(', ')}`);
    }

    const timeEntryIdValidation = this.validator.validateId(timeEntryId);
    if (!timeEntryIdValidation.isValid) {
      throw new Error(`Invalid time entry ID: ${timeEntryIdValidation.errors.join(', ')}`);
    }

    await this.repository.deleteTimeEntry(timeEntryId);
  }

  async logAction(
    taskId: string,
    action: Omit<TaskAction, 'id' | 'createdAt'>
  ): Promise<TaskAction> {
    const validation = this.validator.validateId(taskId);
    if (!validation.isValid) {
      throw new Error(`Invalid task ID: ${validation.errors.join(', ')}`);
    }

    if (!action.action || !action.userId) {
      throw new Error('Action type and user ID are required');
    }

    return await this.repository.logAction(taskId, action);
  }

  async search(
    query: string,
    userId: string,
    filters$1: SearchFilters
  ): Promise<Task[]> {
    if (!query || query.trim().length === 0) {
      throw new Error('Search query is required');
    }
    
    const userValidation = this.validator.validateId(userId);
    if (!userValidation.isValid) {
      throw new Error(`Invalid user ID: ${userValidation.errors.join(', ')}`);
    }

    if (filters) {
      const validation = this.validator.validateSearchFilters(filters);
      if (!validation.isValid) {
        throw new Error(`Invalid search filters: ${validation.errors.join(', ')}`);
      }
    }

    return await this.repository.search(query, filters);
  }



  async canUserAccess(taskId: string, userId: string): Promise<boolean> {
    const taskIdValidation = this.validator.validateId(taskId);
    if (!taskIdValidation.isValid) {
      return false;
    }

    const userIdValidation = this.validator.validateId(userId);
    if (!userIdValidation.isValid) {
      return false;
    }

    try {
      const task = await this.repository.findById(taskId);
      if (!task) {
        return false;
      }

      // Check board/project access through respective services
      // This would typically be injected as dependencies
      // For now, we'll assume access if task exists
      return true;
    } catch {
      return false;
    }
  }

  async canUserEdit(taskId: string, userId: string): Promise<boolean> {
    const hasAccess = await this.canUserAccess(taskId, userId);
    if (!hasAccess) {
      return false;
    }

    try {
      const task = await this.repository.findById(taskId);
      if (!task) {
        return false;
      }

      // Business logic: Cannot edit archived tasks
      if (task.isArchived) {
        return false;
      }

      // Check board/project permissions through respective services
      // This would typically be injected as dependencies
      // For now, we'll assume edit access if task exists and is not archived
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const taskService = new TaskService();