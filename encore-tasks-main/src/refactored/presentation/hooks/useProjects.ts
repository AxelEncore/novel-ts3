import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Project,
  CreateProjectData,
  UpdateProjectData,
  ProjectStatus,
  ProjectSortBy,
  SortOrder,
  PaginationParams,
  PaginatedResponse
} from '../../data/types';
import { ClientServiceFactory } from '../../business/services/index.client';
import { useAuth } from '../context/AuthContext';

interface UseProjectsFilters {
  status?: ProjectStatus;
  search?: string;
  sortBy?: ProjectSortBy;
  sortOrder?: SortOrder;
  showArchived?: boolean;
}

interface UseProjectsOptions {
  autoLoad?: boolean;
  pageSize?: number;
}

interface UseProjectsReturn {
  // Data
  projects: Project[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  
  // Loading states
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  
  // Error states
  error: string | null;
  
  // Filters and pagination
  filters: UseProjectsFilters;
  setFilters: (filters: Partial<UseProjectsFilters>) => void;
  resetFilters: () => void;
  
  // Pagination
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  
  // Actions
  loadProjects: () => Promise<void>;
  createProject: (data: CreateProjectData) => Promise<Project>;
  updateProject: (id: string, data: UpdateProjectData) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  archiveProject: (id: string) => Promise<void>;
  restoreProject: (id: string) => Promise<void>;
  
  // Utilities
  refreshProjects: () => Promise<void>;
  getProjectById: (id: string) => Project | undefined;
}

const defaultFilters: UseProjectsFilters = {
  sortBy: 'updatedAt',
  sortOrder: 'desc',
  showArchived: false
};

export const useProjects = (options: UseProjectsOptions = {}): UseProjectsReturn => {
  const { autoLoad = true, pageSize = 12 } = options;
  const { user } = useAuth();
  const projectService = ClientServiceFactory.getProjectService();
  
  // State
  const [projects, setProjects] = useState<Project[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFiltersState] = useState<UseProjectsFilters>(defaultFilters);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Error state
  const [error, setError] = useState<string | null>(null);
  
  // Computed values
  const totalPages = useMemo(() => {
    return Math.ceil(totalCount / pageSize);
  }, [totalCount, pageSize]);
  
  // Load projects function
  const loadProjects = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const pagination: PaginationParams = {
        page: currentPage,
        limit: pageSize
      };
      
      const allProjects = await projectService.getByUserId(
        user?.id || '',
        filters
      );
      
      // Handle pagination manually
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedProjects = allProjects.slice(startIndex, endIndex);
      
      setProjects(paginatedProjects);
      setTotalCount(allProjects.length);
    } catch (err) {
      console.error('Error loading projects:', err);
      setError('Failed to load projects. Please try again.');
      setProjects([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [user, projectService, currentPage, pageSize, filters]);
  
  // Auto-load projects when dependencies change
  useEffect(() => {
    if (autoLoad) {
      loadProjects();
    }
  }, [autoLoad, loadProjects]);
  
  // Filter management
  const setFilters = useCallback((newFilters: Partial<UseProjectsFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1); // Reset to first page when filters change
  }, []);
  
  const resetFilters = useCallback(() => {
    setFiltersState(defaultFilters);
    setCurrentPage(1);
  }, []);
  
  // Pagination
  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);
  
  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  }, [currentPage, totalPages]);
  
  const previousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage]);
  
  // Project actions
  const createProject = useCallback(async (data: CreateProjectData): Promise<Project> => {
    setIsCreating(true);
    setError(null);
    
    try {
      const projectData = {
        ...data,
        color: data.color || '#3B82F6',
        ownerId: user?.id || '',
        isArchived: false,
        settings: {
          isPublic: false,
          allowGuestAccess: false,
          defaultTaskPriority: 'medium' as const,
          autoArchiveCompletedTasks: false,
          enableTimeTracking: false,
          enableDependencies: false
        }
      };
      const newProject = await projectService.create(projectData, user?.id || '');
      
      // Add to local state if it matches current filters
      const matchesStatusFilter = !filters.status || 
        (filters.status === 'active' && !newProject.isArchived) ||
        (filters.status === 'archived' && newProject.isArchived);
      
      if (matchesStatusFilter) {
        setProjects(prev => [newProject, ...prev]);
        setTotalCount(prev => prev + 1);
      }
      
      return newProject;
    } catch (err) {
      console.error('Error creating project:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create project';
      setError(errorMessage);
      throw err;
    } finally {
      setIsCreating(false);
    }
  }, [projectService, filters]);
  
  const updateProject = useCallback(async (id: string, data: UpdateProjectData): Promise<Project> => {
    setIsUpdating(true);
    setError(null);
    
    try {
      const updatedProject = await projectService.update(id, data, user$1.id || '');
      
      // Update local state
      setProjects(prev => 
        prev.map(project => 
          project.id === id ? updatedProject : project
        )
      );
      
      return updatedProject;
    } catch (err) {
      console.error('Error updating project:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update project';
      setError(errorMessage);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [projectService]);
  
  const deleteProject = useCallback(async (id: string): Promise<void> => {
    setIsDeleting(true);
    setError(null);
    
    try {
      await projectService.delete(id, user?.id || '');
      
      // Remove from local state
      setProjects(prev => prev.filter(project => project.id !== id));
      setTotalCount(prev => prev - 1);
    } catch (err) {
      console.error('Error deleting project:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete project';
      setError(errorMessage);
      throw err;
    } finally {
      setIsDeleting(false);
    }
  }, [projectService]);
  
  const archiveProject = useCallback(async (id: string): Promise<void> => {
    setError(null);
    
    try {
      await projectService.archive(id, user?.id || '');
      
      // Update local state
      setProjects(prev => 
        prev.map(project => 
          project.id === id 
            ? { ...project, isArchived: true, updatedAt: new Date() }
            : project
        )
      );
    } catch (err) {
      console.error('Error archiving project:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to archive project';
      setError(errorMessage);
      throw err;
    }
  }, [projectService]);
  
  const restoreProject = useCallback(async (id: string): Promise<void> => {
    setError(null);
    
    try {
      await projectService.restore(id, user?.id || '');
      
      // Update local state
      setProjects(prev => 
        prev.map(project => 
          project.id === id 
            ? { ...project, isArchived: false, updatedAt: new Date() }
            : project
        )
      );
    } catch (err) {
      console.error('Error restoring project:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to restore project';
      setError(errorMessage);
      throw err;
    }
  }, [projectService]);
  
  // Utilities
  const refreshProjects = useCallback(async (): Promise<void> => {
    await loadProjects();
  }, [loadProjects]);
  
  const getProjectById = useCallback((id: string): Project | undefined => {
    return projects.find(project => project.id === id);
  }, [projects]);
  
  return {
    // Data
    projects,
    totalCount,
    currentPage,
    totalPages,
    
    // Loading states
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    
    // Error state
    error,
    
    // Filters and pagination
    filters,
    setFilters,
    resetFilters,
    
    // Pagination
    goToPage,
    nextPage,
    previousPage,
    
    // Actions
    loadProjects,
    createProject,
    updateProject,
    deleteProject,
    archiveProject,
    restoreProject,
    
    // Utilities
    refreshProjects,
    getProjectById
  };
};

export default useProjects;