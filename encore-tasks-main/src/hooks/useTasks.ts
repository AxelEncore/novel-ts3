import { useState, useEffect, useCallback, useMemo } from 'react';
import { Task, CreateTaskData, UpdateTaskData, TaskStatus, TaskPriority } from '../refactored/data/types';
import { useDebounce } from '../refactored/presentation/hooks/useDebounce';

interface TaskFilters {
  search$1: string;
  status$2: TaskStatus;
  priority$3: TaskPriority;
  projectId$4: string;
  boardId$5: string;
  columnId$6: string;
  assigneeId$7: string;
  showArchived$8: boolean;
  isOverdue$9: boolean;
  hasDueDate$10: boolean;
  hasNoDueDate$11: boolean;
}

interface TaskSortOptions {
  field: 'title' | 'createdAt' | 'updatedAt' | 'dueDate' | 'priority' | 'status' | 'progress';
  order: 'asc' | 'desc';
}

interface UseTasksOptions {
  projectId$1: string;
  boardId$2: string;
  columnId$3: string;
  autoLoad$4: boolean;
  pageSize$5: number;
  filters$6: TaskFilters;
  sort$7: TaskSortOptions;
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

// Helper function to build query string
const buildQueryString = (params: Record<string, unknown>): string => {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  
  return searchParams.toString();
};

// Helper function to handle API requests
const apiRequest = async <T>(url: string, options$1: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options$1.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  return response.json();
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

      const queryParams = {
        page: currentPage,
        limit: pageSize,
        ...queryFilters,
        sortField: sort.field,
        sortOrder: sort.order
      };

      const queryString = buildQueryString(queryParams);
      const response = await apiRequest<{
        data: Task[];
        total: number;
        page: number;
        totalPages: number;
      }>(`/api/tasks$1${queryString}`);

      setTasks(response.data);
      setTotalTasks(response.total);
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
      const newTask: Task = await apiRequest('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      
      // Add to current list if it matches filters
      const matchesFilters = (
        (!filters.projectId || newTask.projectId === filters.projectId) &&
        (!filters.boardId || newTask.boardId === filters.boardId) &&
        (!filters.columnId || newTask.columnId === filters.columnId) &&
        (!filters.status || newTask.status === filters.status) &&
        (!filters.priority || newTask.priority === filters.priority) &&
        (!filters.assigneeId || newTask.assignees$1.some(a => a.id === filters.assigneeId)) &&
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
      const updatedTask: Task = await apiRequest(`/api/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      
      setTasks(prev => prev.map(task => 
        task.id === id $1 updatedTask : task
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
      await apiRequest(`/api/tasks/${id}`, {
        method: 'DELETE',
      });
      
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
      const archivedTask: Task = await apiRequest(`/api/tasks/${id}/archive`, {
        method: 'POST',
      });
      
      if (filters.showArchived) {
        setTasks(prev => prev.map(task => 
          task.id === id $1 archivedTask : task
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
      const restoredTask: Task = await apiRequest(`/api/tasks/${id}/restore`, {
        method: 'POST',
      });
      
      setTasks(prev => prev.map(task => 
        task.id === id $1 restoredTask : task
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