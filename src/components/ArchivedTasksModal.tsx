"use client";

import React, { useState, useMemo } from "react";
import { X, Calendar, User, Filter, Search, Archive, RotateCcw, Trash2 } from "lucide-react";
import { Task, User as UserType } from "@/types";
import { useApp } from "@/contexts/AppContext";
import { formatDate } from "@/lib/utils";
import { CustomSelect } from "./CustomSelect";
import { useConfirmation } from "@/hooks/useConfirmation";

interface ArchivedTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
}

function ArchivedTasksModal({ isOpen, onClose, boardId }: ArchivedTasksModalProps) {
  const { state, dispatch } = useApp();
  const { ConfirmationComponent, confirm } = useConfirmation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAssignee, setSelectedAssignee] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [sortBy, setSortBy] = useState<"completedAt" | "archivedAt" | "title">("archivedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const handleRestoreTask = (taskId: string) => {
    dispatch({ type: "UNARCHIVE_TASK", payload: taskId });
  };

  const handleDeleteTask = async (taskId: string) => {
    const confirmed = await confirm({
      title: 'Удаление задачи',
      message: 'Вы уверены, что хотите окончательно удалить эту задачу? Это действие нельзя отменить.',
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      type: 'danger'
    });

    if (confirmed) {
      dispatch({ type: "DELETE_TASK", payload: taskId });
    }
  };

  const isAdmin = state.currentUser?.role === "admin";

  const filteredAndSortedTasks = useMemo(() => {
    if (!state.archivedTasks || !Array.isArray(state.archivedTasks)) {
      return [];
    }
    
    let filtered = state.archivedTasks.filter(task => {
      if (task.boardId !== boardId) return false;
      
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            task.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesAssignee = !selectedAssignee || 
                             (task.assignees && Array.isArray(task.assignees) && task.assignees.some(assignee => assignee.id === selectedAssignee)) ||
                             task.assignee?.id === selectedAssignee;
      
      const matchesPriority = !selectedPriority || task.priority === selectedPriority;
      
      let matchesDate = true;
      if (dateFilter) {
        const filterDate = new Date(dateFilter);
        const taskDate = task.completedAt || task.archivedAt;
        if (taskDate) {
          const taskDateOnly = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate());
          const filterDateOnly = new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate());
          matchesDate = taskDateOnly.getTime() === filterDateOnly.getTime();
        }
      }
      
      return matchesSearch && matchesAssignee && matchesPriority && matchesDate;
    });

    // Сортировка
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case "completedAt":
          aValue = a.completedAt || a.archivedAt;
          bValue = b.completedAt || b.archivedAt;
          break;
        case "archivedAt":
          aValue = a.archivedAt;
          bValue = b.archivedAt;
          break;
        case "title":
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        default:
          return 0;
      }
      
      if (!aValue && !bValue) return 0;
      if (!aValue) return 1;
      if (!bValue) return -1;
      
      if (sortBy === "title") {
        return sortOrder === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      } else {
        const aTime = new Date(aValue).getTime();
        const bTime = new Date(bValue).getTime();
        return sortOrder === "asc" ? aTime - bTime : bTime - aTime;
      }
    });

    return filtered;
  }, [state.archivedTasks, boardId, searchTerm, selectedAssignee, selectedPriority, dateFilter, sortBy, sortOrder]);

  const availableUsers = useMemo(() => {
    const users = new Set<UserType>();
    if (state.archivedTasks && Array.isArray(state.archivedTasks)) {
      state.archivedTasks.forEach(task => {
        if (task.boardId === boardId) {
          if (task.assignees && Array.isArray(task.assignees)) {
            task.assignees.forEach(assignee => users.add(assignee));
          }
          if (task.assignee) users.add(task.assignee);
        }
      });
    }
    return Array.from(users);
  }, [state.archivedTasks, boardId]);

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedAssignee("");
    setSelectedPriority("");
    setDateFilter("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-dark w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Archive className="w-6 h-6 text-primary-400" />
            <h2 className="text-xl font-semibold text-white">Архивированные задачи</h2>
            <span className="px-2 py-1 bg-primary-500/20 text-primary-300 rounded text-sm">
              {filteredAndSortedTasks.length} из {(state.archivedTasks || []).filter(task => task.boardId === boardId).length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-white/10 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск задач..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-800/80 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-400/20 transition-all duration-200 shadow-lg hover:bg-gray-700/80 hover:border-white/30"
              />
            </div>

            {/* Assignee filter */}
            <CustomSelect
              value={selectedAssignee}
              onChange={setSelectedAssignee}
              options={[
                { value: "", label: "Все исполнители" },
                ...availableUsers.map(user => ({
                  value: user.id,
                  label: user.name
                }))
              ]}
              placeholder="Все исполнители"
              className="min-w-0"
            />

            {/* Priority filter */}
            <CustomSelect
              value={selectedPriority}
              onChange={setSelectedPriority}
              options={[
                { value: "", label: "Все приоритеты" },
                { value: "low", label: "Низкий", color: "#a5b4fc" },
    { value: "medium", label: "Средний", color: "#818cf8" },
    { value: "high", label: "Высокий", color: "#6366f1" },
    { value: "urgent", label: "Срочный", color: "#4f46e5" }
              ]}
              placeholder="Все приоритеты"
              className="min-w-0"
            />

            {/* Date filter */}
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-3 bg-gray-800/80 backdrop-blur-sm border border-white/20 rounded-xl text-white focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-400/20 transition-all duration-200 shadow-lg hover:bg-gray-700/80 hover:border-white/30"
            />

            {/* Clear filters */}
            <button
              onClick={clearFilters}
              className="px-4 py-3 bg-red-500/20 text-red-300 rounded-xl hover:bg-red-500/30 transition-all duration-200 border border-red-500/30 hover:border-red-500/50 shadow-lg backdrop-blur-sm"
            >
              Очистить
            </button>
          </div>

          {/* Sort options */}
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm">Сортировка:</span>
            <CustomSelect
              value={sortBy}
              onChange={(value) => setSortBy(value as any)}
              options={[
                { value: "archivedAt", label: "По дате архивирования" },
                { value: "completedAt", label: "По дате завершения" },
                { value: "title", label: "По названию" }
              ]}
              placeholder="Сортировка"
              className="min-w-0"
            />
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="px-4 py-3 bg-gray-800/80 backdrop-blur-sm border border-white/20 rounded-xl text-white hover:bg-gray-700/80 hover:border-white/30 transition-all duration-200 shadow-lg focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-400/20"
            >
              {sortOrder === "asc" ? "↑" : "↓"}
            </button>
          </div>
        </div>

        {/* Tasks list */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredAndSortedTasks.length === 0 ? (
            <div className="text-center py-12">
              <Archive className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">
                {(state.archivedTasks || []).filter(task => task.boardId === boardId).length === 0 ? "Нет архивированных задач" : "Задачи не найдены"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAndSortedTasks.map(task => (
                <div
                  key={task.id}
                  className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-white mb-2">{task.title}</h3>
                      {task.description && (
                        <p className="text-gray-400 text-sm mb-3 line-clamp-2">{task.description}</p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span className={`px-2 py-1 rounded ${
                          task.priority === 'urgent' ? 'bg-primary-700/20 text-primary-400' :
          task.priority === 'high' ? 'bg-primary-600/20 text-primary-400' :
          task.priority === 'medium' ? 'bg-primary-500/20 text-primary-400' :
          'bg-primary-400/20 text-primary-400'
                        }`}>
                          {task.priority === 'urgent' ? 'Срочный' :
                           task.priority === 'high' ? 'Высокий' :
                           task.priority === 'medium' ? 'Средний' : 'Низкий'}
                        </span>
                        
                        {task.assignees && Array.isArray(task.assignees) && task.assignees.length > 0 && (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>{task.assignees?.map(a => a.name).join(', ') || 'Не назначено'}</span>
                          </div>
                        )}
                        
                        {task.completedAt && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>Завершено: {formatDate(new Date(task.completedAt))}</span>
                          </div>
                        )}
                        
                        {task.archivedAt && (
                          <div className="flex items-center gap-1">
                            <Archive className="w-3 h-3" />
                            <span>Архивировано: {formatDate(new Date(task.archivedAt))}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Action buttons for admin */}
                    {isAdmin && (
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleRestoreTask(task.id)}
                          className="p-2 bg-primary-600/20 text-primary-400 rounded-lg hover:bg-primary-600/30 transition-colors"
                          title="Восстановить задачу"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                          title="Удалить навсегда"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {ConfirmationComponent()}
    </div>
  );
}

export default ArchivedTasksModal;