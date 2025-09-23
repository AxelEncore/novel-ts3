"use client";

import React, { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { Board } from "@/types";
import { Plus, Edit2, Trash2, Settings } from "lucide-react";
import DeleteConfirmationModal from "./DeleteConfirmationModal";
import { CreateBoardModalSimple } from "./CreateBoardModalSimple";
import ProjectSettingsModal from './ProjectSettingsModalNew';
import { api } from "@/lib/api";
import { toast } from "sonner";

interface BoardManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

function BoardManager({ isOpen, onClose }: BoardManagerProps) {
  const { state, dispatch, createBoard, loadBoards } = useApp();
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [boardToDelete, setBoardToDelete] = useState<Board | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Получаем информацию о текущем пользователе
  const currentUser = state.currentUser;
  const isAdmin = currentUser?.role === 'admin';
  const isProjectOwner = state.selectedProject?.created_by === currentUser?.id;

  if (!isOpen || !state.selectedProject) return null;

  const projectBoards = state.boards.filter(
    (board) => board.project_id === state.selectedProject!.id
  );

  const handleCreateBoard = async (boardData: Omit<Board, "id" | "createdAt">) => {
    try {
      console.log('🚀 BoardManager handleCreateBoard called with:', {
        name: boardData.name,
        description: boardData.description,
        project_id: boardData.project_id,
        selectedProjectId: state.selectedProject?.id
      });
      
      console.log('📝 BoardManager calling AppContext createBoard...');
      
      const success = await createBoard({
        name: boardData.name,
        description: boardData.description,
        project_id: boardData.project_id
      });
      
      console.log('📝 BoardManager createBoard result:', success);
      
      if (success) {
        console.log('✅ BoardManager: Board created successfully, closing modal');
        setShowCreateModal(false);
        // Доска уже добавлена в стейт через ADD_BOARD action в createBoard
        console.log('✅ BoardManager: Board should now appear in the list');
      } else {
        console.error('❌ BoardManager: Failed to create board');
        // TODO: Show error notification
      }
    } catch (error) {
      console.error('❌ BoardManager: Error creating board:', error);
      // TODO: Show error notification
    }
  };

  const handleUpdateBoard = (board: Board, newName: string) => {
    if (!newName.trim()) return;

    const updatedBoard = { ...board, name: newName };
    dispatch({ type: "UPDATE_BOARD", payload: updatedBoard });
    setEditingBoard(null);
  };

  const handleDeleteBoard = (board: Board) => {
    setBoardToDelete(board);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (boardToDelete) {
      try {
        await api.deleteBoard(boardToDelete.id.toString());
        dispatch({ type: "DELETE_BOARD", payload: boardToDelete.id });
        setBoardToDelete(null);
        setShowDeleteModal(false);
      } catch (error) {
        console.error('Ошибка удаления доски:', error);
        // TODO: Показать уведомление об ошибке
      }
    }
  };

  const handleProjectUpdated = (updatedProject: any) => {
    dispatch({ type: "UPDATE_PROJECT", payload: updatedProject });
    toast.success('Проект успешно обновлен!');
  };

  const handleProjectDeleted = (projectId: string) => {
    dispatch({ type: "DELETE_PROJECT", payload: projectId });
    setShowSettingsModal(false);
    onClose();
    toast.success('Проект успешно удален!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">
            Управление досками
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {/* Action buttons - только для админов и владельцев проекта */}
          {(isAdmin || isProjectOwner) && (
            <div className="mb-6 flex gap-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Создать новую доску
              </button>
              <button
                onClick={() => {
                  console.log('Settings button clicked!');
                  console.log('Current showSettingsModal:', showSettingsModal);
                  console.log('Current selectedProject:', state.selectedProject);
                  setShowSettingsModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4" />
                Настройки проекта
              </button>
            </div>
          )}

          {/* Boards list */}
          <div className="space-y-3">
            <h3 className="text-lg font-medium text-white mb-4">
              Доски проекта &quot;{state.selectedProject.name}&quot;
            </h3>

            {projectBoards.length === 0 ? (
              <p className="text-gray-400 text-center py-8">
                Нет созданных досок
              </p>
            ) : (
              projectBoards.map((board) => (
                <div
                  key={board.id}
                  className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        state.selectedBoard?.id === board.id
                          ? "bg-primary-500"
                          : "bg-gray-500"
                      }`}
                    />

                    {editingBoard?.id === board.id ? (
                      <input
                        type="text"
                        defaultValue={board.name}
                        className="px-2 py-1 bg-white/10 border border-white/20 rounded text-white focus:outline-none focus:border-primary-500"
                        autoFocus
                        onBlur={(e) => handleUpdateBoard(board, e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            handleUpdateBoard(board, e.currentTarget.value);
                          }
                        }}
                      />
                    ) : (
                      <span className="text-white font-medium">
                        {board.name}
                      </span>
                    )}
                    {state.selectedBoard?.id === board.id && (
                      <span className="text-xs text-primary-400 bg-primary-500/20 px-2 py-1 rounded-full">
                        Активная
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        dispatch({ type: "SELECT_BOARD", payload: board })
                      }
                      className="px-3 py-1 text-sm bg-primary-500/20 text-primary-300 hover:bg-primary-500/30 rounded transition-colors"
                    >
                      Выбрать
                    </button>
                    {/* Кнопка редактирования - для админов, владельцев проекта и создателей доски */}
                    {(isAdmin || isProjectOwner || board.created_by === currentUser?.id) && (
                      <button
                        onClick={() => setEditingBoard(board)}
                        className="p-2 hover:bg-white/10 rounded transition-colors"
                        title="Переименовать"
                      >
                        <Edit2 className="w-4 h-4 text-gray-400" />
                      </button>
                    )}
                    {/* Кнопка удаления - только для админов и владельцев проекта */}
                    {projectBoards.length > 1 && (isAdmin || isProjectOwner) && (
                      <button
                        onClick={() => handleDeleteBoard(board)}
                        className="p-2 hover:bg-primary-700/20 rounded transition-colors"
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="Удалить доску"
        message={`Вы уверены, что хотите удалить доску "${boardToDelete?.name}"? Все задачи будут удалены.`}
      />
      
      <CreateBoardModalSimple
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreateBoard}
        projectId={state.selectedProject!.id}
      />
      
      {console.log('Rendering settings modal area:', { 
        hasProject: !!state.selectedProject,
        showSettingsModal,
        projectName: state.selectedProject?.name 
      })}
      {state.selectedProject && (
        <ProjectSettingsModal
          isOpen={showSettingsModal}
          onClose={() => {
            console.log('Closing settings modal');
            setShowSettingsModal(false);
          }}
          project={state.selectedProject}
          onProjectUpdated={handleProjectUpdated}
          onProjectDeleted={handleProjectDeleted}
        />
      )}
    </div>
  );
}

export default BoardManager;