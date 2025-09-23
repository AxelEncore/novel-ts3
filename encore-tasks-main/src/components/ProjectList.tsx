import React, { useState, useContext, useEffect } from 'react';
import { Search, Plus, Filter, SortAsc, SortDesc, Archive, ArchiveRestore, Grid, List } from 'lucide-react';
import { AppContext } from '../context/AppContext';
import { ProjectWithStats, ProjectFilters, ProjectSort } from '../types/core.types';
import ProjectCard from './ProjectCard';
import CreateProjectModal from './CreateProjectModal';
import CreateProjectWithBoardsModal from './CreateProjectWithBoardsModal';
import ProjectSettingsModal from './ProjectSettingsModal';
import { toast } from 'sonner';

interface ProjectListProps {
  onProjectSelect$1: (project: ProjectWithStats) => void;
}

const ProjectList: React.FC<ProjectListProps> = ({ onProjectSelect }) => {
  const { currentUser } = useContext(AppContext);
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [sortBy, setSortBy] = useState<ProjectSort>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateWithBoardsModal, setShowCreateWithBoardsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectWithStats | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const loadProjects = async (reset = false) => {
    if (!currentUser) return;

    try {
      const currentPage = reset ? 1 : page;
      const filters: ProjectFilters = {
        search: searchTerm.trim() || undefined,
        archived: showArchived,
        page: currentPage,
        limit: 12,
        sort_by: sortBy,
        sort_order: sortOrder,
      };

      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });

      const response = await fetch(`/api/projects$1${queryParams.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || 'Не удалось загрузить проекты');
        return;
      }

      if (result.success && result.data) {
        if (reset || currentPage === 1) {
          setProjects(result.data.projects);
        } else {
          setProjects(prev => [...prev, ...result.data.projects]);
        }
        setTotalCount(result.data.total);
        setHasMore(result.data.projects.length === filters.limit);
        if (reset) {
          setPage(2);
        } else {
          setPage(prev => prev + 1);
        }
      }
    } catch (err) {
      console.error('Error loading projects:', err);
      toast.error('Произошла ошибка при загрузке проектов');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setPage(1);
    setHasMore(true);
    loadProjects(true);
  }, [currentUser, searchTerm, showArchived, sortBy, sortOrder]);

  const handleProjectCreated = (newProject: ProjectWithStats) => {
    setProjects(prev => [newProject, ...prev]);
    setTotalCount(prev => prev + 1);
    toast.success('Проект успешно создан!');
  };

  const handleProjectUpdated = (updatedProject: ProjectWithStats) => {
    setProjects(prev => 
      prev.map(project => 
        project.id === updatedProject.id ? updatedProject : project
      )
    );
    toast.success('Проект успешно обновлен!');
  };

  const handleProjectDeleted = (projectId: string) => {
    setProjects(prev => prev.filter(project => project.id !== projectId));
    setTotalCount(prev => prev - 1);
    toast.success('Проект успешно удален!');
  };

  const handleEditProject = (project: ProjectWithStats) => {
    setSelectedProject(project);
    setShowSettingsModal(true);
  };

  const handleSortChange = (newSortBy: ProjectSort) => {
    if (newSortBy === sortBy) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      loadProjects();
    }
  };

  if (loading && projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и кнопка создания */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Проекты</h1>
          <p className="text-gray-600 mt-1">
            {totalCount} {totalCount === 1 ? 'проект' : totalCount < 5 ? 'проекта' : 'проектов'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>Простой проект</span>
          </button>
          <button
            onClick={() => setShowCreateWithBoardsModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>Проект с досками</span>
          </button>
        </div>
      </div>

      {/* Фильтры и поиск */}
      <div className="bg-white rounded-lg border p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Поиск */}
          <div className="flex-1 relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск проектов..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Переключатель архивных */}
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`px-4 py-2 rounded-lg border transition-colors flex items-center space-x-2 ${
              showArchived
                ? 'bg-orange-100 border-orange-300 text-orange-700'
                : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {showArchived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
            <span>{showArchived ? 'Архивные' : 'Активные'}</span>
          </button>

          {/* Режим отображения */}
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 transition-colors ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <List size={16} />
            </button>
          </div>
        </div>

        {/* Сортировка */}
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-gray-600 flex items-center">
            <Filter size={14} className="mr-1" />
            Сортировка:
          </span>
          {[
            { key: 'created_at' as ProjectSort, label: 'Дате создания' },
            { key: 'updated_at' as ProjectSort, label: 'Последнему обновлению' },
            { key: 'name' as ProjectSort, label: 'Названию' },
            { key: 'members_count' as ProjectSort, label: 'Количеству участников' },
            { key: 'boards_count' as ProjectSort, label: 'Количеству досок' },
            { key: 'tasks_count' as ProjectSort, label: 'Количеству задач' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleSortChange(key)}
              className={`px-3 py-1 rounded-full text-sm transition-colors flex items-center space-x-1 ${
                sortBy === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>{label}</span>
              {sortBy === key && (
                sortOrder === 'asc' ? <SortAsc size={12} /> : <SortDesc size={12} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Список проектов */}
      {projects.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Archive size={48} className="mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {showArchived ? 'Нет архивных проектов' : 'Нет активных проектов'}
          </h3>
          <p className="text-gray-600 mb-4">
            {showArchived 
              ? 'Архивные проекты появятся здесь после архивирования.'
              : 'Создайте свой первый проект, чтобы начать работу.'
            }
          </p>
          {!showArchived && (
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Простой проект
              </button>
              <button
                onClick={() => setShowCreateWithBoardsModal(true)}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Проект с досками
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className={`${
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-4'
          }`}>
            {projects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                viewMode={viewMode}
                onClick={() => onProjectSelect(project)}
                onEdit={handleEditProject}
                currentUserId={currentUser?.id}
                isAdmin={currentUser?.role === 'admin'}
              />
            ))}
          </div>

          {/* Кнопка загрузки еще */}
          {hasMore && (
            <div className="text-center">
              <button
                onClick={loadMore}
                disabled={loading}
                className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Загрузка...' : 'Загрузить еще'}
              </button>
            </div>
          )}
        </>
      )}

      {/* Модальные окна создания проекта */}
      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onProjectCreated={handleProjectCreated}
      />
      
      <CreateProjectWithBoardsModal
        isOpen={showCreateWithBoardsModal}
        onClose={() => setShowCreateWithBoardsModal(false)}
        onProjectCreated={handleProjectCreated}
      />
      
      {/* Модальное окно настроек проекта */}
      {selectedProject && (
        <ProjectSettingsModal
          isOpen={showSettingsModal}
          onClose={() => {
            setShowSettingsModal(false);
            setSelectedProject(null);
          }}
          project={selectedProject}
          onProjectUpdated={(updatedProject) => {
            handleProjectUpdated(updatedProject);
            setShowSettingsModal(false);
            setSelectedProject(null);
          }}
          onProjectDeleted={(deletedId) => {
            handleProjectDeleted(deletedId);
            setShowSettingsModal(false);
            setSelectedProject(null);
          }}
        />
      )}
    </div>
  );
};

export default ProjectList;