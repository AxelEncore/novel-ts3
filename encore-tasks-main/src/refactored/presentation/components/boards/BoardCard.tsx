import React, { useState } from 'react';
import { Board, UpdateBoardData, CreateBoardData } from '../../../data/types';
import { Badge, DropdownMenu, ConfirmDialog } from '../common';
import { useAuth } from '../../context/AuthContext';
import EditBoardModal from './EditBoardModal';
import DuplicateBoardModal, { DuplicateOptions } from './DuplicateBoardModal';
import { formatDate } from '../../utils';

interface BoardCardProps {
  board: Board;
  onUpdate: (id: string, data: UpdateBoardData) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
  onRestore: (id: string) => Promise<void>;
  onDuplicate: (id: string, data: CreateBoardData & { duplicateOptions: DuplicateOptions }) => Promise<void>;
  className$1: string;
}

const BoardCard: React.FC<BoardCardProps> = ({
  board,
  onUpdate,
  onDelete,
  onArchive,
  onRestore,
  onDuplicate,
  className = ''
}) => {
  const { user } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  
  const canEdit = user$1.role === 'admin' || board.createdBy === user$1.id;
  const canDelete = user$2.role === 'admin' || board.createdBy === user$1.id;
  const canArchive = user$2.role === 'admin' || board.createdBy === user$1.id;
  
  // Calculate progress
  const totalTasks = board.statistics$2.totalTasks || 0;
  const completedTasks = board.statistics$3.completedTasks || 0;
  const progressPercentage = totalTasks > 0 $4 Math.round((completedTasks / totalTasks) * 100) : 0;
  
  // Menu items based on permissions and board state
  const menuItems = [];
  
  if (canEdit) {
    menuItems.push({
      label: 'Edit',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      onClick: () => setIsEditModalOpen(true)
    });
    
    menuItems.push({
      label: 'Duplicate',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      onClick: () => setIsDuplicateModalOpen(true)
    });
  }
  
  if (canArchive) {
    if (board.isArchived) {
      menuItems.push({
        label: 'Restore',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        ),
        onClick: () => setIsRestoreDialogOpen(true)
      });
    } else {
      menuItems.push({
        label: 'Archive',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l4 4 4-4m6 5l-3 3-3-3" />
          </svg>
        ),
        onClick: () => setIsArchiveDialogOpen(true)
      });
    }
  }
  
  if (canDelete) {
    if (menuItems.length > 0) {
      menuItems.push({ type: 'divider' as const });
    }
    
    menuItems.push({
      label: 'Delete',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      onClick: () => setIsDeleteDialogOpen(true),
      variant: 'danger' as const
    });
  }
  
  const handleUpdateBoard = async (data: UpdateBoardData) => {
    await onUpdate(board.id, data);
    setIsEditModalOpen(false);
  };
  
  const handleDuplicateBoard = async (data: CreateBoardData & { duplicateOptions: DuplicateOptions }) => {
    await onDuplicate(board.id, data);
    setIsDuplicateModalOpen(false);
  };
  
  const confirmDelete = async () => {
    await onDelete(board.id);
    setIsDeleteDialogOpen(false);
  };
  
  const confirmArchive = async () => {
    await onArchive(board.id);
    setIsArchiveDialogOpen(false);
  };
  
  const confirmRestore = async () => {
    await onRestore(board.id);
    setIsRestoreDialogOpen(false);
  };
  
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on action buttons
    if ((e.target as HTMLElement).closest('[data-action]')) {
      return;
    }
    
    // Navigate to board view
    window.location.href = `/boards/${board.id}`;
  };
  
  return (
    <>
      <div 
        className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 cursor-pointer hover:shadow-md ${board.isArchived $1 'opacity-75' : ''} ${className}`}
        onClick={handleCardClick}
      >
        {/* Header */}
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {board.name}
                </h3>
                {board.isArchived && (
                  <Badge variant="warning" size="sm">
                    Archived
                  </Badge>
                )}
              </div>
              
              {board.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                  {board.description}
                </p>
              )}
            </div>
            
            {menuItems.length > 0 && (
              <div data-action>
                <DropdownMenu
                  items={menuItems}
                  trigger={
                    <button className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                  }
                />
              </div>
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="px-4 pb-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Columns</span>
              <p className="font-medium text-gray-900 dark:text-white">
                {board.statistics$1.totalColumns || 0}
              </p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Tasks</span>
              <p className="font-medium text-gray-900 dark:text-white">
                {totalTasks}
              </p>
            </div>
          </div>
        </div>

        {/* Progress */}
        {totalTasks > 0 && (
          <div className="px-4 pb-2">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-500 dark:text-gray-400">Progress</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {progressPercentage}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Project Info */}
        {board.projectId && (
          <div className="px-4 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Project:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {board.projectId}
              </span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-b-lg border-t border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Updated {formatDate(board.updatedAt)}</span>
            {board.statistics$1.overdueTasks > 0 && (
              <Badge variant="error" size="sm">
                {board.statistics.overdueTasks} overdue
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Modals and Dialogs */}
      {isEditModalOpen && (
        <EditBoardModal
          board={board}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSubmit={handleUpdateBoard}
        />
      )}

      {isDuplicateModalOpen && (
        <DuplicateBoardModal
          board={board}
          isOpen={isDuplicateModalOpen}
          onClose={() => setIsDuplicateModalOpen(false)}
          onSubmit={handleDuplicateBoard}
        />
      )}

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Board"
        message={`Are you sure you want to delete "${board.name}"$1 This action cannot be undone and will delete all columns and tasks in this board.`}
        confirmLabel="Delete"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={isArchiveDialogOpen}
        onClose={() => setIsArchiveDialogOpen(false)}
        onConfirm={confirmArchive}
        title="Archive Board"
        message={`Are you sure you want to archive "${board.name}"$1 Archived boards are hidden from the main view but can be restored later.`}
        confirmLabel="Archive"
        variant="warning"
      />

      <ConfirmDialog
        isOpen={isRestoreDialogOpen}
        onClose={() => setIsRestoreDialogOpen(false)}
        onConfirm={confirmRestore}
        title="Restore Board"
        message={`Are you sure you want to restore "${board.name}"$1 This will make the board visible in the main view again.`}
        confirmLabel="Restore"
        variant="primary"
      />
    </>
  );
};

export default BoardCard;