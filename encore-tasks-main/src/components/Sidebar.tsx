"use client";

import React, { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { cn, getInitials } from "@/lib/utils";
import {
  Activity, AlertCircle, AlertTriangle, Anchor, Archive, ArrowDown, ArrowLeft, ArrowRight, ArrowUp,
  AtSign, Atom, Award, BarChart3, Battery, Bluetooth, Book, BookOpen, Bookmark, Box, Briefcase,
  Brush, Bug, Building, Calculator, Calendar, Camera, Car, Check, CheckCircle, CheckCircle2,
  ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Circle, Clipboard, Clock, Cloud, CloudRain,
  Code, Code2, Coffee, Cpu, CreditCard, Crown, Database, DollarSign, Download, Edit, Edit2, Edit3,
  Eye, Feather, File, FileText, Film, Fingerprint, Flag, Flame, Folder, Gamepad, Gamepad2, Gem,
  Gift, GitBranch, Github, Glasses, Globe, GraduationCap, Hammer, HardDrive, Headphones, Heart,
  HelpCircle, Home, Image, Infinity, Info, Kanban, Key, Laptop, Layers, Leaf, Lightbulb, Link,
  Lock, Mail, MapPin, MessageCircle, MessageSquare, Mic, MinusCircle, Monitor, Moon, Music,
  Navigation, Network, Package, Palette, Paperclip, Pause, PenTool, Phone, PieChart, Pill, Plane,
  Play, Plus, PlusCircle, Printer, RefreshCw, Rocket, RotateCcw, RotateCw, Save, Scissors,
  Server, Settings, Share, Share2, Shield, ShoppingBag, ShoppingCart, SkipBack, SkipForward,
  Smartphone, Sparkles, Square, Star, Store, Sun, Tag, Target, Terminal, Trash, TrendingUp,
  Trophy, Tv, Type, Umbrella, Unlock, Upload, Users, Utensils, Video, Volume, Volume2, Wallet,
  Watch, Wifi, Wrench, X, XCircle, Zap
} from "lucide-react";
import { CreateProjectModal } from "./CreateProjectModal";
import { useConfirmation } from "@/hooks/useConfirmation";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  onNavigate: (page: string) => void;
  currentPage: string;
}

// Function to get icon component by name
const getIconComponent = (iconName: string) => {
  const iconMap: { [key: string]: any } = {
    Activity, AlertCircle, AlertTriangle, Anchor, Archive, ArrowDown, ArrowLeft, ArrowRight, ArrowUp,
    AtSign, Atom, Award, BarChart3, Battery, Bluetooth, Book, BookOpen, Bookmark, Box, Briefcase,
    Brush, Bug, Building, Calculator, Camera, Car, Check, CheckCircle, CheckCircle2, ChevronDown,
    ChevronLeft, ChevronRight, ChevronUp, Circle, Clipboard, Clock, Cloud, CloudRain, Code, Code2,
    Coffee, Cpu, CreditCard, Crown, Database, DollarSign, Download, Edit, Edit2, Edit3, Eye,
    Feather, File, FileText, Film, Fingerprint, Flag, Flame, Folder, Gamepad, Gamepad2, Gem,
    Gift, GitBranch, Github, Glasses, Globe, GraduationCap, Hammer, HardDrive, Headphones, Heart,
    HelpCircle, Home, Image, Infinity, Info, Kanban, Key, Laptop, Layers, Leaf, Lightbulb, Link,
    Lock, Mail, MapPin, MessageCircle, MessageSquare, Mic, MinusCircle, Monitor, Moon, Music,
    Navigation, Network, Package, Palette, Paperclip, Pause, PenTool, Phone, PieChart, Pill, Plane,
    Play, Plus, PlusCircle, Printer, RefreshCw, Rocket, RotateCcw, RotateCw, Save, Scissors,
    Server, Settings, Share, Share2, Shield, ShoppingBag, ShoppingCart, SkipBack, SkipForward,
    Smartphone, Sparkles, Square, Star, Store, Sun, Tag, Target, Terminal, Trash, TrendingUp,
    Trophy, Tv, Type, Umbrella, Unlock, Upload, Users, Utensils, Video, Volume, Volume2, Wallet,
    Watch, Wifi, Wrench, X, XCircle, Zap
  };
  
  return iconMap[iconName] || Folder;
};

