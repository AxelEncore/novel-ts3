import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Grid3X3,
  List,
  Plus,
  RefreshCw,
  Eye,
  EyeOff,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { BoardCard } from './BoardCard';
import { CreateBoardModal } from './CreateBoardModal';
import ProjectSettingsModal from './ProjectSettingsModal';

interface Board {
  id: string;
  name: string;
  description$1: string;
  visibility: 'public' | 'private';
  project_id: string;
  project_name: string;
  creator_id: string;
  creator_username: string;
  created_at: string;
  updated_at: string;
  columns_count: number;
  tasks_count: number;
}

interface Project {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
}

interface BoardListProps {
  currentUser: User;
  projects: Project[];
  selectedProjectId$1: string;
}

type SortField = 'created_at' | 'updated_at' | 'name' | 'columns_count' | 'tasks_count';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'grid' | 'list';
type VisibilityFilter = 'all' | 'public' | 'private';

export function BoardList({ currentUser, projects, selectedProjectId }: BoardListProps) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('all');
  const [projectFilter, setProjectFilter] = useState<string>(selectedProjectId || 'all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);

  const limit = 12;

  const fetchBoards = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sort_by: sortField,
        sort_order: sortOrder,
      });

      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }

      if (projectFilter !== 'all') {
        params.append('project_id', projectFilter);
      }

      if (visibilityFilter !== 'all') {
        params.append('visibility', visibilityFilter);
      }

      const response = await fetch(`/api/boards$1${params}`);
      
      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || 'Ошибка при загрузке досок');
        return;
      }

      const data = await response.json();
      setBoards(data.boards);
      setTotalPages(data.pagination.total_pages);
      setTotalCount(data.pagination.total);
    } catch (error) {
      console.error('Error fetching boards:', error);
      toast.error('Произошла ошибка при загрузке досок');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoards();
  }, [page, sortField, sortOrder, searchTerm, projectFilter, visibilityFilter, fetchBoards]);

  useEffect(() => {
    if (selectedProjectId) {
      setProjectFilter(selectedProjectId);
    }
  }, [selectedProjectId]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPage(1);
  };

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const handleBoardCreated = (newBoard: Board) => {
    setBoards(prev => [newBoard, ...prev]);
    setTotalCount(prev => prev + 1);
    toast.success('Доска успешно создана');
  };

  const handleBoardUpdated = (updatedBoard: Board) => {
    setBoards(prev => prev.map(board => 
      board.id === updatedBoard.id ? updatedBoard : board
    ));
    toast.success('Доска успешно обновлена');
  };

  const handleBoardDeleted = (boardId: string) => {
    setBoards(prev => prev.filter(board => board.id !== boardId));
    setTotalCount(prev => prev - 1);
    toast.success('Доска успешно удалена');
  };

  const getSortIcon = (field: SortField) => {
    if (field !== sortField) return null;
    return sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />;
  };

  const getVisibilityIcon = (visibility: VisibilityFilter) => {
    switch (visibility) {
      case 'public':
        return <Eye className="w-4 h-4" />;
      case 'private':
        return <EyeOff className="w-4 h-4" />;
      default:
        return <Filter className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Заголовок и действия */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Доски</h1>
          <p className="text-muted-foreground">
            {totalCount > 0 ? `Найдено ${totalCount} досок` : 'Доски не найдены'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchBoards}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
          {projectFilter !== 'all' && (
            <Button
              variant="outline"
              onClick={() => {
                const project = projects.find(p => p.id === projectFilter);
                if (project) {
                  setSelectedProject(project);
                  setShowSettingsModal(true);
                }
              }}
            >
              <Settings className="w-4 h-4 mr-2" />
              Настройки проекта
            </Button>
          )}
          <CreateBoardModal
            projects={projects}
            onBoardCreated={handleBoardCreated}
            trigger={
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Создать доску
              </Button>
            }
          />
        </div>
      </div>

      {/* Фильтры и поиск */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Поиск досок..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Все проекты" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все проекты</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={visibilityFilter} onValueChange={(value: VisibilityFilter) => setVisibilityFilter(value)}>
            <SelectTrigger className="w-[140px]">
              <div className="flex items-center gap-2">
                {getVisibilityIcon(visibilityFilter)}
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Все
                </div>
              </SelectItem>
              <SelectItem value="public">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Публичные
                </div>
              </SelectItem>
              <SelectItem value="private">
                <div className="flex items-center gap-2">
                  <EyeOff className="w-4 h-4" />
                  Приватные
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          <Select value={`${sortField}-${sortOrder}`} onValueChange={(value) => {
            const [field, order] = value.split('-') as [SortField, SortOrder];
            setSortField(field);
            setSortOrder(order);
          }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at-desc">Новые первыми</SelectItem>
              <SelectItem value="created_at-asc">Старые первыми</SelectItem>
              <SelectItem value="updated_at-desc">Недавно обновленные</SelectItem>
              <SelectItem value="name-asc">По названию А-Я</SelectItem>
              <SelectItem value="name-desc">По названию Я-А</SelectItem>
              <SelectItem value="columns_count-desc">Больше колонок</SelectItem>
              <SelectItem value="tasks_count-desc">Больше задач</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Список досок */}
      {loading ? (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={`skeleton-${i}`} className={viewMode === 'grid' ? 'h-64' : 'h-32'} />
          ))}
        </div>
      ) : boards.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-muted-foreground mb-4">
            {searchTerm || projectFilter !== 'all' || visibilityFilter !== 'all'
              ? 'Доски не найдены по заданным критериям'
              : 'У вас пока нет досок'
            }
          </div>
          <CreateBoardModal
            projects={projects}
            onBoardCreated={handleBoardCreated}
            trigger={
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Создать первую доску
              </Button>
            }
          />
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
          {boards.map((board) => (
            <BoardCard
              key={board.id}
              board={board}
              currentUser={currentUser}
              projects={projects}
              viewMode={viewMode}
              onBoardUpdated={handleBoardUpdated}
              onBoardDeleted={handleBoardDeleted}
            />
          ))}
        </div>
      )}

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(prev => Math.max(1, prev - 1))}
            disabled={page === 1 || loading}
          >
            Предыдущая
          </Button>
          
          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              
              return (
                <Button
                  key={`page-${pageNum}`}
                  variant={page === pageNum ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPage(pageNum)}
                  disabled={loading}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
            disabled={page === totalPages || loading}
          >
            Следующая
          </Button>
        </div>
      )}
      
      {selectedProject && (
        <ProjectSettingsModal
          isOpen={showSettingsModal}
          onClose={() => {
            setShowSettingsModal(false);
            setSelectedProject(null);
          }}
          project={selectedProject}
          onProjectUpdated={(updatedProject) => {
            // Обновляем проект в списке если нужно
            toast.success('Проект успешно обновлен!');
            setShowSettingsModal(false);
            setSelectedProject(null);
          }}
          onProjectDeleted={(deletedId) => {
            // Удаляем проект из списка если нужно
            setProjectFilter('all');
            toast.success('Проект успешно удален!');
            setShowSettingsModal(false);
            setSelectedProject(null);
          }}
        />
      )}
    </div>
  );
}
