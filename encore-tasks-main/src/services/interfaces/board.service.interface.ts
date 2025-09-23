/**
 * Интерфейсы сервисов для управления досками
 * Следует принципу инверсии зависимостей (DIP)
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

/**
 * Интерфейс репозитория для досок
 * Отвечает только за операции с данными (Single Responsibility)
 */
export interface IBoardRepository {
  // Основные CRUD операции
  findById(id: BoardId): Promise<Board | null>;
  findByProjectId(projectId: ProjectId, filters?: BoardFilters): Promise<Board[]>;
  findAll(filters?: BoardFilters, sort?: SortOptions, pagination?: PaginationOptions): Promise<PaginatedResponse<Board>>;
  create(boardData: CreateBoardDto & { createdBy: UserId }): Promise<Board>;
  update(id: BoardId, boardData: UpdateBoardDto, updatedBy: UserId): Promise<Board | null>;
  delete(id: BoardId): Promise<boolean>;
  archive(id: BoardId, archivedBy: UserId): Promise<boolean>;
  restore(id: BoardId, restoredBy: UserId): Promise<boolean>;
  
  // Специфичные операции
  updatePosition(id: BoardId, newPosition: number): Promise<boolean>;
  getMaxPosition(projectId: ProjectId): Promise<number>;
  existsByName(name: string, projectId: ProjectId, excludeId?: BoardId): Promise<boolean>;
  countByProject(projectId: ProjectId): Promise<number>;
}

/**
 * Интерфейс валидатора для досок
 * Отвечает только за валидацию (Single Responsibility)
 */
export interface IBoardValidator {
  validateCreateData(data: CreateBoardDto): Promise<OperationResult>;
  validateUpdateData(data: UpdateBoardDto, existingBoard: Board): Promise<OperationResult>;
  validateBoardName(name: string, projectId: ProjectId, excludeId?: BoardId): Promise<OperationResult>;
  validateBoardAccess(boardId: BoardId, userId: UserId, action: 'view' | 'edit' | 'delete'): Promise<OperationResult>;
}

/**
 * Интерфейс для управления правами доступа к доскам
 * Отвечает только за авторизацию (Single Responsibility)
 */
export interface IBoardPermissionService {
  getUserPermissions(boardId: BoardId, userId: UserId): Promise<BoardPermissions>;
  canUserViewBoard(boardId: BoardId, userId: UserId): Promise<boolean>;
  canUserEditBoard(boardId: BoardId, userId: UserId): Promise<boolean>;
  canUserDeleteBoard(boardId: BoardId, userId: UserId): Promise<boolean>;
  canUserCreateBoard(projectId: ProjectId, userId: UserId): Promise<boolean>;
}

/**
 * Интерфейс для событий досок
 * Отвечает только за события (Single Responsibility)
 */
export interface IBoardEventService {
  emitBoardCreated(board: Board, userId: UserId): Promise<void>;
  emitBoardUpdated(board: Board, userId: UserId, changes: Partial<Board>): Promise<void>;
  emitBoardDeleted(boardId: BoardId, userId: UserId): Promise<void>;
  emitBoardArchived(boardId: BoardId, userId: UserId): Promise<void>;
  getBoardEvents(boardId: BoardId, limit?: number): Promise<BoardEvent[]>;
}

/**
 * Основной интерфейс сервиса досок
 * Координирует работу других сервисов (Facade pattern)
 */
export interface IBoardService {
  // Основные операции
  getBoardById(id: BoardId, userId: UserId): Promise<OperationResult<Board>>;
  getBoardsByProject(projectId: ProjectId, userId: UserId, filters?: BoardFilters): Promise<OperationResult<Board[]>>;
  getAllBoards(userId: UserId, filters?: BoardFilters, sort?: SortOptions, pagination?: PaginationOptions): Promise<OperationResult<PaginatedResponse<Board>>>;
  createBoard(boardData: CreateBoardDto, userId: UserId): Promise<OperationResult<Board>>;
  updateBoard(id: BoardId, boardData: UpdateBoardDto, userId: UserId): Promise<OperationResult<Board>>;
  deleteBoard(id: BoardId, userId: UserId): Promise<OperationResult<boolean>>;
  archiveBoard(id: BoardId, userId: UserId): Promise<OperationResult<boolean>>;
  restoreBoard(id: BoardId, userId: UserId): Promise<OperationResult<boolean>>;
  
  // Специфичные операции
  reorderBoards(projectId: ProjectId, boardIds: BoardId[], userId: UserId): Promise<OperationResult<boolean>>;
  duplicateBoard(id: BoardId, newName: string, userId: UserId): Promise<OperationResult<Board>>;
  getBoardStatistics(id: BoardId, userId: UserId): Promise<OperationResult<Record<string, unknown>>>;
  
  // Операции с правами доступа
  getUserPermissions(boardId: BoardId, userId: UserId): Promise<OperationResult<BoardPermissions>>;
  
  // События
  getBoardEvents(boardId: BoardId, userId: UserId, limit?: number): Promise<OperationResult<BoardEvent[]>>;
}

/**
 * Интерфейс фабрики для создания досок
 * Применяет паттерн Factory (Open/Closed Principle)
 */
export interface IBoardFactory {
  createBoard(data: CreateBoardDto, createdBy: UserId): Board;
  createDefaultBoard(projectId: ProjectId, createdBy: UserId): Board;
  createBoardFromTemplate(templateId: string, data: Partial<CreateBoardDto>, createdBy: UserId): Board;
}

/**
 * Интерфейс для кэширования досок
 * Отвечает только за кэширование (Single Responsibility)
 */
export interface IBoardCacheService {
  getBoard(id: BoardId): Promise<Board | null>;
  setBoard(board: Board): Promise<void>;
  deleteBoard(id: BoardId): Promise<void>;
  getBoardsByProject(projectId: ProjectId): Promise<Board[] | null>;
  setBoardsByProject(projectId: ProjectId, boards: Board[]): Promise<void>;
  invalidateProjectBoards(projectId: ProjectId): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Интерфейс для поиска досок
 * Отвечает только за поиск (Single Responsibility)
 */
export interface IBoardSearchService {
  searchBoards(query: string, userId: UserId, filters?: BoardFilters): Promise<OperationResult<Board[]>>;
  indexBoard(board: Board): Promise<void>;
  removeFromIndex(boardId: BoardId): Promise<void>;
  updateIndex(board: Board): Promise<void>;
}

/**
 * Интерфейс для экспорта/импорта досок
 * Отвечает только за импорт/экспорт (Single Responsibility)
 */
export interface IBoardImportExportService {
  exportBoard(boardId: BoardId, format: 'json' | 'csv' | 'excel'): Promise<OperationResult<Buffer>>;
  importBoard(data: Buffer, format: 'json' | 'csv' | 'excel', projectId: ProjectId, userId: UserId): Promise<OperationResult<Board>>;
  validateImportData(data: Buffer, format: 'json' | 'csv' | 'excel'): Promise<OperationResult>;
}