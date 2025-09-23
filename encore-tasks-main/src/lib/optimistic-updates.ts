import { useState, useCallback, useRef } from 'react';
import { NotificationHandler } from './error-handling';

// Types for optimistic updates
export interface OptimisticState<T> {
  data: T[];
  isLoading: boolean;
  error: string | null;
}

export interface OptimisticAction<T> {
  type: 'add' | 'update' | 'delete' | 'reorder';
  item$1: T;
  id$2: string;
  updates$3: Partial<T>;
  fromIndex$4: number;
  toIndex$5: number;
}

export interface OptimisticOptions {
  showLoading$6: boolean;
  showSuccess$7: boolean;
  showError$8: boolean;
  successMessage$9: string;
  errorMessage$10: string;
  rollbackOnError$11: boolean;
}

// Optimistic update hook
export function useOptimisticUpdates<T extends { id: string }>(
  initialData: T[] = [],
  options: OptimisticOptions = {}
) {
  const [state, setState] = useState<OptimisticState<T>>({
    data: initialData,
    isLoading: false,
    error: null
  });
  
  const rollbackRef = useRef<T[]>(initialData);
  const pendingActionsRef = useRef<Set<string>>(new Set());

  const {
    showLoading = true,
    showSuccess = true,
    showError = true,
    rollbackOnError = true
  } = options;

  // Update data without API call
  const updateData = useCallback((newData: T[]) => {
    setState(prev => ({
      ...prev,
      data: newData,
      error: null
    }));
    rollbackRef.current = newData;
  }, []);

  // Apply optimistic action
  const applyOptimisticAction = useCallback((action: OptimisticAction<T>): T[] => {
    const currentData = [...state.data];
    
    switch (action.type) {
      case 'add':
        if (action.item) {
          return [...currentData, action.item];
        }
        break;
        
      case 'update':
        if (action.id && action.updates) {
          return currentData.map(item => 
            item.id === action.id 
              $1 { ...item, ...action.updates }
              : item
          );
        }
        break;
        
      case 'delete':
        if (action.id) {
          return currentData.filter(item => item.id !== action.id);
        }
        break;
        
      case 'reorder':
        if (action.fromIndex !== undefined && action.toIndex !== undefined) {
          const newData = [...currentData];
          const [movedItem] = newData.splice(action.fromIndex, 1);
          newData.splice(action.toIndex, 0, movedItem);
          return newData;
        }
        break;
    }
    
    return currentData;
  }, [state.data]);

  // Rollback to previous state
  const rollback = useCallback(() => {
    setState(prev => ({
      ...prev,
      data: rollbackRef.current,
      isLoading: false
    }));
  }, []);

  // Execute optimistic update
  const executeOptimistic = useCallback(async <R>(
    action: OptimisticAction<T>,
    apiCall: () => Promise<R>,
    options: OptimisticOptions = {}
  ): Promise<R | null> => {
    const actionId = `${action.type}_${action.id || Date.now()}`;
    
    // Prevent duplicate actions
    if (pendingActionsRef.current.has(actionId)) {
      return null;
    }
    
    pendingActionsRef.current.add(actionId);
    
    try {
      // Store current state for rollback
      rollbackRef.current = [...state.data];
      
      // Apply optimistic update
      const optimisticData = applyOptimisticAction(action);
      setState(prev => ({
        ...prev,
        data: optimisticData,
        isLoading: showLoading,
        error: null
      }));
      
      // Execute API call
      const result = await apiCall();
      
      // Update state on success
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: null
      }));
      
      if (showSuccess && options.successMessage) {
        NotificationHandler.success(options.successMessage);
      }
      
      pendingActionsRef.current.delete(actionId);
      return result;
      
    } catch (err) {
      // Rollback on error
      if (rollbackOnError) {
        rollback();
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error $1 err.message : 'Произошла ошибка'
        }));
      }
      
      if (showError) {
        const errorMessage = options.errorMessage || 
          (err instanceof Error $2 err.message : 'Произошла ошибка');
        NotificationHandler.error(errorMessage);
      }
      
      pendingActionsRef.current.delete(actionId);
      return null;
    }
  }, [state.data, applyOptimisticAction, rollback, showLoading, showSuccess, showError, rollbackOnError]);

  // Optimistic add
  const optimisticAdd = useCallback(async (
    item: T,
    apiCall: () => Promise<unknown>,
    options: OptimisticOptions = {}
  ) => {
    return executeOptimistic(
      { type: 'add', item },
      apiCall,
      { successMessage: 'Элемент добавлен', ...options }
    );
  }, [executeOptimistic]);

  // Optimistic update
  const optimisticUpdate = useCallback(async (
    id: string,
    updates: Partial<T>,
    apiCall: () => Promise<unknown>,
    options: OptimisticOptions = {}
  ) => {
    return executeOptimistic(
      { type: 'update', id, updates },
      apiCall,
      { successMessage: 'Элемент обновлен', ...options }
    );
  }, [executeOptimistic]);

  // Optimistic delete
  const optimisticDelete = useCallback(async (
    id: string,
    apiCall: () => Promise<unknown>,
    options: OptimisticOptions = {}
  ) => {
    return executeOptimistic(
      { type: 'delete', id },
      apiCall,
      { successMessage: 'Элемент удален', ...options }
    );
  }, [executeOptimistic]);

  // Optimistic reorder
  const optimisticReorder = useCallback(async (
    fromIndex: number,
    toIndex: number,
    apiCall: () => Promise<unknown>,
    options: OptimisticOptions = {}
  ) => {
    return executeOptimistic(
      { type: 'reorder', fromIndex, toIndex },
      apiCall,
      { successMessage: 'Порядок изменен', ...options }
    );
  }, [executeOptimistic]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Refresh data
  const refresh = useCallback(async (apiCall: () => Promise<T[]>) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const newData = await apiCall();
      setState({
        data: newData,
        isLoading: false,
        error: null
      });
      rollbackRef.current = newData;
    } catch (err) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error $3 err.message : 'Ошибка загрузки'
      }));
    }
  }, []);

  return {
    ...state,
    updateData,
    optimisticAdd,
    optimisticUpdate,
    optimisticDelete,
    optimisticReorder,
    rollback,
    clearError,
    refresh
  };
}