export function Sidebar({ isCollapsed, onToggle, onNavigate, currentPage }: SidebarProps) {
  const { state, dispatch } = useApp();
  const { ConfirmationComponent, confirm } = useConfirmation();
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [projectSearchTerm, setProjectSearchTerm] = useState("");

  // Navigation items
  const navigationItems = [
    { id: "home", label: "Главная", icon: Home, color: "text-blue-400" },
    { id: "boards", label: "Доски", icon: Kanban, color: "text-purple-400" },
    { id: "calendar", label: "Календарь", icon: Calendar, color: "text-orange-400" },
    { id: "team", label: "Команда", icon: Users, color: "text-cyan-400" },
    { id: "notifications", label: "Уведомления", icon: MessageCircle, color: "text-yellow-400" },
  ];

  // Admin-only items
  const adminItems = [
    { id: "admin", label: "Админ-панель", icon: Crown, color: "text-red-400" },
  ];

  // Settings item
  const settingsItem = { id: "settings", label: "Настройки", icon: Settings, color: "text-gray-400" };

  // Filter projects based on search
  const filteredProjects = state.projects.filter(project =>
    project.name.toLowerCase().includes(projectSearchTerm.toLowerCase())
  );

  const handleProjectSelect = (project: any) => {
    console.log('🎯 Sidebar: Selecting project:', project.name);
    dispatch({ type: "SELECT_PROJECT", payload: project });
    onNavigate("boards");
    // Доски будут автоматически загружены в Layout useEffect
  };

  const handleBoardSelect = (board: any) => {
    dispatch({ type: "SELECT_BOARD", payload: board });
    onNavigate("boards");
  };

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

  return (
    <>
      <div className={cn(
        "h-full bg-gradient-to-b from-slate-900/95 to-slate-800/95 backdrop-blur-xl border-r border-white/10 flex flex-col transition-all duration-300",
        isCollapsed ? "w-16" : "w-80"
      )}>
        {/* Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Kanban className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-white font-bold text-lg">Encore Tasks</h1>
              </div>
            )}
            <button
              onClick={onToggle}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title={isCollapsed ? "Развернуть" : "Свернуть"}
            >
              {isCollapsed ? (
                <ChevronRight className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronLeft className="w-5 h-5 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 space-y-2">
            {navigationItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = currentPage === item.id;
              const showBadge = item.id === "notifications" && notificationCount > 0;

              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                    isActive
                      ? "bg-indigo-500/20 border border-indigo-500/30 text-white"
                      : "hover:bg-white/5 text-gray-300 hover:text-white"
                  )}
                  title={isCollapsed ? item.label : undefined}
                >
                  <div className="relative">
                    <IconComponent className={cn("w-5 h-5", isActive ? "text-indigo-400" : item.color)} />
                    {showBadge && (
                      <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {notificationCount > 99 ? "99+" : notificationCount}
                      </div>
                    )}
                  </div>
                  {!isCollapsed && (
                    <span className="font-medium">{item.label}</span>
                  )}
                </button>
              );
            })}

            {/* Admin Panel */}
            {state.currentUser?.role === "admin" && (
              <>
                <div className="my-4 border-t border-white/10" />
                {adminItems.map((item) => {
                  const IconComponent = item.icon;
                  const isActive = currentPage === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => onNavigate(item.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                        isActive
                          ? "bg-red-500/20 border border-red-500/30 text-white"
                          : "hover:bg-white/5 text-gray-300 hover:text-white"
                      )}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <IconComponent className={cn("w-5 h-5", isActive ? "text-red-400" : item.color)} />
                      {!isCollapsed && (
                        <span className="font-medium">{item.label}</span>
                      )}
                    </button>
                  );
                })}
              </>
            )}
          </div>

          {/* Projects Section */}
          {!isCollapsed && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-4 pb-2">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                    Проекты
                  </h3>
                  <button
                    onClick={() => setIsCreateProjectModalOpen(true)}
                    className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
                    title="Создать проект"
                  >
                    <Plus className="w-4 h-4 text-gray-400" />
                  </button>
                </div>

                {/* Search projects */}
                <div className="relative mb-3">
                  <input
                    type="text"
                    placeholder="Поиск проектов..."
                    value={projectSearchTerm}
                    onChange={(e) => setProjectSearchTerm(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
              </div>

              {/* Projects List */}
              <div className="flex-1 overflow-y-auto px-4 space-y-1">
                {filteredProjects.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-sm">
                      {projectSearchTerm ? "Проекты не найдены" : "Нет проектов"}
                    </div>
                  </div>
                ) : (
                  filteredProjects.map((project) => {
                    const IconComponent = getIconComponent('Folder'); // Use default icon
                    const isSelected = state.selectedProject?.id === project.id;
                    const projectBoards = state.boards.filter(board => board.project_id === project.id);

                    return (
                      <div key={project.id} className="space-y-1">
                        <button
                          onClick={() => handleProjectSelect(project)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all duration-200",
                            isSelected
                              ? "bg-indigo-500/20 border border-indigo-500/30 text-white"
                              : "hover:bg-white/5 text-gray-300 hover:text-white"
                          )}
                        >
                          <div
                            className="w-6 h-6 rounded-md flex items-center justify-center text-xs"
                            style={{ backgroundColor: project.color || '#6366f1' }}
                          >
                            <IconComponent className="w-3.5 h-3.5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">
                              {project.name}
                            </div>
                            <div className="text-xs text-gray-400">
                              {projectBoards.length} {projectBoards.length === 1 ? 'доска' : 'досок'}
                            </div>
                          </div>
                        </button>

                        {/* Project Boards */}
                        {isSelected && projectBoards.length > 0 && (
                          <div className="ml-4 space-y-1">
                            {projectBoards.map((board) => {
                              const isSelectedBoard = state.selectedBoard?.id === board.id;
                              return (
                                <button
                                  key={board.id}
                                  onClick={() => handleBoardSelect(board)}
                                  className={cn(
                                    "w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-all duration-200 text-sm",
                                    isSelectedBoard
                                      ? "bg-purple-500/20 border border-purple-500/30 text-white"
                                      : "hover:bg-white/5 text-gray-400 hover:text-white"
                                  )}
                                >
                                  <div className="w-2 h-2 rounded-full bg-current opacity-60" />
                                  <span className="truncate">{board.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Settings */}
          <div className="p-4 border-t border-white/10">
            <button
              onClick={() => onNavigate(settingsItem.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                currentPage === settingsItem.id
                  ? "bg-gray-500/20 border border-gray-500/30 text-white"
                  : "hover:bg-white/5 text-gray-300 hover:text-white"
              )}
              title={isCollapsed ? settingsItem.label : undefined}
            >
              <settingsItem.icon className={cn("w-5 h-5", currentPage === settingsItem.id ? "text-gray-400" : settingsItem.color)} />
              {!isCollapsed && (
                <span className="font-medium">{settingsItem.label}</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateProjectModalOpen}
        onClose={() => setIsCreateProjectModalOpen(false)}
      />

      {/* Confirmation Component */}
      <ConfirmationComponent />
    </>
  );
}