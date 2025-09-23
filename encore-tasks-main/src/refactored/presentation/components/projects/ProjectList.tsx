// ProjectList Component
// Displays a list of projects with filtering, sorting, and actions

import React, { useState, useEffect, useCallback } from 'react';
import { Project, ProjectStatus } from '../../../data/types';
import { useApp } from '../../../../contexts/AppContext';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorMessage } from '../common/ErrorMessage';
import { EmptyState } from '../common/EmptyState';
import { CreateProjectModal } from '../../../../components/CreateProjectModal';

interface ProjectListProps {
  userId?: string;
  showCreateButton?: boolean;
  showFilters?: boolean;
  showPagination?: boolean;
  pageSize?: number;
  className?: string;
}

interface ProjectFilters {
  status?: ProjectStatus;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  showArchived?: boolean;
}

export const ProjectList: React.FC<ProjectListProps> = ({
  userId,
  showCreateButton = true,
  showFilters = true,
  showPagination = true,
  pageSize = 12,
  className = ''
}) => {
  const { state, dispatch } = useApp();
  const { currentUser, projects, isLoading, error } = state;
  
  const [filters, setFilters] = useState<ProjectFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Load projects on component mount
  useEffect(() => {
    if (currentUser) {
      dispatch({
        type: 'LOAD_PROJECTS_START',
        payload: null
      });
    }
  }, [currentUser?.id, filters, dispatch]);

  // Handle search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        setFilters(prev => ({ ...prev, search: searchQuery.trim() }));
      } else {
        setFilters(prev => {
          const { search, ...rest } = prev;
          return rest;
        });
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleFilterChange = useCallback((newFilters: Partial<ProjectFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const handleCreateProject = async (projectData: {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
  }) => {
    try {
      dispatch({
        type: 'CREATE_PROJECT_START',
        payload: null
      });

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData),
      });

      if (response.ok) {
        const result = await response.json();
        dispatch({
          type: 'CREATE_PROJECT_SUCCESS',
          payload: result.data
        });
        setIsCreateModalOpen(false);
        return true;
      } else {
        throw new Error('Failed to create project');
      }
    } catch (error) {
      dispatch({
        type: 'CREATE_PROJECT_ERROR',
        payload: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        dispatch({
          type: 'DELETE_PROJECT',
          payload: projectId
        });
      } else {
        throw new Error('Failed to delete project');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  const handleUpdateProject = async (projectId: string, updates: Partial<Project>) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const result = await response.json();
        dispatch({
          type: 'UPDATE_PROJECT',
          payload: { id: projectId, updates: result.data }
        });
      } else {
        throw new Error('Failed to update project');
      }
    } catch (error) {
      console.error('Error updating project:', error);
    }
  };

  // Filter projects based on current filters
  const filteredProjects = projects.filter(project => {
    if (filters.status && project.status !== filters.status) return false;
    if (filters.search && !project.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.showArchived === false && project.status === 'archived') return false;
    return true;
  });

  // Sort projects
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    const sortBy = filters.sortBy || 'updated_at';
    const sortOrder = filters.sortOrder || 'desc';
    
    let aValue: any = a[sortBy as keyof Project];
    let bValue: any = b[sortBy as keyof Project];
    
    if (typeof aValue === 'string') aValue = aValue.toLowerCase();
    if (typeof bValue === 'string') bValue = bValue.toLowerCase();
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const canCreateProject = currentUser?.role === 'admin' || currentUser?.role === 'manager';

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12">
        <ErrorMessage 
          message={error}
          onRetry={() => dispatch({ type: 'LOAD_PROJECTS_START', payload: null })}
        />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Проекты</h1>
          <p className="text-gray-400 mt-1">
            {sortedProjects.length} {sortedProjects.length === 1 ? 'проект' : 'проектов'}
          </p>
        </div>
        
        {showCreateButton && canCreateProject && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all duration-200 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Создать проект
          </button>
        )}
      </div>

      {/* Search and Filters */}
      {showFilters && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Поиск проектов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={filters.status || ''}
            onChange={(e) => handleFilterChange({ status: e.target.value as ProjectStatus || undefined })}
            className="px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">Все статусы</option>
            <option value="active">Активные</option>
            <option value="archived">Архивные</option>
            <option value="completed">Завершенные</option>
          </select>
          
          <select
            value={filters.sortBy || 'updated_at'}
            onChange={(e) => handleFilterChange({ sortBy: e.target.value })}
            className="px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="updated_at">По дате изменения</option>
            <option value="created_at">По дате создания</option>
            <option value="name">По названию</option>
          </select>
        </div>
      )}

      {/* Projects Grid */}
      {sortedProjects.length === 0 ? (
        <EmptyState
          icon="📋"
          title="Нет проектов"
          description={searchQuery ? "Не найдено проектов соответствующих поиску" : "Создайте первый проект для начала работы"}
          action={canCreateProject ? {
            label: "Создать проект",
            onClick: () => setIsCreateModalOpen(true)
          } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onUpdate={(updates) => handleUpdateProject(project.id, updates)}
              onDelete={() => handleDeleteProject(project.id)}
            />
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateProject}
      />
    </div>
  );
};

// Project Card Component
const ProjectCard: React.FC<{
  project: Project;
  onUpdate: (updates: Partial<Project>) => void;
  onDelete: () => void;
}> = ({ project, onUpdate, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'archived': return 'bg-gray-500';
      case 'completed': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: ProjectStatus) => {
    switch (status) {
      case 'active': return 'Активный';
      case 'archived': return 'Архивный';
      case 'completed': return 'Завершен';
      default: return status;
    }
  };

  return (
    <div className="bg-gray-800/30 backdrop-blur border border-gray-700/50 rounded-xl p-6 hover:bg-gray-800/40 transition-all duration-200 group relative">
      {/* Project Color Bar */}
      <div 
        className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
        style={{ backgroundColor: project.color }}
      />
      
      {/* Menu Button */}
      <div className="absolute top-4 right-4">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-1 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all duration-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
        
        {showMenu && (
          <div className="absolute top-8 right-0 bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-2 min-w-[120px] z-10">
            <button
              onClick={() => {
                onUpdate({ status: 'archived' });
                setShowMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              Архивировать
            </button>
            <button
              onClick={() => {
                onDelete();
                setShowMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-700 hover:text-red-300"
            >
              Удалить
            </button>
          </div>
        )}
      </div>

      {/* Project Icon & Status */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{project.icon}</div>
          <div className={`w-2 h-2 rounded-full ${getStatusColor(project.status)}`} />
        </div>
      </div>

      {/* Project Info */}
      <div className="space-y-3">
        <h3 className="font-semibold text-white text-lg leading-tight">
          {project.name}
        </h3>
        
        {project.description && (
          <p className="text-gray-400 text-sm line-clamp-2">
            {project.description}
          </p>
        )}
        
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{getStatusText(project.status)}</span>
          <span>
            {new Date(project.updated_at).toLocaleDateString('ru-RU')}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 pt-4 border-t border-gray-700/50">
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>0 досок</span>
          <span>0 задач</span>
        </div>
      </div>
    </div>
  );
};