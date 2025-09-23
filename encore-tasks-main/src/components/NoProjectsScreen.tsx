"use client";

import React from "react";
import { useApp } from "@/contexts/AppContext";
import { Plus, Users, Clock, FolderX, Mail, LogOut } from "lucide-react";

export function NoProjectsScreen() {
  const { state, logout } = useApp();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Check user role for different displays
  const isAdmin = state.currentUser?.role === "admin";
  const isUser = state.currentUser?.role === "user";

  if (isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-6">
              <Plus className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">
              Добро пожаловать в Encore Tasks!
            </h1>
            <p className="text-slate-400 mb-8">
              Добро пожаловать, {state.currentUser?.name || 'Администратор'}! Создайте свой первый проект для начала работы.
            </p>
          </div>

          {/* Quick Start Guide */}
          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-4 p-4 bg-white/5 rounded-lg">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">1</span>
              </div>
              <div className="text-left">
                <p className="text-white font-medium">Создайте проект</p>
                <p className="text-gray-400 text-sm">Нажмите кнопку "+" в боковой панели</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-white/5 rounded-lg">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">2</span>
              </div>
              <div className="text-left">
                <p className="text-white font-medium">Добавьте команду</p>
                <p className="text-gray-400 text-sm">Пригласите участников в проект</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-white/5 rounded-lg">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">3</span>
              </div>
              <div className="text-left">
                <p className="text-white font-medium">Создайте доски</p>
                <p className="text-gray-400 text-sm">Организуйте задачи в Kanban доски</p>
              </div>
            </div>
          </div>

          {/* Features Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-lg p-6">
              <Users className="w-8 h-8 text-indigo-400 mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Управление командой</h3>
              <p className="text-gray-300 text-sm">
                Добавляйте участников, назначайте роли и управляйте доступом к проектам
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-6">
              <FolderX className="w-8 h-8 text-purple-400 mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Kanban доски</h3>
              <p className="text-gray-300 text-sm">
                Организуйте задачи в гибкие доски с перетаскиванием
              </p>
            </div>
          </div>

          {/* User Info */}
          <div className="pt-6 border-t border-white/10 flex items-center justify-between">
            <p className="text-gray-400 text-sm">
              Вы вошли как: <span className="text-white font-medium">{state.currentUser?.email}</span>
            </p>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              title="Выйти">
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Выйти</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // For regular users without projects
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">
            Ожидание доступа к проектам
          </h1>
          <p className="text-slate-400 mb-8">
            Добро пожаловать, {state.currentUser?.name || 'Пользователь'}! Вы будете добавлены в проекты администратором.
          </p>
        </div>

        {/* Status Steps */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">✓</span>
            </div>
            <div className="text-left">
              <p className="text-white font-medium">Аккаунт создан</p>
              <p className="text-gray-400 text-sm">Вы успешно зарегистрированы в системе</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <p className="text-white font-medium">Ожидание добавления в проект</p>
              <p className="text-gray-400 text-sm">Администратор должен добавить вас в проект</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-white/5 rounded-lg opacity-50">
            <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center flex-shrink-0">
              <FolderX className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <p className="text-white font-medium">Доступ к проектам</p>
              <p className="text-gray-400 text-sm">Будет доступен после добавления в проект</p>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Mail className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Как получить доступ к проектам</h3>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed text-center">
            Обратитесь к администратору системы или менеджеру проекта для добавления в команду. 
            После добавления в проект вы получите доступ к задачам и всем функциям платформы.
          </p>
        </div>

        {/* User Info */}
        <div className="pt-6 border-t border-white/10 flex items-center justify-between">
          <p className="text-gray-400 text-sm">
            Вы вошли как: <span className="text-white font-medium">{state.currentUser?.email}</span>
          </p>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            title="Выйти">
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Выйти</span>
          </button>
        </div>
      </div>
    </div>
  );
}