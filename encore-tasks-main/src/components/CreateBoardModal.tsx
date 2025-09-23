import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Board } from '@/types';
import { projectService } from '@/services/ProjectService';
import { toast } from 'sonner';

interface CreateBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBoardCreated: (board: Board) => void;
  projectId: number;
}

interface BoardFormData {
  name: string;
  description: string;
  color: string;
  isPrivate: boolean;
}

const BOARD_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#6B7280', // Gray
];

const DEFAULT_COLUMNS = [
  { name: 'К выполнению', type: 'TODO' as const },
  { name: 'В работе', type: 'IN_PROGRESS' as const },
  { name: 'На проверке', type: 'REVIEW' as const },
  { name: 'Выполнено', type: 'DONE' as const },
];

const CreateBoardModal: React.FC<CreateBoardModalProps> = ({
  isOpen,
  onClose,
  onBoardCreated,
  projectId,
}) => {
  const [formData, setFormData] = useState<BoardFormData>({
    name: '',
    description: '',
    color: BOARD_COLORS[0],
    isPrivate: false,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<BoardFormData>>({});

  // Валидация формы
  const validateForm = (): boolean => {
    const newErrors: Partial<BoardFormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Название доски обязательно';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Название должно содержать минимум 2 символа';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Название не должно превышать 100 символов';
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Описание не должно превышать 500 символов';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Сброс формы
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: BOARD_COLORS[0],
      isPrivate: false,
    });
    setErrors({});
  };

  // Закрытие модального окна
  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Обработка отправки формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Создание доски через API
      const response = await fetch('/api/boards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim(),
          color: formData.color,
          is_private: formData.isPrivate,
          project_id: projectId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ошибка при создании доски');
      }

      const { data: board } = await response.json();

      // Создание колонок по умолчанию
      const columnPromises = DEFAULT_COLUMNS.map(async (columnData, index) => {
        const columnResponse = await fetch('/api/columns', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: columnData.name,
            board_id: board.id,
            position: index,
            type: columnData.type,
          }),
        });

        if (!columnResponse.ok) {
          throw new Error(`Ошибка при создании колонки: ${columnData.name}`);
        }

        return columnResponse.json();
      });

      await Promise.all(columnPromises);

      toast.success('Доска успешно создана');
      onBoardCreated(board);
      handleClose();

    } catch (error) {
      console.error('Error creating board:', error);
      toast.error(
        error instanceof Error 
          ? error.message 
          : 'Ошибка при создании доски'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">Создать доску</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Название доски */}
          <div>
            <label htmlFor="board-name" className="block text-sm font-medium text-white mb-2">
              Название доски *
            </label>
            <input
              id="board-name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Введите название доски"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/5 text-white placeholder-gray-400 ${
                errors.name ? 'border-red-300' : 'border-gray-600'
              }`}
              disabled={loading}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-400">{errors.name}</p>
            )}
          </div>

          {/* Описание */}
          <div>
            <label htmlFor="board-description" className="block text-sm font-medium text-white mb-2">
              Описание (необязательно)
            </label>
            <textarea
              id="board-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Введите описание доски"
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white/5 text-white placeholder-gray-400 ${
                errors.description ? 'border-red-300' : 'border-gray-600'
              }`}
              disabled={loading}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-400">{errors.description}</p>
            )}
          </div>

          {/* Цвет доски */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Цвет доски
            </label>
            <div className="grid grid-cols-5 gap-2">
              {BOARD_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    formData.color === color
                      ? 'border-white scale-110'
                      : 'border-gray-500 hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: color }}
                  disabled={loading}
                  aria-label={`Выбрать цвет ${color}`}
                />
              ))}
            </div>
          </div>

          {/* Приватность */}
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isPrivate}
                onChange={(e) => setFormData({ ...formData, isPrivate: e.target.checked })}
                className="rounded border-gray-600 bg-white/5 text-blue-600 focus:ring-blue-500"
                disabled={loading}
              />
              <span className="text-sm text-white">Приватная доска</span>
            </label>
            <p className="mt-1 text-xs text-gray-400">
              Приватные доски видны только участникам проекта
            </p>
          </div>

          {/* Предварительный просмотр */}
          <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
            <h3 className="text-sm font-medium text-white mb-2">Предварительный просмотр</h3>
            <div className="flex items-center space-x-3">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: formData.color }}
              />
              <div>
                <p className="text-white font-medium">
                  {formData.name || 'Название доски'}
                </p>
                {formData.description && (
                  <p className="text-xs text-gray-400 mt-1">
                    {formData.description}
                  </p>
                )}
              </div>
              {formData.isPrivate && (
                <span className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded">
                  Приватная
                </span>
              )}
            </div>
          </div>

          {/* Кнопки */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              disabled={loading}
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading || !formData.name.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Создание...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Создать доску</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateBoardModal;