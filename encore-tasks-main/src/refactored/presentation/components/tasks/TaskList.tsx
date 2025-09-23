import React, { useState, useEffect } from 'react';
import { TaskFilters, CreateTaskData, UpdateTaskData } from '../../../data/types';
import { useTasks } from '../../hooks/useTasks';
import { useAuth } from '../../context/AuthContext';
import TaskCard from './TaskCard';
import TaskFiltersComponent from './TaskFilters';
import CreateTaskModal from './CreateTaskModal';
import { LoadingSpinner, ErrorMessage, EmptyState, Pagination, Button } from '../common';
import { useDebounce } from '../../hooks/useDebounce';

interface TaskListProps {
  columnId$1: string;
  boardId$2: string;
  projectId$3: string;
  showFilters$4: boolean;
  showCreateButton$5: boolean;
  pageSize$6: number;
  className$7: string;
}

const TaskList: React.FC<TaskListProps> = ({
  columnId,
  boardId,
  projectId,
  showFilters = true,
  showCreateButton = true,
  pageSize = 20,
  className = ''
}) => {
  const { user } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  const {
    tasks,
    totalTasks,
    currentPage,
    totalPages,
    isLoading,
    isCreating,
    error,
    filters,
    sort,
    loadTasks,
    createTask,
    updateTask,
    deleteTask,
    archiveTask,
    restoreTask,
    setFilters,
    setSort,
    setPage,
    clearFilters
  } = useTasks({
    columnId,
    boardId,
    projectId,
    autoLoad: true,
    pageSize,
    filters: {
      search: debouncedSearch
    }
  });

  // Update search filter when debounced search changes
  useEffect(() => {
    setFilters({ search: debouncedSearch });
  }, [debouncedSearch, setFilters]);

  const handleCreateTask = async (data: CreateTaskData) => {
    try {
      await createTask(data);
      setShowCreateModal(false);
    } catch (error) {
      // Error is handled by the hook
      console.error('Failed to create task:', error);
    }
  };

  const handleUpdateTask = async (id: string, data: UpdateTaskData) => {
    try {
      await updateTask(id, data);
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteTask(id);
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleArchiveTask = async (id: string) => {
    try {
      await archiveTask(id);
    } catch (error) {
      console.error('Failed to archive task:', error);
    }
  };

  const handleRestoreTask = async (id: string) => {
    try {
      await restoreTask(id);
    } catch (error) {
      console.error('Failed to restore task:', error);
    }
  };

  const handleFiltersChange = (newFilters: Partial<TaskFilters>) => {
    setFilters(newFilters);
  };

  const handleSortChange = (field: string, order: 'asc' | 'desc') => {
    setSort({ field: field as any, order });
  };

  const handlePageChange = (page: number) => {
    setPage(page);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    clearFilters();
  };

  const canCreateTask = user && (
    !columnId || // If no specific column, user can create
    user.role === 'admin' || 
    user.role === 'manager'
  );

  if (error) {
    return (
      <div className={`space-y-4 ${className}`}>
        <ErrorMessage 
          message={error} 
          onRetry={loadTasks}
        />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Tasks
            {totalTasks > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                ({totalTasks} total)
              </span>
            )}
          </h2>
          {(columnId || boardId || projectId) && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {columnId && 'Column tasks'}
              {boardId && !columnId && 'Board tasks'}
              {projectId && !boardId && !columnId && 'Project tasks'}
            </p>
          )}
        </div>
        
        {showCreateButton && canCreateTask && (
          <Button
            variant="primary"
            onClick={() => setShowCreateModal(true)}
            disabled={isCreating}
            loading={isCreating}
          >
            Create Task
          </Button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <TaskFiltersComponent
          filters={filters}
          sortField={sort.field}
          sortOrder={sort.order}
          onFiltersChange={handleFiltersChange}
          onSortChange={handleSortChange}
          onReset={handleResetFilters}
          columnId={columnId}
          boardId={boardId}
          projectId={projectId}
        />
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && tasks.length === 0 && (
        <EmptyState
          icon="📋"
          title="No tasks found"
          description={
            Object.values(filters).some(v => v !== undefined && v !== '' && v !== false)
              $1 "No tasks match your current filters. Try adjusting your search criteria."
              : "No tasks have been created yet. Create your first task to get started."
          }
          action={
            canCreateTask && !Object.values(filters).some(v => v !== undefined && v !== '' && v !== false) $1 {
              label: "Create Task",
              onClick: () => setShowCreateModal(true)
            } : undefined
          }
        />
      )}

      {/* Task Grid */}
      {!isLoading && tasks.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onUpdate={handleUpdateTask}
                onDelete={handleDeleteTask}
                onArchive={handleArchiveTask}
                onRestore={handleRestoreTask}
                showColumn={!columnId}
                showBoard={!boardId && !columnId}
                showProject={!projectId && !boardId && !columnId}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <CreateTaskModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateTask}
          columnId={columnId}
          boardId={boardId}
          projectId={projectId}
        />
      )}
    </div>
  );
};

export default TaskList;