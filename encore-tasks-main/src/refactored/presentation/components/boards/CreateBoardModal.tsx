import React, { useState, useEffect } from 'react';
import { CreateBoardData } from '../../../data/types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Textarea } from '../common/Textarea';
import { Select } from '../common/Select';
import { BoardValidator } from '../../../business/validators';
import { useProjects } from '../../hooks/useProjects';

interface CreateBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateBoardData) => Promise<void>;
  projectId$1: string;
  isSubmitting$2: boolean;
}

const CreateBoardModal: React.FC<CreateBoardModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  projectId,
  isSubmitting = false
}) => {
  const [formData, setFormData] = useState<CreateBoardData>({
    name: '',
    description: '',
    projectId: projectId || ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Load projects for selection if no projectId is provided
  const { projects, loadProjects } = useProjects({ 
    autoLoad: !projectId,
    pageSize: 100 // Load more projects for selection
  });
  
  useEffect(() => {
    if (isOpen && !projectId) {
      loadProjects();
    }
  }, [isOpen, projectId, loadProjects]);
  
  useEffect(() => {
    if (projectId) {
      setFormData(prev => ({ ...prev, projectId }));
    }
  }, [projectId]);
  
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

    try {
      await onSubmit(formData);
      handleClose();
    } catch (error) {
      console.error('Error creating board:', error);
      setErrors({ submit: 'Failed to create board. Please try again.' });
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      projectId: projectId || ''
    });
    setErrors({});
    onClose();
  };

  const handleInputChange = (field: keyof CreateBoardData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Board"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Board Name */}
        <div>
          <label htmlFor="board-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Board Name *
          </label>
          <Input
            id="board-name"
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
          <label htmlFor="board-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <Textarea
            id="board-description"
            value={formData.description || ''}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Enter board description (optional)"
            rows={4}
            error={errors.description}
            disabled={isSubmitting}
          />
        </div>

        {/* Project Selection */}
        {!projectId && (
          <div>
            <label htmlFor="board-project" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Project *
            </label>
            <Select
              id="board-project"
              value={formData.projectId}
              onChange={(value) => handleInputChange('projectId', value)}
              options={projectOptions}
              placeholder="Select a project"
              error={errors.projectId}
              disabled={isSubmitting}
            />
            {projectOptions.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                No projects available. Create a project first.
              </p>
            )}
          </div>
        )}

        {/* Project Info (when projectId is provided) */}
        {projectId && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                This board will be created in the current project.
              </p>
            </div>
          </div>
        )}

        {/* Submit Error */}
        {errors.submit && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
          </div>
        )}

        {/* Default Columns Info */}
        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Default Columns
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your new board will be created with default columns: &quot;To Do&quot;, &quot;In Progress&quot;, and &quot;Done&quot;. You can customize these after creation.
              </p>
            </div>
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
            disabled={isSubmitting || (!projectId && projectOptions.length === 0)}
            loading={isSubmitting}
          >
            {isSubmitting $1 'Creating...' : 'Create Board'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateBoardModal;