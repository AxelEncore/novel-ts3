import React, { useState, useEffect } from 'react';
import { CreateTaskData } from '../../../data/types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Textarea } from '../common/Textarea';
import { Select } from '../common/Select';
// DatePicker and UserSelect components don't exist, using alternatives
import { TaskValidator } from '../../../business/validators';
import { useProjects } from '../../hooks/useProjects';
import { useBoards } from '../../hooks/useBoards';
import { useColumns } from '../../hooks/useColumns';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTaskData) => Promise<void>;
  columnId$1: string;
  boardId$2: string;
  projectId$3: string;
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  columnId,
  boardId,
  projectId
}) => {
  const [formData, setFormData] = useState<CreateTaskData>({
    title: '',
    description: '',
    priority: 'medium',
    columnId: columnId || '',
    boardId: boardId || '',
    projectId: projectId || ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Load data for selects
  const { projects } = useProjects({ autoLoad: true, pageSize: 100 });
  const { boards } = useBoards({ 
    projectId: formData.projectId || projectId,
    autoLoad: !boardId,
    pageSize: 100
  });
  const { columns } = useColumns({ 
    boardId: formData.boardId || boardId,
    autoLoad: !columnId,
    pageSize: 100
  });
  
  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        columnId: columnId || '',
        boardId: boardId || '',
        projectId: projectId || ''
      });
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen, columnId, boardId, projectId]);
  
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

    // Validate title
    const titleValidation = TaskValidator.validateTitle(formData.title);
    if (!titleValidation.isValid) {
      newErrors.title = titleValidation.errors[0].message;
    }

    // Validate description (optional)
    if (formData.description) {
      const descValidation = TaskValidator.validateDescription(formData.description);
      if (!descValidation.isValid) {
        newErrors.description = descValidation.errors[0].message;
      }
    }

    // Validate project ID
    if (!formData.projectId) {
      newErrors.projectId = 'Project is required';
    }

    // Validate board ID
    if (!formData.boardId) {
      newErrors.boardId = 'Board is required';
    }

    // Validate column ID
    if (!formData.columnId) {
      newErrors.columnId = 'Column is required';
    }

    // Validate due date (if provided)
    if (formData.dueDate) {
      const dueDateValidation = TaskValidator.validateDueDate(formData.dueDate);
      if (!dueDateValidation.isValid) {
        newErrors.dueDate = dueDateValidation.errors[0].message;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      handleClose();
    } catch (error) {
      console.error('Error creating task:', error);
      setErrors({ submit: 'Failed to create task. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      columnId: columnId || '',
      boardId: boardId || '',
      projectId: projectId || ''
    });
    setErrors({});
    setIsSubmitting(false);
    onClose();
  };

  const handleInputChange = (field: keyof CreateTaskData, value: string | string[] | Date | undefined) => {
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Task"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Task Title */}
        <div>
          <label htmlFor="create-task-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Task Title *
          </label>
          <Input
            id="create-task-title"
            type="text"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="Enter task title"
            error={errors.title}
            disabled={isSubmitting}
            autoFocus
          />
        </div>

        {/* Task Description */}
        <div>
          <label htmlFor="create-task-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <Textarea
            id="create-task-description"
            value={formData.description || ''}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Enter task description (optional)"
            rows={4}
            error={errors.description}
            disabled={isSubmitting}
          />
        </div>

        {/* Priority */}
        <div>
          <label htmlFor="create-task-priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Priority *
          </label>
          <Select
            id="create-task-priority"
            value={formData.priority || 'medium'}
            onChange={(value) => handleInputChange('priority', value)}
            options={priorityOptions}
            error={errors.priority}
            disabled={isSubmitting}
          />
        </div>

        {/* Project, Board, Column Selection */}
        <div className="space-y-4">
          {!projectId && (
            <div>
              <label htmlFor="create-task-project" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Project *
              </label>
              <Select
                id="create-task-project"
                value={formData.projectId || ''}
                onChange={handleProjectChange}
                options={projectOptions}
                placeholder="Select a project"
                error={errors.projectId}
                disabled={isSubmitting}
              />
            </div>
          )}
          
          {!boardId && (
            <div>
              <label htmlFor="create-task-board" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Board *
              </label>
              <Select
                id="create-task-board"
                value={formData.boardId || ''}
                onChange={handleBoardChange}
                options={boardOptions}
                placeholder="Select a board"
                error={errors.boardId}
                disabled={isSubmitting || !formData.projectId}
              />
              {!formData.projectId && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Please select a project first
                </p>
              )}
            </div>
          )}
          
          {!columnId && (
            <div>
              <label htmlFor="create-task-column" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Column *
              </label>
              <Select
                id="create-task-column"
                value={formData.columnId}
                onChange={(value) => handleInputChange('columnId', value)}
                options={columnOptions}
                placeholder="Select a column"
                error={errors.columnId}
                disabled={isSubmitting || !formData.boardId}
              />
              {!formData.boardId && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Please select a board first
                </p>
              )}
            </div>
          )}
        </div>

        {/* Due Date */}
        <div>
          <label htmlFor="create-task-due-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Due Date
          </label>
          <Input
            id="create-task-due-date"
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
        {/* <div>
          <label htmlFor="create-task-assignees" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Assignees
          </label>
          <Input
            id="create-task-assignees"
            type="text"
            value=""
            onChange={() => {}}
            placeholder="Assignee selection not available"
            disabled={true}
          />
        </div> */}

        {/* Submit Error */}
        {errors.submit && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
          </div>
        )}

        {/* Context Information */}
        {(projectId || boardId || columnId) && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
              Task will be created in:
            </h4>
            <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              {projectId && (
                <p>📁 Project: {projects.find(p => p.id === projectId)$1.name || 'Selected project'}</p>
              )}
              {boardId && (
                <p>📋 Board: {boards.find(b => b.id === boardId)$2.name || 'Selected board'}</p>
              )}
              {columnId && (
                <p>📂 Column: {columns.find(c => c.id === columnId)$3.name || 'Selected column'}</p>
              )}
            </div>
          </div>
        )}

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
            disabled={isSubmitting}
            loading={isSubmitting}
          >
            {isSubmitting $1 'Creating...' : 'Create Task'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateTaskModal;