import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Calendar, User, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { Task } from '@/types';

interface TaskFormData {
  title: string;
  description: string;
  column_id: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'review' | 'done' | 'deferred';
  due_date: string;
  assignee_ids: string[];
  tags: string[];
  settings: {
    notifications_enabled: boolean;
    auto_archive: boolean;
    time_tracking: boolean;
  };
}

interface ValidationErrors {
  title: string;
  description: string;
  column_id: string;
  priority: string;
  status: string;
  due_date: string;
  assignee_ids: string;
  tags: string;
}

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated: (task: Task) => void;
  task: Task;
}

interface Column {
  id: string;
  name: string;
  board_id: string;
  board_name: string;
  project_id: string;
  project_name: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export function EditTaskModal({ 
  isOpen, 
  onClose, 
  onTaskUpdated, 
  task 
}: EditTaskModalProps) {
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    column_id: '',
    priority: 'medium',
    status: 'todo',
    due_date: '',
    assignee_ids: [],
    tags: [],
    settings: {
      notifications_enabled: true,
      auto_archive: false,
      time_tracking: false,
    },
  });

  const [errors, setErrors] = useState<Partial<ValidationErrors>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [columns, setColumns] = useState<Column[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingColumns, setLoadingColumns] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (isOpen && task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        column_id: task.column_id,
        priority: task.priority,
        status: task.status,
        due_date: task.due_date || '',
        assignee_ids: task.assignees?.map(a => a.id) || [],
        tags: [...(task.tags || [])],
        settings: task.settings ? { ...task.settings } : {
          notifications_enabled: true,
          auto_archive: false,
          time_tracking: false,
        },
      });
      setErrors({});
      
      // Load columns and users
      loadColumns();
      loadUsers();
    }
  }, [isOpen, task]);

  const loadColumns = async () => {
    setLoadingColumns(true);
    try {
      const response = await fetch('/api/columns');
      if (response.ok) {
        const data = await response.json();
        setColumns(data.columns || []);
      }
    } catch (error) {
      console.error('Failed to load columns:', error);
      toast.error('Не удалось загрузить колонки');
    } finally {
      setLoadingColumns(false);
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Не удалось загрузить пользователей');
    } finally {
      setLoadingUsers(false);
    }
  };

  const hasChanges = 
    formData.title !== task.title ||
    formData.description !== (task.description || '') ||
    formData.column_id !== task.column_id ||
    formData.priority !== task.priority ||
    formData.status !== task.status ||
    formData.due_date !== (task.due_date || '') ||
    JSON.stringify(formData.assignee_ids.sort()) !== JSON.stringify((task.assignees?.map(a => a.id) || []).sort()) ||
    JSON.stringify(formData.tags.sort()) !== JSON.stringify((task.tags || []).sort()) ||
    JSON.stringify(formData.settings) !== JSON.stringify(task.settings || {
      notifications_enabled: true,
      auto_archive: false,
      time_tracking: false,
    });

  const validateForm = (): boolean => {
    const newErrors: Partial<ValidationErrors> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Название задачи обязательно';
    }

    if (!formData.column_id) {
      newErrors.column_id = 'Выберите колонку';
    }

    if (formData.due_date && new Date(formData.due_date) < new Date()) {
      newErrors.due_date = 'Дата выполнения не может быть в прошлом';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          column_id: formData.column_id,
          priority: formData.priority,
          status: formData.status,
          due_date: formData.due_date || null,
          assignee_ids: formData.assignee_ids,
          tags: formData.tags,
          settings: formData.settings,
        }),
      });

      if (response.ok) {
        const updatedTask = await response.json();
        toast.success('Задача успешно обновлена');
        onTaskUpdated(updatedTask);
        onClose();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Не удалось обновить задачу');
      }
    } catch (error) {
      console.error('Failed to update task:', error);
      toast.error('Произошла ошибка при обновлении задачи');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const toggleAssignee = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      assignee_ids: prev.assignee_ids.includes(userId)
        ? prev.assignee_ids.filter(id => id !== userId)
        : [...prev.assignee_ids, userId]
    }));
  };

  const priorityColors = {
    low: 'bg-gray-500/20 text-gray-300',
    medium: 'bg-yellow-500/20 text-yellow-300',
    high: 'bg-orange-500/20 text-orange-300',
    urgent: 'bg-red-500/20 text-red-300'
  };

  const statusColors = {
    todo: 'bg-blue-500/20 text-blue-300',
    in_progress: 'bg-yellow-500/20 text-yellow-300',
    review: 'bg-purple-500/20 text-purple-300',
    deferred: 'bg-orange-500/20 text-orange-300',
    done: 'bg-green-500/20 text-green-300'
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900/95 backdrop-blur-xl border border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white">Редактировать задачу</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="title" className="text-white">Название задачи *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Введите название задачи"
                  className={errors.title ? 'border-red-500' : ''}
                />
                {errors.title && (
                  <p className="text-sm text-red-400 mt-1">{errors.title}</p>
                )}
              </div>

              <div>
                <Label htmlFor="description" className="text-white">Описание</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Введите описание задачи"
                  rows={3}
                  className={errors.description ? 'border-red-500' : ''}
                />
                {errors.description && (
                  <p className="text-sm text-red-400 mt-1">{errors.description}</p>
                )}
              </div>

              <div>
                <Label className="text-white">Колонка *</Label>
                <Select
                  value={formData.column_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, column_id: value }))}
                >
                  <SelectTrigger className={errors.column_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder={loadingColumns ? "Загрузка..." : "Выберите колонку"} />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map((column) => (
                      <SelectItem key={column.id} value={column.id}>
                        {column.name} ({column.board_name} - {column.project_name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.column_id && (
                  <p className="text-sm text-red-400 mt-1">{errors.column_id}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">Приоритет</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Низкий</SelectItem>
                      <SelectItem value="medium">Средний</SelectItem>
                      <SelectItem value="high">Высокий</SelectItem>
                      <SelectItem value="urgent">Срочный</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-white">Статус</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">К выполнению</SelectItem>
                      <SelectItem value="in_progress">В работе</SelectItem>
                      <SelectItem value="review">На проверке</SelectItem>
                      <SelectItem value="deferred">Отложено</SelectItem>
                      <SelectItem value="done">Выполнено</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="due_date" className="text-white">Дата выполнения</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    id="due_date"
                    type="datetime-local"
                    value={formData.due_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                    className={`pl-10 ${errors.due_date ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.due_date && (
                  <p className="text-sm text-red-400 mt-1">{errors.due_date}</p>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div>
                <Label className="text-white">Исполнители</Label>
                <div className="border rounded-md p-3 max-h-32 overflow-y-auto">
                  {loadingUsers ? (
                    <p className="text-sm text-gray-500">Загрузка пользователей...</p>
                  ) : users.length === 0 ? (
                    <p className="text-sm text-gray-500">Нет доступных пользователей</p>
                  ) : (
                    <div className="space-y-2">
                      {users.map((user) => (
                        <label
                          key={user.id}
                          className="flex items-center space-x-2 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={formData.assignee_ids.includes(user.id)}
                            onChange={() => toggleAssignee(user.id)}
                            className="rounded"
                          />
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-white">{user.name}</span>
                            <span className="text-xs text-gray-400">({user.email})</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-white">Теги</Label>
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Добавить тег"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    />
                    <Button
                      type="button"
                      onClick={handleAddTag}
                      size="sm"
                      variant="outline"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="flex items-center space-x-1"
                      >
                        <Tag className="w-3 h-3" />
                        <span>{tag}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 text-gray-400 hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-white">Настройки</Label>
                <div className="space-y-2 p-3 border rounded-md">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.settings.notifications_enabled}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, notifications_enabled: e.target.checked }
                      }))}
                    />
                    <span className="text-sm text-white">Уведомления включены</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.settings.auto_archive}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, auto_archive: e.target.checked }
                      }))}
                    />
                    <span className="text-sm text-white">Автоархивирование</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.settings.time_tracking}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, time_tracking: e.target.checked }
                      }))}
                    />
                    <span className="text-sm text-white">Отслеживание времени</span>
                  </label>
                </div>
              </div>

              <div>
                <Label className="text-white">Предварительный просмотр</Label>
                <div className="p-3 border rounded-md bg-white/5">
                  <h4 className="font-medium text-white mb-2">{formData.title || 'Название задачи'}</h4>
                  {formData.description && (
                    <p className="text-sm text-gray-300 mb-2">{formData.description}</p>
                  )}
                  <div className="flex items-center space-x-2">
                    <Badge className={priorityColors[formData.priority]}>
                      {formData.priority === 'low' ? 'Низкий' : 
                       formData.priority === 'medium' ? 'Средний' :
                       formData.priority === 'high' ? 'Высокий' : 'Срочный'}
                    </Badge>
                    <Badge className={statusColors[formData.status]}>
                      {formData.status === 'todo' ? 'К выполнению' :
                       formData.status === 'in_progress' ? 'В работе' :
                       formData.status === 'review' ? 'На проверке' :
                       formData.status === 'deferred' ? 'Отложено' : 'Выполнено'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !hasChanges}
            >
              {isSubmitting ? 'Сохранение...' : 'Сохранить изменения'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}