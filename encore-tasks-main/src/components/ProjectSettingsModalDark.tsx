'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Users,
  Bell,
  Trash2,
  Save,
  X,
  AlertTriangle,
  Palette,
  UserPlus,
  UserMinus,
  Crown,
  Shield,
  Eye,
  MessageSquare,
  Hash,
  Archive,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: any;
  onProjectUpdated?: (project: any) => void;
  onProjectDeleted?: (projectId: string) => void;
}

type SettingsTab = 'general' | 'members' | 'notifications' | 'danger';

// Иконки для проектов
const PROJECT_ICONS = ['📁', '💼', '🎯', '🚀', '💡', '⚡', '🌟', '🔥', '💎', '🎨'];

// Цветовая палитра
const PROJECT_COLORS = [
  '#3B82F6', // blue
  '#EF4444', // red
  '#10B981', // green
  '#F59E0B', // yellow
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F97316', // orange
  '#6366F1', // indigo
  '#84CC16', // lime
];

export default function ProjectSettingsModalDark({
  isOpen,
  onClose,
  project,
  onProjectUpdated,
  onProjectDeleted,
}: ProjectSettingsModalProps) {
  console.log('ProjectSettingsModalDark rendering:', { isOpen, project });

  if (!project) {
    return null;
  }

  const projectId = project.id;

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Form states - только реальные поля из Project interface
  const [formData, setFormData] = useState({
    name: project?.name || '',
    description: project?.description || '',
    color: project?.color || '#3B82F6',
    icon: project?.icon || '📁',
    visibility: project?.visibility || 'private',
    telegram_chat_id: project?.telegram_chat_id || '',
    telegram_topic_id: project?.telegram_topic_id || '',
  });

  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        description: project.description || '',
        color: project.color || '#3B82F6',
        icon: project.icon || '📁',
        visibility: project.visibility || 'private',
        telegram_chat_id: project.telegram_chat_id || '',
        telegram_topic_id: project.telegram_topic_id || '',
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
        if (data.success && data.data) {
          setMembers(data.data);
        } else {
          setMembers([]);
        }
      }
    } catch (error) {
      console.error('Error fetching project members:', error);
      setMembers([]);
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
          visibility: formData.visibility,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (onProjectUpdated && result.data) {
          onProjectUpdated(result.data);
        }
        toast.success('Настройки проекта успешно сохранены');
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update project');
      }
    } catch (error: any) {
      toast.error(error.message || 'Ошибка при сохранении настроек');
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
        }),
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

  const handleAddMember = async () => {
    if (!newMemberEmail) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newMemberEmail, role: 'member' }),
      });

      if (response.ok) {
        toast.success('Участник добавлен в проект');
        setNewMemberEmail('');
        fetchProjectMembers();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Не удалось добавить участника');
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
        method: 'DELETE',
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
        body: JSON.stringify({ role }),
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
        method: 'DELETE',
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

  const tabs = [
    { id: 'general', label: 'Основные', icon: Settings },
    { id: 'members', label: 'Участники', icon: Users },
    { id: 'notifications', label: 'Уведомления', icon: Bell },
    { id: 'danger', label: 'Опасная зона', icon: AlertTriangle },
  ];

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4" />;
      case 'admin':
        return <Shield className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'text-yellow-400';
      case 'admin':
        return 'text-purple-400';
      default:
        return 'text-gray-400';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/5 rounded-lg">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Настройки проекта</h2>
              <p className="text-sm text-gray-400 mt-1">
                Управление параметрами и участниками проекта
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-2 border-b border-white/10 bg-black/20">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  activeTab === tab.id
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* General Settings Tab */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Name & Description */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    Название проекта
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:bg-white/10 focus:border-blue-500 focus:outline-none transition-all"
                    placeholder="Введите название"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    Видимость
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFormData({ ...formData, visibility: 'public' })}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                        formData.visibility === 'public'
                          ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      <Eye className="w-4 h-4" />
                      <span>Публичный</span>
                    </button>
                    <button
                      onClick={() => setFormData({ ...formData, visibility: 'private' })}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                        formData.visibility === 'private'
                          ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      <Shield className="w-4 h-4" />
                      <span>Приватный</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Описание</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:bg-white/10 focus:border-blue-500 focus:outline-none transition-all resize-none"
                  placeholder="Описание проекта..."
                />
              </div>

              {/* Icon & Color */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">
                    Иконка проекта
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {PROJECT_ICONS.map((icon) => (
                      <button
                        key={icon}
                        onClick={() => setFormData({ ...formData, icon })}
                        className={`p-3 text-2xl rounded-lg border transition-all ${
                          formData.icon === icon
                            ? 'bg-blue-500/20 border-blue-500'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Цвет проекта</label>
                  <div className="grid grid-cols-5 gap-2">
                    {PROJECT_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setFormData({ ...formData, color })}
                        className={`h-12 rounded-lg border-2 transition-all ${
                          formData.color === color
                            ? 'border-white scale-110'
                            : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleSaveGeneral}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Сохранить изменения</span>
                </button>
              </div>
            </div>
          )}

          {/* Members Tab */}
          {activeTab === 'members' && (
            <div className="space-y-6">
              {/* Add Member */}
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Добавить участника
                </h3>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="Email пользователя"
                    className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:bg-white/10 focus:border-blue-500 focus:outline-none transition-all"
                  />
                  <button
                    onClick={handleAddMember}
                    disabled={loading || !newMemberEmail}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Добавить</span>
                  </button>
                </div>
              </div>

              {/* Members List */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Участники проекта ({members.length})
                </h3>
                {members.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Нет участников</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {members.map((member) => (
                      <div
                        key={member.user_id}
                        className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                            {member.username?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="text-white font-medium">
                              {member.username || member.email}
                            </div>
                            <div className="text-sm text-gray-400">{member.email}</div>
                          </div>
                          <div className={`flex items-center gap-1 ${getRoleColor(member.role)}`}>
                            {getRoleIcon(member.role)}
                            <span className="text-sm capitalize">{member.role}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {member.role !== 'owner' && (
                            <>
                              <select
                                value={member.role}
                                onChange={(e) =>
                                  handleUpdateMemberRole(member.user_id, e.target.value)
                                }
                                className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:bg-white/10 focus:border-blue-500 focus:outline-none transition-all"
                              >
                                <option value="member">Участник</option>
                                <option value="admin">Администратор</option>
                              </select>
                              <button
                                onClick={() => handleRemoveMember(member.user_id)}
                                className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                              >
                                <UserMinus className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <MessageSquare className="w-5 h-5 text-blue-400" />
                  <h3 className="text-lg font-semibold text-white">Telegram интеграция</h3>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Chat ID</label>
                    <input
                      type="text"
                      value={formData.telegram_chat_id}
                      onChange={(e) =>
                        setFormData({ ...formData, telegram_chat_id: e.target.value })
                      }
                      placeholder="-1001234567890"
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:bg-white/10 focus:border-blue-500 focus:outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Topic ID</label>
                    <input
                      type="text"
                      value={formData.telegram_topic_id}
                      onChange={(e) =>
                        setFormData({ ...formData, telegram_topic_id: e.target.value })
                      }
                      placeholder="123"
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:bg-white/10 focus:border-blue-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveNotifications}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Сохранить настройки</span>
                </button>
              </div>
            </div>
          )}

          {/* Danger Zone Tab */}
          {activeTab === 'danger' && (
            <div className="space-y-6">
              <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-red-500/20 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-2">Удалить проект</h3>
                    <p className="text-gray-300 mb-4">
                      После удаления проекта восстановить его будет невозможно. Все доски,
                      задачи и файлы будут удалены безвозвратно.
                    </p>

                    {!showDeleteConfirm ? (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                      >
                        Удалить проект
                      </button>
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm text-gray-300">
                            Введите название проекта "{project.name}" для подтверждения:
                          </label>
                          <input
                            type="text"
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:bg-white/10 focus:border-red-500 focus:outline-none transition-all"
                            placeholder="Название проекта"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleDeleteProject}
                            disabled={loading || deleteConfirmText !== project.name}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Удалить навсегда</span>
                          </button>
                          <button
                            onClick={() => {
                              setShowDeleteConfirm(false);
                              setDeleteConfirmText('');
                            }}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Archive Project Option */}
              {project.status !== 'archived' && (
                <div className="p-6 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-orange-500/20 rounded-lg">
                      <Archive className="w-6 h-6 text-orange-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-2">
                        Архивировать проект
                      </h3>
                      <p className="text-gray-300 mb-4">
                        Архивированный проект будет скрыт из основного списка, но его можно будет
                        восстановить позже.
                      </p>
                      <button
                        onClick={async () => {
                          try {
                            const response = await fetch(`/api/projects/${projectId}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: 'archived' }),
                            });
                            if (response.ok) {
                              const result = await response.json();
                              if (onProjectUpdated && result.data) {
                                onProjectUpdated(result.data);
                              }
                              toast.success('Проект архивирован');
                              onClose();
                            }
                          } catch (error) {
                            toast.error('Ошибка при архивировании проекта');
                          }
                        }}
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                      >
                        Архивировать
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}