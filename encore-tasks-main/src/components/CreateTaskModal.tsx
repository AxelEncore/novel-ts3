import React, { useState, useEffect } from 'react';
import { X, Calendar, Users, Flag, Paperclip, Plus } from 'lucide-react';
import { Task, User, Project } from '@/types';
import { format } from 'date-fns';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated?: (task: Task, columnId: string) => void;
  columnId: string | number;
  boardId: string;
  users: User[];
}

interface TaskFormData {
  title: string;
  description: string;
  priority: Task['priority'];
  dueDate: string;
  assigneeIds: string[];
}

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Низкий', color: 'text-green-600 bg-green-100' },
  { value: 'MEDIUM', label: 'Средний', color: 'text-yellow-600 bg-yellow-100' },
  { value: 'HIGH', label: 'Высокий', color: 'text-orange-600 bg-orange-100' },
  { value: 'URGENT', label: 'Срочный', color: 'text-red-600 bg-red-100' },
] as const;

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onTaskCreated,
  columnId,
  boardId,
  users,
}) => {
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    priority: 'MEDIUM',
    dueDate: '',
    assigneeIds: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Сброс формы при открытии/закрытии модального окна
  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: '',
        description: '',
        priority: 'MEDIUM',
        dueDate: '',
        assigneeIds: [],
      });
      setErrors({});
    }
  }, [isOpen]);

  // Валидация формы
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Название задачи обязательно';
    }

    if (formData.title.length > 200) {
      newErrors.title = 'Название не должно превышать 200 символов';
    }

    if (formData.description.length > 1000) {
      newErrors.description = 'Описание не должно превышать 1000 символов';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Обработка отправки формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Вызываем API для создания задачи
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim() || '',
          priority: formData.priority.toLowerCase(),
          column_id: columnId.toString(),
          assignee_ids: formData.assigneeIds,
          due_date: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create task');
      }

      const createdTask = await response.json();

      if (onTaskCreated) {
        onTaskCreated(createdTask, typeof columnId === 'string' ? columnId : String(columnId));
      }
      onClose();
    } catch (error: any) {
      console.error('Ошибка при создании задачи:', error);
      setErrors({ submit: error.message || 'Не удалось создать задачу. Попробуйте еще раз.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Обработка изменения полей формы
  const handleInputChange = (field: keyof TaskFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Переключение исполнителя
  const toggleAssignee = (userId: string) => {
    const newAssigneeIds = formData.assigneeIds.includes(userId)
      ? formData.assigneeIds.filter(id => id !== userId)
      : [...formData.assigneeIds, userId];
    handleInputChange('assigneeIds', newAssigneeIds);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Заголовок */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">Создать задачу</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Форма */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Название задачи */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
              Название задачи *
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={`w-full px-3 py-2 bg-white/5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-white placeholder-gray-500 ${
                errors.title ? 'border-red-400' : 'border-white/10'
              }`}
              placeholder="Введите название задачи"
              maxLength={200}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-400">{errors.title}</p>
            )}
          </div>

          {/* Описание */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
              Описание
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={4}
              className={`w-full px-3 py-2 bg-white/5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-white placeholder-gray-500 ${
                errors.description ? 'border-red-400' : 'border-white/10'
              }`}
              placeholder="Введите описание задачи"
              maxLength={1000}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-400">{errors.description}</p>
            )}
          </div>

          {/* Приоритет и дата выполнения */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Приоритет */}
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-300 mb-2">
                <Flag size={16} className="inline mr-1" />
                Приоритет
              </label>
              <select
                id="priority"
                value={formData.priority}
                onChange={(e) => handleInputChange('priority', e.target.value as Task['priority'])}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-white"
              >
                {PRIORITY_OPTIONS.map(option => (
                  <option key={option.value} value={option.value} className="bg-gray-800 text-white">
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Дата выполнения */}
            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-gray-300 mb-2">
                <Calendar size={16} className="inline mr-1" />
                Дата выполнения
              </label>
              <input
                type="date"
                id="dueDate"
                value={formData.dueDate}
                onChange={(e) => handleInputChange('dueDate', e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-white"
              />
            </div>
          </div>

          {/* Исполнители */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <Users size={16} className="inline mr-1" />
              Исполнители
            </label>
            <div className="space-y-2 max-h-32 overflow-y-auto border border-white/10 bg-white/5 rounded-lg p-2">
              {(!users || users.length === 0) ? (
                <div className="text-center py-4 text-gray-400 text-sm">
                  Нет доступных пользователей
                </div>
              ) : (
                (users || []).map(user => (
                  <label key={user.id} className="flex items-center space-x-2 cursor-pointer hover:bg-white/10 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={formData.assigneeIds.includes(user.id)}
                      onChange={() => toggleAssignee(user.id)}
                      className="rounded border-gray-600 text-primary-500 focus:ring-primary-500 bg-white/10"
                    />
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-primary-500/20 flex items-center justify-center text-xs font-medium text-primary-400">
                        {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                      </div>
                      <span className="text-sm text-gray-200">
                        {user.name || 'Unknown User'}
                      </span>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Ошибка отправки */}
          {errors.submit && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400">{errors.submit}</p>
            </div>
          )}

          {/* Кнопки действий */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-300 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
              disabled={isSubmitting}
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.title.trim()}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Создание...' : 'Создать задачу'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTaskModal;