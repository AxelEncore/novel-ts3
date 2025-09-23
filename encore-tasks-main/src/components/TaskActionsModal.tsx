"use client";

import React, { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { TaskAction } from "@/types";
import {
  X,
  Activity,
  Plus,
  Edit,
  Trash2,
  ArrowRight,
  UserPlus,
  UserMinus,
  AlertCircle,
  Flag,
  Filter,
  Search,
  Clock
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { CustomSelect } from "./CustomSelect";

interface TaskActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
}

export function TaskActionsModal({ isOpen, onClose, taskId }: TaskActionsModalProps) {
  const { state } = useApp();
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedAction, setSelectedAction] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  if (!isOpen) return null;

  const getActionIcon = (action: TaskAction['action']) => {
    switch (action) {
      case 'created':
        return <Plus className="w-4 h-4 text-green-500" />;
      case 'updated':
        return <Edit className="w-4 h-4 text-gray-500" />;
      case 'deleted':
        return <Trash2 className="w-4 h-4 text-red-500" />;
      case 'moved':
        return <ArrowRight className="w-4 h-4 text-purple-500" />;
      case 'assigned':
        return <UserPlus className="w-4 h-4 text-green-500" />;
      case 'unassigned':
        return <UserMinus className="w-4 h-4 text-orange-500" />;
      case 'status_changed':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'priority_changed':
        return <Flag className="w-4 h-4 text-yellow-500" />;
      case 'title_changed':
        return <Edit className="w-4 h-4 text-gray-500" />;
      case 'description_changed':
          return <Edit className="w-4 h-4 text-gray-500" />;
      case 'deadline_changed':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'tags_changed':
        return <Flag className="w-4 h-4 text-purple-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActionLabel = (action: TaskAction['action']) => {
    switch (action) {
      case 'created':
        return 'Создание';
      case 'updated':
        return 'Обновление';
      case 'deleted':
        return 'Удаление';
      case 'moved':
        return 'Перемещение';
      case 'assigned':
        return 'Назначение';
      case 'unassigned':
        return 'Снятие назначения';
      case 'status_changed':
        return 'Изменение статуса';
      case 'priority_changed':
        return 'Изменение приоритета';
      case 'title_changed':
        return 'Изменение названия';
      case 'description_changed':
        return 'Изменение описания';
      case 'deadline_changed':
        return 'Изменение срока';
      case 'tags_changed':
        return 'Изменение тегов';
      default:
        return 'Действие';
    }
  };

  // Получаем уникальных пользователей и типы действий для фильтров
  const uniqueUsers = Array.from(new Set(state.taskActions.map(action => action.userName)));
  const uniqueActions = Array.from(new Set(state.taskActions.map(action => action.action)));

  // Filter actions by taskId if provided, otherwise show all actions for current board
  let filteredActions = taskId 
    ? state.taskActions.filter(action => action.taskId === taskId)
    : state.taskActions.filter(action => action.boardId === state.selectedBoard?.id);

  // Apply additional filters
  filteredActions = filteredActions.filter(action => {
    // Фильтр по пользователю
    if (selectedUser && action.userName !== selectedUser) return false;
    // Фильтр по типу действия
    if (selectedAction && action.action !== selectedAction) return false;
    // Поиск по описанию
    if (searchTerm && !action.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Sort actions by timestamp (newest first)
  const sortedActions = [...filteredActions].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-primary-400" />
            <h2 className="text-xl font-semibold text-white">
              {taskId ? "История действий задачи" : "Все действия пользователей"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Filters */}
        {!taskId && (
          <div className="p-6 border-b border-white/10 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-300">Фильтры</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Поиск по описанию..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* User Filter */}
              <CustomSelect
                value={selectedUser}
                onChange={setSelectedUser}
                options={[
                  { value: "", label: "Все пользователи" },
                  ...uniqueUsers.map(user => ({ value: user, label: user }))
                ]}
                placeholder="Выберите пользователя"
              />

              {/* Action Filter */}
              <CustomSelect
                value={selectedAction}
                onChange={setSelectedAction}
                options={[
                  { value: "", label: "Все действия" },
                  ...uniqueActions.map(action => ({ value: action, label: getActionLabel(action) }))
                ]}
                placeholder="Выберите действие"
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {sortedActions.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Нет записей о действиях</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedActions.map((action) => (
                <div
                  key={action.id}
                  className="flex items-start gap-4 p-4 bg-white/5 rounded-lg border border-white/10"
                >
                  <div className="flex-shrink-0 mt-1">
                    {getActionIcon(action.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white">
                        {action.userName}
                      </span>
                      <span className="text-xs text-gray-400">
                        {getActionLabel(action.action)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 mb-2">
                      {action.description}
                    </p>
                    
                    {/* Показываем детальные изменения если они есть */}
                    {action.changes && action.changes.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {action.changes.map((change, index) => (
                          <div key={`${action.id}-change-${index}-${change.field}`} className="text-xs bg-white/5 rounded p-2">
                            <div className="font-medium text-gray-300 mb-1">
                              {change.field === 'title' && 'Название:'}
                              {change.field === 'description' && 'Описание:'}
                              {change.field === 'deadline' && 'Срок выполнения:'}
                              {change.field === 'tags' && 'Теги:'}
                              {change.field === 'priority' && 'Приоритет:'}
                              {change.field === 'assignees' && 'Исполнители:'}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-red-400 line-through">
                                {change.oldValue && typeof change.oldValue === 'object' && change.oldValue instanceof Date ? formatDate(change.oldValue) : (change.oldValue || 'Не задано')}
                              </span>
                              <ArrowRight className="w-3 h-3 text-gray-400" />
                              <span className="text-green-400">
                                {change.newValue && typeof change.newValue === 'object' && change.newValue instanceof Date ? formatDate(change.newValue) : (change.newValue || 'Не задано')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {(action.oldValue || action.newValue) && (
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        {action.oldValue && (
                          <span className="px-2 py-1 bg-primary-700/20 rounded">
                            {typeof action.oldValue === 'string' ? action.oldValue : String(action.oldValue)}
                          </span>
                        )}
                        {action.oldValue && action.newValue && (
                          <ArrowRight className="w-3 h-3" />
                        )}
                        {action.newValue && (
                          <span className="px-2 py-1 bg-primary-600/20 rounded">
                            {typeof action.newValue === 'string' ? action.newValue : String(action.newValue)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(new Date(action.timestamp))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TaskActionsModal;