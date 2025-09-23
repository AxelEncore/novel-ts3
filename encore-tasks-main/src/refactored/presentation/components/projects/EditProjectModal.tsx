import React, { useState, useEffect } from 'react';
import { Project, UpdateProjectData } from '../../../data/types';
import { Modal, Button, Input, Textarea, Select } from '../common';
import { ProjectValidator } from '../../../business/validators';

interface EditProjectModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (id: string, data: UpdateProjectData) => Promise<void>;
}

const EditProjectModal: React.FC<EditProjectModalProps> = ({
  project,
  isOpen,
  onClose,
  onSubmit
}) => {
  const [formData, setFormData] = useState<UpdateProjectData>({
    name: project.name,
    description: project.description
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Update form data when project changes
  useEffect(() => {
    setFormData({
      name: project.name,
      description: project.description
    });
    setHasChanges(false);
    setErrors({});
  }, [project]);

  // Check for changes
  useEffect(() => {
    const changed = 
      formData.name !== project.name ||
      formData.description !== project.description;
    setHasChanges(changed);
  }, [formData, project]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate using ProjectValidator.validateUpdate
    const validator = new ProjectValidator();
    const validation = validator.validateUpdate(formData);

    if (!validation.isValid) {
      validation.errors.forEach(error => {
        if (error.field && error.message) {
          newErrors[error.field] = error.message;
        }
      });
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
      await onSubmit(project.id, formData);
      handleClose();
    } catch (error) {
      console.error('Error updating project:', error);
      setErrors({ submit: 'Failed to update project. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: project.name,
      description: project.description
    });
    setErrors({});
    setHasChanges(false);
    onClose();
  };

  const handleInputChange = (field: keyof UpdateProjectData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleReset = () => {
    setFormData({
      name: project.name,
      description: project.description
    });
    setErrors({});
    setHasChanges(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Edit Project: ${project.name}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Project Name */}
        <div>
          <label htmlFor="edit-project-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Project Name *
          </label>
          <Input
            id="edit-project-name"
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Enter project name"
            error={errors.name}
            disabled={isSubmitting}
            autoFocus
          />
        </div>

        {/* Project Description */}
        <div>
          <label htmlFor="edit-project-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <Textarea
            id="edit-project-description"
            value={formData.description || ''}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Enter project description (optional)"
            rows={4}
            error={errors.description}
            disabled={isSubmitting}
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

        {/* Project Info */}
        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Created:</span>
              <p className="font-medium text-gray-900 dark:text-white">
                {new Date(project.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Last Updated:</span>
              <p className="font-medium text-gray-900 dark:text-white">
                {new Date(project.updatedAt).toLocaleDateString()}
              </p>
            </div>
            {project.statistics && (
              <>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Boards:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {project.statistics.totalBoards}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Tasks:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {project.statistics.totalTasks}
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
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export { EditProjectModal };
export default EditProjectModal;