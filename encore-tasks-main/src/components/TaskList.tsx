import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Filter, Grid, List, RefreshCw } from 'lucide-react';
import { TaskCard } from './TaskCard';
import { CreateTaskModal } from './CreateTaskModal';
import { EditTaskModal } from './EditTaskModal';
import { toast } from 'sonner';

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'review' | 'done';
  due_date?: string;
  created_at: string;
  updated_at: string;
  column_id: string;
  column_name: string;
  board_id: string;
  board_name: string;
  project_id: string;
  project_name: string;
  creator_id: string;
  creator_username: string;
  assignees: Array<{
    id: string;
    username: string;
    email: string;
  }>;
  tags: string[];
  settings: {
    notifications_enabled: boolean;
    auto_archive: boolean;
    time_tracking: boolean;
  };
}

interface Project {
  id: string;
  name: string;
}

interface Board {
  id: string;
  name: string;
  project_id: string;
  project_name: string;
}

interface Column {
  id: string;
  name: string;
  board_id: string;
  board_name: string;
  project_id: string;
  project_name: string;
}

interface TaskListProps {
  projectId?: string;
  boardId?: string;
  columnId?: string;
}

export function TaskList({ projectId, boardId, columnId }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState(projectId || '');
  const [selectedBoard, setSelectedBoard] = useState(boardId || '');
  const [selectedColumn, setSelectedColumn] = useState(columnId || '');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTasks, setTotalTasks] = useState(0);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const itemsPerPage = 12;

  useEffect(() => {
    loadProjects();
    loadTasks();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadBoards();
    } else {
      setBoards([]);
      setSelectedBoard('');
    }
  }, [selectedProject]);

  useEffect(() => {
    if (selectedBoard) {
      loadColumns();
    } else {
      setColumns([]);
      setSelectedColumn('');
    }
  }, [selectedBoard]);

  useEffect(() => {
    loadTasks();
  }, [
    searchTerm,
    selectedProject,
    selectedBoard,
    selectedColumn,
    selectedPriority,
    selectedStatus,
    selectedAssignee,
    sortBy,
    sortOrder,
    currentPage
  ]);

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadBoards = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedProject) {
        params.append('project_id', selectedProject);
      }
      
      const response = await fetch(`/api/boards?${params}`);
      if (response.ok) {
        const data = await response.json();
        setBoards(data.boards || []);
      }
    } catch (error) {
      console.error('Error loading boards:', error);
    }
  };

  const loadColumns = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedBoard) {
        params.append('board_id', selectedBoard);
      }
      
      const response = await fetch(`/api/columns?${params}`);
      if (response.ok) {
        const data = await response.json();
        setColumns(data.columns || []);
      }
    } catch (error) {
      console.error('Error loading columns:', error);
    }
  };

  const loadTasks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      if (searchTerm) params.append('search', searchTerm);
      if (selectedProject) params.append('project_id', selectedProject);
      if (selectedBoard) params.append('board_id', selectedBoard);
      if (selectedColumn) params.append('column_id', selectedColumn);
      if (selectedPriority) params.append('priority', selectedPriority);
      if (selectedStatus) params.append('status', selectedStatus);
      if (selectedAssignee) params.append('assignee_id', selectedAssignee);

      const response = await fetch(`/api/tasks?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
        setTotalPages(data.pagination?.total_pages || 1);
        setTotalTasks(data.pagination?.total || 0);
      } else {
        toast.error('Ошибка загрузки задач');
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      toast.error('Ошибка загрузки задач');
    } finally {
      setLoading(false);
    }
  };

  const handleTaskCreated = (newTask: Task) => {
    setTasks(prev => [newTask, ...prev]);
    setTotalTasks(prev => prev + 1);
    toast.success('Задача успешно создана');
  };

  const handleTaskUpdated = (updatedTask: Task) => {
    setTasks(prev => prev.map(task => 
      task.id === updatedTask.id ? updatedTask : task
    ));
    toast.success('Задача успешно обновлена');
  };

  const handleTaskDeleted = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
    setTotalTasks(prev => prev - 1);
    toast.success('Задача успешно удалена');
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsEditModalOpen(true);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedProject(projectId || '');
    setSelectedBoard(boardId || '');
    setSelectedColumn(columnId || '');
    setSelectedPriority('');
    setSelectedStatus('');
    setSelectedAssignee('');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchTerm || selectedProject || selectedBoard || selectedColumn || 
    selectedPriority || selectedStatus || selectedAssignee;

  const uniqueAssignees = Array.from(
    new Map(
      tasks.flatMap(task => task.assignees)
        .map(assignee => [assignee.id, assignee])
    ).values()
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Задачи</h1>
          <p className="text-gray-600">
            {totalTasks} {totalTasks === 1 ? 'задача' : totalTasks < 5 ? 'задачи' : 'задач'}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadTasks}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Создать задачу
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Поиск задач..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Project Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Проект</label>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger>
                <SelectValue placeholder="Все проекты" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Все проекты</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Board Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Доска</label>
            <Select value={selectedBoard} onValueChange={setSelectedBoard}>
              <SelectTrigger>
                <SelectValue placeholder="Все доски" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Все доски</SelectItem>
                {boards.map((board) => (
                  <SelectItem key={board.id} value={board.id}>
                    {board.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Column Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Колонка</label>
            <Select value={selectedColumn} onValueChange={setSelectedColumn}>
              <SelectTrigger>
                <SelectValue placeholder="Все колонки" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Все колонки</SelectItem>
                {columns.map((column) => (
                  <SelectItem key={column.id} value={column.id}>
                    {column.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Приоритет</label>
            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
              <SelectTrigger>
                <SelectValue placeholder="Все приоритеты" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Все приоритеты</SelectItem>
                <SelectItem value="low">Низкий</SelectItem>
                <SelectItem value="medium">Средний</SelectItem>
                <SelectItem value="high">Высокий</SelectItem>
                <SelectItem value="urgent">Срочный</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Статус</label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Все статусы" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Все статусы</SelectItem>
                <SelectItem value="todo">К выполнению</SelectItem>
                <SelectItem value="in_progress">В работе</SelectItem>
                <SelectItem value="review">На проверке</SelectItem>
                <SelectItem value="done">Выполнено</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Assignee Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Исполнитель</label>
            <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
              <SelectTrigger>
                <SelectValue placeholder="Все исполнители" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Все исполнители</SelectItem>
                {uniqueAssignees.map((assignee) => (
                  <SelectItem key={assignee.id} value={assignee.id}>
                    {assignee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sort */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Сортировка</label>
            <Select value={`${sortBy}_${sortOrder}`} onValueChange={(value) => {
              const [field, order] = value.split('_');
              setSortBy(field);
              setSortOrder(order as 'asc' | 'desc');
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at_desc">Дата создания (новые)</SelectItem>
                <SelectItem value="created_at_asc">Дата создания (старые)</SelectItem>
                <SelectItem value="updated_at_desc">Дата обновления (новые)</SelectItem>
                <SelectItem value="updated_at_asc">Дата обновления (старые)</SelectItem>
                <SelectItem value="due_date_asc">Срок выполнения (ближайшие)</SelectItem>
                <SelectItem value="due_date_desc">Срок выполнения (дальние)</SelectItem>
                <SelectItem value="title_asc">Название (А-Я)</SelectItem>
                <SelectItem value="title_desc">Название (Я-А)</SelectItem>
                <SelectItem value="priority_desc">Приоритет (высокий)</SelectItem>
                <SelectItem value="priority_asc">Приоритет (низкий)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">&nbsp;</label>
            <Button
              variant="outline"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className="w-full"
            >
              <Filter className="h-4 w-4 mr-2" />
              Очистить фильтры
            </Button>
          </div>
        </div>

        {/* Active Filters */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2">
            {searchTerm && (
              <Badge variant="secondary">
                Поиск: {searchTerm}
              </Badge>
            )}
            {selectedProject && (
              <Badge variant="secondary">
                Проект: {projects.find(p => p.id === selectedProject)?.name}
              </Badge>
            )}
            {selectedBoard && (
              <Badge variant="secondary">
                Доска: {boards.find(b => b.id === selectedBoard)?.name}
              </Badge>
            )}
            {selectedColumn && (
              <Badge variant="secondary">
                Колонка: {columns.find(c => c.id === selectedColumn)?.name}
              </Badge>
            )}
            {selectedPriority && (
              <Badge variant="secondary">
                Приоритет: {selectedPriority === 'low' ? 'Низкий' : 
                           selectedPriority === 'medium' ? 'Средний' :
                           selectedPriority === 'high' ? 'Высокий' : 'Срочный'}
              </Badge>
            )}
            {selectedStatus && (
              <Badge variant="secondary">
                Статус: {selectedStatus === 'todo' ? 'К выполнению' :
                         selectedStatus === 'in_progress' ? 'В работе' :
                         selectedStatus === 'review' ? 'На проверке' : 'Выполнено'}
              </Badge>
            )}
            {selectedAssignee && (
              <Badge variant="secondary">
                Исполнитель: {uniqueAssignees.find(a => a.id === selectedAssignee)?.name}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Tasks Grid/List */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">
            {hasActiveFilters ? 'Задачи не найдены' : 'Пока нет задач'}
          </p>
          {!hasActiveFilters && (
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Создать первую задачу
            </Button>
          )}
        </div>
      ) : (
        <div className={viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
          : 'space-y-4'
        }>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              viewMode={viewMode}
              onEdit={handleEditTask}
              onDelete={handleTaskDeleted}
              onStatusChange={handleTaskUpdated}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Предыдущая
          </Button>
          
          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Следующая
          </Button>
        </div>
      )}

      {/* Modals */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onTaskCreated={handleTaskCreated}
        projectId={selectedProject}
        boardId={selectedBoard}
        columnId={selectedColumn}
      />

      {editingTask && (
        <EditTaskModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingTask(null);
          }}
          onTaskUpdated={handleTaskUpdated}
          task={editingTask}
        />
      )}
    </div>
  );
}