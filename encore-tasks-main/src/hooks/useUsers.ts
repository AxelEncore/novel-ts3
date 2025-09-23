import { useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { api } from '../lib/api';

interface UseUsersOptions {
  autoLoad?: boolean;
}

interface UseUsersReturn {
  users: User[];
  loading: boolean;
  error: string | null;
  loadUsers: () => Promise<void>;
  createUser: (userData: Omit<User, 'id' | 'created_at' | 'updated_at'>) => Promise<User>;
  updateUser: (id: string, updates: Partial<User>) => Promise<User>;
  deleteUser: (id: string) => Promise<void>;
  getUserByEmail: (email: string) => Promise<User | null>;
}

export const useUsers = (options: UseUsersOptions = {}): UseUsersReturn => {
  const { autoLoad = false } = options;
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await api.get('/users');
      setUsers(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  }, []);
  
  const createUser = useCallback(async (userData: Omit<User, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setError(null);
      const newUser = await api.post('/users', userData);
      setUsers(prev => [...prev, newUser.data]);
      return newUser.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
      throw new Error(err instanceof Error ? err.message : 'Failed to create user');
    }
  }, []);
  
  const updateUser = useCallback(async (id: string, updates: Partial<User>) => {
    try {
      setError(null);
      const updatedUser = await api.put(`/users/${id}`, updates);
      setUsers(prev => prev.map(user => user.id === id ? updatedUser.data : user));
      return updatedUser.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
      throw new Error(err instanceof Error ? err.message : 'Failed to update user');
    }
  }, []);
  
  const deleteUser = useCallback(async (id: string) => {
    try {
      setError(null);
      await api.delete(`/users/${id}`);
      setUsers(prev => prev.filter(user => user.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
      throw new Error(err instanceof Error ? err.message : 'Failed to delete user');
    }
  }, []);
  
  const getUserByEmail = useCallback(async (email: string) => {
    try {
      setError(null);
      // Filter existing users by email
      const filtered = users.filter(user => 
        user.name.toLowerCase().includes(email.toLowerCase()) ||
        user.email.toLowerCase().includes(email.toLowerCase())
      );
      return filtered[0] || null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search users');
      throw new Error(err instanceof Error ? err.message : 'Failed to search users');
    }
  }, [users]);
  
  const searchUsers = useCallback(async (query: string) => {
    try {
      setError(null);
      const filtered = users.filter(user => 
        user.name.toLowerCase().includes(query.toLowerCase()) ||
        user.email.toLowerCase().includes(query.toLowerCase())
      );
      return filtered;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search users');
      throw new Error(err instanceof Error ? err.message : 'Failed to search users');
    }
  }, [users]);
  
  const getUserById = useCallback(async (id: string) => {
    try {
      setError(null);
      const user = users.find(u => u.id === id);
      return user || null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get user');
      throw new Error(err instanceof Error ? err.message : 'Failed to get user');
    }
  }, [users]);
  
  useEffect(() => {
    if (autoLoad) {
      loadUsers();
    }
  }, [autoLoad, loadUsers]);
  
  return {
    users,
    loading,
    error,
    loadUsers,
    createUser,
    updateUser,
    deleteUser,
    getUserByEmail
  };
};