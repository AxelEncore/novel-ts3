import React, { useState } from 'react';
import { Calendar, Users, MessageSquare, Paperclip, MoreHorizontal, Edit, Trash2, Eye, Flag } from 'lucide-react';
import { Task, User } from '@/types';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { ru } from 'date-fns/locale';

interface KanbanTaskProps {
  task: Task;
  projectUsers: User[];
  canManage: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onUpdate: (updates: Partial<Task>) => void;
  onDelete: () => void;
}

const PRIORITY_COLORS = {
  LOW: 'text-green-600 bg-green-100',
  MEDIUM: 'text-yellow-600 bg-yellow-100',
  HIGH: 'text-orange-600 bg-orange-100',
  URGENT: 'text-red-600 bg-red-100',
};

const PRIORITY_LABELS = {
  LOW: 'Низкий',
  MEDIUM: 'Средний',
  HIGH: 'Высокий',
  URGENT: 'Срочный',
};

const STATUS_COLORS = {
  TODO: 'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  REVIEW: 'bg-yellow-100 text-yellow-700',
  DONE: 'bg-green-100 text-green-700',
  BLOCKED: 'bg-red-100 text-red-700',
};

const KanbanTask: React.FC<KanbanTaskProps> = ({
  task,
  projectUsers,
  canManage,
  onDragStart,
  onDragEnd,
  onUpdate,
  onDelete,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Получение информации о пользователях-исполнителях
  const getAssignees = () => {
    if (!task.assignees) return [];
    return task.assignees
      .map(assignee => projectUsers.find(user => user.id === assignee.userId))
      .filter((user): user is User => user !== undefined);
  };

  // Форматирование даты
  const formatDueDate = (date: string) => {
    const dueDate = new Date(date);
    
    if (isToday(dueDate)) {
      return 'Сегодня';
    }
    if (isTomorrow(dueDate)) {
      return 'Завтра';
    }
    return format(dueDate, 'd MMM', { locale: ru });
  };

  // Определение срочности задачи
  const getUrgencyStatus = () => {
    if (!task.dueDate) return null;
    
    const dueDate = new Date(task.dueDate);
    const now = new Date();
    const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (isPast(dueDate) && !isToday(dueDate)) {
      return { type: 'overdue', label: 'Просрочено', color: 'text-red-600 bg-red-100' };
    }
    if (diffDays <= 1) {
      return { type: 'urgent', label: 'Срочно', color: 'text-orange-600 bg-orange-100' };
    }
    return null;
  };

  // Обработка начала перетаскивания
  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    onDragStart();
    
    // Добавляем данные для drag and drop
    e.dataTransfer.setData('text/plain', task.id.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  // Обработка окончания перетаскивания
  const handleDragEnd = () => {
    setIsDragging(false);
    onDragEnd();
  };

  // Обработка клика по задаче
  const handleTaskClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.task-content')) {
      // TODO: Открыть модальное окно с деталями задачи
      console.log('Открыть детали задачи:', task.id);
    }
  };

  // Обработка изменения статуса
  const handleStatusChange = (newStatus: Task['status']) => {
    onUpdate({ status: newStatus });
  };

  const assignees = getAssignees();
  const urgencyStatus = getUrgencyStatus();
  const priorityColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.MEDIUM;
  const statusColor = STATUS_COLORS[task.status] || STATUS_COLORS.TODO;

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${
        isDragging ? 'opacity-50 transform rotate-2' : ''
      }`}
      draggable={canManage}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleTaskClick}
    >
      {/* Заголовок задачи */}
      <div className="p-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 task-content">
            <h4 className="font-medium text-gray-900 text-sm line-clamp-2 mb-1">
              {task.title}
            </h4>
            {task.description && (
              <p className="text-gray-600 text-xs line-clamp-2">
                {task.description}
              </p>
            )}
          </div>
          
          {canManage && (
            <div className="relative ml-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal size={14} />
              </button>
              
              {showMenu && (
                <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-32">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      // TODO: Открыть редактирование задачи
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                  >
                    <Edit size={12} />
                    <span>Изменить</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      // TODO: Открыть детали задачи
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                  >
                    <Eye size={12} />
                    <span>Подробнее</span>
                  </button>
                  <hr className="my-1" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onDelete();
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                  >
                    <Trash2 size={12} />
                    <span>Удалить</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Метки и статусы */}
        <div className="flex flex-wrap gap-1 mb-2">
          {/* Приоритет */}
          {task.priority && task.priority !== 'MEDIUM' && (
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${priorityColor}`}>
              <Flag size={10} className="mr-1" />
              {PRIORITY_LABELS[task.priority]}
            </span>
          )}
          
          {/* Срочность */}
          {urgencyStatus && (
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${urgencyStatus.color}`}>
              {urgencyStatus.label}
            </span>
          )}
          
          {/* Статус */}
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
            {task.status}
          </span>
        </div>

        {/* Дополнительная информация */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-3">
            {/* Дата выполнения */}
            {task.dueDate && (
              <div className={`flex items-center space-x-1 ${
                urgencyStatus ? urgencyStatus.color.split(' ')[0] : ''
              }`}>
                <Calendar size={12} />
                <span>{formatDueDate(task.dueDate)}</span>
              </div>
            )}
            
            {/* Комментарии */}
            {task.comments && task.comments.length > 0 && (
              <div className="flex items-center space-x-1">
                <MessageSquare size={12} />
                <span>{task.comments.length}</span>
              </div>
            )}
            
            {/* Вложения */}
            {task.attachments && task.attachments.length > 0 && (
              <div className="flex items-center space-x-1">
                <Paperclip size={12} />
                <span>{task.attachments.length}</span>
              </div>
            )}
          </div>
          
          {/* Исполнители */}
          {assignees.length > 0 && (
            <div className="flex items-center space-x-1">
              <Users size={12} />
              <div className="flex -space-x-1">
                {assignees.slice(0, 3).map((user, index) => (
                  <div
                    key={user.id}
                    className="w-5 h-5 rounded-full bg-gray-300 border border-white flex items-center justify-center text-xs font-medium text-gray-700"
                    title={`${user.firstName} ${user.lastName}`}
                    style={{ zIndex: assignees.length - index }}
                  >
                    {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                  </div>
                ))}
                {assignees.length > 3 && (
                  <div className="w-5 h-5 rounded-full bg-gray-400 border border-white flex items-center justify-center text-xs font-medium text-white">
                    +{assignees.length - 3}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Прогресс выполнения (если есть подзадачи) */}
      {task.subtasks && task.subtasks.length > 0 && (
        <div className="px-3 pb-3">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Подзадачи</span>
            <span>
              {task.subtasks.filter(st => st.completed).length}/{task.subtasks.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
              style={{
                width: `${(task.subtasks.filter(st => st.completed).length / task.subtasks.length) * 100}%`
              }}
            ></div>
          </div>
        </div>
      )}

      {/* Закрытие меню при клике вне его */}
      {showMenu && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
};

export default KanbanTask;