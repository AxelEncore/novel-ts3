"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { User, Project } from "@/types";
import { Users, Check, X, Clock, Mail, Calendar, Shield, UserPlus, ArrowLeft, Plus, Minus, Briefcase, Crown, UserCheck } from "lucide-react";
import DeleteConfirmationModal from "./DeleteConfirmationModal";

interface AdminPanelProps {
  onNavigate: (page: string) => void;
}

export function AdminPanel({ onNavigate }: AdminPanelProps) {
  const { state, dispatch, updateUser, deleteUser } = useApp();
  const [selectedTab, setSelectedTab] = useState<'pending' | 'approved'>('pending');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleteAction, setDeleteAction] = useState<'reject' | 'remove'>('reject');
  const [userProjectsMap, setUserProjectsMap] = useState<Record<string, string[]>>({});
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Filter users based on approval status
  const pendingUsers = state.users.filter(user => !user.isApproved && user.role !== 'admin');
  const approvedUsers = state.users.filter(user => user.isApproved && user.role !== 'admin');
  const newUserNotifications = state.pendingUserNotifications || [];

  // Загрузка информации о проектах пользователей
  useEffect(() => {
    const loadUserProjects = async () => {
      if (state.projects.length === 0) return;
      
      setLoadingProjects(true);
      const projectsMap: Record<string, string[]> = {};
      
      try {
        for (const project of state.projects) {
          const response = await fetch(`/api/projects/${project.id}/members`);
          if (response.ok) {
            const data = await response.json();
            if (data.members) {
              data.members.forEach((member: any) => {
                if (!projectsMap[member.user_id]) {
                  projectsMap[member.user_id] = [];
                }
                projectsMap[member.user_id].push(project.id);
              });
            }
          }
        }
        setUserProjectsMap(projectsMap);
      } catch (error) {
        console.error('Ошибка загрузки проектов пользователей:', error);
      } finally {
        setLoadingProjects(false);
      }
    };
    
    loadUserProjects();
  }, [state.projects]);

  const handleApproveUser = async (userId: string) => {
    try {
      const user = state.users.find(u => u.id === userId);
      if (!user) {
        console.error('Пользователь не найден');
        return;
      }
      const success = await updateUser(userId, { role: user.role || 'user', status: 'approved' });
      if (success) {
        dispatch({ type: 'APPROVE_USER', payload: userId });
      } else {
        console.error('Ошибка одобрения пользователя');
      }
    } catch (error) {
      console.error('Ошибка одобрения пользователя:', error);
    }
  };

  const handleRejectUser = (user: User) => {
    setUserToDelete(user);
    setDeleteAction('reject');
    setShowDeleteModal(true);
  };

  const handleRemoveUserAccess = (user: User) => {
    setUserToDelete(user);
    setDeleteAction('remove');
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (userToDelete) {
      try {
        if (deleteAction === 'reject' || deleteAction === 'remove') {
          const success = await deleteUser(userToDelete.id);
          if (!success) {
            console.error('Ошибка удаления пользователя');
          }
        }
      } catch (error) {
        console.error('Ошибка удаления пользователя:', error);
      }
      setUserToDelete(null);
    }
    setShowDeleteModal(false);
  };

  const handlePromoteToManager = async (userId: string) => {
    try {
      const user = state.users.find(u => u.id === userId);
      if (!user) {
        console.error('Пользователь не найден');
        return;
      }
      const success = await updateUser(userId, { role: 'manager', status: user.isApproved ? 'approved' : 'pending' });
      if (!success) {
        console.error('Ошибка назначения менеджера');
      }
    } catch (error) {
      console.error('Ошибка назначения менеджера:', error);
    }
  };

  const handleDemoteFromManager = async (userId: string) => {
    try {
      const user = state.users.find(u => u.id === userId);
      if (!user) {
        console.error('Пользователь не найден');
        return;
      }
      const success = await updateUser(userId, { role: 'user', status: user.isApproved ? 'approved' : 'pending' });
      if (!success) {
        console.error('Ошибка снятия роли администратора');
      }
    } catch (error) {
      console.error('Ошибка снятия роли менеджера:', error);
    }
  };

  const handleAddUserToProject = async (userId: string, projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId, role: 'member' }),
      });
      
      if (response.ok) {
        // Обновляем локальное состояние
        setUserProjectsMap(prev => ({
          ...prev,
          [userId]: [...(prev[userId] || []), projectId]
        }));
        console.log('Пользователь добавлен в проект');
      } else {
        const error = await response.json();
        console.error('Ошибка добавления пользователя в проект:', error);
      }
    } catch (error) {
      console.error('Ошибка добавления пользователя в проект:', error);
    }
  };

  const handleRemoveUserFromProject = async (userId: string, projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/members/${userId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Обновляем локальное состояние
        setUserProjectsMap(prev => ({
          ...prev,
          [userId]: (prev[userId] || []).filter(id => id !== projectId)
        }));
        console.log('Пользователь удален из проекта');
      } else {
        const error = await response.json();
        console.error('Ошибка удаления пользователя из проекта:', error);
      }
    } catch (error) {
      console.error('Ошибка удаления пользователя из проекта:', error);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const UserCard = ({ user, isPending }: { user: User; isPending: boolean }) => {
    const userProjectIds = userProjectsMap[user.id] || [];
    const userProjects = state.projects.filter(p => userProjectIds.includes(p.id));
    const availableProjects = state.projects.filter(p => !userProjectIds.includes(p.id));
    
    return (
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all duration-200">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-500/20 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-primary-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{user.name}</h3>
              <div className="flex items-center gap-2 text-gray-400 text-sm mt-1">
                <Mail className="w-4 h-4" />
                <span>{user.email}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400 text-sm mt-1">
                <Calendar className="w-4 h-4" />
                <span>Регистрация: {formatDate(new Date(user.created_at))}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400 text-sm mt-1">
                <Shield className="w-4 h-4" />
                <span>Роль: {user.role === 'manager' ? 'Менеджер' : 'Пользователь'}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400 text-sm mt-1">
                <Briefcase className="w-4 h-4" />
                <span>Проекты: {loadingProjects ? 'Загрузка...' : userProjects.length > 0 ? userProjects.map(p => p.name).join(', ') : 'Нет проектов'}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isPending ? (
              <>
                <div className="flex items-center gap-1 px-3 py-1 bg-primary-500/20 text-primary-400 rounded-full text-sm">
                  <Clock className="w-4 h-4" />
                  <span>Ожидает</span>
                </div>
                <button
                  onClick={() => handleApproveUser(user.id)}
                  className="p-2 bg-primary-600/20 hover:bg-primary-600/30 text-primary-400 rounded-lg transition-colors"
                  title="Одобрить пользователя"
                >
                  <Check className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleRejectUser(user)}
                  className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                  title="Отклонить пользователя"
                >
                  <X className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1 px-3 py-1 bg-primary-600/20 text-primary-400 rounded-full text-sm">
                  <Check className="w-4 h-4" />
                  <span>Одобрен</span>
                </div>
                {/* Manager role controls - only for admins */}
                {state.currentUser?.role === 'admin' && (
                  <>
                    {user.role === 'user' ? (
                      <button
                        onClick={() => handlePromoteToManager(user.id)}
                        className="p-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-colors"
                        title="Назначить менеджером"
                      >
                        <Crown className="w-5 h-5" />
                      </button>
                    ) : user.role === 'manager' ? (
                      <button
                        onClick={() => handleDemoteFromManager(user.id)}
                        className="p-2 bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 rounded-lg transition-colors"
                        title="Убрать роль менеджера"
                      >
                        <UserCheck className="w-5 h-5" />
                      </button>
                    ) : null}
                  </>
                )}
                <button
                  onClick={() => handleRemoveUserAccess(user)}
                  className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                  title="Удалить доступ пользователя"
                >
                  <X className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>
        
        {/* Project Management for Approved Users */}
        {!isPending && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <h4 className="text-sm font-medium text-white mb-3">Управление проектами</h4>
            
            {/* Current Projects */}
            {userProjects.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-gray-400 mb-2">Участвует в проектах:</p>
                <div className="flex flex-wrap gap-2">
                  {userProjects.map(project => (
                    <div key={project.id} className="flex items-center gap-2 px-3 py-1 bg-primary-500/20 text-primary-300 rounded-full text-sm">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color }}></div>
                      <span>{project.name}</span>
                      <button
                        onClick={() => handleRemoveUserFromProject(user.id, project.id)}
                        className="hover:text-red-400 transition-colors"
                        title="Удалить из проекта"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Available Projects */}
            {availableProjects.length > 0 ? (
              <div>
                <p className="text-xs text-gray-400 mb-2">Добавить в проект:</p>
                <div className="flex flex-wrap gap-2">
                  {availableProjects.map(project => (
                    <button
                      key={project.id}
                      onClick={() => handleAddUserToProject(user.id, project.id)}
                      className="flex items-center gap-2 px-3 py-1 bg-gray-500/20 hover:bg-primary-600/20 text-gray-300 hover:text-primary-300 rounded-full text-sm transition-colors"
                      title="Добавить в проект"
                    >
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color }}></div>
                      <span>{project.name}</span>
                      <Plus className="w-3 h-3" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              userProjects.length === 0 && (
                <p className="text-xs text-gray-400 italic">Нет доступных проектов</p>
              )
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 animate-fade-in">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-3 animate-slide-in-left">
                  Панель администратора
                  {newUserNotifications.length > 0 && (
                    <span className="px-3 py-1 bg-primary-700 text-white text-sm rounded-full animate-pulse">
                      {newUserNotifications.length} новых
                    </span>
                  )}
                </h1>
                <p className="text-gray-400">Управление пользователями и доступом</p>
                {newUserNotifications.length > 0 && (
                  <div className="mt-3 p-3 bg-primary-500/20 border border-primary-500/30 rounded-lg">
                    <p className="text-gray-300 text-sm">
                      📢 У вас {newUserNotifications.length} новых заявок на регистрацию, ожидающих подтверждения
                    </p>
                  </div>
                )}
              </div>
            </div>
            {onNavigate && (
              <button
                onClick={() => onNavigate('boards')}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors"
                title="Вернуться к доскам"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Назад к доскам</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{pendingUsers.length}</p>
                <p className="text-gray-400">Ожидают подтверждения</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-600/20 rounded-xl flex items-center justify-center">
                <Check className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{approvedUsers.length}</p>
                <p className="text-gray-400">Одобренные пользователи</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-400/20 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-gray-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{state.users.filter(u => u.role !== 'admin').length}</p>
                <p className="text-gray-400">Всего пользователей</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setSelectedTab('pending')}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
              selectedTab === 'pending'
                ? 'bg-primary-500 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <span>Ожидают подтверждения ({pendingUsers.length})</span>
            </div>
          </button>
          
          <button
            onClick={() => setSelectedTab('approved')}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
              selectedTab === 'approved'
                ? 'bg-primary-500 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5" />
              <span>Одобренные ({approvedUsers.length})</span>
            </div>
          </button>
        </div>

        {/* User List */}
        <div className="space-y-4">
          {selectedTab === 'pending' ? (
            pendingUsers.length > 0 ? (
              pendingUsers.map(user => (
                <UserCard key={user.id} user={user} isPending={true} />
              ))
            ) : (
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-12 text-center">
                <UserPlus className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Нет пользователей на рассмотрении</h3>
                <p className="text-gray-400">Все новые пользователи будут отображаться здесь для подтверждения.</p>
              </div>
            )
          ) : (
            approvedUsers.length > 0 ? (
              approvedUsers.map(user => (
                <UserCard key={user.id} user={user} isPending={false} />
              ))
            ) : (
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-12 text-center">
                <Users className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Нет одобренных пользователей</h3>
                <p className="text-gray-400">Одобренные пользователи будут отображаться здесь.</p>
              </div>
            )
          )}
        </div>
      </div>
      
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title={deleteAction === 'reject' ? 'Отклонить пользователя' : 'Удалить доступ пользователя'}
        message={deleteAction === 'reject' 
          ? `Вы уверены, что хотите отклонить пользователя "${userToDelete?.name}"? Это действие нельзя отменить.`
          : `Вы уверены, что хотите удалить доступ пользователя "${userToDelete?.name}"? Пользователь будет удален из всех проектов.`
        }
      />
    </div>
  );
}