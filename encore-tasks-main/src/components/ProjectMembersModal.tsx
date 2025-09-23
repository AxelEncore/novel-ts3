"use client";

import React, { useState, useEffect } from 'react';
import { X, Plus, UserPlus, Trash2, Users } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';

interface ProjectMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

interface ProjectMember {
  id: string;
  user_id: string;
  role: string;
  name: string;
  email: string;
  joined_at: string;
}

export function ProjectMembersModal({ isOpen, onClose, projectId }: ProjectMembersModalProps) {
  const { state } = useApp();
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');

  // Получить участников проекта
  const fetchMembers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/members`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch members');
      }
      
      const { data } = await response.json();
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error('Ошибка при загрузке участников');
    } finally {
      setLoading(false);
    }
  };

  // Добавить участника
  const addMember = async () => {
    if (!selectedUserId) {
      toast.error('Выберите пользователя');
      return;
    }

    try {
      setAddingMember(true);
      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: selectedUserId,
          role: 'member'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add member');
      }

      toast.success('Участник успешно добавлен');
      setSelectedUserId('');
      fetchMembers(); // Перезагружаем список участников
    } catch (error) {
      console.error('Error adding member:', error);
      toast.error(error instanceof Error ? error.message : 'Ошибка при добавлении участника');
    } finally {
      setAddingMember(false);
    }
  };

  // Удалить участника
  const removeMember = async (userId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этого участника из проекта?')) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/members?user_id=${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove member');
      }

      toast.success('Участник удален из проекта');
      fetchMembers(); // Перезагружаем список участников
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error(error instanceof Error ? error.message : 'Ошибка при удалении участника');
    }
  };

  // Загрузить участников при открытии модального окна
  useEffect(() => {
    if (isOpen && projectId) {
      fetchMembers();
    }
  }, [isOpen, projectId]);

  if (!isOpen) return null;

  // Пользователи, которые еще не являются участниками проекта
  const availableUsers = state.users.filter(user => 
    !members.some(member => member.user_id === user.id) &&
    user.id !== state.currentUser?.id
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Users className="w-5 h-5" />
            Участники проекта
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Add Member Section */}
          <div className="bg-white/5 rounded-lg p-4">
            <h3 className="text-lg font-medium text-white mb-4">Добавить участника</h3>
            <div className="flex items-center gap-3">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500"
                disabled={addingMember}
              >
                <option value="">Выберите пользователя</option>
                {availableUsers.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
              <button
                onClick={addMember}
                disabled={addingMember || !selectedUserId}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {addingMember ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                {addingMember ? 'Добавление...' : 'Добавить'}
              </button>
            </div>
          </div>

          {/* Members List */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4">Текущие участники</h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">Нет участников в проекте</p>
              </div>
            ) : (
              <div className="space-y-3">
                {members.map(member => {
                  const isCurrentUser = member.user_id === state.currentUser?.id;
                  const isOwner = member.role === 'owner';
                  
                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white font-medium">
                          {member.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-white font-medium">
                            {member.name}
                            {isCurrentUser && <span className="text-primary-300 text-sm ml-2">(Вы)</span>}
                          </p>
                          <p className="text-gray-400 text-sm">{member.email}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded text-sm ${
                          isOwner 
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {isOwner ? 'Владелец' : 'Участник'}
                        </span>
                        
                        {!isOwner && !isCurrentUser && (
                          <button
                            onClick={() => removeMember(member.user_id)}
                            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                            title="Удалить участника"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}