"use client";

import React, { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { Board } from "@/types";
import { generateId } from "@/lib/utils";
import { Plus, Edit2, Trash2, Settings } from "lucide-react";
import DeleteConfirmationModal from "./DeleteConfirmationModal";
import { CreateBoardModal } from "./CreateBoardModal";
import { api } from "@/lib/api";

interface BoardManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

function BoardManager({ isOpen, onClose }: BoardManagerProps) {
  const { state, dispatch, createBoard } = useApp();
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [boardToDelete, setBoardToDelete] = useState<Board | null>(null);

  // Получаем информацию о текущем пользователе
  const currentUser = state.user;
  const isAdmin = currentUser?.role === 'admin';
  const isProjectOwner = state.selectedProject?.createdBy === currentUser?.id;

  if (!isOpen || !state.selectedProject) return null;

  const projectBoards = state.boards.filter(
    (board) => board.projectId === state.selectedProject!.id
  );

  const handleCreateBoard = async (boardData: Omit<Board, "id" | "createdAt">) => {
    try {
      console.log('Creating board with data:', {
        name: boardData.name,
        description: boardData.description,
        projectId: boardData.projectId,
        selectedProjectId: state.selectedProject?.id
      });
      
      const success = await createBoard({
        name: boardData.name,
        description: boardData.description,
        projectId: boardData.projectId
      });
      
      if (success) {
        setShowCreateModal(false);
      } else {
        console.error('Failed to create board');
        // TODO: Show error notification
      }
    } catch (error) {
      console.error('Error creating board:', error);
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
            <Settings className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Create Board Button */}
          {(isAdmin || isProjectOwner) && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full mb-6 p-4 border-2 border-dashed border-white/20 rounded-lg hover:border-white/40 transition-colors group"
            >
              <div className="flex items-center justify-center gap-2 text-gray-400 group-hover:text-white transition-colors">
                <Plus className="w-5 h-5" />
                <span>Создать новую доску</span>
              </div>
            </button>
          )}

          {/* Boards List */}
          <div className="space-y-3">
            {projectBoards.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <div className="text-lg mb-2">Нет досок</div>
                <div className="text-sm">
                  {isAdmin || isProjectOwner
                    ? "Создайте первую доску для этого проекта"
                    : "В этом проекте пока нет досок"}
                </div>
              </div>
            ) : (
              projectBoards.map((board) => (
                <div
                  key={board.id}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <div className="flex-1">
                    {editingBoard?.id === board.id ? (
                      <input
                        type="text"
                        defaultValue={board.name}
                        className="w-full bg-transparent text-white border-b border-white/20 focus:border-white/40 outline-none"
                        onBlur={(e) => handleUpdateBoard(board, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleUpdateBoard(board, e.currentTarget.value);
                          } else if (e.key === "Escape") {
                            setEditingBoard(null);
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      <div>
                        <div className="text-white font-medium">{board.name}</div>
                        {board.description && (
                          <div className="text-gray-400 text-sm mt-1">
                            {board.description}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {(isAdmin || isProjectOwner) && (
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => setEditingBoard(board)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        title="Редактировать"
                      >
                        <Edit2 className="w-4 h-4 text-gray-400 hover:text-white" />
                      </button>
                      <button
                        onClick={() => handleDeleteBoard(board)}
                        className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateBoardModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreateBoard}
          projectId={state.selectedProject!.id}
        />
      )}

      {showDeleteModal && boardToDelete && (
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setBoardToDelete(null);
          }}
          onConfirm={handleConfirmDelete}
          title="Удалить доску"
          message={`Вы уверены, что хотите удалить доску "${boardToDelete.name}"? Это действие нельзя отменить.`}
        />
      )}
    </div>
  );
}

export default BoardManager;