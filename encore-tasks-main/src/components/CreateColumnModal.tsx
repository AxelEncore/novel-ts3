import React, { useState } from 'react';
import { X } from 'lucide-react';

interface CreateColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    color: string;
    position: number;
  }) => void;
  nextPosition: number;
}

const COLUMN_COLORS = [
  { name: 'Синий', value: '#3B82F6', bg: 'bg-blue-500' },
  { name: 'Зеленый', value: '#10B981', bg: 'bg-green-500' },
  { name: 'Желтый', value: '#F59E0B', bg: 'bg-yellow-500' },
  { name: 'Красный', value: '#EF4444', bg: 'bg-red-500' },
  { name: 'Фиолетовый', value: '#8B5CF6', bg: 'bg-purple-500' },
  { name: 'Розовый', value: '#EC4899', bg: 'bg-pink-500' },
  { name: 'Индиго', value: '#6366F1', bg: 'bg-indigo-500' },
  { name: 'Серый', value: '#6B7280', bg: 'bg-gray-500' },
];

export const CreateColumnModal: React.FC<CreateColumnModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  nextPosition
}) => {
  const [formData, setFormData] = useState({
    name: '',
    color: COLUMN_COLORS[0].value
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onSubmit({
        name: formData.name.trim(),
        color: formData.color,
        position: nextPosition
      });
      
      // Сброс формы
      setFormData({
        name: '',
        color: COLUMN_COLORS[0].value
      });
    } catch (error) {
      console.error('Ошибка создания колонки:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        name: '',
        color: COLUMN_COLORS[0].value
      });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Создать колонку
          </h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Название колонки */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Название колонки *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Введите название колонки"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={isSubmitting}
              maxLength={50}
            />
          </div>

          {/* Выбор цвета */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Цвет колонки
            </label>
            <div className="grid grid-cols-4 gap-2">
              {COLUMN_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
                  disabled={isSubmitting}
                  className={`
                    w-full h-10 rounded-md border-2 transition-all
                    ${color.bg}
                    ${
                      formData.color === color.value
                        ? 'border-gray-900 scale-105'
                        : 'border-gray-300 hover:border-gray-400'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* Предварительный просмотр */}
          <div className="border border-gray-200 rounded-md p-3">
            <div className="text-sm text-gray-600 mb-2">Предварительный просмотр:</div>
            <div 
              className="rounded-md p-3 text-white font-medium"
              style={{ backgroundColor: formData.color }}
            >
              {formData.name || 'Название колонки'}
            </div>
          </div>

          {/* Кнопки действий */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.name.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateColumnModal;