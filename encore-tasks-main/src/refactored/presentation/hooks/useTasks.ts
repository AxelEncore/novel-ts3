import { useState, useEffect, useCallback, useMemo } from 'react';
import { Task, CreateTaskData, UpdateTaskData, TaskStatus, TaskPriority } from '../../data/types';
import { taskService } from '../../business/services/task.service';
import { useAuth } from '../context/AuthContext';
import { useDebounce } from './useDebounce';

interface TaskFilters {
  search?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  projectId?: string;
  boardId?: string;
  columnId?: string;
  assigneeId?: string;
  showArchived?: boolean;
  isOverdue?: boolean;
  hasDueDate?: boolean;
  hasNoDueDate?: boolean;
}

interface TaskSortOptions {
  field: 'title' | 'createdAt' | 'updatedAt' | 'dueDate' | 'priority' | 'status' | 'progress';
  order: 'asc' | 'desc';
}

interface UseTasksOptions {
  projectId?: string;
  boardId?: string;
  columnId?: string;
  autoLoad?: boolean;
  pageSize?: number;
  filters?: TaskFilters;
  sort?: TaskSortOptions;
}

interface UseTasksReturn {
  // Data
  tasks: Task[];
  totalTasks: number;
  totalPages: number;
  currentPage: number;
  
  // Loading states
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isArchiving: boolean;
  isRestoring: boolean;
  
  // Error states
  error: string | null;
  
  // Filters and sorting
  filters: TaskFilters;
  sort: TaskSortOptions;
  
  // Actions
  loadTasks: () => Promise<void>;
  createTask: (data: CreateTaskData) => Promise<Task>;
  updateTask: (id: string, data: UpdateTaskData) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  archiveTask: (id: string) => Promise<void>;
  restoreTask: (id: string) => Promise<void>;
  
  // Filter and sort actions
  setFilters: (filters: Partial<TaskFilters>) => void;
  setSort: (sort: TaskSortOptions) => void;
  clearFilters: () => void;
  
  // Pagination
  setPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  
  // Utility
  refreshTasks: () => Promise<void>;
  getTaskById: (id: string) => Task | undefined;
}

const DEFAULT_FILTERS: TaskFilters = {
  search: '',
  showArchived: false,
  isOverdue: false,
  hasDueDate: false,
  hasNoDueDate: false
};

const DEFAULT_SORT: TaskSortOptions = {
  field: 'updatedAt',
  order: 'desc'
};

