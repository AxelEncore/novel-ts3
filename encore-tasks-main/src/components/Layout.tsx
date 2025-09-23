"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { HomePage } from "./pages/HomePage";
import { CalendarPage } from "./pages/CalendarPage";
import { TeamPage } from "./pages/TeamPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import KanbanBoard from "./KanbanBoard";
import { AuthModal } from "./AuthModal";
import { WelcomeScreen } from "./WelcomeScreen";
import { NoProjectsScreen } from "./NoProjectsScreen";
import { AdminPanel } from "./AdminPanel";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children?: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { state, dispatch, loadProjects, loadUsers, loadBoards } = useApp();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState("boards");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  
  // Update auth modal state based on authentication
  useEffect(() => {
    setIsAuthModalOpen(!state.isAuthenticated);
  }, [state.isAuthenticated]);

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    
    // Mark all notifications as read when navigating to notifications page
    if (page === "notifications") {
      dispatch({ type: "MARK_ALL_NOTIFICATIONS_READ" });
    }
  };

  const handleToggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Apply theme settings
  useEffect(() => {
    const theme = state.settings?.theme || 'dark';
    const root = document.documentElement;
    
    if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.add('light');
        root.classList.remove('dark');
      }
    }
  }, [state.settings?.theme]);

  // Apply language settings
  useEffect(() => {
    const language = state.settings?.language || 'ru';
    document.documentElement.lang = language;
  }, [state.settings?.language]);

  // Get the current active project (needs to be calculated before useEffect)
  const currentProject = state.selectedProject || (state.projects.length > 0 ? state.projects[0] : undefined);

  // Auto-load boards when current project changes
  useEffect(() => {
    if (currentProject && currentProject.id) {
      console.log('🔄 Layout: Auto-loading boards for current project:', currentProject.name);
      loadBoards(currentProject.id).catch(error => {
        console.error('❌ Layout: Failed to auto-load boards:', error);
      });
    }
  }, [currentProject?.id, loadBoards]);

  // Show authentication modal if not authenticated
  if (!state.isAuthenticated && !state.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900/20 via-purple-900/20 to-pink-900/20 dark:from-indigo-950/40 dark:via-purple-950/40 dark:to-pink-950/40">
        <AuthModal 
          isOpen={isAuthModalOpen} 
          onClose={() => setIsAuthModalOpen(false)} 
        />
      </div>
    );
  }

  // Show loading screen
  if (state.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900/20 via-purple-900/20 to-pink-900/20 dark:from-indigo-950/40 dark:via-purple-950/40 dark:to-pink-950/40 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // Show welcome screen if authenticated but no projects
  if (state.isAuthenticated && state.projects.length === 0 && currentPage === "boards") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900/20 via-purple-900/20 to-pink-900/20 dark:from-indigo-950/40 dark:via-purple-950/40 dark:to-pink-950/40">
        <div className="flex h-screen">
          <Sidebar
            isCollapsed={sidebarCollapsed}
            onToggle={handleToggleSidebar}
            onNavigate={handleNavigate}
            currentPage={currentPage}
          />
          <div className="flex-1 flex flex-col overflow-hidden">
            <TopBar
              onToggleSidebar={handleToggleSidebar}
              sidebarCollapsed={sidebarCollapsed}
              onNavigate={handleNavigate}
              currentPage={currentPage}
              currentProject={undefined}
            />
            <main className="flex-1 overflow-auto p-6">
              <NoProjectsScreen />
            </main>
          </div>
        </div>
      </div>
    );
  }


  // Render main content based on current page
  const renderPageContent = () => {
    switch (currentPage) {
      case "home":
        return <HomePage onNavigate={handleNavigate} />;
      case "projects":
        return <ProjectsPage onNavigate={handleNavigate} />;
      case "boards":
        if (!currentProject) {
          return <NoProjectsScreen />;
        }
        // Get boards for current project
        const projectBoards = state.boards.filter(board => board.project_id === currentProject.id);
        if (projectBoards.length === 0) {
          return (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h2 className="text-xl text-gray-400 mb-4">Нет досок в проекте</h2>
                <p className="text-gray-500">Создайте первую доску для начала работы</p>
              </div>
            </div>
          );
        }
        // Show first board or selected board
        const selectedBoard = state.selectedBoard || projectBoards[0];
        return <KanbanBoard board={selectedBoard} />;
      case "calendar":
        return <CalendarPage />;
      case "team":
        return <TeamPage />;
      case "notifications":
        return <NotificationsPage />;
      case "admin":
        // Only show for admin users
        if (state.currentUser?.role === "admin") {
          return <AdminPanel onNavigate={handleNavigate} />;
        }
        return <div className="text-center text-red-500">Доступ запрещён</div>;
      case "settings":
        return <SettingsPage />;
      default:
        return <HomePage onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900/20 via-purple-900/20 to-pink-900/20 dark:from-indigo-950/40 dark:via-purple-950/40 dark:to-pink-950/40">
      <div className="flex h-screen">
        <Sidebar
          isCollapsed={sidebarCollapsed}
          onToggle={handleToggleSidebar}
          onNavigate={handleNavigate}
          currentPage={currentPage}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar
            onToggleSidebar={handleToggleSidebar}
            sidebarCollapsed={sidebarCollapsed}
            onNavigate={handleNavigate}
            currentPage={currentPage}
            currentProject={currentProject}
          />
          <main className="flex-1 overflow-auto p-6">
            {renderPageContent()}
          </main>
        </div>
      </div>
      {children}
    </div>
  );
}