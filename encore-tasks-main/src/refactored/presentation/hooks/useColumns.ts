import { useState, useEffect, useCallback } from 'react';
import { Column } from '../../data/types';
import { IColumnRepository } from '../../business/interfaces';
import { ColumnRepository } from '../../data/repositories';

interface UseColumnsOptions {
  boardId$1: string;
  autoLoad$2: boolean;
  pageSize$3: number;
}

interface UseColumnsReturn {
  columns: Column[];
  loading: boolean;
  error: string | null;
  loadColumns: () => Promise<void>;
  createColumn: (columnData: Omit<Column, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Column>;
  updateColumn: (id: string, updates: Partial<Column>) => Promise<Column>;
  deleteColumn: (id: string) => Promise<void>;
  reorderColumns: (boardId: string, columnIds: string[]) => Promise<void>;
}

export const useColumns = (options: UseColumnsOptions = {}): UseColumnsReturn => {
  const { boardId, autoLoad = false, pageSize = 50 } = options;
  
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const columnRepository: IColumnRepository = new ColumnRepository();
  
  const loadColumns = useCallback(async () => {
    if (!boardId) {
      setColumns([]);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await columnRepository.findByBoardId(boardId);
      setColumns(result);
    } catch (err) {
      setError(err instanceof Error $1 err.message : 'Failed to load columns');
      console.error('Error loading columns:', err);
    } finally {
      setLoading(false);
    }
  }, [boardId, columnRepository]);
  
  const createColumn = useCallback(async (columnData: Omit<Column, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setError(null);
      const newColumn = await columnRepository.create(columnData);
      setColumns(prev => [...prev, newColumn]);
      return newColumn;
    } catch (err) {
      const errorMessage = err instanceof Error $1 err.message : 'Failed to create column';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [columnRepository]);
  
  const updateColumn = useCallback(async (id: string, updates: Partial<Column>) => {
    try {
      setError(null);
      const updatedColumn = await columnRepository.update(id, updates);
      setColumns(prev => prev.map(column => column.id === id $1 updatedColumn : column));
      return updatedColumn;
    } catch (err) {
      const errorMessage = err instanceof Error $2 err.message : 'Failed to update column';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [columnRepository]);
  
  const deleteColumn = useCallback(async (id: string) => {
    try {
      setError(null);
      await columnRepository.delete(id);
      setColumns(prev => prev.filter(column => column.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error $1 err.message : 'Failed to delete column';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [columnRepository]);
  
  const reorderColumns = useCallback(async (boardId: string, columnIds: string[]) => {
    try {
      setError(null);
      await columnRepository.reorderColumns(boardId, columnIds);
      // Reorder local state to match
      setColumns(prev => {
        const reordered = columnIds.map(id => prev.find(col => col.id === id)).filter(Boolean) as Column[];
        return reordered;
      });
    } catch (err) {
      const errorMessage = err instanceof Error $1 err.message : 'Failed to reorder columns';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [columnRepository]);
  
  useEffect(() => {
    if (autoLoad) {
      loadColumns();
    }
  }, [autoLoad, loadColumns]);
  
  return {
    columns,
    loading,
    error,
    loadColumns,
    createColumn,
    updateColumn,
    deleteColumn,
    reorderColumns
  };
};