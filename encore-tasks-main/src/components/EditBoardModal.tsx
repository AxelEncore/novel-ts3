import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Board {
  id: string;
  name: string;
  description: string;
  project_id: string;
  visibility: 'public' | 'private';
}

interface Project {
  id: string;
  name: string;
}

interface BoardFormData {
  name: string;
  description: string;
  project_id: string;
  visibility: 'public' | 'private';
}

interface ValidationErrors {
  name?: string;
  description?: string;
  project_id?: string;
  visibility?: string;
}

interface EditBoardModalProps {
  board: Board;
  projects: Project[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBoardUpdated: (board: any) => void;
}

export function EditBoardModal({
  board,
  projects,
  open,
  onOpenChange,
  onBoardUpdated
}: EditBoardModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<BoardFormData>({
    name: board.name,
    description: board.description || '',
    project_id: board.project_id,
    visibility: board.visibility
  });
  const [errors, setErrors] = useState<ValidationErrors>({});

  // Обновляем форму при изменении доски
  useEffect(() => {
    setFormData({
      name: board.name,
      description: board.description || '',
      project_id: board.project_id,
      visibility: board.visibility
    });
    setErrors({});
  }, [board]);

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Название доски обязательно';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Название должно содержать минимум 2 символа';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Название не должно превышать 100 символов';
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Описание не должно превышать 500 символов';
    }

    if (!formData.project_id) {
      newErrors.project_id = 'Необходимо выбрать проект';
    }

    if (!formData.visibility) {
      newErrors.visibility = 'Необходимо выбрать видимость';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/boards/${board.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim(),
          project_id: formData.project_id,
          visibility: formData.visibility,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка при обновлении доски');
      }

      const { data: updatedBoard } = await response.json();
      
      toast.success('Доска успешно обновлена');
      onBoardUpdated(updatedBoard);
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating board:', error);
      toast.error(
        error instanceof Error 
          ? error.message 
          : 'Ошибка при обновлении доски'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof BoardFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Очищаем ошибку для этого поля
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Редактировать доску
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Название доски */}
          <div className="space-y-2">
            <Label htmlFor="board-name" className="text-sm font-medium text-gray-300">
              Название доски *
            </Label>
            <Input
              id="board-name"
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Введите название доски"
              className={`bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 ${
                errors.name ? 'border-red-500' : ''
              }`}
              disabled={loading}
            />
            {errors.name && (
              <p className="text-red-400 text-xs mt-1">{errors.name}</p>
            )}
          </div>

          {/* Описание */}
          <div className="space-y-2">
            <Label htmlFor="board-description" className="text-sm font-medium text-gray-300">
              Описание
            </Label>
            <Textarea
              id="board-description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Описание доски (необязательно)"
              rows={3}
              className={`bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 resize-none ${
                errors.description ? 'border-red-500' : ''
              }`}
              disabled={loading}
            />
            {errors.description && (
              <p className="text-red-400 text-xs mt-1">{errors.description}</p>
            )}
          </div>

          {/* Проект */}
          <div className="space-y-2">
            <Label htmlFor="board-project" className="text-sm font-medium text-gray-300">
              Проект *
            </Label>
            <Select 
              value={formData.project_id} 
              onValueChange={(value) => handleChange('project_id', value)}
              disabled={loading}
            >
              <SelectTrigger className={`bg-gray-800 border-gray-600 text-white focus:border-blue-500 ${
                errors.project_id ? 'border-red-500' : ''
              }`}>
                <SelectValue placeholder="Выберите проект" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {projects.map((project) => (
                  <SelectItem 
                    key={project.id} 
                    value={project.id}
                    className="text-white hover:bg-gray-700"
                  >
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.project_id && (
              <p className="text-red-400 text-xs mt-1">{errors.project_id}</p>
            )}
          </div>

          {/* Видимость */}
          <div className="space-y-2">
            <Label htmlFor="board-visibility" className="text-sm font-medium text-gray-300">
              Видимость *
            </Label>
            <Select 
              value={formData.visibility} 
              onValueChange={(value: 'public' | 'private') => handleChange('visibility', value)}
              disabled={loading}
            >
              <SelectTrigger className={`bg-gray-800 border-gray-600 text-white focus:border-blue-500 ${
                errors.visibility ? 'border-red-500' : ''
              }`}>
                <SelectValue placeholder="Выберите видимость" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="private" className="text-white hover:bg-gray-700">
                  Приватная - доступна только участникам проекта
                </SelectItem>
                <SelectItem value="public" className="text-white hover:bg-gray-700">
                  Публичная - доступна всем пользователям
                </SelectItem>
              </SelectContent>
            </Select>
            {errors.visibility && (
              <p className="text-red-400 text-xs mt-1">{errors.visibility}</p>
            )}
          </div>

          {/* Кнопки действий */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="bg-transparent border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Сохранить изменения
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}