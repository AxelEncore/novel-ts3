"use client";

import React, { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { getInitials, formatDate } from "@/lib/utils";
import {
  User,
  Mail,
  Calendar,
  Target,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Edit,
  X,
  Award,
  TrendingUp,
  Activity
} from "lucide-react";

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string; // If not provided, shows current user profile
}

export function UserProfile({ isOpen, onClose, userId }: UserProfileProps) {
  const { state } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  
  // Get user data - either specified user or current user
  const user = userId 
    ? state.users.find(u => u.id === userId) 
    : state.currentUser;
    
  if (!user || !isOpen) return null;

  // Calculate user statistics
  const userTasks = state.tasks.filter(
    (task) => task.assignees?.some(a => a.id === user.id)
  );
  
  const completedTasks = userTasks.filter((task) => task.status === "done");
  const inProgressTasks = userTasks.filter((task) => task.status === "in_progress");
  const overdueTasks = userTasks.filter((task) => {
    if (!task.due_date) return false;
    const deadline = new Date(task.due_date);
    const now = new Date();
    return deadline < now && task.status !== "done";
  });
  
  // Calculate completion rate by month for the last 6 months
  const getMonthlyStats = () => {
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('ru-RU', { month: 'short' });
      
      const monthTasks = userTasks.filter(task => {
        if (task.status !== 'done') return false;
        
        // Используем updated_at для выполненных задач
        const completedDate = new Date(task.updated_at);
        
        return completedDate.getMonth() === date.getMonth() && 
               completedDate.getFullYear() === date.getFullYear();
      });
      
      months.push({
        month: monthName,
        completed: monthTasks.length,
        percentage: Math.min(100, (monthTasks.length / Math.max(1, userTasks.length)) * 100)
      });
    }
    
    return months;
  };
  
  const monthlyStats = getMonthlyStats();
  const maxCompleted = Math.max(...monthlyStats.map(m => m.completed), 1);
  
  // Calculate skill levels based on real user data
  const getSkillLevels = () => {
    const totalTasks = userTasks.length;
    const completionRate = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0;
    const onTimeRate = totalTasks > 0 ? ((totalTasks - overdueTasks.length) / totalTasks) * 100 : 0;
    
    // Calculate teamwork based on collaborative tasks
    const collaborativeTasks = userTasks.filter(task => 
      (task.assignees && task.assignees.length > 1) || 
      (task.comments && task.comments.length > 0)
    );
    const teamworkScore = totalTasks > 0 ? (collaborativeTasks.length / totalTasks) * 100 : 0;
    
    // Calculate communication based on comments and task interactions
    const totalComments = userTasks.reduce((sum, task) => 
      sum + (task.comments?.filter(comment => comment.author.id === user.id)?.length || 0), 0
    );
    const communicationScore = Math.min(100, (totalComments / Math.max(1, totalTasks)) * 20);
    
    // Calculate leadership based on role and project management
    const userProjects = state.projects.filter(project =>
      project.members?.some(member => member.userId === user.id && (member.role === 'admin' || member.role === 'owner'))
    );
    const leadershipBase = user.role === 'admin' ? 80 : user.role === 'manager' ? 60 : 40;
    const leadershipBonus = Math.min(20, userProjects.length * 5);
    
    return {
      productivity: Math.min(100, Math.max(0, completionRate)),
      quality: Math.min(100, Math.max(0, onTimeRate)),
      teamwork: Math.min(100, Math.max(0, teamworkScore + 20)), // Base 20 points
      communication: Math.min(100, Math.max(0, communicationScore + 30)), // Base 30 points
      leadership: Math.min(100, Math.max(0, leadershipBase + leadershipBonus))
    };
  };
  
  const skills = getSkillLevels();
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-4">
            {state.settings?.showAvatars && (
              user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-16 h-16 rounded-full"
                />
              ) : (
                <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center text-xl text-white font-semibold">
                  {getInitials(user.name)}
                </div>
              )
            )}
            <div>
              <h2 className="text-2xl font-bold text-white">{user.name}</h2>
              <p className="text-gray-400">{user.role === 'admin' ? 'Администратор' : user.role === 'manager' ? 'Менеджер' : 'Пользователь'}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {(state.currentUser?.id === user.id || state.currentUser?.role === 'admin') && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-500/20 hover:bg-primary-500/30 text-primary-400 rounded-lg transition-colors"
              >
                <Edit className="w-4 h-4" />
                Редактировать
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Info */}
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="bg-white/5 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Досье
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300">Присоединился {formatDate(new Date(user.created_at || new Date().toISOString()))}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Target className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300">Всего задач: {userTasks.length}</span>
                  </div>
                </div>
              </div>
              
              {/* Task Statistics */}
              <div className="bg-white/5 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Статистика задач
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-green-500/10 rounded-lg">
                    <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">{completedTasks.length}</div>
                    <div className="text-sm text-gray-400">Выполнено</div>
                  </div>
                  <div className="text-center p-4 bg-gray-500/10 rounded-lg">
                  <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">{inProgressTasks.length}</div>
                    <div className="text-sm text-gray-400">В работе</div>
                  </div>
                  <div className="text-center p-4 bg-red-500/10 rounded-lg">
                    <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">{overdueTasks.length}</div>
                    <div className="text-sm text-gray-400">Просрочено</div>
                  </div>
                  <div className="text-center p-4 bg-purple-500/10 rounded-lg">
                    <Award className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">
                      {userTasks.length > 0 ? Math.round((completedTasks.length / userTasks.length) * 100) : 0}%
                    </div>
                    <div className="text-sm text-gray-400">Успешность</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Performance Charts */}
            <div className="space-y-6">
              {/* Monthly Activity Chart */}
              <div className="bg-white/5 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Активность по месяцам
                </h3>
                <div className="space-y-3">
                  {monthlyStats.map((stat, index) => (
                    <div key={`${stat.month}-${index}`} className="flex items-center gap-3">
                      <div className="w-12 text-sm text-gray-400">{stat.month}</div>
                      <div className="flex-1 bg-gray-700 rounded-full h-6 relative overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-500"
                          style={{ width: `${(stat.completed / maxCompleted) * 100}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium">
                          {stat.completed}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Skills Radar Chart */}
              <div className="bg-white/5 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Навыки
                </h3>
                <div className="space-y-4">
                  {Object.entries(skills).map(([skill, value]) => (
                    <div key={skill} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300 capitalize">
                          {skill === 'productivity' ? 'Продуктивность' :
                           skill === 'quality' ? 'Качество' :
                           skill === 'teamwork' ? 'Командная работа' :
                           skill === 'communication' ? 'Коммуникация' :
                           skill === 'leadership' ? 'Лидерство' : skill}
                        </span>
                        <span className="text-white font-medium">{Math.round(value)}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                          className="h-2 bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-500"
                          style={{ width: `${value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}