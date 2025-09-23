import React, { useState } from 'react';
import { Plus, MoreHorizontal, Edit, Trash2, Users, Calendar, AlertCircle } from 'lucide-react';
import { Column, Task, User } from '@/types';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';
import KanbanTask from './KanbanTask';
import CreateTaskModal from './CreateTaskModal';

interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
  projectUsers: User[];
  project: any;
  canManage: boolean;
  onTaskDragStart: (task: Task) => void;
  onTaskDragEnd: () => void;
  onTaskCreate: (task: Task) => void;
  onTaskUpdate: (taskId: number, updates: Partial<Task>) => void;
  onTaskDelete: (taskId: number) => void;
  onColumnUpdate: (columnId: number, updates: Partial<Column>) => void;
  onColumnDelete: (columnId: number) => void;
}

const COLUMN_TYPE_COLORS = {
  TODO: 'bg-gray-100 border-gray-300',
  IN_PROGRESS: 'bg-blue-50 border-blue-300',
  REVIEW: 'bg-yellow-50 border-yellow-300',
  DONE: 'bg-green-50 border-green-300',
  BLOCKED: 'bg-red-50 border-red-300',
};

const COLUMN_TYPE_ICONS = {
  TODO: '📋',
  IN_PROGRESS: '⚡',
  REVIEW: '👀',
  DONE: '✅',
  BLOCKED: '🚫',
};

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column,
  index,
  isDragOver,
  canManage,
  projectUsers,
  onTaskDragStart,
  onTaskDragEnd,
  onTaskDrop,
  onColumnDragStart,
  onColumnDragEnd,
  onColumnDrop,
  onColumnDragOver,
  onColumnDragLeave,
  onTaskUpdate,
  onColumnUpdate,
  onCreateTask,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [dragOverTaskIndex, setDragOverTaskIndex] = useState<number | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  const tasks = (column.tasks || []).sort((a, b) => (a.position || 0) - (b.position || 0));
  const columnColorClass = COLUMN_TYPE_COLORS[column.type] || COLUMN_TYPE_COLORS.TODO;
  const columnIcon = COLUMN_TYPE_ICONS[column.type] || COLUMN_TYPE_ICONS.TODO;

  // Обработка перетаскивания задач внутри колонки
  const handleTaskDragOver = (e: React.DragEvent, taskIndex: number) => {
    e.preventDefault();
    setDragOverTaskIndex(taskIndex);
  };

  const handleTaskDragLeave = () => {
    setDragOverTaskIndex(null);
  };

  const handleTaskDropOnTask = (targetIndex: number) => {
    onTaskDrop(targetIndex);
    setDragOverTaskIndex(null);
  };

  // Обработка перетаскивания в пустую область колонки
  const handleColumnDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onTaskDrop(); // Добавить в конец колонки
  };

  // Получение статистики колонки
  const getColumnStats = () => {
    const totalTasks = tasks.length;
    const urgentTasks = tasks.filter(task => {
      if (!task.dueDate) return false;
      const dueDate = new Date(task.dueDate);
      const now = new Date();
      const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 1;
    }).length;

    const assignedUsers = new Set(
      tasks.flatMap(task => task.assignees?.map(a => a.userId) || [])
    ).size;

    return { totalTasks, urgentTasks, assignedUsers };
  };

  const stats = getColumnStats();

  // Создание новой задачи
  const handleCreateTaskSubmit = async (taskData: Partial<Task>) => {
    setIsCreatingTask(true);
    try {
      const createdTask = await projectService.createTask(column.id, taskData);
      
      // Обновляем локальное состояние
      onTaskCreate(createdTask);
      
      toast.success('Задача создана');
    } catch (error) {
      console.error('Ошибка при создании задачи:', error);
      toast.error('Не удалось создать задачу');
      throw error;
    } finally {
      setIsCreatingTask(false);
    }
  };

  // Обновление задачи
  const handleUpdateTask = async (taskId: number, updates: Partial<Task>) => {
    try {
      await projectService.updateTask(taskId, updates);
      onTaskUpdate(taskId, updates);
      toast.success('Задача обновлена');
    } catch (error) {
      console.error('Ошибка при обновлении задачи:', error);
      toast.error('Не удалось обновить задачу');
    }
  };

  // Удаление задачи
  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('Вы уверены, что хотите удалить эту задачу?')) {
      return;
    }

    try {
      await projectService.deleteTask(taskId);
      onTaskDelete(taskId);
      toast.success('Задача удалена');
    } catch (error) {
      console.error('Ошибка при удалении задачи:', error);
      toast.error('Не удалось удалить задачу');
    }
  };

  return (
    <div
      className={`flex-shrink-0 w-72 bg-white rounded-lg border-2 transition-all duration-200 ${
        isDragOver ? 'border-blue-400 bg-blue-50' : columnColorClass
      }`}
      draggable={canManage}
      onDragStart={canManage ? onColumnDragStart : undefined}
      onDragEnd={onColumnDragEnd}
      onDragOver={onColumnDragOver}
      onDragLeave={onColumnDragLeave}
      onDrop={handleColumnDrop}
    >
      {/* Заголовок колонки */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{columnIcon}</span>
            <h3 className="font-semibold text-gray-900 truncate">
              {column.name}
            </h3>
            <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">
              {stats.totalTasks}
            </span>
          </div>
          
          {canManage && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <MoreHorizontal size={16} />
              </button>
              
              {showMenu && (
                <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-32">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      // TODO: Добавить редактирование колонки
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                  >
                    <Edit size={14} />
                    <span>Изменить</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      // TODO: Добавить удаление колонки
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                  >
                    <Trash2 size={14} />
                    <span>Удалить</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Статистика колонки */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-3">
            {stats.urgentTasks > 0 && (
              <div className="flex items-center space-x-1 text-red-600">
                <AlertCircle size={12} />
                <span>{stats.urgentTasks} срочных</span>
              </div>
            )}
            {stats.assignedUsers > 0 && (
              <div className="flex items-center space-x-1">
                <Users size={12} />
                <span>{stats.assignedUsers} участников</span>
              </div>
            )}
          </div>
          
          {canManage && (
            <button
              onClick={onCreateTask}
              className="text-blue-600 hover:text-blue-700 flex items-center space-x-1"
            >
              <Plus size={12} />
              <span>Добавить</span>
            </button>
          )}
        </div>
      </div>

      {/* Список задач */}
      <div className="flex-1 p-2 space-y-2 min-h-32 max-h-96 overflow-y-auto">
        {tasks.map((task, taskIndex) => (
          <KanbanTask
            key={task.id}
            task={task}
            projectUsers={projectUsers}
            canManage={canManage}
            onDragStart={() => onTaskDragStart(task)}
            onDragEnd={onTaskDragEnd}
            onUpdate={(updates) => handleUpdateTask(task.id, updates)}
            onDelete={() => handleDeleteTask(task.id)}
          />
        ))}

        {/* Область для перетаскивания в пустую колонку */}
        {tasks.length === 0 && (
          <div
            className={`h-20 border-2 border-dashed rounded-lg flex items-center justify-center transition-all duration-200 ${
              isDragOver
                ? 'border-blue-400 bg-blue-50 text-blue-600'
                : 'border-gray-300 text-gray-400'
            }`}
            onDragOver={onColumnDragOver}
            onDragLeave={onColumnDragLeave}
            onDrop={handleColumnDrop}
          >
            <div className="text-center">
              <div className="text-2xl mb-1">📝</div>
              <p className="text-xs">
                {isDragOver ? 'Отпустите здесь' : 'Перетащите задачу сюда'}
              </p>
            </div>
          </div>
        )}

        {/* Кнопка добавления задачи */}
        {canManage && tasks.length > 0 && (
          <button
            onClick={onCreateTask}
            className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors flex items-center justify-center space-x-2"
          >
            <Plus size={16} />
            <span className="text-sm">Добавить задачу</span>
          </button>
        )}
      </div>

      {/* Закрытие меню при клике вне его */}
      {showMenu && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
};

export default KanbanColumn;