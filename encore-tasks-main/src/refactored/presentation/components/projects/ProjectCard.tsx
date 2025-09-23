// ProjectCard Component
// Displays a single project in card format with actions

import React, { useState } from 'react';
import { Project, UpdateProjectData } from '../../../data/types';
import { formatDate, getInitials } from '../../utils';
import { DropdownMenu } from '../common/DropdownMenu';
import { Badge } from '../common/Badge';
import { Avatar } from '../common/Avatar';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { EditProjectModal } from './EditProjectModal';

interface ProjectCardProps {
  project: Project;
  onUpdate: (updates: Partial<Project>) => void;
  onDelete: () => void;
  onArchive: () => void;
  onRestore: () => void;
  canEdit$1: boolean;
  canDelete$2: boolean;
  onClick$3: () => void;
  className$4: string;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onUpdate,
  onDelete,
  onArchive,
  onRestore,
  canEdit = false,
  canDelete = false,
  onClick,
  className = ''
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger onClick if clicking on action buttons
    if ((e.target as HTMLElement).closest('[data-action]')) {
      return;
    }
    onClick?.();
  };

  const handleEdit = () => {
    setIsEditModalOpen(true);
  };

  const handleDelete = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleArchive = () => {
    setIsArchiveDialogOpen(true);
  };

  const handleRestore = () => {
    setIsRestoreDialogOpen(true);
  };

  const confirmDelete = () => {
    onDelete();
    setIsDeleteDialogOpen(false);
  };

  const confirmArchive = () => {
    onArchive();
    setIsArchiveDialogOpen(false);
  };

  const confirmRestore = () => {
    onRestore();
    setIsRestoreDialogOpen(false);
  };

  const handleUpdateProject = async (id: string, data: UpdateProjectData) => {
    onUpdate(data);
    setIsEditModalOpen(false);
  };

  const menuItems = [];
  
  if (canEdit) {
    menuItems.push({
      label: 'Edit',
      icon: 'edit',
      onClick: handleEdit
    });
  }

  if (!project.isArchived) {
    menuItems.push({
      label: 'Archive',
      icon: 'archive',
      onClick: handleArchive
    });
  } else {
    menuItems.push({
      label: 'Restore',
      icon: 'restore',
      onClick: handleRestore
    });
  }

  if (canDelete) {
    menuItems.push({
      label: 'Delete',
      icon: 'delete',
      onClick: handleDelete,
      variant: 'danger' as const
    });
  }

  const progressPercentage = project.statistics?.totalTasks 
    ? Math.round((project.statistics.completedTasks / project.statistics.totalTasks) * 100)
    : 0;

  return (
    <>
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200 ${onClick ? 'cursor-pointer' : ''} ${project.isArchived ? 'opacity-75' : ''} ${className}`}
        onClick={handleCardClick}
      >
        {/* Header */}
        <div className="p-4 pb-2">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: project.color }}
                />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {project.name}
                </h3>
                {project.isArchived && (
                  <Badge variant="warning" size="sm">
                    Archived
                  </Badge>
                )}
              </div>
              
              {project.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                  {project.description}
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
              <span className="text-gray-500 dark:text-gray-400">Boards</span>
              <p className="font-medium text-gray-900 dark:text-white">
                {project.statistics?.totalBoards || 0}
              </p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Tasks</span>
              <p className="font-medium text-gray-900 dark:text-white">
                {project.statistics?.totalTasks || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Progress */}
        {project.statistics?.totalTasks > 0 && (
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

        {/* Members */}
        {project.members && project.members.length > 0 && (
          <div className="px-4 pb-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Members</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {project.members.length}
              </span>
            </div>
            <div className="flex -space-x-2">
              {project.members.slice(0, 5).map((member, index) => (
                <Avatar
                  key={member.userId}
                  src={undefined}
                  alt={member.userId}
                  initials={getInitials(member.userId)}
                  size="sm"
                  className="ring-2 ring-white dark:ring-gray-800"
                />
              ))}
              {project.members.length > 5 && (
                <div className="flex items-center justify-center w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full ring-2 ring-white dark:ring-gray-800 text-xs font-medium text-gray-600 dark:text-gray-400">
                  +{project.members.length - 5}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-b-lg border-t border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Updated {formatDate(project.updatedAt)}</span>
            {project.statistics$1.overdueTasks > 0 && (
              <Badge variant="error" size="sm">
                {project.statistics.overdueTasks} overdue
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Modals and Dialogs */}
      {isEditModalOpen && (
        <EditProjectModal
          project={project}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSubmit={handleUpdateProject}
        />
      )}

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Project"
        message={`Are you sure you want to delete &quot;${project.name}&quot;$1 This action cannot be undone and will delete all boards and tasks in this project.`}
        confirmLabel="Delete"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={isArchiveDialogOpen}
        onClose={() => setIsArchiveDialogOpen(false)}
        onConfirm={confirmArchive}
        title="Archive Project"
        message={`Are you sure you want to archive &quot;${project.name}&quot;$1 Archived projects are hidden from the main view but can be restored later.`}
        confirmLabel="Archive"
        variant="warning"
      />

      <ConfirmDialog
        isOpen={isRestoreDialogOpen}
        onClose={() => setIsRestoreDialogOpen(false)}
        onConfirm={confirmRestore}
        title="Restore Project"
        message={`Are you sure you want to restore &quot;${project.name}&quot;$1 This will make the project visible in the main view again.`}
        confirmLabel="Restore"
        variant="primary"
      />
    </>
  );
};

export default ProjectCard;