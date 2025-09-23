import React from 'react';
import { X, Calendar, Flag } from 'lucide-react';

interface QuickTaskModalProps {
  task: any;
  onClose: () => void;
}

const QuickTaskModal: React.FC<QuickTaskModalProps> = ({ task, onClose }) => {
  const dueRaw = task.due_date || task.dueDate || task.deadline;
  const due = dueRaw ? new Date(dueRaw) : null;
  const msLeft = due ? (due.getTime() - Date.now()) : null;
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const dueCls = !due ? 'text-gray-300' : (msLeft! <= 0 || msLeft! < ONE_DAY) ? 'text-red-300' : (msLeft! < 2 * ONE_DAY) ? 'text-yellow-300' : 'text-gray-300';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-dark w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white">{task.title || 'Задача'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          {task.description && (
            <p className="text-sm text-gray-300 whitespace-pre-wrap">{task.description}</p>
          )}

          <div className="flex flex-wrap gap-3 text-sm">
            <div className="inline-flex items-center gap-2 px-2 py-1 rounded bg-white/5 border border-white/10">
              <Flag className="w-4 h-4 text-gray-400" />
              <span className="text-gray-300">Приоритет:</span>
              <span className="text-gray-200 font-medium">{String(task.priority || '').toUpperCase() || '—'}</span>
            </div>

            {due && (
              <div className={`inline-flex items-center gap-2 px-2 py-1 rounded bg-white/5 border border-white/10 ${dueCls}`}>
                <Calendar className="w-4 h-4" />
                <span>Дедлайн:</span>
                <span className="font-medium">{due.toLocaleString('ru-RU')}</span>
              </div>
            )}
          </div>

          {/* Assignees */}
          {Array.isArray(task.assignees) && task.assignees.length > 0 && (
            <div>
              <div className="text-xs text-gray-400 mb-2">Исполнители</div>
              {task.assignees.length === 1 ? (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium ring-2 ring-gray-800">
                    {(task.assignees[0].name || task.assignees[0].username || 'U')[0].toUpperCase()}
                  </div>
                  <span className="text-sm text-gray-200">{task.assignees[0].name || task.assignees[0].username || 'Без имени'}</span>
                </div>
              ) : (
                <div className="flex -space-x-2">
                  {task.assignees.slice(0, 8).map((a: any, idx: number) => (
                    <div key={a.id || idx} className="w-7 h-7 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium ring-2 ring-gray-800" title={a.name || a.username || 'User'}>
                      {(a.name || a.username || 'U')[0].toUpperCase()}
                    </div>
                  ))}
                  {task.assignees.length > 8 && (
                    <div className="w-7 h-7 rounded-full bg-gray-600 flex items-center justify-center text-white text-[10px] font-medium ring-2 ring-gray-800">
                      +{task.assignees.length - 8}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickTaskModal;
