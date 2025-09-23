import React from 'react';
import { ProjectStatus, ProjectSortBy, SortOrder } from '../../../data/types';
import { Button, Select, Input } from '../common';

interface ProjectFiltersProps {
  filters: {
    status?: ProjectStatus;
    search?: string;
    sortBy?: ProjectSortBy;
    sortOrder?: SortOrder;
    showArchived?: boolean;
  };
  onFiltersChange: (filters: Partial<ProjectFiltersProps['filters']>) => void;
  onReset: () => void;
}

const ProjectFilters: React.FC<ProjectFiltersProps> = ({
  filters,
  onFiltersChange,
  onReset
}) => {
  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'on_hold', label: 'On Hold' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const sortByOptions = [
    { value: 'name', label: 'Name' },
    { value: 'created_at', label: 'Created Date' },
    { value: 'updated_at', label: 'Updated Date' },
    { value: 'status', label: 'Status' },
    { value: 'member_count', label: 'Member Count' }
  ];

  const sortOrderOptions = [
    { value: 'asc', label: 'Ascending' },
    { value: 'desc', label: 'Descending' }
  ];

  const hasActiveFilters = 
    filters.status ||
    filters.search ||
    filters.showArchived ||
    (filters.sortBy && filters.sortBy !== 'updatedAt') ||
    (filters.sortOrder && filters.sortOrder !== 'desc');

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Search projects..."
            value={filters.search || ''}
            onChange={(e) => onFiltersChange({ search: e.target.value })}
            className="w-full"
            icon={
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
          />
        </div>

        {/* Status Filter */}
        <div className="w-full lg:w-48">
          <Select
            value={filters.status || ''}
            onChange={(value) => onFiltersChange({ status: value as ProjectStatus || undefined })}
            options={statusOptions}
            placeholder="Filter by status"
          />
        </div>

        {/* Sort By */}
        <div className="w-full lg:w-48">
          <Select
            value={filters.sortBy || 'updated_at'}
            onChange={(value) => onFiltersChange({ sortBy: value as ProjectSortBy })}
            options={sortByOptions}
            placeholder="Sort by"
          />
        </div>

        {/* Sort Order */}
        <div className="w-full lg:w-32">
          <Select
            value={filters.sortOrder || 'desc'}
            onChange={(value) => onFiltersChange({ sortOrder: value as SortOrder })}
            options={sortOrderOptions}
            placeholder="Order"
          />
        </div>

        {/* Show Archived Toggle */}
        <div className="flex items-center">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.showArchived || false}
              onChange={(e) => onFiltersChange({ showArchived: e.target.checked })}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Show Archived
            </span>
          </label>
        </div>

        {/* Reset Button */}
        {hasActiveFilters && (
          <div className="flex items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="whitespace-nowrap"
            >
              Reset Filters
            </Button>
          </div>
        )}
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
          <div className="flex flex-wrap gap-2">
            {filters.status && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                Status: {statusOptions.find(opt => opt.value === filters.status)?.label}
                <button
                  onClick={() => onFiltersChange({ status: undefined })}
                  className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}
            
            {filters.search && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                Search: &quot;{filters.search}&quot;
                <button
                  onClick={() => onFiltersChange({ search: undefined })}
                  className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-green-200 dark:hover:bg-green-800"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}
            
            {filters.showArchived && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                Including Archived
                <button
                  onClick={() => onFiltersChange({ showArchived: false })}
                  className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-yellow-200 dark:hover:bg-yellow-800"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export { ProjectFilters };
export default ProjectFilters;