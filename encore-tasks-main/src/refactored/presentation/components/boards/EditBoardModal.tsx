import React, { useState, useEffect } from 'react';
import { Board, UpdateBoardData } from '../../../data/types';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Textarea } from '../common/Textarea';
import { Select } from '../common/Select';
import { BoardValidator } from '../../../business/validators';
import { useProjects } from '../../hooks/useProjects';

interface EditBoardModalProps {
  board: Board;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UpdateBoardData) => Promise<void>;
}

const EditBoardModal: React.FC<EditBoardModalProps> = ({
  board,
  isOpen,
  onClose,
  onSubmit
}) => {
  const [formData, setFormData] = useState<UpdateBoardData>({
    name: board.name,
    description: board.description,
    projectId: board.projectId
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
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
  
  // Update form data when board changes
  useEffect(() => {
    setFormData({
      name: board.name,
      description: board.description,
      projectId: board.projectId
    });
    setHasChanges(false);
    setErrors({});
  }, [board]);

  // Check for changes
  useEffect(() => {
    const changed = 
      formData.name !== board.name ||
      formData.description !== board.description ||
      formData.projectId !== board.projectId;
    setHasChanges(changed);
  }, [formData, board]);
  
  const projectOptions = projects.map(project => ({
    value: project.id,
    label: project.name
  }));

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate name
    const nameValidation = BoardValidator.validateName(formData.name || '');
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
      console.error('Error updating board:', error);
      setErrors({ submit: 'Failed to update board. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: board.name,
      description: board.description,
      projectId: board.projectId
    });
    setErrors({});
    setIsSubmitting(false);
    setHasChanges(false);
    onClose();
  };

  const handleInputChange = (field: keyof UpdateBoardData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleReset = () => {
    setFormData({
      name: board.name,
      description: board.description,
      projectId: board.projectId
    });
    setErrors({});
    setHasChanges(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Edit Board: ${board.name}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Board Name */}
        <div>
          <label htmlFor="edit-board-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Board Name *
          </label>
          <Input
            id="edit-board-name"
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
          <label htmlFor="edit-board-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <Textarea
            id="edit-board-description"
            value={formData.description || ''}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Enter board description (optional)"
            rows={4}
            error={errors.description}
            disabled={isSubmitting}
          />
        </div>

        {/* Project Selection */}
        <div>
          <label htmlFor="edit-board-project" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Project *
          </label>
          <Select
            id="edit-board-project"
            value={formData.projectId || ''}
            onChange={(value) => handleInputChange('projectId', value)}
            options={projectOptions}
            placeholder="Select a project"
            error={errors.projectId}
            disabled={isSubmitting}
          />
          {formData.projectId !== board.projectId && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
              ⚠️ Moving this board to a different project may affect access permissions.
            </p>
          )}
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

        {/* Board Info */}
        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Created:</span>
              <p className="font-medium text-gray-900 dark:text-white">
                {new Date(board.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Last Updated:</span>
              <p className="font-medium text-gray-900 dark:text-white">
                {new Date(board.updatedAt).toLocaleDateString()}
              </p>
            </div>
            {board.statistics && (
              <>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Columns:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {board.statistics.totalColumns}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Tasks:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {board.statistics.totalTasks}
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

export default EditBoardModal;