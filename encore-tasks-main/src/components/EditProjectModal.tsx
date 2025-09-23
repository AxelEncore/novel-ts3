import React, { useState, useContext, useEffect } from 'react';
import { X, Users, Hash, MessageSquare, Plus, Trash2, AlertCircle, Save } from 'lucide-react';
import { AppContext } from '../contexts/AppContext';
import { User, UpdateProjectDto, ProjectWithStats } from '../types/core.types';
import { toast } from 'sonner';

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectUpdated: (project: ProjectWithStats) => void;
  project: ProjectWithStats;
}

interface ProjectFormData {
  name: string;
  description: string;
  color: string;
  icon: string;
  members: User[];
  telegramChatId: string;
  telegramTopicId: string;
}

interface ValidationErrors {
  name: string;
  description: string;
  color: string;
  icon: string;
  telegramChatId: string;
  telegramTopicId: string;
  members: string;
}

const EditProjectModal: React.FC<EditProjectModalProps> = ({
  isOpen,
  onClose,
  onProjectUpdated,
  project,
}) => {
  const { currentUser, users } = useContext(AppContext);
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    description: '',
    color: '#3B82F6',
    icon: '📋',
    members: [],
    telegramChatId: '',
    telegramTopicId: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<ValidationErrors>>({});
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (isOpen && project) {
      setFormData({
        name: project.name || '',
        description: project.description || '',
        color: project.color || '#3B82F6',
        icon: project.icon || '📋',
        members: project.members || [],
        telegramChatId: project.telegram_chat_id || '',
        telegramTopicId: project.telegram_topic_id || '',
      });
      setErrors({});
      setHasChanges(false);
      
      // Load available users for membership management
      const nonMembers = users.filter(user => 
        !project.members?.some(member => member.id === user.id)
      );
      setAvailableUsers(nonMembers);
    }
  }, [isOpen, project, users]);

  // Track changes
  useEffect(() => {
    if (project) {
      const changed = 
        formData.name !== (project.name || '') ||
        formData.description !== (project.description || '') ||
        formData.color !== (project.color || '#3B82F6') ||
        formData.icon !== (project.icon || '📋') ||
        formData.telegramChatId !== (project.telegram_chat_id || '') ||
        formData.telegramTopicId !== (project.telegram_topic_id || '') ||
        JSON.stringify(formData.members.map(m => m.id).sort()) !== 
        JSON.stringify((project.members || []).map(m => m.id).sort());
      
      setHasChanges(changed);
    }
  }, [formData, project]);

  const validateForm = (): boolean => {
    const newErrors: Partial<ValidationErrors> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Название проекта обязательно';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Название должно содержать минимум 2 символа';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Название не должно превышать 100 символов';
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Описание не должно превышать 500 символов';
    }

    if (formData.telegramChatId && formData.telegramChatId.trim()) {
      const chatIdRegex = /^-?\d+$/;
      if (!chatIdRegex.test(formData.telegramChatId.trim())) {
        newErrors.telegramChatId = 'ID чата должен содержать только цифры и может начинаться с "-"';
      }
    }

    if (formData.telegramTopicId && formData.telegramTopicId.trim()) {
      const topicIdRegex = /^\d+$/;
      if (!topicIdRegex.test(formData.telegramTopicId.trim())) {
        newErrors.telegramTopicId = 'ID топика должен содержать только цифры';
      }
    }

    if (formData.members.length === 0) {
      newErrors.members = 'Проект должен иметь хотя бы одного участника';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const updateData: UpdateProjectDto = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        color: formData.color,
        icon: formData.icon,
        member_ids: formData.members.map(member => member.id),
        telegram_chat_id: formData.telegramChatId.trim() || undefined,
        telegram_topic_id: formData.telegramTopicId.trim() || undefined,
      };

      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ошибка при обновлении проекта');
      }

      const { project: updatedProject } = await response.json();
      
      toast.success('Проект успешно обновлен');
      onProjectUpdated(updatedProject);
      onClose();

    } catch (error) {
      console.error('Error updating project:', error);
      toast.error(
        error instanceof Error 
          ? error.message 
          : 'Ошибка при обновлении проекта'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const addMember = (user: User) => {
    setFormData(prev => ({
      ...prev,
      members: [...prev.members, user]
    }));
    setAvailableUsers(prev => prev.filter(u => u.id !== user.id));
  };

  const removeMember = (userId: string) => {
    if (userId === currentUser?.id) return; // Нельзя удалить текущего пользователя
    
    const memberToRemove = formData.members.find(m => m.id === userId);
    if (!memberToRemove) return;

    setFormData(prev => ({
      ...prev,
      members: prev.members.filter(m => m.id !== userId)
    }));
    setAvailableUsers(prev => [...prev, memberToRemove]);
  };

  const resetForm = () => {
    if (project) {
      setFormData({
        name: project.name || '',
        description: project.description || '',
        color: project.color || '#3B82F6',
        icon: project.icon || '📋',
        members: project.members || [],
        telegramChatId: project.telegram_chat_id || '',
        telegramTopicId: project.telegram_topic_id || '',
      });
      setErrors({});
      setHasChanges(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen || !project) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">Редактировать проект</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Основная информация</h3>
            
            <div>
              <label htmlFor="project-name" className="block text-sm font-medium text-white mb-2">
                Название проекта *
              </label>
              <input
                id="project-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Введите название проекта"
                className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white/5 text-white placeholder-gray-400 ${
                  errors.name ? 'border-red-500' : 'border-gray-600'
                }`}
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-400">{errors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="project-description" className="block text-sm font-medium text-white mb-2">
                Описание
              </label>
              <textarea
                id="project-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Введите описание проекта"
                rows={3}
                className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none bg-white/5 text-white placeholder-gray-400 ${
                  errors.description ? 'border-red-500' : 'border-gray-600'
                }`}
                disabled={isSubmitting}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-400">{errors.description}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="project-color" className="block text-sm font-medium text-white mb-2">
                  Цвет проекта
                </label>
                <input
                  id="project-color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className={`w-full h-10 border rounded-md cursor-pointer bg-white/5 ${
                    errors.color ? 'border-red-500' : 'border-gray-600'
                  }`}
                  disabled={isSubmitting}
                />
                {errors.color && (
                  <p className="mt-1 text-sm text-red-400">{errors.color}</p>
                )}
              </div>

              <div>
                <label htmlFor="project-icon" className="block text-sm font-medium text-white mb-2">
                  Иконка проекта
                </label>
                <input
                  id="project-icon"
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="📋"
                  className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white/5 text-white placeholder-gray-400 ${
                    errors.icon ? 'border-red-500' : 'border-gray-600'
                  }`}
                  disabled={isSubmitting}
                />
                {errors.icon && (
                  <p className="mt-1 text-sm text-red-400">{errors.icon}</p>
                )}
              </div>
            </div>
          </div>

          {/* Telegram Integration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Интеграция с Telegram</h3>
            
            <div>
              <label htmlFor="telegram-chat-id" className="block text-sm font-medium text-white mb-2">
                ID чата Telegram
              </label>
              <input
                id="telegram-chat-id"
                type="text"
                value={formData.telegramChatId}
                onChange={(e) => setFormData({ ...formData, telegramChatId: e.target.value })}
                placeholder="-1001234567890"
                className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white/5 text-white placeholder-gray-400 ${
                  errors.telegramChatId ? 'border-red-500' : 'border-gray-600'
                }`}
                disabled={isSubmitting}
              />
              {errors.telegramChatId && (
                <p className="mt-1 text-sm text-red-400">{errors.telegramChatId}</p>
              )}
            </div>

            <div>
              <label htmlFor="telegram-topic-id" className="block text-sm font-medium text-white mb-2">
                ID топика Telegram
              </label>
              <input
                id="telegram-topic-id"
                type="text"
                value={formData.telegramTopicId}
                onChange={(e) => setFormData({ ...formData, telegramTopicId: e.target.value })}
                placeholder="123"
                className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white/5 text-white placeholder-gray-400 ${
                  errors.telegramTopicId ? 'border-red-500' : 'border-gray-600'
                }`}
                disabled={isSubmitting}
              />
              {errors.telegramTopicId && (
                <p className="mt-1 text-sm text-red-400">{errors.telegramTopicId}</p>
              )}
            </div>
          </div>

          {/* Team Management */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Участники проекта</h3>
            
            {/* Current Members */}
            <div>
              <h4 className="text-sm font-medium text-white mb-2">Текущие участники</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {formData.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2 bg-white/5 rounded-lg border border-white/10"
                  >
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-white">
                        {member.name} {member.id === currentUser?.id && '(Вы)'}
                      </span>
                      <span className="text-xs text-gray-400">({member.email})</span>
                    </div>
                    {member.id !== currentUser?.id && (
                      <button
                        type="button"
                        onClick={() => removeMember(member.id)}
                        className="p-1 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300 transition-colors"
                        disabled={isSubmitting}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {errors.members && (
                <p className="mt-1 text-sm text-red-400">{errors.members}</p>
              )}
            </div>

            {/* Available Users */}
            {availableUsers.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-white mb-2">Добавить участников</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {availableUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-2 bg-white/5 rounded-lg border border-white/10"
                    >
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-white">{user.name}</span>
                        <span className="text-xs text-gray-400">({user.email})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => addMember(user)}
                        className="p-1 hover:bg-green-500/20 rounded text-green-400 hover:text-green-300 transition-colors"
                        disabled={isSubmitting}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              disabled={isSubmitting}
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !hasChanges}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              <Save size={16} />
              <span>{isSubmitting ? 'Сохранение...' : 'Сохранить'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProjectModal;