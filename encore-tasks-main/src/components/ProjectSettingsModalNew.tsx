'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  Settings, 
  Users, 
  Bell, 
  Trash2, 
  Save, 
  X, 
  AlertTriangle,
  Tag,
  UserPlus,
  UserMinus,
  Crown,
  Shield,
  Eye,
  ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';

interface ProjectMember {
  id: string;
  user_id: string;
  project_id: string;
  role: string;
  joined_at: string;
  name?: string;
  email?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isApproved?: boolean;
}

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: any;
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
  
  if (!project) return null;
  
  const projectId = project.id;
  
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  
  // Member management states
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active',
    icon: '📁',
    color: '#3B82F6',
    priority: 'medium',
    visibility: 'private',
    deadline: '',
    tags: [] as string[],
    budget: 0,
    progress: 0
  });
  
  const [notificationSettings, setNotificationSettings] = useState({
    taskCreated: true,
    taskCompleted: true,
    memberAdded: true,
    deadlineApproaching: true,
    mentionInComment: true
  });
  
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (isOpen && project) {
      // Initialize form data
      setFormData({
        name: project.name || '',
        description: project.description || '',
        status: project.status || 'active',
        icon: project.icon || '📁',
        color: project.color || '#3B82F6',
        priority: project.priority || 'medium',
        visibility: project.visibility || 'private',
        deadline: project.deadline || '',
        tags: project.tags || [],
        budget: project.budget || 0,
        progress: project.progress || 0
      });
      
      setNotificationSettings({
        taskCreated: project.notifications?.taskCreated ?? true,
        taskCompleted: project.notifications?.taskCompleted ?? true,
        memberAdded: project.notifications?.memberAdded ?? true,
        deadlineApproaching: project.notifications?.deadlineApproaching ?? true,
        mentionInComment: project.notifications?.mentionInComment ?? true
      });
      
      // Load data
      fetchProjectMembers();
      fetchAllUsers();
    }
  }, [isOpen, project]);

  useEffect(() => {
    // Filter available users (not already members)
    const memberUserIds = members.map(m => m.user_id);
    const available = allUsers.filter(user => 
      !memberUserIds.includes(user.id) &&
      (user.isApproved !== false) &&
      (user.role !== 'pending')
    );
    setAvailableUsers(available);
  }, [members, allUsers]);

  const fetchProjectMembers = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/members`);
      if (response.ok) {
        const data = await response.json();
        setMembers(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setAllUsers(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleAddMember = async (userId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: userId,
          role: 'member' 
        })
      });

      if (response.ok) {
        toast.success('Участник добавлен в проект');
        setUserSearchQuery('');
        setShowUserDropdown(false);
        fetchProjectMembers();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Не удалось добавить участника');
      }
    } catch (error) {
      toast.error('Ошибка при добавлении участника');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/members?user_id=${userId}`, {
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
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGeneral = async () => {
    setLoading(true);
    try {
      console.log('Saving project data:', formData);
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        const result = await response.json();
        if (onProjectUpdated && result.data) {
          onProjectUpdated(result.data);
        }
        toast.success('Настройки проекта сохранены');
      } else {
        const errorData = await response.json();
        console.error('Update failed:', errorData);
        toast.error(errorData.error || 'Не удалось обновить проект');
      }
    } catch (error) {
      console.error('Error saving project:', error);
      toast.error('Ошибка при сохранении настроек');
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
        body: JSON.stringify({ notifications: notificationSettings })
      });
      
      if (response.ok) {
        toast.success('Настройки уведомлений сохранены');
      } else {
        throw new Error('Failed to update notifications');
      }
    } catch (error) {
      toast.error('Ошибка при сохранении уведомлений');
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
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleAddTag = () => {
    if (newTag && !formData.tags.includes(newTag)) {
      setFormData({ ...formData, tags: [...formData.tags, newTag] });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };

  const iconOptions = ['📁', '💼', '🎯', '🚀', '💡', '⚡', '🌟', '🔥', '💎', '🎨'];
  const colorOptions = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
    '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'
  ];

  const tabs = [
    { id: 'general', label: 'Основные', icon: Settings },
    { id: 'members', label: 'Участники', icon: Users },
    { id: 'notifications', label: 'Уведомления', icon: Bell },
    { id: 'danger', label: 'Опасная зона', icon: AlertTriangle }
  ];

  const filteredUsers = availableUsers.filter(user =>
    user.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'admin': return <Shield className="w-4 h-4 text-blue-500" />;
      case 'viewer': return <Eye className="w-4 h-4 text-gray-500" />;
      default: return null;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return 'Владелец';
      case 'admin': return 'Администратор';
      case 'member': return 'Участник';
      case 'viewer': return 'Наблюдатель';
      default: return role;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-gray-900/95 backdrop-blur-xl border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-400" />
            Настройки проекта
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Управление настройками, участниками и уведомлениями проекта
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-800">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto px-1">
          {/* Members Tab */}
          {activeTab === 'members' && (
            <div className="space-y-6 py-4">
              {/* Add Member Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Добавить участника</h3>
                
                <div className="relative">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Input
                        value={userSearchQuery}
                        onChange={(e) => {
                          setUserSearchQuery(e.target.value);
                          setShowUserDropdown(true);
                        }}
                        onFocus={() => setShowUserDropdown(true)}
                        placeholder="Поиск пользователя по имени или email..."
                        className="bg-gray-800 border-gray-700 text-white"
                      />
                      
                      {/* User Dropdown */}
                      {showUserDropdown && userSearchQuery && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto z-50">
                          {filteredUsers.length > 0 ? (
                            filteredUsers.map(user => (
                              <button
                                key={user.id}
                                onClick={() => handleAddMember(user.id)}
                                className="w-full px-4 py-2 text-left hover:bg-gray-700 transition-colors flex items-center justify-between group"
                                disabled={loading}
                              >
                                <div>
                                  <div className="font-medium text-white">{user.name}</div>
                                  <div className="text-sm text-gray-400">{user.email}</div>
                                </div>
                                <UserPlus className="w-4 h-4 text-gray-500 group-hover:text-blue-400" />
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-3 text-gray-500 text-center">
                              Пользователи не найдены
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Available Users List */}
                  {!userSearchQuery && availableUsers.length > 0 && (
                    <div className="mt-3">
                      <button
                        onClick={() => setShowUserDropdown(!showUserDropdown)}
                        className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300"
                      >
                        <ChevronDown className={`w-4 h-4 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} />
                        Показать доступных пользователей ({availableUsers.length})
                      </button>
                      
                      {showUserDropdown && (
                        <div className="mt-2 grid gap-2">
                          {availableUsers.map(user => (
                            <div
                              key={user.id}
                              className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                                  {user.name?.[0]?.toUpperCase() || '?'}
                                </div>
                                <div>
                                  <div className="font-medium text-white">{user.name}</div>
                                  <div className="text-sm text-gray-400">{user.email}</div>
                                </div>
                              </div>
                              <Button
                                onClick={() => handleAddMember(user.id)}
                                disabled={loading}
                                size="sm"
                                className="bg-blue-500 hover:bg-blue-600"
                              >
                                <UserPlus className="w-4 h-4 mr-1" />
                                Добавить
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Current Members */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Текущие участники</h3>
                
                <div className="space-y-2">
                  {members.length > 0 ? (
                    members.map(member => (
                      <div 
                        key={member.id}
                        className="flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-gray-700"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                            {member.name?.[0]?.toUpperCase() || member.email?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="font-medium text-white flex items-center gap-2">
                              {member.name || 'Без имени'}
                              {getRoleIcon(member.role)}
                            </div>
                            <div className="text-sm text-gray-400">{member.email}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Select
                            value={member.role}
                            onValueChange={value => handleUpdateMemberRole(member.user_id, value)}
                            disabled={member.role === 'owner' || loading}
                          >
                            <SelectTrigger className="w-40 bg-gray-700 border-gray-600 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="owner" disabled>
                                <span className="flex items-center gap-2">
                                  <Crown className="w-3 h-3" />
                                  Владелец
                                </span>
                              </SelectItem>
                              <SelectItem value="admin">
                                <span className="flex items-center gap-2">
                                  <Shield className="w-3 h-3" />
                                  Администратор
                                </span>
                              </SelectItem>
                              <SelectItem value="member">Участник</SelectItem>
                              <SelectItem value="viewer">
                                <span className="flex items-center gap-2">
                                  <Eye className="w-3 h-3" />
                                  Наблюдатель
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          
                          {member.role !== 'owner' && (
                            <Button
                              onClick={() => handleRemoveMember(member.user_id)}
                              disabled={loading}
                              variant="ghost"
                              size="sm"
                              className="text-red-400 hover:text-red-300 hover:bg-red-950"
                            >
                              <UserMinus className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      В проекте пока нет участников
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* General Settings Tab */}
          {activeTab === 'general' && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">Название проекта</Label>
                  <Input
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-gray-300">Приоритет</Label>
                  <Select 
                    value={formData.priority}
                    onValueChange={value => setFormData({ ...formData, priority: value })}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
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
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Описание</Label>
                <Textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">Иконка</Label>
                  <div className="flex gap-2 flex-wrap">
                    {iconOptions.map(icon => (
                      <button
                        key={icon}
                        onClick={() => setFormData({ ...formData, icon })}
                        className={`text-2xl p-2 rounded-lg border-2 transition-all ${
                          formData.icon === icon
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-gray-700 hover:border-gray-600'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Цвет</Label>
                  <div className="flex gap-2 flex-wrap">
                    {colorOptions.map(color => (
                      <button
                        key={color}
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-10 h-10 rounded-lg border-2 transition-all ${
                          formData.color === color
                            ? 'scale-110 border-white'
                            : 'border-gray-600 hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Теги</Label>
                <div className="flex gap-2 flex-wrap mb-2">
                  {formData.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-gray-800 text-gray-300 border border-gray-700"
                    >
                      <Tag className="w-3 h-3" />
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-red-400"
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
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                  <Button onClick={handleAddTag} variant="outline" className="border-gray-700 text-gray-300">
                    Добавить
                  </Button>
                </div>
              </div>

              <Button 
                onClick={handleSaveGeneral}
                disabled={loading}
                className="w-full bg-blue-500 hover:bg-blue-600"
              >
                <Save className="w-4 h-4 mr-2" />
                Сохранить настройки
              </Button>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6 py-4">
              <h3 className="text-lg font-semibold text-white">Настройки уведомлений</h3>
              
              <div className="space-y-4">
                {Object.entries(notificationSettings).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                    <Label className="text-gray-300">
                      {key === 'taskCreated' && 'Создание задачи'}
                      {key === 'taskCompleted' && 'Завершение задачи'}
                      {key === 'memberAdded' && 'Добавление участника'}
                      {key === 'deadlineApproaching' && 'Приближение дедлайна'}
                      {key === 'mentionInComment' && 'Упоминание в комментарии'}
                    </Label>
                    <Switch
                      checked={value}
                      onCheckedChange={(checked) => 
                        setNotificationSettings({ ...notificationSettings, [key]: checked })
                      }
                    />
                  </div>
                ))}
              </div>

              <Button 
                onClick={handleSaveNotifications}
                disabled={loading}
                className="w-full bg-blue-500 hover:bg-blue-600"
              >
                <Bell className="w-4 h-4 mr-2" />
                Сохранить уведомления
              </Button>
            </div>
          )}

          {/* Danger Zone Tab */}
          {activeTab === 'danger' && (
            <div className="space-y-6 py-4">
              <div className="border border-red-900 rounded-lg p-6 bg-red-950/20">
                <h3 className="text-lg font-semibold text-red-400 mb-4">Опасная зона</h3>
                
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
                    <p className="text-gray-300">
                      Для подтверждения удаления введите название проекта: <strong className="text-white">{project.name}</strong>
                    </p>
                    <Input
                      value={deleteConfirmText}
                      onChange={e => setDeleteConfirmText(e.target.value)}
                      placeholder="Введите название проекта"
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleDeleteProject}
                        disabled={loading || deleteConfirmText !== project.name}
                        variant="destructive"
                        className="flex-1"
                      >
                        Удалить навсегда
                      </Button>
                      <Button
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeleteConfirmText('');
                        }}
                        variant="outline"
                        className="flex-1 border-gray-700 text-gray-300"
                      >
                        Отмена
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}