export const useTasks = (options: UseTasksOptions = {}): UseTasksReturn => {
  const {
    projectId,
    boardId,
    columnId,
    autoLoad = false,
    pageSize = 20,
    filters: initialFilters = {},
    sort: initialSort = DEFAULT_SORT
  } = options;
  
  const { user } = useAuth();

  // State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [totalTasks, setTotalTasks] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<TaskFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
    projectId,
    boardId,
    columnId
  });
  const [sort, setSortState] = useState<TaskSortOptions>(initialSort);

  // Debounced search
  const debouncedSearch = useDebounce(filters.search || '', 300);

  // Computed values
  const totalPages = Math.ceil(totalTasks / pageSize);

  // Update filters when props change
  useEffect(() => {
    setFiltersState(prev => ({
      ...prev,
      projectId,
      boardId,
      columnId
    }));
  }, [projectId, boardId, columnId]);

  // Load tasks function
  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const queryFilters = {
        ...filters,
        search: debouncedSearch
      };

      let tasks: Task[] = [];
      
      // Choose the most specific method based on available filters
      if (queryFilters.columnId) {
        tasks = await taskService.getByColumnId(queryFilters.columnId, user?.id || '');
      } else if (queryFilters.boardId) {
        tasks = await taskService.getByBoardId(queryFilters.boardId, user?.id || '');
      } else if (queryFilters.projectId) {
        tasks = await taskService.getByProjectId(queryFilters.projectId, user?.id || '');
      } else if (queryFilters.assigneeId) {
        tasks = await taskService.getByAssigneeId(queryFilters.assigneeId, user?.id || '');
      } else if (queryFilters.search) {
        // Use search method for text-based queries
        tasks = await taskService.search(queryFilters.search, user?.id || '', {
          projectIds: queryFilters.projectId ? [queryFilters.projectId] : undefined,
          boardIds: queryFilters.boardId ? [queryFilters.boardId] : undefined,
          columnIds: queryFilters.columnId ? [queryFilters.columnId] : undefined
        });
      } else {
        // If no specific filter, get tasks by project (assuming we have a projectId)
        tasks = queryFilters.projectId ? 
          await taskService.getByProjectId(queryFilters.projectId, user?.id || '') : [];
      }
      
      // Apply client-side filtering for properties not handled by the service methods
      let filteredTasks = tasks.filter(task => {
        if (queryFilters.status && task.status !== queryFilters.status) return false;
        if (queryFilters.priority && task.priority !== queryFilters.priority) return false;
        if (queryFilters.showArchived !== undefined && task.isArchived !== queryFilters.showArchived) return false;
        if (queryFilters.isOverdue && (!task.dueDate || new Date(task.dueDate) >= new Date())) return false;
        if (queryFilters.hasDueDate && !task.dueDate) return false;
        if (queryFilters.hasNoDueDate && task.dueDate) return false;
        return true;
      });
      
      // Apply sorting
      filteredTasks.sort((a, b) => {
        const aValue = a[sort.field];
        const bValue = b[sort.field];
        
        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;
        
        let comparison = 0;
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          comparison = aValue.localeCompare(bValue);
        } else if (aValue instanceof Date && bValue instanceof Date) {
          comparison = aValue.getTime() - bValue.getTime();
        } else {
          comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        }
        
        return sort.order === 'desc' ? -comparison : comparison;
      });
      
      // Apply pagination
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedTasks = filteredTasks.slice(startIndex, endIndex);
      
      setTasks(paginatedTasks);
      setTotalTasks(filteredTasks.length);
    } catch (err) {
      console.error('Error loading tasks:', err);
      setError('Failed to load tasks. Please try again.');
      setTasks([]);
      setTotalTasks(0);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, filters, debouncedSearch, sort]);

  // Auto-load tasks when dependencies change
  useEffect(() => {
    if (autoLoad) {
      loadTasks();
    }
  }, [loadTasks, autoLoad]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sort, debouncedSearch]);

  // Create task
  const createTask = useCallback(async (data: CreateTaskData): Promise<Task> => {
    setIsCreating(true);
    setError(null);

    try {
      // Prepare task data with required properties
      const taskWithDefaults = {
        ...data,
        status: 'todo' as const,
        priority: data.priority || 'medium' as const,
        position: 0, // Default position
        reporterId: user?.id || '',
        isArchived: false,
        tags: data.tags || [],
        projectId: data.projectId || '',
        boardId: data.boardId || '',
        metadata: {
          complexity: 1,
          businessValue: 1,
          technicalDebt: false
        }
      };
      
      const newTask = await taskService.create(taskWithDefaults, user?.id || '');
      
      // Add to current list if it matches filters
      const matchesFilters = (
        (!filters.projectId || newTask.projectId === filters.projectId) &&
        (!filters.boardId || newTask.boardId === filters.boardId) &&
        (!filters.columnId || newTask.columnId === filters.columnId) &&
        (!filters.status || newTask.status === filters.status) &&
        (!filters.priority || newTask.priority === filters.priority) &&
        (!filters.assigneeId || newTask.assignees?.some(a => a.id === filters.assigneeId)) &&
        (filters.showArchived || !newTask.isArchived)
      );

      if (matchesFilters) {
        setTasks(prev => [newTask, ...prev]);
        setTotalTasks(prev => prev + 1);
      }

      return newTask;
    } catch (err) {
      console.error('Error creating task:', err);
      setError('Failed to create task. Please try again.');
      throw err;
    } finally {
      setIsCreating(false);
    }
  }, [filters]);

  // Update task
  const updateTask = useCallback(async (id: string, data: UpdateTaskData): Promise<Task> => {
    setIsUpdating(true);
    setError(null);

    try {
      const updatedTask = await taskService.update(id, data, user?.id || '');
      
      setTasks(prev => prev.map(task => 
        task.id === id ? updatedTask : task
      ));

      return updatedTask;
    } catch (err) {
      console.error('Error updating task:', err);
      setError('Failed to update task. Please try again.');
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  // Delete task
  const deleteTask = useCallback(async (id: string): Promise<void> => {
    setIsDeleting(true);
    setError(null);

    try {
      await taskService.delete(id, user?.id || '');
      
      setTasks(prev => prev.filter(task => task.id !== id));
      setTotalTasks(prev => prev - 1);
    } catch (err) {
      console.error('Error deleting task:', err);
      setError('Failed to delete task. Please try again.');
      throw err;
    } finally {
      setIsDeleting(false);
    }
  }, []);

  // Archive task
  const archiveTask = useCallback(async (id: string): Promise<void> => {
    setIsArchiving(true);
    setError(null);

    try {
      const archivedTask = await taskService.archive(id, user?.id || '');
      
      if (filters.showArchived) {
        setTasks(prev => prev.map(task => 
          task.id === id ? archivedTask : task
        ));
      } else {
        setTasks(prev => prev.filter(task => task.id !== id));
        setTotalTasks(prev => prev - 1);
      }
    } catch (err) {
      console.error('Error archiving task:', err);
      setError('Failed to archive task. Please try again.');
      throw err;
    } finally {
      setIsArchiving(false);
    }
  }, [filters.showArchived]);

  // Restore task
  const restoreTask = useCallback(async (id: string): Promise<void> => {
    setIsRestoring(true);
    setError(null);

    try {
      const restoredTask = await taskService.restore(id, user?.id || '');
      
      setTasks(prev => prev.map(task => 
        task.id === id ? restoredTask : task
      ));
    } catch (err) {
      console.error('Error restoring task:', err);
      setError('Failed to restore task. Please try again.');
      throw err;
    } finally {
      setIsRestoring(false);
    }
  }, []);

  // Filter actions
  const setFilters = useCallback((newFilters: Partial<TaskFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  const setSort = useCallback((newSort: TaskSortOptions) => {
    setSortState(newSort);
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState({
      ...DEFAULT_FILTERS,
      projectId,
      boardId,
      columnId
    });
    setSortState(DEFAULT_SORT);
  }, [projectId, boardId, columnId]);

  // Pagination actions
  const setPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const nextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  }, []);

  // Utility functions
  const refreshTasks = useCallback(async () => {
    await loadTasks();
  }, [loadTasks]);

  const getTaskById = useCallback((id: string): Task | undefined => {
    return tasks.find(task => task.id === id);
  }, [tasks]);

  // Memoized return value
  return useMemo(() => ({
    // Data
    tasks,
    totalTasks,
    totalPages,
    currentPage,
    
    // Loading states
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    isArchiving,
    isRestoring,
    
    // Error states
    error,
    
    // Filters and sorting
    filters,
    sort,
    
    // Actions
    loadTasks,
    createTask,
    updateTask,
    deleteTask,
    archiveTask,
    restoreTask,
    
    // Filter and sort actions
    setFilters,
    setSort,
    clearFilters,
    
    // Pagination
    setPage,
    nextPage,
    prevPage,
    
    // Utility
    refreshTasks,
    getTaskById
  }), [
    tasks,
    totalTasks,
    totalPages,
    currentPage,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    isArchiving,
    isRestoring,
    error,
    filters,
    sort,
    loadTasks,
    createTask,
    updateTask,
    deleteTask,
    archiveTask,
    restoreTask,
    setFilters,
    setSort,
    clearFilters,
    setPage,
    nextPage,
    prevPage,
    refreshTasks,
    getTaskById
  ]);
};

export default useTasks;