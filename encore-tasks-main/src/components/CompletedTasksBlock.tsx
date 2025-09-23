import React from 'react';
import { Archive, ChevronDown } from 'lucide-react';
import { Task } from '../types';

interface CompletedTasksBlockProps {
  completedTasksCount: number;
  onViewCompleted: () => void;
}

const CompletedTasksBlock: React.FC<CompletedTasksBlockProps> = ({
  completedTasksCount,
  onViewCompleted
}) => {
  if (completedTasksCount === 0) {
    return null;
  }

  return (
    <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
      <button
        onClick={onViewCompleted}
        className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
      >
        <div className="flex items-center gap-2">
          <Archive className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Выполненные задачи
          </span>
          <span className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full">
            {completedTasksCount}
          </span>
        </div>
        <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
      </button>
    </div>
  );
};

export default CompletedTasksBlock;