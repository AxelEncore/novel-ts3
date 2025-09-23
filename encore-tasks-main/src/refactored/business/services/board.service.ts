// Board Service Implementation
// Handles business logic for board management

import { IBoardService, IBoardRepository, IBoardValidator, IColumnRepository, ITaskRepository } from '../interfaces';
import {
  Board,
  Column,
  SearchFilters,
  SortOptions,
  PaginationOptions
} from '../../data/types';
import { boardRepository, columnRepository, taskRepository } from '../../data/repositories';
import { BoardValidator } from '../validators';

export class BoardService implements IBoardService {
  private repository: IBoardRepository;
  private columnRepository: IColumnRepository;
  private validator: IBoardValidator;
  private taskRepository: ITaskRepository;

  constructor(
    repository: IBoardRepository = boardRepository,
    columnRepo: IColumnRepository = columnRepository,
    validator: IBoardValidator = new BoardValidator(),
    taskRepo: ITaskRepository = taskRepository
  ) {
    this.repository = repository;
    this.columnRepository = columnRepo;
    this.validator = validator;
    this.taskRepository = taskRepo;
  }

  async getById(id: string, userId: string): Promise<Board> {
    // Validate ID format
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid board ID: ID must be a non-empty string');
    }

    const board = await this.repository.findById(id);
    if (!board) {
      throw new Error('Board not found');
    }

