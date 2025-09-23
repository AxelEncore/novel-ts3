"use client";

import React, { useState } from "react";
import { Task, Project } from "@/types";
import { useApp } from "@/contexts/AppContext";
import { cn, getInitials } from "@/lib/utils";
import {
  Plus,
  Filter,
  SortAsc,
  MoreHorizontal,
  Users,
  Calendar,
  Bell,
  Menu,
  X,
  Settings,
  LogOut,
  Activity,
  Search,
  ChevronDown
} from "lucide-react";
import { useConfirmation } from "@/hooks/useConfirmation";
import CreateTaskModal from "./CreateTaskModal";
import BoardManager from "./BoardManager";
import { CustomSelect } from "./CustomSelect";
import { TaskActionsModal } from "./TaskActionsModal";
import { UserProfile } from "./UserProfile";

interface TopBarProps {
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
  onNavigate: (page: string) => void;
  currentPage: string;
  currentProject?: Project;
}

export function TopBar({
  onToggleSidebar,
  sidebarCollapsed,
  onNavigate,
  currentPage = "boards",
  currentProject
}: TopBarProps) {
  const { state, dispatch, createTask, logout } = useApp();
  const { ConfirmationComponent, confirm } = useConfirmation();
  const [showFilters, setShowFilters] = useState(false);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [isBoardManagerOpen, setIsBoardManagerOpen] = useState(false);
  const [isTaskActionsModalOpen, setIsTaskActionsModalOpen] = useState(false);
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const handleCreateTask = async (taskData: {
    title: string;
    description: string;
    status: string;
    priority: string;
    assigneeId: string;
    columnId: string;
    position: number;
    dueDate: Date;
    estimatedHours: number;
    tags: string[];
  }): Promise<boolean> => {
    try {
      const success = await createTask(taskData);
      if (success) {
        setIsCreateTaskModalOpen(false);
      }
      return success;
    } catch (error) {
      console.error("Ошибка при создании задачи:", error);
      return false;
    }
  };

  const handleSort = () => {
    const newSortOrder = state.sortOrder === "asc" ? "desc" : "asc";
    dispatch({
      type: "SET_SORT",
      payload: { sortBy: state.sortBy, sortOrder: newSortOrder }
    });
  };

  const handleLogout = async () => {
    const confirmed = await confirm({
      message: "Вы уверены, что хотите выйти?",
      title: "Выход из системы"
    });

    if (confirmed) {
      try {
        await logout();
      } catch (error) {
        console.error("Logout error:", error);
      }
    }
  };

  const handleFilterChange = (filterType: string, value: string) => {
    dispatch({
      type: "SET_FILTERS",
      payload: { [filterType]: value }
    });
  };

  const clearFilters = () => {
    dispatch({
      type: "SET_FILTERS",
      payload: { assignee: "", priority: "", status: "", deadline: "" }
    });
  };

  // Get notification count
  const getNotificationCount = () => {
    const currentUserId = state.currentUser?.id;
    if (!currentUserId) return 0;
    
    const userNotifications = state.notifications.filter(n => 
      n.userId === currentUserId && !n.isRead
    );
    
    const adminNotifications = state.currentUser?.role === 'admin' 
      ? (state.pendingUserNotifications?.length || 0)
      : 0;
    
    return userNotifications.length + adminNotifications;
  };

  const notificationCount = getNotificationCount();

  // Get page title
  const getPageTitle = () => {
    switch (currentPage) {
      case "home":
        return "Главная";
      case "boards":
        return currentProject ? `${currentProject.name} - Доски` : "Доски";
      case "projects":
        return "Проекты";
      case "calendar":
        return "Календарь";
      case "team":
        return "Команда";
      case "notifications":
        return "Уведомления";
      case "admin":
        return "Админ-панель";
      case "settings":
        return "Настройки";
      default:
        return "Encore Tasks";
    }
  };

  return (
    <>
      <header className="h-16 bg-gradient-to-r from-slate-900/95 to-slate-800/95 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-6">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          {/* Mobile Menu Toggle */}
          <button
            onClick={onToggleSidebar}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors lg:hidden"
            title="Меню"
          >
            <Menu className="w-5 h-5 text-gray-400" />
          </button>

          {/* Page Title */}
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-white">
              {getPageTitle()}
            </h1>
            
            {/* Project Indicator */}
            {currentProject && currentPage === "boards" && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: currentProject.color || '#6366f1' }}
                />
                <span className="text-sm text-gray-300">
                  {state.selectedBoard?.name || "Выберите доску"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Center Section - Search */}
        <div className="flex-1 max-w-md mx-6">
          {showSearch ? (
            <div className="relative">
              <input
                type="text"
                placeholder="Поиск задач..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 pl-10 text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500/50"
                autoFocus
                onBlur={() => {
                  if (!searchTerm) setShowSearch(false);
                }}
              />
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setShowSearch(false);
                  }}
                  className="absolute right-2 top-2 p-1 hover:bg-white/10 rounded transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="flex items-center gap-2 w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Search className="w-4 h-4" />
              <span className="text-sm">Поиск задач...</span>
            </button>
          )}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Action Buttons - only show on boards page */}
          {currentPage === "boards" && (
            <>
              {/* Create Task */}
              <button
                onClick={() => setIsCreateTaskModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors"
                title="Создать задачу"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Задача</span>
              </button>

              {/* Filters */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  showFilters
                    ? "bg-purple-500/20 text-purple-400"
                    : "hover:bg-white/10 text-gray-400 hover:text-white"
                )}
                title="Фильтры"
              >
                <Filter className="w-5 h-5" />
              </button>

              {/* Sort */}
              <button
                onClick={handleSort}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                title="Сортировка"
              >
                <SortAsc className="w-5 h-5" />
              </button>

              {/* Board Manager */}
              <button
                onClick={() => setIsBoardManagerOpen(true)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                title="Управление досками"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Notifications */}
          <button
            onClick={() => onNavigate("notifications")}
            className="relative p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
            title="Уведомления"
          >
            <Bell className="w-5 h-5" />
            {notificationCount > 0 && (
              <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {notificationCount > 99 ? "99+" : notificationCount}
              </div>
            )}
          </button>

          {/* User Profile */}
          <div className="relative">
            <button
              onClick={() => setIsUserProfileOpen(!isUserProfileOpen)}
              className="flex items-center gap-2 p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-white">
                  {getInitials(state.currentUser?.name || "User")}
                </span>
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-sm font-medium text-white">
                  {state.currentUser?.name}
                </div>
                <div className="text-xs text-gray-400">
                  {state.currentUser?.role === "admin" ? "Администратор" : "Пользователь"}
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {/* User Dropdown */}
            {isUserProfileOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl z-[9999]">
                <div className="p-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-lg font-medium text-white">
                        {getInitials(state.currentUser?.name || "User")}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-white">
                        {state.currentUser?.name}
                      </div>
                      <div className="text-sm text-gray-400">
                        {state.currentUser?.email}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-2">
                  <button
                    onClick={() => {
                      onNavigate("settings");
                      setIsUserProfileOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Настройки</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsUserProfileOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Выйти</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Filters Panel */}
      {showFilters && currentPage === "boards" && (
        <div className="bg-slate-800/95 backdrop-blur-xl border-b border-white/10 p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-400">Исполнитель:</label>
              <CustomSelect
                value={state.filters.assignee}
                onChange={(value) => handleFilterChange("assignee", value)}
                options={[
                  { value: "", label: "Все" },
                  ...state.users.map(user => ({
                    value: user.id,
                    label: user.name
                  }))
                ]}
                className="min-w-[120px]"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-400">Приоритет:</label>
              <CustomSelect
                value={state.filters.priority}
                onChange={(value) => handleFilterChange("priority", value)}
                options={[
                  { value: "", label: "Все" },
                  { value: "low", label: "Низкий" },
                  { value: "medium", label: "Средний" },
                  { value: "high", label: "Высокий" },
                  { value: "urgent", label: "Критический" }
                ]}
                className="min-w-[120px]"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-400">Статус:</label>
              <CustomSelect
                value={state.filters.status}
                onChange={(value) => handleFilterChange("status", value)}
                options={[
                  { value: "", label: "Все" },
                  { value: "backlog", label: "Беклог" },
                  { value: "todo", label: "К выполнению" },
                  { value: "in_progress", label: "В работе" },
                  { value: "review", label: "На проверке" },
                  { value: "done", label: "Выполнено" }
                ]}
                className="min-w-[120px]"
              />
            </div>

            <button
              onClick={clearFilters}
              className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              Очистить
            </button>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {currentProject && (
        <CreateTaskModal
          isOpen={isCreateTaskModalOpen}
          onClose={() => setIsCreateTaskModalOpen(false)}
          onSubmit={async (data: any) => { await handleCreateTask(data); }}
          project={currentProject}
          columnId={0}
          projectUsers={state.users.filter(user => user.isApproved)}
        />
      )}

      {/* Board Manager Modal */}
      <BoardManager
        isOpen={isBoardManagerOpen}
        onClose={() => setIsBoardManagerOpen(false)}
      />

      {/* Confirmation Component */}
      <ConfirmationComponent />

      {/* Click outside to close dropdowns */}
      {isUserProfileOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsUserProfileOpen(false)}
        />
      )}
    </>
  );
}