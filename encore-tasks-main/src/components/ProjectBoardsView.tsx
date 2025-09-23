import React, { useState, useEffect } from 'react';
import { Plus, Grid, List, Calendar, Users, Clock, AlertCircle } from 'lucide-react';
import { Board, Column, Task, Project } from '@/types';
import { projectService } from '@/services/projectService';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';
import KanbanBoard from './KanbanBoard';
import { CreateBoardModal } from './CreateBoardModal';

interface ProjectBoardsViewProps {
  project: Project;
  onBoardSelect?: (board: Board) => void;
}

const ProjectBoardsView: React.FC<ProjectBoardsViewProps> = ({
  project,
  onBoardSelect,
}) => {
  const { user } = useApp();
  const [boards, setBoards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBoard, setSelectedBoard] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Загрузка досок проекта
  const loadBoards = async () => {
    try {
      setLoading(true);
      const response = await projectService.getProjectBoards(project.id.toString(), {
        includeColumns: true,
        includeTasks: true,
      });
      
      if (response.success && response.data) {
        setBoards(response.data);
        if (response.data.length > 0 && !selectedBoard) {
          setSelectedBoard(response.data[0]);
        }
      } else {
        toast.error(response.error || 'Ошибка при загрузке досок');
      }
    } catch (error) {
      console.error('Ошибка загрузки досок:', error);
      toast.error('Ошибка при загрузке досок проекта');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBoards();
  }, [project.id]);

  const handleCreateBoard = async (boardData: {
    name: string;
    description?: string;
    color: string;
  }) => {
    try {
      const response = await projectService.createBoard(project.id.toString(), boardData);
      
      if (response.success && response.data) {
        setBoards(prev => [...prev, response.data]);
        setShowCreateModal(false);
        toast.success('Доска успешно создана');
      } else {
        toast.error(response.error || 'Ошибка при создании доски');
      }
    } catch (error) {
      console.error('Ошибка создания доски:', error);
      toast.error('Ошибка при создании доски');
    }
  };

  // Обработка выбора доски
  const handleBoardSelect = (board: Board) => {
    setSelectedBoard(board);
    onBoardSelect?.(board);
  };

  // Подсчет статистики доски
  const getBoardStats = (board: Board) => {
    if (!board.columns) return { totalTasks: 0, completedTasks: 0, members: 0 };
    
    const totalTasks = board.columns.reduce((sum, col) => sum + (col.tasks?.length || 0), 0);
    const completedTasks = board.columns
      .filter(col => col.type === 'DONE')
      .reduce((sum, col) => sum + (col.tasks?.length || 0), 0);
    
    // Подсчет уникальных участников
    const memberIds = new Set<number>();
    board.columns.forEach(col => {
      col.tasks?.forEach(task => {
        task.assignees?.forEach(assignee => {
          memberIds.add(assignee.userId);
        });
      });
    });
    
    return {
      totalTasks,
      completedTasks,
      members: memberIds.size,
    };
  };

  // Проверка прав доступа
  const canManageBoards = () => {
    const member = project.members?.find(m => m.userId === user?.id);
    return member && ['OWNER', 'ADMIN', 'MEMBER'].includes(member.role);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (viewMode === 'kanban' && selectedBoard) {
    return (
      <div className="h-full flex flex-col">
        {/* Заголовок с переключением режимов */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setViewMode('grid')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Назад к доскам
            </button>
            <h2 className="text-xl font-semibold text-gray-900">
              {selectedBoard.name}
            </h2>
          </div>
        </div>

        {/* Канбан доска */}
        <div className="flex-1">
          <KanbanBoard
            board={selectedBoard}
            onTaskUpdate={loadBoards}
            onColumnUpdate={loadBoards}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Доски проекта</h2>
          <p className="text-gray-600 mt-1">
            Управление досками задач в проекте "{project.name}"
          </p>
        </div>
        
        {canManageBoards() && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Создать доску
          </button>
        )}
      </div>

      {/* Список досок */}
      {boards.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Plus size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Нет досок в проекте
          </h3>
          <p className="text-gray-600 mb-6">
            Создайте первую доску для организации задач
          </p>
          {canManageBoards() && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Создать доску
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {boards.map((board) => {
            const stats = getBoardStats(board);
            const progress = stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0;
            
            return (
              <div
                key={board.id}
                className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer"
                onClick={() => {
                  setViewMode('kanban');
                  handleBoardSelect(board);
                }}
              >
                {/* Заголовок доски */}
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: board.color || '#3B82F6' }}
                        ></div>
                        <h3 className="font-semibold text-gray-900 truncate">
                          {board.name}
                        </h3>
                      </div>
                      {board.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {board.description}
                        </p>
                      )}
                    </div>
                    
                    {canManageBoards() && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: Добавить меню действий
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Статистика */}
                <div className="p-4 space-y-3">
                  {/* Прогресс */}
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">Прогресс</span>
                      <span className="font-medium">
                        {stats.completedTasks}/{stats.totalTasks}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Дополнительная информация */}
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Users size={14} />
                      <span>{stats.members} участников</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar size={14} />
                      <span>
                        {new Date(board.createdAt).toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                  </div>

                  {/* Колонки */}
                  {board.columns && board.columns.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {board.columns.slice(0, 3).map((column) => (
                        <span
                          key={column.id}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700"
                        >
                          {column.name}
                          {column.tasks && column.tasks.length > 0 && (
                            <span className="ml-1 text-gray-500">
                              ({column.tasks.length})
                            </span>
                          )}
                        </span>
                      ))}
                      {board.columns.length > 3 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-500">
                          +{board.columns.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreateModal && (
        <CreateBoardModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateBoard}
        />
      )}
    </div>
  );
};

export default ProjectBoardsView;