import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Calendar, 
  User, 
  Tag, 
  Clock,
  CheckCircle,
  Circle,
  AlertCircle,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { EditTaskModal } from './EditTaskModal';
import { Task } from '@/types';

interface TaskCardProps {
  task: Task;
  onTaskUpdated?: (task: Task) => void;
  onTaskDeleted?: (taskId: string) => void;
  viewMode?: 'grid' | 'list';
  currentUserId?: string;
  canEdit?: boolean;
  canDelete?: boolean;
  isDragOverlay?: boolean;
}

export function TaskCard({ 
  task, 
  onTaskUpdated, 
  onTaskDeleted, 
  viewMode = 'grid',
  currentUserId,
  canEdit = true,
  canDelete = true,
  isDragOverlay = false
}: TaskCardProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!onTaskDeleted || !confirm('Вы уверены, что хотите удалить эту задачу?')) {
      return;
    }

    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Задача успешно удалена');
        onTaskDeleted(task.id);
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Ошибка удаления задачи');
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Ошибка удаления задачи');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStatusChange = async (newStatus: Task['status']) => {
    if (!onTaskUpdated) return;
    
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        const updatedTask = await response.json();
        toast.success('Статус задачи обновлен');
        onTaskUpdated(updatedTask);
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Ошибка обновления статуса');
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      toast.error('Ошибка обновления статуса');
    }
  };

  const priorityConfig = {
    low: { 
      color: 'bg-green-100 text-green-800 border-green-200', 
      icon: Circle, 
      label: 'Низкий' 
    },
    medium: { 
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
      icon: AlertCircle, 
      label: 'Средний' 
    },
    high: { 
      color: 'bg-orange-100 text-orange-800 border-orange-200', 
      icon: AlertCircle, 
      label: 'Высокий' 
    },
    urgent: { 
      color: 'bg-red-100 text-red-800 border-red-200', 
      icon: Zap, 
      label: 'Срочный' 
    }
  };

  const statusConfig = {
    todo: { 
      color: 'bg-gray-100 text-gray-800 border-gray-200', 
      icon: Circle, 
      label: 'К выполнению' 
    },
    in_progress: { 
      color: 'bg-blue-100 text-blue-800 border-blue-200', 
      icon: Clock, 
      label: 'В работе' 
    },
    review: { 
      color: 'bg-purple-100 text-purple-800 border-purple-200', 
      icon: AlertCircle, 
      label: 'На проверке' 
    },
    done: { 
      color: 'bg-green-100 text-green-800 border-green-200', 
      icon: CheckCircle, 
      label: 'Выполнено' 
    },
    deferred: { 
      color: 'bg-orange-100 text-orange-800 border-orange-200', 
      icon: AlertCircle, 
      label: 'Отложено' 
    }
  };

  const PriorityIcon = priorityConfig[task.priority].icon;
  const StatusIcon = statusConfig[task.status].icon;

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
  const isDueSoon = task.due_date && !isOverdue && 
    new Date(task.due_date).getTime() - new Date().getTime() < 24 * 60 * 60 * 1000;

  // Check permissions
  const isCreator = currentUserId === task.creator_id;
  const isAssignee = task.assignees && task.assignees.some(assignee => assignee.id === currentUserId) || false;
  const canEditTask = canEdit && (isCreator || isAssignee);
  const canDeleteTask = canDelete && isCreator;

  if (viewMode === 'list') {
    return (
      <>
        <Card className={`hover:shadow-md transition-shadow ${
          isOverdue ? 'border-red-300 bg-red-50' : 
          isDueSoon ? 'border-yellow-300 bg-yellow-50' : ''
        }`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1">
                {/* Status Icon */}
                <button
                  onClick={() => {
                    const statuses: Task['status'][] = ['todo', 'in_progress', 'review', 'done', 'deferred'];
                    const currentIndex = statuses.indexOf(task.status);
                    const nextStatus = statuses[(currentIndex + 1) % statuses.length];
                    handleStatusChange(nextStatus);
                  }}
                  className="flex-shrink-0 hover:scale-110 transition-transform"
                  title="Изменить статус"
                >
                  <StatusIcon className={`h-5 w-5 ${
                    task.status === 'done' ? 'text-green-600' : 'text-gray-400'
                  }`} />
                </button>

                {/* Task Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="font-medium text-gray-900 truncate">{task.title}</h3>
                    <Badge className={priorityConfig[task.priority].color}>
                      <PriorityIcon className="h-3 w-3 mr-1" />
                      {priorityConfig[task.priority].label}
                    </Badge>
                    <Badge className={statusConfig[task.status].color}>
                      {statusConfig[task.status].label}
                    </Badge>
                  </div>
                  
                  {task.description && (
                    <p className="text-sm text-gray-600 truncate mb-1">{task.description}</p>
                  )}
                  
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>{task.column_name}</span>
                    <span>{task.board_name}</span>
                    <span>Создал: {task.creator_username}</span>
                    {task.due_date && (
                      <span className={`flex items-center space-x-1 ${
                        isOverdue ? 'text-red-600 font-medium' :
                        isDueSoon ? 'text-yellow-600 font-medium' : ''
                      }`}>
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(task.due_date).toLocaleDateString('ru-RU')}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Assignees */}
                {task.assignees && task.assignees.length > 0 && (
                  <div className="flex items-center space-x-1">
                    <User className="h-4 w-4 text-gray-400" />
                    <div className="flex -space-x-1">
                      {task.assignees.slice(0, 3).map((assignee, index) => (
                        <div
                          key={assignee.id}
                          className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center border-2 border-white"
                          title={assignee.name}
                        >
                          {assignee.name.charAt(0).toUpperCase()}
                        </div>
                      ))}
                      {task.assignees.length > 3 && (
                        <div className="w-6 h-6 rounded-full bg-gray-500 text-white text-xs flex items-center justify-center border-2 border-white">
                          +{task.assignees.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {task.tags && task.tags.length > 0 && (
                  <div className="flex items-center space-x-1">
                    <Tag className="h-4 w-4 text-gray-400" />
                    <div className="flex space-x-1">
                      {task.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {task.tags.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{task.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              {(canEditTask || canDeleteTask) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canEditTask && (
                      <DropdownMenuItem onClick={() => setIsEditModalOpen(true)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Редактировать
                      </DropdownMenuItem>
                    )}
                    {canDeleteTask && (
                      <DropdownMenuItem 
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {isDeleting ? 'Удаление...' : 'Удалить'}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </CardContent>
        </Card>

        {isEditModalOpen && (
          <EditTaskModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onTaskUpdated={onTaskUpdated || (() => {})}
            task={task}
          />
        )}
      </>
    );
  }

  // Grid view
  return (
    <>
      <Card className={`hover:shadow-lg transition-all duration-200 cursor-pointer ${
        isOverdue ? 'border-red-300 bg-red-50' : 
        isDueSoon ? 'border-yellow-300 bg-yellow-50' : ''
      }`}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  const statuses: Task['status'][] = ['todo', 'in_progress', 'review', 'done', 'deferred'];
                  const currentIndex = statuses.indexOf(task.status);
                  const nextStatus = statuses[(currentIndex + 1) % statuses.length];
                  handleStatusChange(nextStatus);
                }}
                className="flex-shrink-0 hover:scale-110 transition-transform"
                title="Изменить статус"
              >
                <StatusIcon className={`h-5 w-5 ${
                  task.status === 'done' ? 'text-green-600' : 'text-gray-400'
                }`} />
              </button>
              <h3 className="font-semibold text-gray-900 line-clamp-2">{task.title}</h3>
            </div>
            
            {(canEditTask || canDeleteTask) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canEditTask && (
                    <DropdownMenuItem onClick={() => setIsEditModalOpen(true)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Редактировать
                    </DropdownMenuItem>
                  )}
                  {canDeleteTask && (
                    <DropdownMenuItem 
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {isDeleting ? 'Удаление...' : 'Удалить'}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          {task.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</p>
          )}
          
          {/* Priority and Status */}
          <div className="flex items-center space-x-2 mb-3">
            <Badge className={priorityConfig[task.priority].color}>
              <PriorityIcon className="h-3 w-3 mr-1" />
              {priorityConfig[task.priority].label}
            </Badge>
            <Badge className={statusConfig[task.status].color}>
              {statusConfig[task.status].label}
            </Badge>
          </div>
          
          {/* Due Date */}
          {task.due_date && (
            <div className={`flex items-center space-x-1 text-sm mb-3 ${
              isOverdue ? 'text-red-600 font-medium' :
              isDueSoon ? 'text-yellow-600 font-medium' : 'text-gray-600'
            }`}>
              <Calendar className="h-4 w-4" />
              <span>{new Date(task.due_date).toLocaleDateString('ru-RU')}</span>
              {isOverdue && <span className="text-xs">(просрочено)</span>}
              {isDueSoon && <span className="text-xs">(скоро)</span>}
            </div>
          )}
          
          {/* Assignees */}
          {task.assignees && task.assignees.length > 0 && (
            <div className="flex items-center space-x-2 mb-3">
              <User className="h-4 w-4 text-gray-400" />
              <div className="flex -space-x-1">
                {task.assignees.slice(0, 3).map((assignee) => (
                  <div
                    key={assignee.id}
                    className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center border-2 border-white"
                    title={assignee.name}
                  >
                    {assignee.name.charAt(0).toUpperCase()}
                  </div>
                ))}
                {task.assignees.length > 3 && (
                  <div className="w-6 h-6 rounded-full bg-gray-500 text-white text-xs flex items-center justify-center border-2 border-white">
                    +{task.assignees.length - 3}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex items-center space-x-1 mb-3">
              <Tag className="h-4 w-4 text-gray-400" />
              <div className="flex flex-wrap gap-1">
                {task.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {task.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{task.tags.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}
          
          {/* Meta Info */}
          <div className="text-xs text-gray-500 space-y-1">
            <div>{task.column_name} • {task.board_name}</div>
            <div>Создал: {task.creator_username}</div>
            <div>Создано: {new Date(task.created_at).toLocaleDateString('ru-RU')}</div>
            {task.updated_at !== task.created_at && (
              <div>Обновлено: {new Date(task.updated_at).toLocaleDateString('ru-RU')}</div>
            )}
          </div>
        </CardContent>
      </Card>

      {isEditModalOpen && (
        <EditTaskModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onTaskUpdated={onTaskUpdated || (() => {})}
          task={task}
        />
      )}
    </>
  );
}