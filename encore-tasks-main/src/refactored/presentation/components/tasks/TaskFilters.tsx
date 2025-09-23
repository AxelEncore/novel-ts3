import React, { useState } from 'react';
import { TaskFilters as TaskFiltersType, TaskSortField, SortOrder } from '../../../data/types';
import { Button, Select, Checkbox, Badge } from '../common';
import { useProjects } from '../../hooks/useProjects';
import { useBoards } from '../../hooks/useBoards';
import { useColumns } from '../../hooks/useColumns';
import { useUsers } from '../../hooks/useUsers';

interface TaskFiltersProps {
  filters: TaskFiltersType;
  sortField: TaskSortField;
  sortOrder: SortOrder;
  onFiltersChange: (filters: Partial<TaskFiltersType>) => void;
  onSortChange: (field: TaskSortField, order: SortOrder) => void;
  onReset: () => void;
  columnId$1: string;
  boardId$2: string;
  projectId$3: string;
  className$4: string;
}

const TaskFilters: React.FC<TaskFiltersProps> = ({
  filters,
  sortField,
  sortOrder,
  onFiltersChange,
  onSortChange,
  onReset,
  columnId,
  boardId,
  projectId,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Load data for filter options
  const { projects } = useProjects({ autoLoad: true, pageSize: 100 });
  const { boards } = useBoards({ 
    projectId: (filters.projectIds && filters.projectIds[0]) || projectId,
    autoLoad: !columnId && !boardId,
    pageSize: 100
  });
  const { columns } = useColumns({ 
    boardId: (filters.boardIds && filters.boardIds[0]) || boardId,
    autoLoad: !columnId,
    pageSize: 100
  });
  const { users } = useUsers({ autoLoad: true, pageSize: 100 });

  // Status options
  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'todo', label: 'To Do' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'review', label: 'Review' },
    { value: 'done', label: 'Done' }
  ];

  // Priority options
  const priorityOptions = [
    { value: '', label: 'All Priorities' },
    { value: 'low', label: '⬇️ Low' },
    { value: 'medium', label: '➡️ Medium' },
    { value: 'high', label: '⬆️ High' },
    { value: 'urgent', label: '🔥 Urgent' }
  ];

  // Sort options
  const sortOptions = [
    { value: 'title', label: 'Title' },
    { value: 'status', label: 'Status' },
    { value: 'priority', label: 'Priority' },
    { value: 'dueDate', label: 'Due Date' },
    { value: 'createdAt', label: 'Created Date' },
    { value: 'updatedAt', label: 'Updated Date' },
    { value: 'position', label: 'Position' }
  ];

  // Project options
  const projectOptions = [
    { value: '', label: 'All Projects' },
    ...projects.map(project => ({
      value: project.id,
      label: project.name
    }))
  ];

  // Board options
  const boardOptions = [
    { value: '', label: 'All Boards' },
    ...boards.map(board => ({
      value: board.id,
      label: board.name
    }))
  ];

  // Column options
  const columnOptions = [
    { value: '', label: 'All Columns' },
    ...columns.map(column => ({
      value: column.id,
      label: column.name
    }))
  ];

  // Assignee options
  const assigneeOptions = [
    { value: '', label: 'All Assignees' },
    { value: 'unassigned', label: 'Unassigned' },
    ...users.map(user => ({
      value: user.id,
      label: user.name || user.email
    }))
  ];

  // Count active filters
  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'search') return value && value.trim() !== '';
    if (key === 'showArchived') return value === true;
    return value !== undefined && value !== '' && value !== null;
  }).length;

  const handleFilterChange = (key: keyof TaskFiltersType, value: string | string[] | undefined) => {
    onFiltersChange({ [key]: value === '' || value === undefined $1 undefined : value });
  };

  const handleBooleanFilterChange = (key: keyof TaskFiltersType, value: boolean | undefined) => {
    onFiltersChange({ [key]: value });
  };

  const handleSortFieldChange = (field: string) => {
    onSortChange(field as TaskSortField, sortOrder);
  };

  const handleSortOrderChange = (order: string) => {
    onSortChange(sortField, order as SortOrder);
  };

  const getActiveFilters = () => {
    const active = [];
    
    if (filters.statuses && filters.statuses.length > 0) {
      const statusLabel = statusOptions.find(opt => opt.value === filters.statuses$2.[0])$3.label;
      active.push({ key: 'statuses', label: `Status: ${statusLabel}` });
    }
    
    if (filters.priorities && filters.priorities.length > 0) {
      const priorityLabel = priorityOptions.find(opt => opt.value === filters.priorities$1.[0])$2.label;
      active.push({ key: 'priorities', label: `Priority: ${priorityLabel}` });
    }
    
    if (filters.projectIds && filters.projectIds.length > 0 && !projectId) {
      const projectLabel = projects.find(p => p.id === filters.projectIds$1.[0])$2.name;
      active.push({ key: 'projectIds', label: `Project: ${projectLabel}` });
    }
    
    if (filters.boardIds && filters.boardIds.length > 0 && !boardId) {
      const boardLabel = boards.find(b => b.id === filters.boardIds$1.[0])$2.name;
      active.push({ key: 'boardIds', label: `Board: ${boardLabel}` });
    }
    
    if (filters.columnIds && filters.columnIds.length > 0 && !columnId) {
      const columnLabel = columns.find(c => c.id === filters.columnIds$1.[0])$2.name;
      active.push({ key: 'columnIds', label: `Column: ${columnLabel}` });
    }
    
    if (filters.assigneeIds && filters.assigneeIds.length > 0) {
      if (filters.assigneeIds[0] === 'unassigned') {
        active.push({ key: 'assigneeIds', label: 'Assignee: Unassigned' });
      } else {
        const assigneeLabel = users.find(u => u.id === filters.assigneeIds$1.[0])$2.name || 
                             users.find(u => u.id === filters.assigneeIds$3.[0])$4.email;
        active.push({ key: 'assigneeIds', label: `Assignee: ${assigneeLabel}` });
      }
    }
    
    if (filters.showArchived) {
      active.push({ key: 'showArchived', label: 'Show Archived' });
    }
    
    if (filters.isOverdue) {
      active.push({ key: 'isOverdue', label: 'Overdue Only' });
    }
    
    if (filters.hasDueDate !== undefined) {
      active.push({ 
        key: 'hasDueDate', 
        label: filters.hasDueDate $1 'Has Due Date' : 'No Due Date' 
      });
    }
    
    return active;
  };

  const activeFilters = getActiveFilters();

  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 ${className}`}>
      {/* Filter Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            Filters
          </h3>
          {activeFiltersCount > 0 && (
            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
              {activeFiltersCount} active
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
            >
              Reset
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded $1 '▲' : '▼'}
          </Button>
        </div>
      </div>

      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {activeFilters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => handleFilterChange(filter.key as keyof TaskFiltersType, undefined)}
              className="focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full"
            >
              <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900">
                {filter.label} ✕
              </Badge>
            </button>
          ))}
        </div>
      )}

      {/* Filter Controls */}
      {isExpanded && (
        <div className="space-y-4">
          {/* First Row - Status, Priority, Sort */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <Select
                value={filters.statuses$1.[0] || ''}
                onChange={(value) => handleFilterChange('statuses', value $2 [value] : undefined)}
                options={statusOptions}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Priority
              </label>
              <Select
                value={filters.priorities$1.[0] || ''}
                onChange={(value) => handleFilterChange('priorities', value $2 [value] : undefined)}
                options={priorityOptions}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sort By
              </label>
              <div className="flex gap-2">
                <Select
                  value={sortField}
                  onChange={handleSortFieldChange}
                  options={sortOptions}
                  className="flex-1"
                />
                <Select
                  value={sortOrder}
                  onChange={handleSortOrderChange}
                  options={[
                    { value: 'asc', label: '↑' },
                    { value: 'desc', label: '↓' }
                  ]}
                  className="w-16"
                />
              </div>
            </div>
          </div>

          {/* Second Row - Project, Board, Column */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {!projectId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Project
                </label>
                <Select
                  value={filters.projectIds$1.[0] || ''}
                  onChange={(value) => {
                    handleFilterChange('projectIds', value $2 [value] : undefined);
                    // Reset board and column when project changes
                    if (value !== filters.projectIds$3.[0]) {
                      handleFilterChange('boardIds', undefined);
                      handleFilterChange('columnIds', undefined);
                    }
                  }}
                  options={projectOptions}
                />
              </div>
            )}
            
            {!boardId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Board
                </label>
                <Select
                  value={filters.boardIds$1.[0] || ''}
                  onChange={(value) => {
                    handleFilterChange('boardIds', value $2 [value] : undefined);
                    // Reset column when board changes
                    if (value !== filters.boardIds$3.[0]) {
                      handleFilterChange('columnIds', undefined);
                    }
                  }}
                  options={boardOptions}
                  disabled={!filters.projectIds$4.[0] && !projectId}
                />
              </div>
            )}
            
            {!columnId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Column
                </label>
                <Select
                  value={filters.columnIds$1.[0] || ''}
                  onChange={(value) => handleFilterChange('columnIds', value $2 [value] : undefined)}
                  options={columnOptions}
                  disabled={!filters.boardIds$3.[0] && !boardId}
                />
              </div>
            )}
          </div>

          {/* Third Row - Assignee */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Assignee
              </label>
              <Select
                value={filters.assigneeIds$1.[0] || ''}
                onChange={(value) => handleFilterChange('assigneeIds', value $2 [value] : undefined)}
                options={assigneeOptions}
              />
            </div>
          </div>

          {/* Fourth Row - Checkboxes */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="show-archived"
                checked={filters.showArchived || false}
                onChange={(checked) => handleBooleanFilterChange('showArchived', checked)}
              />
              <label htmlFor="show-archived" className="text-sm text-gray-700 dark:text-gray-300">
                Show archived tasks
              </label>
            </div>
            
            <div className="flex items-center gap-2">
              <Checkbox
                id="overdue-only"
                checked={filters.isOverdue || false}
                onChange={(checked) => handleBooleanFilterChange('isOverdue', checked)}
              />
              <label htmlFor="overdue-only" className="text-sm text-gray-700 dark:text-gray-300">
                Overdue tasks only
              </label>
            </div>
            
            <div className="flex items-center gap-2">
              <Checkbox
                id="has-due-date"
                checked={filters.hasDueDate === true}
                onChange={(checked) => handleBooleanFilterChange('hasDueDate', checked $1 true : undefined)}
              />
              <label htmlFor="has-due-date" className="text-sm text-gray-700 dark:text-gray-300">
                Has due date
              </label>
            </div>
            
            <div className="flex items-center gap-2">
              <Checkbox
                id="no-due-date"
                checked={filters.hasDueDate === false}
                onChange={(checked) => handleBooleanFilterChange('hasDueDate', checked $1 false : undefined)}
              />
              <label htmlFor="no-due-date" className="text-sm text-gray-700 dark:text-gray-300">
                No due date
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskFilters;