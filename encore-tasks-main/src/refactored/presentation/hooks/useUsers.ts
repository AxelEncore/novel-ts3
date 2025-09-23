import { useState, useEffect, useCallback } from 'react';
import { User, SearchFilters } from '../../data/types';
import { IUserRepository } from '../../business/interfaces';
import { UserRepository } from '../../data/repositories';

interface UseUsersOptions {
  filters?: SearchFilters;
  autoLoad?: boolean;
  pageSize?: number;
}

interface UseUsersReturn {
  users: User[];
  loading: boolean;
  error: string | null;
  loadUsers: () => Promise<void>;
  createUser: (userData: Omit<User, 'id' | 'created_at' | 'updated_at' | 'lastLoginAt'>) => Promise<User>;
  updateUser: (id: string, updates: Partial<User>) => Promise<User>;
  deleteUser: (id: string) => Promise<void>;
  searchUsers: (query: string) => Promise<User[]>;
  getUserById: (id: string) => Promise<User | null>;
  getUserByEmail: (email: string) => Promise<User | null>;
}

export const useUsers = (options: UseUsersOptions = {}): UseUsersReturn => {
  const { filters, autoLoad = false, pageSize = 50 } = options;
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const userRepository: IUserRepository = new UserRepository();
  
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await userRepository.findAll(filters);
      setUsers(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, userRepository]);
  
  const createUser = useCallback(async (userData: Omit<User, 'id' | 'created_at' | 'updated_at' | 'lastLoginAt'>) => {
    try {
      setError(null);
      const newUser = await userRepository.create(userData);
      setUsers(prev => [...prev, newUser]);
      return newUser;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create user';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [userRepository]);
  
  const updateUser = useCallback(async (id: string, updates: Partial<User>) => {
    try {
      setError(null);
      const updatedUser = await userRepository.update(id, updates);
      setUsers(prev => prev.map(user => user.id === id ? updatedUser : user));
      return updatedUser;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update user';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [userRepository]);
  
  const deleteUser = useCallback(async (id: string) => {
    try {
      setError(null);
      await userRepository.delete(id);
      setUsers(prev => prev.filter(user => user.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete user';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [userRepository]);
  
  const searchUsers = useCallback(async (query: string) => {
    try {
      setError(null);
      // For now, we'll filter the existing users by name or email
      // In a real implementation, this might be a separate API call
      const filtered = users.filter(user => 
        user.name.toLowerCase().includes(query.toLowerCase()) ||
        user.email.toLowerCase().includes(query.toLowerCase())
      );
      return filtered;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search users';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [users]);
  
  const getUserById = useCallback(async (id: string) => {
    try {
      setError(null);
      return await userRepository.findById(id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get user';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [userRepository]);
  
  const getUserByEmail = useCallback(async (email: string) => {
    try {
      setError(null);
      return await userRepository.findByEmail(email);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get user';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [userRepository]);
  
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
    searchUsers,
    getUserById,
    getUserByEmail
  };
};