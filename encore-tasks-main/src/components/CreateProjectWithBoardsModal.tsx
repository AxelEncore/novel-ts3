'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, GripVertical } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';

interface CreateProjectWithBoardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated$1: (project: any) => void;
}

interface BoardColumn {
  name: string;
  status: string;
  order: number;
}

interface BoardData {
  name: string;
  description: string;
  color: string;
  columns: BoardColumn[];
}

interface ProjectData {
  name: string;
  description: string;
  color: string;
  members: string[];
  telegramIntegration: {
    enabled: boolean;
    chatId: string;
    botToken: string;
  };
}

const defaultColors = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'
];

const defaultColumns: BoardColumn[] = [
  { name: 'К выполнению', status: 'TODO', order: 0 },
  { name: 'В работе', status: 'IN_PROGRESS', order: 1 },
  { name: 'На проверке', status: 'REVIEW', order: 2 },
  { name: 'Выполнено', status: 'DONE', order: 3 }
];

export default function CreateProjectWithBoardsModal({
  isOpen,
  onClose,
  onProjectCreated
}: CreateProjectWithBoardsModalProps) {
  const { createProjectWithBoards } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Состояние проекта
  const [projectData, setProjectData] = useState<ProjectData>({
    name: '',
    description: '',
    color: defaultColors[0],
    members: [],
    telegramIntegration: {
      enabled: false,
      chatId: '',
      botToken: ''
    }
  });

  // Состояние досок
  const [boards, setBoards] = useState<BoardData[]>([{
    name: 'Основная доска',
    description: '',
    color: '#10B981',
    columns: [...defaultColumns]
  }]);

  const [newMemberEmail, setNewMemberEmail] = useState('');

  // Сброс формы при открытии
  useEffect(() => {
    if (isOpen) {
      setProjectData({
        name: '',
        description: '',
        color: defaultColors[0],
        members: [],
        telegramIntegration: {
          enabled: false,
          chatId: '',
          botToken: ''
        }
      });
      setBoards([{
        name: 'Основная доска',
        description: '',
        color: '#10B981',
        columns: [...defaultColumns]
      }]);
      setError(null);
      setNewMemberEmail('');
    }
  }, [isOpen]);

  // Генерация автоматического имени проекта
  const generateProjectName = () => {
    const adjectives = ['Новый', 'Важный', 'Срочный', 'Основной', 'Главный'];
    const nouns = ['Проект', 'План', 'Задача', 'Цель', 'Инициатива'];
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const number = Math.floor(Math.random() * 1000) + 1;
    return `${adjective} ${noun} ${number}`;
  };

  // Обработчики для проекта
  const handleProjectChange = (field: keyof ProjectData, value: any) => {
    setProjectData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Добавление участника
  const addMember = () => {
    if (newMemberEmail && !projectData.members.includes(newMemberEmail)) {
      setProjectData(prev => ({
        ...prev,
        members: [...prev.members, newMemberEmail]
      }));
      setNewMemberEmail('');
    }
  };

  // Удаление участника
  const removeMember = (email: string) => {
    setProjectData(prev => ({
      ...prev,
      members: prev.members.filter(m => m !== email)
    }));
  };

  // Обработчики для досок
  const addBoard = () => {
    setBoards(prev => [...prev, {
      name: `Доска ${prev.length + 1}`,
      description: '',
      color: defaultColors[prev.length % defaultColors.length],
      columns: [...defaultColumns]
    }]);
  };

  const removeBoard = (index: number) => {
    if (boards.length > 1) {
      setBoards(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateBoard = (index: number, field: keyof BoardData, value: any) => {
    setBoards(prev => prev.map((board, i) => 
      i === index ? { ...board, [field]: value } : board
    ));
  };

  // Обработчики для колонок
  const addColumn = (boardIndex: number) => {
    setBoards(prev => prev.map((board, i) => {
      if (i === boardIndex) {
        const newColumn: BoardColumn = {
          name: `Колонка ${board.columns.length + 1}`,
          status: `CUSTOM_${Date.now()}`,
          order: board.columns.length
        };
        return {
          ...board,
          columns: [...board.columns, newColumn]
        };
      }
      return board;
    }));
  };

  const removeColumn = (boardIndex: number, columnIndex: number) => {
    setBoards(prev => prev.map((board, i) => {
      if (i === boardIndex && board.columns.length > 1) {
        return {
          ...board,
          columns: board.columns.filter((_, ci) => ci !== columnIndex)
        };
      }
      return board;
    }));
  };

  const updateColumn = (boardIndex: number, columnIndex: number, field: keyof BoardColumn, value: any) => {
    setBoards(prev => prev.map((board, i) => {
      if (i === boardIndex) {
        return {
          ...board,
          columns: board.columns.map((col, ci) => 
            ci === columnIndex ? { ...col, [field]: value } : col
          )
        };
      }
      return board;
    }));
  };

  // Создание проекта
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (!projectData.name.trim()) {
        throw new Error('Название проекта обязательно');
      }

      const result = await createProjectWithBoards({
        name: projectData.name,
        description: projectData.description,
        color: projectData.color,
        members: projectData.members,
        telegramIntegration: projectData.telegramIntegration,
        boards: boards
      });

      if (result.success && result.project) {
        toast.success('Проект успешно создан!');
        // Вызываем callback с данными созданного проекта
        onProjectCreated$2.(result.project);
        onClose();
      } else {
        throw new Error('Ошибка создания проекта');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Заголовок */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Создать проект с досками
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Информация о проекте */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Информация о проекте</h3>
            
            {/* Название проекта */}
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Название проекта *
                </label>
                <input
                  type="text"
                  value={projectData.name}
                  onChange={(e) => handleProjectChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Введите название проекта"
                  required
                />
              </div>
              <button
                type="button"
                onClick={() => handleProjectChange('name', generateProjectName())}
                className="mt-6 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Сгенерировать
              </button>
            </div>

            {/* Описание проекта */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Описание
              </label>
              <textarea
                value={projectData.description}
                onChange={(e) => handleProjectChange('description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Описание проекта (необязательно)"
              />
            </div>

            {/* Цвет проекта */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Цвет проекта
              </label>
              <div className="flex gap-2">
                {defaultColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleProjectChange('color', color)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      projectData.color === color
                        ? 'border-gray-800 scale-110'
                        : 'border-gray-300 hover:border-gray-500'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Участники */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Участники проекта
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Email участника"
                />
                <button
                  type="button"
                  onClick={addMember}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {projectData.members.length > 0 && (
                <div className="space-y-1">
                  {projectData.members.map((email, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md">
                      <span className="text-sm text-gray-700">{email}</span>
                      <button
                        type="button"
                        onClick={() => removeMember(email)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Доски */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Доски задач</h3>
              <button
                type="button"
                onClick={addBoard}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Добавить доску
              </button>
            </div>

            {boards.map((board, boardIndex) => (
              <div key={boardIndex} className="border border-gray-200 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">Доска {boardIndex + 1}</h4>
                  {boards.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeBoard(boardIndex)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Название доски */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Название доски *
                  </label>
                  <input
                    type="text"
                    value={board.name}
                    onChange={(e) => updateBoard(boardIndex, 'name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Название доски"
                    required
                  />
                </div>

                {/* Описание доски */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Описание доски
                  </label>
                  <input
                    type="text"
                    value={board.description}
                    onChange={(e) => updateBoard(boardIndex, 'description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Описание доски (необязательно)"
                  />
                </div>

                {/* Цвет доски */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Цвет доски
                  </label>
                  <div className="flex gap-2">
                    {defaultColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => updateBoard(boardIndex, 'color', color)}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${
                          board.color === color
                            ? 'border-gray-800 scale-110'
                            : 'border-gray-300 hover:border-gray-500'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Колонки доски */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Колонки доски
                    </label>
                    <button
                      type="button"
                      onClick={() => addColumn(boardIndex)}
                      className="text-sm text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Добавить колонку
                    </button>
                  </div>
                  <div className="space-y-2">
                    {board.columns.map((column, columnIndex) => (
                      <div key={columnIndex} className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={column.name}
                          onChange={(e) => updateColumn(boardIndex, columnIndex, 'name', e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Название колонки"
                        />
                        <input
                          type="text"
                          value={column.status}
                          onChange={(e) => updateColumn(boardIndex, columnIndex, 'status', e.target.value)}
                          className="w-32 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Статус"
                        />
                        {board.columns.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeColumn(boardIndex, columnIndex)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Ошибка */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Кнопки */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              disabled={isLoading}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || !projectData.name.trim()}
            >
              {isLoading ? 'Создание...' : 'Создать проект'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}