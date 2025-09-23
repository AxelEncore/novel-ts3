/**
 * Реализация сервиса для управления досками
 * Следует принципам SOLID и использует Dependency Injection
 */

import {
  Board,
  BoardId,
  ProjectId,
  UserId,
  CreateBoardDto,
  UpdateBoardDto,
  BoardFilters,
  SortOptions,
  PaginationOptions,
  PaginatedResponse,
  OperationResult,
  BoardPermissions,
  BoardEvent
} from '../../types/board.types';

import {
  IBoardService,
  IBoardRepository,
  IBoardValidator,
  IBoardPermissionService,
  IBoardEventService,
  IBoardCacheService
} from '../interfaces/board.service.interface';

/**
 * Основная реализация сервиса досок
 * Применяет паттерн Facade для координации работы других сервисов
 */
export class BoardService implements IBoardService {
  constructor(
    private readonly boardRepository: IBoardRepository,
    private readonly boardValidator: IBoardValidator,
    private readonly permissionService: IBoardPermissionService,
    private readonly eventService: IBoardEventService,
    private readonly cacheService: IBoardCacheService
  ) {}

  async getBoardById(id: BoardId, userId: UserId): Promise<OperationResult<Board>> {
    try {
      // Проверяем права доступа
      const canView = await this.permissionService.canUserViewBoard(id, userId);
      if (!canView) {
        return {
          success: false,
          error: 'Access denied: You do not have permission to view this board'
        };
      }

      // Пытаемся получить из кэша
      let board: Board | null = null;
      if (this.cacheService) {
        board = await this.cacheService.getBoard(id);
      }

      // Если не в кэше, получаем из репозитория
      if (!board) {
        board = await this.boardRepository.findById(id);
        if (board && this.cacheService) {
          await this.cacheService.setBoard(board);
        }
      }

      if (!board) {
        return {
          success: false,
          error: 'Board not found'
        };
      }

      return {
        success: true,
        data: board
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get board: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async getBoardsByProject(projectId: ProjectId, userId: UserId, filters: BoardFilters): Promise<OperationResult<Board[]>> {
    try {
      // Пытаемся получить из кэша
      let boards: Board[] | null = null;
      if (this.cacheService && !filters) {
        boards = await this.cacheService.getBoardsByProject(projectId);
      }

      // Если не в кэше, получаем из репозитория
      if (!boards) {
        boards = await this.boardRepository.findByProjectId(projectId, filters);
        if (this.cacheService && !filters) {
          await this.cacheService.setBoardsByProject(projectId, boards);
        }
      }

      // Фильтруем доски по правам доступа
      const accessibleBoards: Board[] = [];
      for (const board of boards) {
        const canView = await this.permissionService.canUserViewBoard(board.id, userId);
        if (canView) {
          accessibleBoards.push(board);
        }
      }

      return {
        success: true,
        data: accessibleBoards
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get boards: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async getAllBoards(userId: UserId, filters: BoardFilters, sort: SortOptions, pagination: PaginationOptions): Promise<OperationResult<PaginatedResponse<Board>>> {
    try {
      const result = await this.boardRepository.findAll(filters, sort, pagination);
      
      // Фильтруем доски по правам доступа
      const accessibleBoards: Board[] = [];
      for (const board of result.data) {
        const canView = await this.permissionService.canUserViewBoard(board.id, userId);
        if (canView) {
          accessibleBoards.push(board);
        }
      }

      return {
        success: true,
        data: {
          ...result,
          data: accessibleBoards,
          pagination: {
            ...result.pagination,
            total: accessibleBoards.length
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get all boards: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async createBoard(boardData: CreateBoardDto, userId: UserId): Promise<OperationResult<Board>> {
    try {
      // Проверяем права на создание доски
      const canCreate = await this.permissionService.canUserCreateBoard(boardData.projectId, userId);
      if (!canCreate) {
        return {
          success: false,
          error: 'Access denied: You do not have permission to create boards in this project'
        };
      }

      // Валидируем данные
      const validationResult = await this.boardValidator.validateCreateData(boardData);
      if (!validationResult.success) {
        return validationResult;
      }

      // Создаем доску
      const board = await this.boardRepository.create({
        ...boardData,
        createdBy: userId
      });

      // Инвалидируем кэш проекта
      if (this.cacheService) {
        await this.cacheService.invalidateProjectBoards(boardData.projectId);
      }

      // Отправляем событие
      await this.eventService.emitBoardCreated(board, userId);

      return {
        success: true,
        data: board
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create board: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async updateBoard(id: BoardId, boardData: UpdateBoardDto, userId: UserId): Promise<OperationResult<Board>> {
    try {
      // Проверяем права на редактирование
      const canEdit = await this.permissionService.canUserEditBoard(id, userId);
      if (!canEdit) {
        return {
          success: false,
          error: 'Access denied: You do not have permission to edit this board'
        };
      }

      // Получаем существующую доску
      const existingBoard = await this.boardRepository.findById(id);
      if (!existingBoard) {
        return {
          success: false,
          error: 'Board not found'
        };
      }

      // Валидируем данные
      const validationResult = await this.boardValidator.validateUpdateData(boardData, existingBoard);
      if (!validationResult.success) {
        return validationResult;
      }

      // Обновляем доску
      const updatedBoard = await this.boardRepository.update(id, boardData, userId);
      if (!updatedBoard) {
        return {
          success: false,
          error: 'Failed to update board'
        };
      }

      // Обновляем кэш
      if (this.cacheService) {
        await this.cacheService.setBoard(updatedBoard);
        await this.cacheService.invalidateProjectBoards(updatedBoard.projectId);
      }

      // Отправляем событие
      await this.eventService.emitBoardUpdated(updatedBoard, userId, boardData);

      return {
        success: true,
        data: updatedBoard
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to update board: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async deleteBoard(id: BoardId, userId: UserId): Promise<OperationResult<boolean>> {
    try {
      // Проверяем права на удаление
      const canDelete = await this.permissionService.canUserDeleteBoard(id, userId);
      if (!canDelete) {
        return {
          success: false,
          error: 'Access denied: You do not have permission to delete this board'
        };
      }

      // Получаем доску для получения projectId
      const board = await this.boardRepository.findById(id);
      if (!board) {
        return {
          success: false,
          error: 'Board not found'
        };
      }

      // Удаляем доску
      const deleted = await this.boardRepository.delete(id);
      if (!deleted) {
        return {
          success: false,
          error: 'Failed to delete board'
        };
      }

      // Очищаем кэш
      if (this.cacheService) {
        await this.cacheService.deleteBoard(id);
        await this.cacheService.invalidateProjectBoards(board.projectId);
      }

      // Отправляем событие
      await this.eventService.emitBoardDeleted(id, userId);

      return {
        success: true,
        data: true
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete board: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async archiveBoard(id: BoardId, userId: UserId): Promise<OperationResult<boolean>> {
    try {
      // Проверяем права на архивирование
      const canEdit = await this.permissionService.canUserEditBoard(id, userId);
      if (!canEdit) {
        return {
          success: false,
          error: 'Access denied: You do not have permission to archive this board'
        };
      }

      // Получаем доску для получения projectId
      const board = await this.boardRepository.findById(id);
      if (!board) {
        return {
          success: false,
          error: 'Board not found'
        };
      }

      // Архивируем доску
      const archived = await this.boardRepository.archive(id, userId);
      if (!archived) {
        return {
          success: false,
          error: 'Failed to archive board'
        };
      }

      // Обновляем кэш
      if (this.cacheService) {
        await this.cacheService.deleteBoard(id);
        await this.cacheService.invalidateProjectBoards(board.projectId);
      }

      // Отправляем событие
      await this.eventService.emitBoardArchived(id, userId);

      return {
        success: true,
        data: true
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to archive board: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async restoreBoard(id: BoardId, userId: UserId): Promise<OperationResult<boolean>> {
    try {
      // Проверяем права на восстановление
      const canEdit = await this.permissionService.canUserEditBoard(id, userId);
      if (!canEdit) {
        return {
          success: false,
          error: 'Access denied: You do not have permission to restore this board'
        };
      }

      // Получаем доску для получения projectId
      const board = await this.boardRepository.findById(id);
      if (!board) {
        return {
          success: false,
          error: 'Board not found'
        };
      }

      // Восстанавливаем доску
      const restored = await this.boardRepository.restore(id, userId);
      if (!restored) {
        return {
          success: false,
          error: 'Failed to restore board'
        };
      }

      // Инвалидируем кэш
      if (this.cacheService) {
        await this.cacheService.invalidateProjectBoards(board.projectId);
      }

      return {
        success: true,
        data: true
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to restore board: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async reorderBoards(projectId: ProjectId, boardIds: BoardId[], userId: UserId): Promise<OperationResult<boolean>> {
    try {
      // Проверяем права на редактирование досок в проекте
      const canCreate = await this.permissionService.canUserCreateBoard(projectId, userId);
      if (!canCreate) {
        return {
          success: false,
          error: 'Access denied: You do not have permission to reorder boards in this project'
        };
      }

      // Обновляем позиции досок
      const updates = boardIds.map((boardId, index) => ({
        id: boardId,
        position: index + 1
      }));

      for (const update of updates) {
        await this.boardRepository.updatePosition(update.id, update.position);
      }

      // Инвалидируем кэш
      if (this.cacheService) {
        await this.cacheService.invalidateProjectBoards(projectId);
      }

      return {
        success: true,
        data: true
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to reorder boards: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async duplicateBoard(id: BoardId, newName: string, userId: UserId): Promise<OperationResult<Board>> {
    try {
      // Получаем исходную доску
      const originalBoard = await this.boardRepository.findById(id);
      if (!originalBoard) {
        return {
          success: false,
          error: 'Original board not found'
        };
      }

      // Проверяем права на просмотр исходной доски
      const canView = await this.permissionService.canUserViewBoard(id, userId);
      if (!canView) {
        return {
          success: false,
          error: 'Access denied: You do not have permission to view the original board'
        };
      }

      // Проверяем права на создание доски в проекте
      const canCreate = await this.permissionService.canUserCreateBoard(originalBoard.projectId, userId);
      if (!canCreate) {
        return {
          success: false,
          error: 'Access denied: You do not have permission to create boards in this project'
        };
      }

      // Создаем дубликат
      const duplicateData: CreateBoardDto = {
        name: newName,
        description: originalBoard.description,
        projectId: originalBoard.projectId,
        visibility: originalBoard.visibility,
        settings: originalBoard.settings,
        icon: originalBoard.icon,
        color: originalBoard.color
      };

      return await this.createBoard(duplicateData, userId);
    } catch (error) {
      return {
        success: false,
        error: `Failed to duplicate board: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async getBoardStatistics(id: BoardId, userId: UserId): Promise<OperationResult<Record<string, unknown>>> {
    try {
      // Проверяем права доступа
      const canView = await this.permissionService.canUserViewBoard(id, userId);
      if (!canView) {
        return {
          success: false,
          error: 'Access denied: You do not have permission to view this board'
        };
      }

      // Здесь будет логика получения статистики
      // Пока возвращаем заглушку
      const statistics = {
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        todoTasks: 0,
        totalColumns: 0
      };

      return {
        success: true,
        data: statistics
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get board statistics: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async getUserPermissions(boardId: BoardId, userId: UserId): Promise<OperationResult<BoardPermissions>> {
    try {
      const permissions = await this.permissionService.getUserPermissions(boardId, userId);
      return {
        success: true,
        data: permissions
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get user permissions: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async getBoardEvents(boardId: BoardId, userId: UserId, limit: number): Promise<OperationResult<BoardEvent[]>> {
    try {
      // Проверяем права доступа
      const canView = await this.permissionService.canUserViewBoard(boardId, userId);
      if (!canView) {
        return {
          success: false,
          error: 'Access denied: You do not have permission to view this board'
        };
      }

      const events = await this.eventService.getBoardEvents(boardId, limit);
      return {
        success: true,
        data: events
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get board events: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}