import React, { useState, useEffect } from 'react';
import { Board, CreateBoardData } from '../../../data/types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Textarea } from '../common/Textarea';
import { Select } from '../common/Select';
import { Checkbox } from '../common/Checkbox';
import { BoardValidator } from '../../../business/validators';
import { useProjects } from '../../hooks/useProjects';

interface DuplicateBoardModalProps {
  board: Board;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateBoardData & { duplicateOptions: DuplicateOptions }) => Promise<void>;
}

export interface DuplicateOptions {
  includeColumns: boolean;
  includeTasks: boolean;
  includeTaskAssignments: boolean;
  includeTaskComments: boolean;
  includeTaskAttachments: boolean;
}

const DuplicateBoardModal: React.FC<DuplicateBoardModalProps> = ({
  board,
  isOpen,
  onClose,
  onSubmit
}) => {
  const [formData, setFormData] = useState<CreateBoardData>({
    name: `${board.name} (Copy)`,
    description: board.description,
    projectId: board.projectId
  });
  
  const [duplicateOptions, setDuplicateOptions] = useState<DuplicateOptions>({
    includeColumns: true,
    includeTasks: true,
    includeTaskAssignments: false,
    includeTaskComments: false,
    includeTaskAttachments: false
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Load projects for selection
  const { projects, loadProjects } = useProjects({ 
    autoLoad: true,
    pageSize: 100
  });
  
  useEffect(() => {
    if (isOpen) {
      loadProjects();
    }
  }, [isOpen, loadProjects]);
  
  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: `${board.name} (Copy)`,
        description: board.description,
        projectId: board.projectId
      });
      setDuplicateOptions({
        includeColumns: true,
        includeTasks: true,
        includeTaskAssignments: false,
        includeTaskComments: false,
        includeTaskAttachments: false
      });
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen, board]);
  
  const projectOptions = projects.map(project => ({
    value: project.id,
    label: project.name
  }));

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate name
    const nameValidation = BoardValidator.validateName(formData.name);
    if (!nameValidation.isValid) {
      newErrors.name = nameValidation.errors[0].message;
    }

    // Validate description (optional)
    if (formData.description) {
      const descValidation = BoardValidator.validateDescription(formData.description);
      if (!descValidation.isValid) {
        newErrors.description = descValidation.errors[0].message;
      }
    }

    // Validate project ID
    if (!formData.projectId) {
      newErrors.projectId = 'Project is required';
    } else {
      const projectValidation = BoardValidator.validateProjectId(formData.projectId);
      if (!projectValidation.isValid) {
        newErrors.projectId = projectValidation.errors[0].message;
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
      await onSubmit({ ...formData, duplicateOptions });
      handleClose();
    } catch (error) {
      console.error('Error duplicating board:', error);
      setErrors({ submit: 'Failed to duplicate board. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: `${board.name} (Copy)`,
      description: board.description,
      projectId: board.projectId
    });
    setDuplicateOptions({
      includeColumns: true,
      includeTasks: true,
      includeTaskAssignments: false,
      includeTaskComments: false,
      includeTaskAttachments: false
    });
    setErrors({});
    setIsSubmitting(false);
    onClose();
  };

  const handleInputChange = (field: keyof CreateBoardData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleOptionChange = (option: keyof DuplicateOptions, checked: boolean) => {
    setDuplicateOptions(prev => {
      const newOptions = { ...prev, [option]: checked };
      
      // If tasks are disabled, disable task-related options
      if (option === 'includeTasks' && !checked) {
        newOptions.includeTaskAssignments = false;
        newOptions.includeTaskComments = false;
        newOptions.includeTaskAttachments = false;
      }
      
      return newOptions;
    });
  };

  const getEstimatedSize = () => {
    if (!board.statistics) return 'Unknown';
    
    let items = 0;
    if (duplicateOptions.includeColumns) items += board.statistics.totalColumns;
    if (duplicateOptions.includeTasks) items += board.statistics.totalTasks;
    
    return `~${items} items`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Duplicate Board: ${board.name}`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Board Name */}
        <div>
          <label htmlFor="duplicate-board-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Board Name *
          </label>
          <Input
            id="duplicate-board-name"
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Enter board name"
            error={errors.name}
            disabled={isSubmitting}
            autoFocus
          />
        </div>

        {/* Board Description */}
        <div>
          <label htmlFor="duplicate-board-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <Textarea
            id="duplicate-board-description"
            value={formData.description || ''}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Enter board description (optional)"
            rows={3}
            error={errors.description}
            disabled={isSubmitting}
          />
        </div>

        {/* Project Selection */}
        <div>
          <label htmlFor="duplicate-board-project" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Project *
          </label>
          <Select
            id="duplicate-board-project"
            value={formData.projectId}
            onChange={(value) => handleInputChange('projectId', value)}
            options={projectOptions}
            placeholder="Select a project"
            error={errors.projectId}
            disabled={isSubmitting}
          />
        </div>

        {/* Duplicate Options */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            What to Include
          </h3>
          
          <div className="space-y-4">
            {/* Include Columns */}
            <div className="flex items-start space-x-3">
              <Checkbox
                id="include-columns"
                checked={duplicateOptions.includeColumns}
                onChange={(checked) => handleOptionChange('includeColumns', checked)}
                disabled={isSubmitting}
              />
              <div className="flex-1">
                <label htmlFor="include-columns" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Include Columns
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Copy all columns and their structure
                </p>
              </div>
            </div>

            {/* Include Tasks */}
            <div className="flex items-start space-x-3">
              <Checkbox
                id="include-tasks"
                checked={duplicateOptions.includeTasks}
                onChange={(checked) => handleOptionChange('includeTasks', checked)}
                disabled={isSubmitting || !duplicateOptions.includeColumns}
              />
              <div className="flex-1">
                <label htmlFor="include-tasks" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Include Tasks
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Copy all tasks (requires columns to be included)
                </p>
              </div>
            </div>

            {/* Task-related options */}
            {duplicateOptions.includeTasks && (
              <div className="ml-6 space-y-3 border-l-2 border-gray-200 dark:border-gray-600 pl-4">
                {/* Include Task Assignments */}
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="include-assignments"
                    checked={duplicateOptions.includeTaskAssignments}
                    onChange={(checked) => handleOptionChange('includeTaskAssignments', checked)}
                    disabled={isSubmitting}
                  />
                  <div className="flex-1">
                    <label htmlFor="include-assignments" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Include Task Assignments
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Copy user assignments to tasks
                    </p>
                  </div>
                </div>

                {/* Include Task Comments */}
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="include-comments"
                    checked={duplicateOptions.includeTaskComments}
                    onChange={(checked) => handleOptionChange('includeTaskComments', checked)}
                    disabled={isSubmitting}
                  />
                  <div className="flex-1">
                    <label htmlFor="include-comments" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Include Task Comments
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Copy all comments and discussions
                    </p>
                  </div>
                </div>

                {/* Include Task Attachments */}
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="include-attachments"
                    checked={duplicateOptions.includeTaskAttachments}
                    onChange={(checked) => handleOptionChange('includeTaskAttachments', checked)}
                    disabled={isSubmitting}
                  />
                  <div className="flex-1">
                    <label htmlFor="include-attachments" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Include Task Attachments
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Copy all file attachments
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Duplication Summary */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
          <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
            Duplication Summary
          </h4>
          <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <p>Estimated size: {getEstimatedSize()}</p>
            {board.statistics && (
              <>
                <p>Original board: {board.statistics.totalColumns} columns, {board.statistics.totalTasks} tasks</p>
                {formData.projectId !== board.projectId && (
                  <p className="text-amber-600 dark:text-amber-400">
                    ⚠️ Board will be duplicated to a different project
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Submit Error */}
        {errors.submit && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
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
            {isSubmitting $1 'Duplicating...' : 'Duplicate Board'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default DuplicateBoardModal;