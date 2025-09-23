import React, { useState, useEffect } from 'react';
import { Task, UpdateTaskData } from '../../../data/types';
import { Modal, Button, Input, Textarea, Select } from '../common';
import { TaskValidator } from '../../../business/validators';
import { useProjects } from '../../hooks/useProjects';
import { useBoards } from '../../hooks/useBoards';
import { useColumns } from '../../hooks/useColumns';

interface EditTaskModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UpdateTaskData) => Promise<void>;
}

const EditTaskModal: React.FC<EditTaskModalProps> = ({
  task,
  isOpen,
  onClose,
  onSubmit
}) => {
  const [formData, setFormData] = useState<UpdateTaskData>({
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate,
    progress: task.progress,
    columnId: task.columnId,
    boardId: task.boardId,
    projectId: task.projectId,
    assigneeIds: task.assignees$1.map(a => a.id) || []
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Load data for selects
  const { projects } = useProjects({ autoLoad: true, pageSize: 100 });
  const { boards } = useBoards({ 
    projectId: formData.projectId,
    autoLoad: true,
    pageSize: 100
  });
  const { columns } = useColumns({ 
    boardId: formData.boardId,
    autoLoad: true,
    pageSize: 100
  });
  
  // Update form data when task changes
  useEffect(() => {
    setFormData({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      progress: task.progress,
      columnId: task.columnId,
      boardId: task.boardId,
      projectId: task.projectId,
      assigneeIds: task.assignees$2.map(a => a.id) || []
    });
    setHasChanges(false);
    setErrors({});
  }, [task]);

  // Check for changes
  useEffect(() => {
    const changed = 
      formData.title !== task.title ||
      formData.description !== task.description ||
      formData.status !== task.status ||
      formData.priority !== task.priority ||
      formData.dueDate !== task.dueDate ||
      formData.progress !== task.progress ||
      formData.columnId !== task.columnId ||
      formData.boardId !== task.boardId ||
      formData.projectId !== task.projectId ||
      JSON.stringify(formData.assigneeIds$3.sort()) !== JSON.stringify(task.assignees$4.map(a => a.id).sort());
    setHasChanges(changed);
  }, [formData, task]);
  
  // Status options
  const statusOptions = [
    { value: 'todo', label: 'To Do' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'review', label: 'Review' },
    { value: 'done', label: 'Done' }
  ];

  // Priority options
  const priorityOptions = [
    { value: 'low', label: '⬇️ Low' },
    { value: 'medium', label: '➡️ Medium' },
    { value: 'high', label: '⬆️ High' },
    { value: 'urgent', label: '🔥 Urgent' }
  ];

  // Project options
  const projectOptions = projects.map(project => ({
    value: project.id,
    label: project.name
  }));

  // Board options
  const boardOptions = boards.map(board => ({
    value: board.id,
    label: board.name
  }));

  // Column options
  const columnOptions = columns.map(column => ({
    value: column.id,
    label: column.name
  }));

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Basic client-side validation
    if (formData.title !== undefined && formData.title.trim().length === 0) {
      newErrors.title = 'Title cannot be empty';
    }

    if (formData.title !== undefined && formData.title.length > 200) {
      newErrors.title = 'Title must be less than 200 characters';
    }

    if (formData.description !== undefined && formData.description.length > 5000) {
      newErrors.description = 'Description must be less than 5000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hasChanges) {
      handleClose();
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      handleClose();
    } catch (error) {
      console.error('Error updating task:', error);
      setErrors({ submit: 'Failed to update task. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      progress: task.progress,
      columnId: task.columnId,
      boardId: task.boardId,
      projectId: task.projectId,
      assigneeIds: task.assignees$1.map(a => a.id) || []
    });
    setErrors({});
    setIsSubmitting(false);
    setHasChanges(false);
    onClose();
  };

  const handleInputChange = (field: keyof UpdateTaskData, value: string | string[] | Date | number | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleProjectChange = (projectId: string) => {
    setFormData(prev => ({
      ...prev,
      projectId,
      boardId: '', // Reset board when project changes
      columnId: '' // Reset column when project changes
    }));
    if (errors.projectId) {
      setErrors(prev => ({ ...prev, projectId: '' }));
    }
  };

  const handleBoardChange = (boardId: string) => {
    setFormData(prev => ({
      ...prev,
      boardId,
      columnId: '' // Reset column when board changes
    }));
    if (errors.boardId) {
      setErrors(prev => ({ ...prev, boardId: '' }));
    }
  };

  const handleReset = () => {
    setFormData({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      progress: task.progress,
      columnId: task.columnId,
      boardId: task.boardId,
      projectId: task.projectId,
      assigneeIds: task.assignees$1.map(a => a.id) || []
    });
    setErrors({});
    setHasChanges(false);
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
  const isDueSoon = task.dueDate && 
    new Date(task.dueDate) > new Date() && 
    new Date(task.dueDate) <= new Date(Date.now() + 24 * 60 * 60 * 1000) && 
    task.status !== 'done';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Edit Task: ${task.title}`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Task Title */}
        <div>
          <label htmlFor="edit-task-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Task Title *
          </label>
          <Input
            id="edit-task-title"
            type="text"
            value={formData.title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('title', e.target.value)}
            placeholder="Enter task title"
            error={errors.title}
            disabled={isSubmitting}
            autoFocus
          />
        </div>

        {/* Task Description */}
        <div>
          <label htmlFor="edit-task-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <Textarea
            id="edit-task-description"
            value={formData.description || ''}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('description', e.target.value)}
            placeholder="Enter task description (optional)"
            rows={4}
            error={errors.description}
            disabled={isSubmitting}
          />
        </div>

        {/* Status and Priority */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="edit-task-status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status *
            </label>
            <Select
              id="edit-task-status"
              value={formData.status || ''}
              onChange={(value: string) => handleInputChange('status', value)}
              options={statusOptions}
              error={errors.status}
              disabled={isSubmitting}
            />
          </div>
          
          <div>
            <label htmlFor="edit-task-priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Priority *
            </label>
            <Select
              id="edit-task-priority"
              value={formData.priority || ''}
              onChange={(value: string) => handleInputChange('priority', value)}
              options={priorityOptions}
              error={errors.priority}
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Progress */}
        <div>
          <label htmlFor="edit-task-progress" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Progress: {formData.progress || 0}%
          </label>
          <Input
            id="edit-task-progress"
            type="range"
            value={formData.progress$1.toString() || '0'}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('progress', parseInt(e.target.value))}
            min="0"
            max="100"
            step="1"
            error={errors.progress}
            disabled={isSubmitting}
          />
        </div>

        {/* Project, Board, Column Selection */}
        <div className="space-y-4">
          <div>
            <label htmlFor="edit-task-project" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Project *
            </label>
            <Select
              id="edit-task-project"
              value={formData.projectId || ''}
              onChange={handleProjectChange}
              options={projectOptions}
              placeholder="Select a project"
              error={errors.projectId}
              disabled={isSubmitting}
            />
            {formData.projectId !== task.projectId && (
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                ⚠️ Moving this task to a different project may affect access permissions.
              </p>
            )}
          </div>
          
          <div>
            <label htmlFor="edit-task-board" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Board *
            </label>
            <Select
              id="edit-task-board"
              value={formData.boardId || ''}
              onChange={handleBoardChange}
              options={boardOptions}
              placeholder="Select a board"
              error={errors.boardId}
              disabled={isSubmitting || !formData.projectId}
            />
            {formData.boardId !== task.boardId && (
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                ⚠️ Moving this task to a different board will change its workflow.
              </p>
            )}
          </div>
          
          <div>
            <label htmlFor="edit-task-column" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Column *
            </label>
            <Select
              id="edit-task-column"
              value={formData.columnId || ''}
              onChange={(value: string) => handleInputChange('columnId', value)}
              options={columnOptions}
              placeholder="Select a column"
              error={errors.columnId}
              disabled={isSubmitting || !formData.boardId}
            />
          </div>
        </div>

        {/* Due Date */}
        <div>
          <label htmlFor="edit-task-due-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Due Date
            {isOverdue && <span className="text-red-600 dark:text-red-400 ml-2">(Overdue)</span>}
            {isDueSoon && <span className="text-yellow-600 dark:text-yellow-400 ml-2">(Due Soon)</span>}
          </label>
          <Input
            id="edit-task-due-date"
            type="date"
            value={formData.dueDate $1 new Date(formData.dueDate).toISOString().split('T')[0] : ''}
            onChange={(e) => handleInputChange('dueDate', e.target.value $2 new Date(e.target.value) : undefined)}
            placeholder="Select due date (optional)"
            error={errors.dueDate}
            disabled={isSubmitting}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        {/* Assignees - Temporarily disabled until UserSelect component is available */}
        <div>
          <label htmlFor="edit-task-assignees" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Assignees
          </label>
          <Input
            id="edit-task-assignees"
            value="Assignee selection temporarily unavailable"
            placeholder="Select assignees (optional)"
            error={errors.assigneeIds}
            disabled={true}
            readOnly
          />
        </div>

        {/* Changes Indicator */}
        {hasChanges && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <div className="flex items-center justify-between">
              <p className="text-sm text-blue-600 dark:text-blue-400">
                You have unsaved changes
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={isSubmitting}
              >
                Reset
              </Button>
            </div>
          </div>
        )}

        {/* Submit Error */}
        {errors.submit && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
          </div>
        )}

        {/* Task Info */}
        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Created:</span>
              <p className="font-medium text-gray-900 dark:text-white">
                {new Date(task.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Last Updated:</span>
              <p className="font-medium text-gray-900 dark:text-white">
                {new Date(task.updatedAt).toLocaleDateString()}
              </p>
            </div>
            {task.statistics && (
              <>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Comments:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {task.statistics.totalComments}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Attachments:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {task.statistics.totalAttachments}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-600">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || !hasChanges}
            loading={isSubmitting}
          >
            {isSubmitting $1 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default EditTaskModal;