import React from 'react';
import { Plus } from 'lucide-react';

interface Column {
  id: string | number;
  name?: string;
  title?: string;
  color?: string;
  tasks?: any[];
}

interface KanbanColumnProps {
  column: Column;
  tasks: any[];
  users: any[];
  onTaskCreate: () => void;
  onTaskUpdate: (task: any) => void;
  onTaskDelete: (taskId: number) => void;
  onDragStart: (e: React.DragEvent, type: string, item: any) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  isDragOver: boolean;
}

// Цветовые схемы для колонок в темной теме со стекломорфизмом
const getColumnStyles = (columnName: string | undefined) => {
  if (!columnName) {
    return {
      background: 'bg-gray-500/10 border-gray-500/30',
      header: 'text-gray-300',
      accent: 'bg-gray-500',
    };
  }
  
  const name = columnName.toLowerCase();
  
  if (name.includes('выполнение') || name.includes('todo')) {
    return {
      background: 'bg-gray-500/10 border-gray-500/30',
      header: 'text-gray-300',
      accent: 'bg-gray-500',
    };
  } else if (name.includes('процесс') || name.includes('progress')) {
    return {
      background: 'bg-blue-500/10 border-blue-500/30',
      header: 'text-blue-300',
      accent: 'bg-blue-500',
    };
  } else if (name.includes('проверк') || name.includes('review')) {
    return {
      background: 'bg-purple-500/10 border-purple-500/30',
      header: 'text-purple-300',
      accent: 'bg-purple-500',
    };
  } else if (name.includes('выполнен') || name.includes('done')) {
    return {
      background: 'bg-green-500/10 border-green-500/30',
      header: 'text-green-300',
      accent: 'bg-green-500',
    };
  } else if (name.includes('отложен') || name.includes('deferred') || name.includes('delayed')) {
    return {
      background: 'bg-orange-500/10 border-orange-500/30',
      header: 'text-orange-300',
      accent: 'bg-orange-500',
    };
  }
  
  // По умолчанию серый
  return {
    background: 'bg-gray-500/10 border-gray-500/30',
    header: 'text-gray-300',
    accent: 'bg-gray-500',
  };
};

const KanbanColumnDark: React.FC<KanbanColumnProps> = ({
  column,
  tasks,
  users,
  onTaskCreate,
  onTaskUpdate,
  onTaskDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragOver,
}) => {
  console.log('📋 KanbanColumnDark: Column data:', column);
  const styles = getColumnStyles(column.name || column.title);
  const taskCount = tasks?.length || 0;

  return (
    <div
      className={`flex-shrink-0 w-80 h-full backdrop-blur-sm border rounded-xl transition-all duration-200 ${
        isDragOver 
          ? 'bg-white/20 border-white/40 shadow-lg' 
          : `${styles.background} ${styles.background.includes('border-') ? '' : 'border-white/10'}`
      }`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${styles.accent}`}></div>
            <h3 className={`font-semibold text-lg ${styles.header}`}>
              {column.name || column.title || 'Колонка'}
            </h3>
            <span className="bg-white/10 text-white/70 text-xs px-2 py-1 rounded-full">
              {taskCount}
            </span>
          </div>
        </div>
      </div>

      {/* Tasks Container */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-3 min-h-[200px]">
          {tasks && tasks.length > 0 ? (
            tasks.map((task) => (
              <div
                key={task.id}
                className="p-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg hover:bg-white/10 transition-all duration-200 cursor-move"
                draggable
                onDragStart={(e) => onDragStart(e, 'task', task)}
                onDragEnd={onDragEnd}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-white font-medium text-sm leading-tight">
                    {task.title || task.name || 'Без названия'}
                  </h4>
                </div>
                
                {task.description && (
                  <p className="text-gray-300 text-xs mb-2 line-clamp-2">
                    {task.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {task.priority && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        task.priority === 'high' 
                          ? 'bg-red-500/20 text-red-300' 
                          : task.priority === 'medium'
                          ? 'bg-yellow-500/20 text-yellow-300'
                          : 'bg-gray-500/20 text-gray-300'
                      }`}>
                        {task.priority}
                      </span>
                    )}
                  </div>
                  
                  {task.assignees && task.assignees.length > 0 && (
                    <div className="flex -space-x-2">
                      {task.assignees.slice(0, 3).map((assignee: any, index: number) => (
                        <div
                          key={assignee.id || index}
                          className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium ring-2 ring-gray-800"
                          title={assignee.name || assignee.username || 'User'}
                        >
                          {(assignee.name || assignee.username || 'U')[0].toUpperCase()}
                        </div>
                      ))}
                      {task.assignees.length > 3 && (
                        <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-white text-xs font-medium ring-2 ring-gray-800">
                          +{task.assignees.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div 
              className={`flex items-center justify-center h-32 border-2 border-dashed rounded-lg transition-all ${
                isDragOver 
                  ? 'border-white/40 bg-white/5' 
                  : 'border-white/20'
              }`}
            >
              <div className="text-center">
                <div className="text-2xl mb-2">📝</div>
                <p className="text-gray-400 text-sm">
                  {isDragOver ? 'Отпустите задачу здесь' : 'Перетащите задачу сюда'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Add Task Button */}
        <button
          onClick={onTaskCreate}
          className="w-full mt-4 p-3 border-2 border-dashed border-white/20 rounded-lg text-gray-400 hover:border-white/40 hover:text-white hover:bg-white/5 transition-all duration-200 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm">Добавить задачу</span>
        </button>
      </div>
    </div>
  );
};

export default KanbanColumnDark;