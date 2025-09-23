'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Settings, 
  Users, 
  Bell, 
  Trash2, 
  Save, 
  X, 
  AlertTriangle,
  Palette,
  Calendar,
  Tag,
  Shield,
  UserPlus,
  UserMinus,
  Crown
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: any;
  onProjectUpdated?: (project: any) => void;
  onProjectDeleted?: (projectId: string) => void;
}

type SettingsTab = 'general' | 'members' | 'notifications' | 'danger';

export default function ProjectSettingsModal({
  isOpen,
  onClose,
  project,
  onProjectUpdated,
  onProjectDeleted
}: ProjectSettingsModalProps) {
  console.log('ProjectSettingsModal rendering:', { isOpen, project });
  const { state } = useApp();
  
  if (!project) {
    console.log('No project provided to ProjectSettingsModal');
    return null;
  }
  
  const projectId = project.id;
  
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  
  // Form states
  const [formData, setFormData] = useState({
    name: project?.name || '',
    description: project?.description || '',
    color: project?.color || '#3B82F6',
    icon: project?.icon || '📁',
    status: (project as any)?.status || 'active',
    visibility: (project as any)?.visibility || 'private',
    priority: (project as any)?.priority || 'medium',
    deadline: (project as any)?.deadline || '',
    telegram_chat_id: (project as any)?.telegram_chat_id || '',
    telegram_topic_id: (project as any)?.telegram_topic_id || '',
    notification_settings: {
      enabled: true,
      types: ['task_created', 'task_completed', 'member_added'],
      channels: ['in-app', 'email'] as ('email' | 'telegram' | 'in-app')[]
    },
    tags: (project as any)?.tags || []
  });

  const [newTag, setNewTag] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        description: project.description || '',
        color: project.color || '#3B82F6',
        icon: project.icon || '📁',
        status: (project as any).status || 'active',
        visibility: (project as any).visibility || 'private',
        priority: (project as any).priority || 'medium',
        deadline: (project as any).deadline || '',
        telegram_chat_id: (project as any).telegram_chat_id || '',
        telegram_topic_id: (project as any).telegram_topic_id || '',
        notification_settings: (project as any).notification_settings || {
          enabled: true,
          types: ['task_created', 'task_completed', 'member_added'],
          channels: ['in-app', 'email']
        },
        tags: (project as any).tags || []
      });
      // Загрузка членов команды
      fetchProjectMembers();
    }
  }, [project]);

  const fetchProjectMembers = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/members`);
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
      }
    } catch (error) {
      console.error('Error fetching project members:', error);
    }
  };

  const handleSaveGeneral = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          color: formData.color,
          icon: formData.icon,
          status: formData.status,
          visibility: formData.visibility,
          priority: formData.priority,
          deadline: formData.deadline || null,
          tags: formData.tags
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (onProjectUpdated && result.data) {
          onProjectUpdated(result.data);
        }
        toast.success('Настройки проекта успешно сохранены');
      } else {
        throw new Error('Failed to update project');
      }
    } catch (error) {
      toast.error('Ошибка при сохранении настроек');
      console.error('Error updating project:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_chat_id: formData.telegram_chat_id || null,
          telegram_topic_id: formData.telegram_topic_id || null,
          notification_settings: formData.notification_settings
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (onProjectUpdated && result.data) {
          onProjectUpdated(result.data);
        }
        toast.success('Настройки уведомлений сохранены');
      } else {
        throw new Error('Failed to update notifications');
      }
    } catch (error) {
      toast.error('Ошибка при сохранении настроек уведомлений');
      console.error('Error updating notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = () => {
    if (newTag && !formData.tags.includes(newTag)) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag]
      });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(t => t !== tag)
    });
  };

  const handleAddMember = async () => {
    if (!newMemberEmail) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newMemberEmail, role: 'member' })
      });

      if (response.ok) {
        toast.success('Участник добавлен в проект');
        setNewMemberEmail('');
        fetchProjectMembers();
      } else {
        toast.error('Не удалось добавить участника');
      }
    } catch (error) {
      toast.error('Ошибка при добавлении участника');
      console.error('Error adding member:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/members/${userId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Участник удален из проекта');
        fetchProjectMembers();
      } else {
        toast.error('Не удалось удалить участника');
      }
    } catch (error) {
      toast.error('Ошибка при удалении участника');
      console.error('Error removing member:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMemberRole = async (userId: string, role: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });

      if (response.ok) {
        toast.success('Роль участника обновлена');
        fetchProjectMembers();
      } else {
        toast.error('Не удалось обновить роль');
      }
    } catch (error) {
      toast.error('Ошибка при обновлении роли');
      console.error('Error updating member role:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async () => {
    if (deleteConfirmText !== project?.name) {
      toast.error('Название проекта не совпадает');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        toast.success('Проект успешно удален');
        if (onProjectDeleted) {
          onProjectDeleted(projectId);
        }
        onClose();
      } else {
        throw new Error('Failed to delete project');
      }
    } catch (error) {
      toast.error('Ошибка при удалении проекта');
      console.error('Error deleting project:', error);
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const iconOptions = ['📁', '💼', '🎯', '🚀', '💡', '⚡', '🌟', '🔥', '💎', '🎨'];
  const colorOptions = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
    '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
    '#6366F1', '#84CC16'
  ];

  const tabs = [
    { id: 'general', label: 'Основные', icon: Settings },
    { id: 'members', label: 'Участники', icon: Users },
    { id: 'notifications', label: 'Уведомления', icon: Bell },
    { id: 'danger', label: 'Опасная зона', icon: AlertTriangle }
  ];

  if (!project) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Настройки проекта
          </DialogTitle>
          <DialogDescription>
            Управление настройками, участниками и уведомлениями проекта
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 border-b">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto px-1">
          {/* Основные настройки */}
          {activeTab === 'general' && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Название проекта</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Введите название проекта"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Статус</Label>
                  <Select 
                    value={formData.status}
                    onValueChange={value => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Активный</SelectItem>
                      <SelectItem value="archived">Архивированный</SelectItem>
                      <SelectItem value="completed">Завершенный</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Описание проекта"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="icon">Иконка</Label>
                  <div className="flex gap-2 flex-wrap">
                    {iconOptions.map(icon => (
                      <button
                        key={icon}
                        onClick={() => setFormData({ ...formData, icon })}
                        className={`text-2xl p-2 rounded-md border-2 transition-colors ${
                          formData.icon === icon
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="color">Цвет</Label>
                  <div className="flex gap-2 flex-wrap">
                    {colorOptions.map(color => (
                      <button
                        key={color}
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-10 h-10 rounded-md border-2 transition-all ${
                          formData.color === color
                            ? 'scale-110 border-gray-600'
                            : 'border-gray-300 hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">Приоритет</Label>
                  <Select 
                    value={formData.priority}
                    onValueChange={value => setFormData({ ...formData, priority: value })}
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

                <div className="space-y-2">
                  <Label htmlFor="visibility">Видимость</Label>
                  <Select 
                    value={formData.visibility}
                    onValueChange={value => setFormData({ ...formData, visibility: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Приватный</SelectItem>
                      <SelectItem value="public">Публичный</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadline">Дедлайн проекта</Label>
                <Input
                  id="deadline"
                  type="datetime-local"
                  value={formData.deadline}
                  onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Теги</Label>
                <div className="flex gap-2 flex-wrap mb-2">
                  {formData.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700"
                    >
                      <Tag className="w-3 h-3" />
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={e => setNewTag(e.target.value)}
                    placeholder="Новый тег"
                    onKeyPress={e => e.key === 'Enter' && handleAddTag()}
                  />
                  <Button onClick={handleAddTag} variant="outline">
                    Добавить
                  </Button>
                </div>
              </div>

              <Button 
                onClick={handleSaveGeneral}
                disabled={loading}
                className="w-full"
              >
                <Save className="w-4 h-4 mr-2" />
                Сохранить основные настройки
              </Button>
            </div>
          )}

          {/* Управление участниками */}
          {activeTab === 'members' && (
            <div className="space-y-6 py-4">
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newMemberEmail}
                    onChange={e => setNewMemberEmail(e.target.value)}
                    placeholder="Email нового участника"
                    type="email"
                  />
                  <Button onClick={handleAddMember} disabled={loading}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Добавить
                  </Button>
                </div>

                <div className="space-y-2">
                  {members.map(member => (
                    <div 
                      key={member.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          {member.user?.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="font-medium">{member.user?.name || 'Без имени'}</div>
                          <div className="text-sm text-gray-600">{member.user?.email}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Select
                          value={member.role}
                          onValueChange={value => handleUpdateMemberRole(member.user_id, value)}
                          disabled={member.role === 'owner'}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="owner">
                              <span className="flex items-center gap-1">
                                <Crown className="w-3 h-3" />
                                Владелец
                              </span>
                            </SelectItem>
                            <SelectItem value="admin">Администратор</SelectItem>
                            <SelectItem value="member">Участник</SelectItem>
                            <SelectItem value="viewer">Наблюдатель</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        {member.role !== 'owner' && (
                          <Button
                            onClick={() => handleRemoveMember(member.user_id)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            <UserMinus className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Настройки уведомлений */}
          {activeTab === 'notifications' && (
            <div className="space-y-6 py-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Уведомления включены</h3>
                    <p className="text-sm text-gray-600">Получать уведомления о событиях в проекте</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.notification_settings.enabled}
                    onChange={e => setFormData({
                      ...formData,
                      notification_settings: {
                        ...formData.notification_settings,
                        enabled: e.target.checked
                      }
                    })}
                    className="w-5 h-5"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Каналы уведомлений</Label>
                  <div className="space-y-2">
                    {(['email', 'telegram', 'in-app'] as const).map(channel => (
                      <label key={channel} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.notification_settings.channels.includes(channel)}
                          onChange={e => {
                            const channels = e.target.checked
                              ? [...formData.notification_settings.channels, channel]
                              : formData.notification_settings.channels.filter(c => c !== channel);
                            setFormData({
                              ...formData,
                              notification_settings: {
                                ...formData.notification_settings,
                                channels
                              }
                            });
                          }}
                        />
                        <span className="capitalize">{channel === 'in-app' ? 'В приложении' : channel}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Типы уведомлений</Label>
                  <div className="space-y-2">
                    {[
                      { id: 'task_created', label: 'Создание задач' },
                      { id: 'task_completed', label: 'Завершение задач' },
                      { id: 'task_assigned', label: 'Назначение задач' },
                      { id: 'member_added', label: 'Добавление участников' },
                      { id: 'comment_added', label: 'Новые комментарии' }
                    ].map(type => (
                      <label key={type.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.notification_settings.types.includes(type.id)}
                          onChange={e => {
                            const types = e.target.checked
                              ? [...formData.notification_settings.types, type.id]
                              : formData.notification_settings.types.filter(t => t !== type.id);
                            setFormData({
                              ...formData,
                              notification_settings: {
                                ...formData.notification_settings,
                                types
                              }
                            });
                          }}
                        />
                        <span>{type.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-medium">Интеграция с Telegram</h3>
                  <div className="space-y-2">
                    <Label htmlFor="telegram_chat_id">ID чата Telegram</Label>
                    <Input
                      id="telegram_chat_id"
                      value={formData.telegram_chat_id}
                      onChange={e => setFormData({ ...formData, telegram_chat_id: e.target.value })}
                      placeholder="Например: -1001234567890"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telegram_topic_id">ID топика (для групп с топиками)</Label>
                    <Input
                      id="telegram_topic_id"
                      value={formData.telegram_topic_id}
                      onChange={e => setFormData({ ...formData, telegram_topic_id: e.target.value })}
                      placeholder="Опционально"
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleSaveNotifications}
                  disabled={loading}
                  className="w-full"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Сохранить настройки уведомлений
                </Button>
              </div>
            </div>
          )}

          {/* Опасная зона */}
          {activeTab === 'danger' && (
            <div className="space-y-6 py-4">
              <div className="border-2 border-red-200 rounded-lg p-6 bg-red-50">
                <h3 className="text-lg font-semibold text-red-900 mb-2">
                  Удаление проекта
                </h3>
                <p className="text-red-700 mb-4">
                  Внимание! Это действие необратимо. Будут удалены все доски, колонки, 
                  задачи и вся связанная информация.
                </p>
                
                {!showDeleteConfirm ? (
                  <Button
                    onClick={() => setShowDeleteConfirm(true)}
                    variant="destructive"
                    className="w-full"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Удалить проект
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="deleteConfirm">
                        Введите название проекта "{project.name}" для подтверждения:
                      </Label>
                      <Input
                        id="deleteConfirm"
                        value={deleteConfirmText}
                        onChange={e => setDeleteConfirmText(e.target.value)}
                        placeholder={project.name}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleDeleteProject}
                        variant="destructive"
                        disabled={loading || deleteConfirmText !== project.name}
                        className="flex-1"
                      >
                        Подтвердить удаление
                      </Button>
                      <Button
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeleteConfirmText('');
                        }}
                        variant="outline"
                        className="flex-1"
                      >
                        Отмена
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-2 border-yellow-200 rounded-lg p-6 bg-yellow-50">
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                  Архивирование проекта
                </h3>
                <p className="text-yellow-700 mb-4">
                  Архивированный проект будет скрыт из основного списка, но его можно восстановить.
                </p>
                <Button
                  onClick={() => {
                    setFormData({ ...formData, status: 'archived' });
                    handleSaveGeneral();
                  }}
                  variant="outline"
                  className="w-full border-yellow-600 text-yellow-700 hover:bg-yellow-100"
                >
                  Архивировать проект
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}