    return board;
  }

  async getByProjectId(
    projectId: string,
    userId: string,
    includeArchived$1: boolean
  ): Promise<Board[]> {
    const validation = this.validator.validateId(projectId);
    if (!validation.isValid) {
      throw new Error(`Invalid project ID: ${validation.errors.join(', ')}`);
    }

    return await this.repository.findByProjectId(projectId, includeArchived);
  }

  async getAll(
    filters$1: SearchFilters,
    sort$2: SortOptions,
    pagination$3: PaginationOptions
  ): Promise<Board[]> {
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

    return await this.repository.findAll(filters, sort, pagination);
  }

  async create(
    boardData: Omit<Board, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Board> {
    const validation = this.validator.validateCreate(boardData);
    if (!validation.isValid) {
      throw new Error(`Invalid board data: ${validation.errors.join(', ')}`);
    }

    // Business logic: Set default values
    const boardWithDefaults = {
      ...boardData,
      color: boardData.color || '#3B82F6',
      isArchived: boardData.isArchived || false,
      settings: boardData.settings || {
        allowComments: true,
        allowAttachments: true,
        requireDueDates: false,
        autoArchiveCards: false,
        cardAging: false,
        votingEnabled: false,
        selfJoin: false,
        permissionLevel: 'private'
      },
      statistics: boardData.statistics || {
        totalColumns: 0,
        totalTasks: 0,
        completedTasks: 0,
        overdueTasks: 0,
        lastActivity: new Date()
      }
    };

    return await this.repository.create(boardWithDefaults);
  }

  async update(
    id: string,
    updates: Partial<Board>
  ): Promise<Board> {
    const idValidation = this.validator.validateId(id);
    if (!idValidation.isValid) {
      throw new Error(`Invalid board ID: ${idValidation.errors.join(', ')}`);
    }

    const updateValidation = this.validator.validateUpdate(updates);
    if (!updateValidation.isValid) {
      throw new Error(`Invalid update data: ${updateValidation.errors.join(', ')}`);
    }

    // Check if board exists
    const existingBoard = await this.repository.findById(id);
    if (!existingBoard) {
      throw new Error('Board not found');
    }

    // Business logic: Prevent certain updates on archived boards
    if (existingBoard.isArchived && (updates.name || updates.description)) {
      throw new Error('Cannot update name or description of archived board');
    }

    return await this.repository.update(id, updates);
  }

  async delete(id: string): Promise<void> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid board ID: ${validation.errors.join(', ')}`);
    }

    // Check if board exists
    const existingBoard = await this.repository.findById(id);
    if (!existingBoard) {
      throw new Error('Board not found');
    }

    // Business logic: Archive instead of delete if board has tasks
    const stats = await this.repository.getStatistics(id);
    if (stats.totalTasks > 0) {
      throw new Error('Cannot delete board with existing tasks. Archive it instead.');
    }

    await this.repository.delete(id);
  }

  async archive(id: string): Promise<Board> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid board ID: ${validation.errors.join(', ')}`);
    }

    // Check if board exists
    const existingBoard = await this.repository.findById(id);
    if (!existingBoard) {
      throw new Error('Board not found');
    }

    if (existingBoard.isArchived) {
      throw new Error('Board is already archived');
    }

    return await this.repository.archive(id);
  }

  async restore(id: string): Promise<Board> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid board ID: ${validation.errors.join(', ')}`);
    }

    // Check if board exists
    const existingBoard = await this.repository.findById(id);
    if (!existingBoard) {
      throw new Error('Board not found');
    }

    if (!existingBoard.isArchived) {
      throw new Error('Board is not archived');
    }

    return await this.repository.restore(id);
  }

  async duplicate(
    id: string,
    newName: string,
    userId: string
  ): Promise<Board> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid board ID: ${validation.errors.join(', ')}`);
    }

    // Check if board exists
    const existingBoard = await this.repository.findById(id);
    if (!existingBoard) {
      throw new Error('Board not found');
    }

    // Business logic: Use provided name
    return await this.repository.duplicate(id, newName);
  }

  async updatePosition(id: string, position: number): Promise<void> {
    const idValidation = this.validator.validateId(id);
    if (!idValidation.isValid) {
      throw new Error(`Invalid board ID: ${idValidation.errors.join(', ')}`);
    }

    if (position < 0) {
      throw new Error('Position must be non-negative');
    }

    await this.repository.updatePosition(id, position);
  }

  async getStatistics(id: string): Promise<Board['statistics']> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid board ID: ${validation.errors.join(', ')}`);
    }

    return await this.repository.getStatistics(id);
  }

  async getColumns(id: string): Promise<Column[]> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid board ID: ${validation.errors.join(', ')}`);
    }

    return await this.columnRepository.findByBoardId(id);
  }

  async addColumn(
    boardId: string,
    columnData: Omit<Column, 'id' | 'createdAt' | 'updatedAt' | 'boardId'>,
    userId: string
  ): Promise<Column> {
    // Validate board access
    await this.canUserAccess(boardId, userId);

    // Add default values
    const columnWithDefaults = {
      ...columnData,
      boardId,
      position: columnData.position $1$2 0
    };

    return this.columnRepository.create(columnWithDefaults);
  }

  async removeColumn(boardId: string, columnId: string, userId: string): Promise<void> {
    // Check if user can edit the board
    if (!(await this.canUserEdit(boardId, userId))) {
      throw new Error('User does not have permission to edit this board');
    }

    // Check if column exists
    const column = await this.columnRepository.findById(columnId);
    if (!column) {
      throw new Error('Column not found');
    }

    // Check if column belongs to the board
    if (column.boardId !== boardId) {
      throw new Error('Column does not belong to this board');
    }

    // Check if column has tasks
    const tasks = await this.taskRepository.findByColumnId(columnId);
    if (tasks.length > 0) {
      throw new Error('Cannot delete column with tasks');
    }

    await this.columnRepository.delete(columnId);
  }

  async reorderColumns(
    boardId: string,
    columnIds: string[]
  ): Promise<void> {
    const idValidation = this.validator.validateId(boardId);
    if (!idValidation.isValid) {
      throw new Error(`Invalid board ID: ${idValidation.errors.join(', ')}`);
    }

    if (!Array.isArray(columnIds) || columnIds.length === 0) {
      throw new Error('Column IDs array is required');
    }

    // Validate all column IDs
    for (const columnId of columnIds) {
      const validation = this.validator.validateId(columnId);
      if (!validation.isValid) {
        throw new Error(`Invalid column ID: ${columnId}`);
      }
    }

    // Check if board exists
    const existingBoard = await this.repository.findById(boardId);
    if (!existingBoard) {
      throw new Error('Board not found');
    }

    // Business logic: Cannot reorder columns in archived board
    if (existingBoard.isArchived) {
      throw new Error('Cannot reorder columns in archived board');
    }

    // Verify all columns belong to the board
    const existingColumns = await this.columnRepository.findByBoardId(boardId);
    const existingColumnIds = existingColumns.map(c => c.id);
    
    for (const columnId of columnIds) {
      if (!existingColumnIds.includes(columnId)) {
        throw new Error(`Column ${columnId} does not belong to this board`);
      }
    }

    // Check if all columns are included
    if (columnIds.length !== existingColumnIds.length) {
      throw new Error('All columns must be included in reorder operation');
    }

    await this.columnRepository.reorderColumns(boardId, columnIds);
  }

  async reorder(projectId: string, boardIds: string[], userId: string): Promise<void> {
    const projectIdValidation = this.validator.validateId(projectId);
    if (!projectIdValidation.isValid) {
      throw new Error(`Invalid project ID: ${projectIdValidation.errors.join(', ')}`);
    }

    if (!Array.isArray(boardIds) || boardIds.length === 0) {
      throw new Error('Board IDs array is required');
    }

    // Validate all board IDs
    for (const boardId of boardIds) {
      const validation = this.validator.validateId(boardId);
      if (!validation.isValid) {
        throw new Error(`Invalid board ID: ${boardId}`);
      }
    }

    await this.repository.reorderBoards(projectId, boardIds);
  }

  async updateColumn(columnId: string, updates: Partial<Column>, userId: string): Promise<Column> {
    const validation = this.validator.validateId(columnId);
    if (!validation.isValid) {
      throw new Error(`Invalid column ID: ${validation.errors.join(', ')}`);
    }

    const updateValidation = this.validator.validateColumn(updates);
    if (!updateValidation.isValid) {
      throw new Error(`Invalid column data: ${updateValidation.errors.join(', ')}`);
    }

    // Check if column exists
    const existingColumn = await this.columnRepository.findById(columnId);
    if (!existingColumn) {
      throw new Error('Column not found');
    }

    return await this.columnRepository.update(columnId, updates);
  }

  async deleteColumn(columnId: string, userId: string): Promise<void> {
    const validation = this.validator.validateId(columnId);
    if (!validation.isValid) {
      throw new Error(`Invalid column ID: ${validation.errors.join(', ')}`);
    }

    // Check if column exists
    const existingColumn = await this.columnRepository.findById(columnId);
    if (!existingColumn) {
      throw new Error('Column not found');
    }

    await this.columnRepository.delete(columnId);
  }

  async canUserAccess(boardId: string, userId: string): Promise<boolean> {
    const boardIdValidation = this.validator.validateId(boardId);
    if (!boardIdValidation.isValid) {
      return false;
    }

    const userIdValidation = this.validator.validateId(userId);
    if (!userIdValidation.isValid) {
      return false;
    }

    try {
      const board = await this.repository.findById(boardId);
      if (!board) {
        return false;
      }

      // Check project access through project service
      // This would typically be injected as a dependency
      // For now, we'll assume access if board exists
      return true;
    } catch {
      return false;
    }
  }

  async canUserEdit(boardId: string, userId: string): Promise<boolean> {
    const hasAccess = await this.canUserAccess(boardId, userId);
    if (!hasAccess) {
      return false;
    }

    try {
      const board = await this.repository.findById(boardId);
      if (!board) {
        return false;
      }

      // Business logic: Cannot edit archived boards
      if (board.isArchived) {
        return false;
      }

      // Check project permissions through project service
      // This would typically be injected as a dependency
      // For now, we'll assume edit access if board exists and is not archived
      return true;
    } catch {
      return false;
    }
  }

  async search(
    query: string,
    projectId$1: string,
    filters$2: SearchFilters
  ): Promise<Board[]> {
    if (!query || query.trim().length === 0) {
      throw new Error('Search query is required');
    }

    if (projectId) {
      const validation = this.validator.validateId(projectId);
      if (!validation.isValid) {
        throw new Error(`Invalid project ID: ${validation.errors.join(', ')}`);
      }
    }

    if (filters) {
      const validation = this.validator.validateSearchFilters(filters);
      if (!validation.isValid) {
        throw new Error(`Invalid search filters: ${validation.errors.join(', ')}`);
      }
    }

    return await this.repository.search(query, projectId, filters);
  }

  async getRecentlyViewed(
    userId: string,
    limit: number = 10
  ): Promise<Board[]> {
    const validation = this.validator.validateId(userId);
    if (!validation.isValid) {
      throw new Error(`Invalid user ID: ${validation.errors.join(', ')}`);
    }

    if (limit <= 0 || limit > 50) {
      throw new Error('Limit must be between 1 and 50');
    }

    return await this.repository.getRecentlyViewed(userId, limit);
  }

  async markAsViewed(boardId: string, userId: string): Promise<void> {
    const boardIdValidation = this.validator.validateId(boardId);
    if (!boardIdValidation.isValid) {
      throw new Error(`Invalid board ID: ${boardIdValidation.errors.join(', ')}`);
    }

    const userIdValidation = this.validator.validateId(userId);
    if (!userIdValidation.isValid) {
      throw new Error(`Invalid user ID: ${userIdValidation.errors.join(', ')}`);
    }

    // Check if board exists and user has access
    const hasAccess = await this.canUserAccess(boardId, userId);
    if (!hasAccess) {
      throw new Error('User does not have access to this board');
    }

    await this.repository.markAsViewed(boardId, userId);
  }
}

// Export singleton instance
export const boardService = new BoardService();