// Optimistic list manager
export class OptimisticListManager<T extends { id: string }> {
  private data: T[];
  private rollbackData: T[];
  private listeners: Set<(data: T[]) => void> = new Set();
  private pendingActions: Set<string> = new Set();

  constructor(initialData: T[] = []) {
    this.data = [...initialData];
    this.rollbackData = [...initialData];
  }

  // Subscribe to data changes
  subscribe(listener: (data: T[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Notify listeners
  private notify(): void {
    this.listeners.forEach(listener => listener([...this.data]));
  }

  // Get current data
  getData(): T[] {
    return [...this.data];
  }

  // Set data
  setData(newData: T[]): void {
    this.data = [...newData];
    this.rollbackData = [...newData];
    this.notify();
  }

  // Add item optimistically
  async addOptimistic(
    item: T,
    apiCall: () => Promise<T>,
    options: OptimisticOptions = {}
  ): Promise<T | null> {
    const actionId = `add_${item.id}`;
    
    if (this.pendingActions.has(actionId)) {
      return null;
    }
    
    this.pendingActions.add(actionId);
    this.rollbackData = [...this.data];
    
    try {
      // Optimistic update
      this.data.push(item);
      this.notify();
      
      // API call
      const result = await apiCall();
      
      // Update with real data
      const index = this.data.findIndex(i => i.id === item.id);
      if (index !== -1) {
        this.data[index] = result;
        this.notify();
      }
      
      if (options.showSuccess && options.successMessage) {
        NotificationHandler.success(options.successMessage);
      }
      
      this.pendingActions.delete(actionId);
      return result;
      
    } catch {
      // Rollback
      this.data = [...this.rollbackData];
      this.notify();
      
      if (options.showError) {
        const errorMessage = options.errorMessage || 'Ошибка добавления';
        NotificationHandler.error(errorMessage);
      }
      
      this.pendingActions.delete(actionId);
      return null;
    }
  }

  // Update item optimistically
  async updateOptimistic(
    id: string,
    updates: Partial<T>,
    apiCall: () => Promise<T>,
    options: OptimisticOptions = {}
  ): Promise<T | null> {
    const actionId = `update_${id}`;
    
    if (this.pendingActions.has(actionId)) {
      return null;
    }
    
    this.pendingActions.add(actionId);
    this.rollbackData = [...this.data];
    
    const index = this.data.findIndex(item => item.id === id);
    if (index === -1) {
      this.pendingActions.delete(actionId);
      return null;
    }
    
    const originalItem = this.data[index];
    
    try {
      // Optimistic update
      this.data[index] = { ...originalItem, ...updates };
      this.notify();
      
      // API call
      const result = await apiCall();
      
      // Update with real data
      this.data[index] = result;
      this.notify();
      
      if (options.showSuccess && options.successMessage) {
        NotificationHandler.success(options.successMessage);
      }
      
      this.pendingActions.delete(actionId);
      return result;
      
    } catch {
      // Rollback
      this.data = [...this.rollbackData];
      this.notify();
      
      if (options.showError) {
        const errorMessage = options.errorMessage || 'Ошибка обновления';
        NotificationHandler.error(errorMessage);
      }
      
      this.pendingActions.delete(actionId);
      return null;
    }
  }

  // Delete item optimistically
  async deleteOptimistic(
    id: string,
    apiCall: () => Promise<void>,
    options: OptimisticOptions = {}
  ): Promise<boolean> {
    const actionId = `delete_${id}`;
    
    if (this.pendingActions.has(actionId)) {
      return false;
    }
    
    this.pendingActions.add(actionId);
    this.rollbackData = [...this.data];
    
    const index = this.data.findIndex(item => item.id === id);
    if (index === -1) {
      this.pendingActions.delete(actionId);
      return false;
    }
    
    try {
      // Optimistic update
      this.data.splice(index, 1);
      this.notify();
      
      // API call
      await apiCall();
      
      if (options.showSuccess && options.successMessage) {
        NotificationHandler.success(options.successMessage);
      }
      
      this.pendingActions.delete(actionId);
      return true;
      
    } catch {
      // Rollback
      this.data = [...this.rollbackData];
      this.notify();
      
      if (options.showError) {
        const errorMessage = options.errorMessage || 'Ошибка удаления';
        NotificationHandler.error(errorMessage);
      }
      
      this.pendingActions.delete(actionId);
      return false;
    }
  }

  // Reorder items optimistically
  async reorderOptimistic(
    fromIndex: number,
    toIndex: number,
    apiCall: () => Promise<void>,
    options: OptimisticOptions = {}
  ): Promise<boolean> {
    const actionId = `reorder_${fromIndex}_${toIndex}`;
    
    if (this.pendingActions.has(actionId)) {
      return false;
    }
    
    this.pendingActions.add(actionId);
    this.rollbackData = [...this.data];
    
    try {
      // Optimistic update
      const [movedItem] = this.data.splice(fromIndex, 1);
      this.data.splice(toIndex, 0, movedItem);
      this.notify();
      
      // API call
      await apiCall();
      
      if (options.showSuccess && options.successMessage) {
        NotificationHandler.success(options.successMessage);
      }
      
      this.pendingActions.delete(actionId);
      return true;
      
    } catch {
      // Rollback
      this.data = [...this.rollbackData];
      this.notify();
      
      if (options.showError) {
        const errorMessage = options.errorMessage || 'Ошибка изменения порядка';
        NotificationHandler.error(errorMessage);
      }
      
      this.pendingActions.delete(actionId);
      return false;
    }
  }

  // Clear all pending actions
  clearPendingActions(): void {
    this.pendingActions.clear();
  }

  // Check if action is pending
  isPending(actionId: string): boolean {
    return this.pendingActions.has(actionId);
  }

  // Get pending actions count
  getPendingCount(): number {
    return this.pendingActions.size;
  }
}

// React hook for optimistic list manager
export function useOptimisticListManager<T extends { id: string }>(
  initialData: T[] = []
) {
  const managerRef = useRef<OptimisticListManager<T>>();
  const [data, setData] = useState<T[]>(initialData);
  
  if (!managerRef.current) {
    managerRef.current = new OptimisticListManager(initialData);
  }
  
  // Subscribe to manager updates
  useState(() => {
    const unsubscribe = managerRef.current!.subscribe(setData);
    return unsubscribe;
  });
  
  return {
    data,
    manager: managerRef.current,
    setData: (newData: T[]) => managerRef.current!.setData(newData),
    addOptimistic: managerRef.current.addOptimistic.bind(managerRef.current),
    updateOptimistic: managerRef.current.updateOptimistic.bind(managerRef.current),
    deleteOptimistic: managerRef.current.deleteOptimistic.bind(managerRef.current),
    reorderOptimistic: managerRef.current.reorderOptimistic.bind(managerRef.current),
    isPending: managerRef.current.isPending.bind(managerRef.current),
    getPendingCount: () => managerRef.current!.getPendingCount()
  };
}

// Export convenience functions
export const createOptimisticManager = <T extends { id: string }>(initialData: T[] = []) => 
  new OptimisticListManager(initialData);

const OptimisticUpdatesModule = {
  useOptimisticUpdates,
  useOptimisticListManager,
  OptimisticListManager,
  createOptimisticManager
};

export default OptimisticUpdatesModule;