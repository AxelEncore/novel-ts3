import React, { useState, useEffect } from 'react';
import { Plus, MoreHorizontal, Edit, Trash2, Users } from 'lucide-react';
import { Board, Column, Task, User } from '@/types';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';
import KanbanColumnDark from './KanbanColumnDark';
import CreateTaskModal from './CreateTaskModal';
import { TaskModal } from './TaskModal';

interface KanbanBoardProps {
  board: Board;
  onTaskUpdate?: () => void;
  onColumnUpdate?: () => void;
}

interface DragState {
  draggedTask: Task | null;
  draggedColumn: Column | null;
  dragOverColumn: string | null;
  dragOverTask: string | null;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({
  board,
  onTaskUpdate,
  onColumnUpdate,
}) => {
  const { user, users } = useApp();
  const [projectMembers, setProjectMembers] = useState<User[]>([]);
  
  // Функция для соответствия колонок со статусами задач
  const getColumnStatusMapping = (columns: Column[]) => {
    const mapping: Record<string, string> = {};
    columns.forEach(column => {
      if (column.status) {
        mapping[column.id] = column.status;
      } else {
        // Определяем статус по названию колонки (для обратной совместимости)
        // Проверяем и name, и title (в БД может быть title)
        const columnName = column.name || column.title || '';
        if (columnName) {
          const name = columnName.toLowerCase();
          if (name.includes('выполнению') || name.includes('todo')) {
            mapping[column.id] = 'todo';
          } else if (name.includes('работе') || name.includes('progress') || name.includes('процессе')) {
            mapping[column.id] = 'in_progress';
          } else if (name.includes('проверк') || name.includes('review')) {
            mapping[column.id] = 'review';
          } else if (name.includes('выполнено') || name.includes('done')) {
            mapping[column.id] = 'done';
          } else if (name.includes('отложено') || name.includes('deferred') || name.includes('отложен')) {
            mapping[column.id] = 'deferred';
          } else {
            // По умолчанию - todo
            mapping[column.id] = 'todo';
          }
        } else {
          // Если нет названия - устанавливаем todo по умолчанию
          mapping[column.id] = 'todo';
        }
      }
    });
    return mapping;
  };
  
  // Проверка наличия доски
  if (!board) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Доска не найдена
      </div>
    );
  }
  
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<Column | null>(null);
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  
  // Получаем соответствие колонок со статусами
  const statusMapping = getColumnStatusMapping(columns);
  
  // Получаем задачи для конкретной колонки
  // Доверяем серверу: /api/tasks?column_id=... уже возвращает задачи колонки
  const getTasksForColumn = (column: Column) => {
    return column.tasks || [];
  };
  const [dragState, setDragState] = useState<DragState>({
    draggedTask: null,
    draggedColumn: null,
    dragOverColumn: null,
    dragOverTask: null,
  });

  // Загрузка членов проекта
  const loadProjectMembers = async () => {
    try {
      // Находим project_id через board
      const boardResponse = await fetch(`/api/boards/${board.id}`, {
        credentials: 'include'
      });
      
      if (!boardResponse.ok) {
        console.error('Не удалось загрузить информацию о доске');
        return;
      }
      
      const boardData = await boardResponse.json();
      const projectId = boardData.data?.project_id || boardData.project_id;
      
      if (!projectId) {
        console.error('Project ID не найден для доски:', boardData);
        return;
      }
      
      // Загружаем членов проекта
      const membersResponse = await fetch(`/api/projects/${projectId}/members`, {
        credentials: 'include'
      });
      
      if (membersResponse.ok) {
        const membersData = await membersResponse.json();
        const members = membersData.members || membersData.data || [];
        
        // Преобразуем данные в формат User
        const formattedMembers = members.map((member: any) => ({
          id: member.user_id || member.id,
          name: member.name || member.user_name || 'Unknown',
          email: member.email || member.user_email || '',
          role: member.role || 'member',
          isApproved: true,
          created_at: member.joined_at || new Date().toISOString(),
          updated_at: member.joined_at || new Date().toISOString()
        }));
        
        setProjectMembers(formattedMembers);
        console.log('Загружено членов проекта:', formattedMembers.length);
      }
    } catch (error) {
      console.error('Ошибка загрузки членов проекта:', error);
    }
  };
  
  // Загрузка колонок и задач для доски через API
  const loadColumns = async () => {
    try {
      setLoading(true);
      console.log('💯 KanbanBoard: Loading columns for board:', board.id);
      
      const response = await fetch(`/api/columns?boardId=${board.id}`, {
        credentials: 'include'
      });
      
      const data = await response.json();
      console.log('💯 KanbanBoard: Columns API response:', data);
      
      if (response.ok && data.columns) {
        // Загружаем задачи для каждой колонки
        const columnsWithTasks = await Promise.all(
          data.columns.map(async (column: Column) => {
            try {
              const tasksResponse = await fetch(
                `/api/columns/${column.id}/tasks`,
                { credentials: 'include' }
              );
              
              if (tasksResponse.ok) {
                const tasksData = await tasksResponse.json();
                const tasks = tasksData.tasks || tasksData.data?.tasks || [];
                console.log(`Loaded ${tasks.length} tasks for column ${column.title || column.name}`);
                return {
                  ...column,
                  tasks
                };
              } else {
                console.error(`Failed to load tasks for column ${column.id}`);
                return {
                  ...column,
                  tasks: []
                };
              }
            } catch (error) {
              console.error(`Error loading tasks for column ${column.id}:`, error);
              return {
                ...column,
                tasks: []
              };
            }
          })
        );
        
        setColumns(columnsWithTasks);
        console.log('✅ KanbanBoard: Loaded', columnsWithTasks.length, 'columns with tasks');
      } else {
        console.error('❌ KanbanBoard: Failed to load columns:', data.error);
        toast.error(data.error || 'Ошибка при загрузке колонок');
      }
    } catch (error) {
      console.error('❌ KanbanBoard: Error loading columns:', error);
      toast.error('Ошибка при загрузке колонок доски');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadColumns();
    loadProjectMembers();
  }, [board.id]);

  // Обработка создания новой задачи
  const handleTaskCreated = async (newTask: Task, columnId: string) => {
    // Обновляем статус задачи на основе колонки
    const column = columns.find(col => col.id === columnId);
    const correctStatus = column ? statusMapping[column.id] : newTask.status;
    const taskWithCorrectStatus = {
      ...newTask,
      status: correctStatus
    };
    
    setColumns(prev => prev.map(col => {
      if (col.id === columnId) {
        return {
          ...col,
          tasks: [...(col.tasks || []), taskWithCorrectStatus]
        };
      }
      return col;
    }));
    
    // Перезагружаем колонки чтобы получить актуальные данные из БД
    setTimeout(() => {
      loadColumns();
    }, 500);
    
    if (onTaskUpdate) {
      onTaskUpdate();
    }
  };


  // Обработка обновления задачи
  const handleTaskUpdated = (updatedTask: Task) => {
    setColumns(prev => prev.map(col => ({
      ...col,
      tasks: (col.tasks || []).map(task => 
        task.id === updatedTask.id ? updatedTask : task
      )
    })));
    
    if (onTaskUpdate) {
      onTaskUpdate();
    }
  };

  // Обработка удаления задачи
  const handleTaskDeleted = (taskId: string) => {
    setColumns(prev => prev.map(col => ({
      ...col,
      tasks: (col.tasks || []).filter(task => task.id !== taskId)
    })));
    
    if (onTaskUpdate) {
      onTaskUpdate();
    }
  };


  // Поиск id колонки по целевому статусу с учетом локализации
  const findTargetColumnIdForStatus = (targetStatus: 'done' | 'review'): string | null => {
    // Подбираем безопасные релевантные паттерны без ложных срабатываний
    // ВАЖНО: не использовать "выполнен" (попадает в "к выполнению")
    const synonyms = targetStatus === 'done'
      ? ['выполнено', 'готово', 'готов', 'done']
      : ['проверке', 'на проверке', 'review'];

    const found = columns.find(col => {
      const mapped = statusMapping[col.id];
      if (mapped === targetStatus) return true;
      const name = (col.name || col.title || '').toLowerCase().trim();
      // Ищем точные слова или устойчивые формы, а не подстроки вида "выполнен"
      return synonyms.some(s => name === s || name.includes(` ${s}`) || name.startsWith(`${s} `) || name.endsWith(` ${s}`));
    });

    return found ? String(found.id) : null;
  };

  // Обработка клика по галочке (toggle)
  const handleTaskComplete = async (task: Task) => {
    try {
      const sourceColumn = columns.find(col => col.tasks?.some(t => t.id === task.id));
      const currentStatus = String((task as any).status || (task as any).Status || '').toLowerCase();
      const toggleTo: 'done' | 'review' = currentStatus === 'done' ? 'review' : 'done';

      const targetColumnId = findTargetColumnIdForStatus(toggleTo) || (sourceColumn ? String(sourceColumn.id) : String((task as any).column_id || (task as any).columnId || ''));

      const updateData: any = { status: toggleTo };
      if (targetColumnId) updateData.columnId = targetColumnId;

      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(err || 'Failed to update task status');
      }

      const updatedTask = await response.json();

      // Перемещаем задачу локально между колонками при необходимости
      setColumns(prev => {
        const next = prev.map(col => ({ ...col }));
        const fromIdx = sourceColumn ? next.findIndex(c => c.id === sourceColumn.id) : -1;
        const toIdx = next.findIndex(c => String(c.id) === String(targetColumnId));

        // убрать из источника
        if (fromIdx !== -1) {
          next[fromIdx] = {
            ...next[fromIdx],
            tasks: (next[fromIdx].tasks || []).filter((t: any) => t.id !== task.id)
          };
        }

        // добавить в цель (или обновить в исходной, если цель не найдена)
        if (toIdx !== -1) {
          next[toIdx] = {
            ...next[toIdx],
            tasks: [...(next[toIdx].tasks || []), { ...task, ...updatedTask }]
          };
        } else if (fromIdx !== -1) {
          next[fromIdx] = {
            ...next[fromIdx],
            tasks: (next[fromIdx].tasks || []).map((t: any) => t.id === task.id ? { ...t, ...updatedTask } : t)
          };
        }
        return next;
      });

      if (onTaskUpdate) onTaskUpdate();
    } catch (error) {
      console.error('Ошибка при переключении статуса задачи:', error);
      toast.error('Не удалось обновить статус задачи');
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (
    e: React.DragEvent,
    type: 'task' | 'column',
    item: Task | Column
  ) => {
    if (type === 'task') {
      setDragState(prev => ({ ...prev, draggedTask: item as Task }));
    } else {
      setDragState(prev => ({ ...prev, draggedColumn: item as Column }));
    }
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragState(prev => ({ ...prev, dragOverColumn: columnId }));
  };

  const handleDragEnd = () => {
    setDragState({
      draggedTask: null,
      draggedColumn: null,
      dragOverColumn: null,
      dragOverTask: null,
    });
  };

  const handleDrop = async (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    
    const { draggedTask, draggedColumn } = dragState;
    
    if (draggedTask) {
      // Перемещение задачи между колонками
      const sourceColumn = columns.find(col => 
        col.tasks?.some(task => task.id === draggedTask.id)
      );
      
      if (sourceColumn && sourceColumn.id !== targetColumnId) {
        try {
          // Получаем новый статус на основе колонки
          const targetColumn = columns.find(col => col.id === targetColumnId);
          const newStatus = targetColumn ? statusMapping[targetColumn.id] : draggedTask.status;
          
          // Обновляем задачу на сервере
          const updateData = {
            columnId: targetColumnId,
            status: newStatus
          };
          
          const response = await fetch(`/api/tasks/${draggedTask.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(updateData)
          });
          
          if (!response.ok) {
            throw new Error('Failed to update task');
          }
          
          const updatedTask = await response.json();
          
          // Обновляем локальное состояние
          const taskWithUpdatedStatus = {
            ...draggedTask,
            column_id: targetColumnId,
            status: newStatus
          };
          
          setColumns(prev => prev.map(col => {
            if (col.id === sourceColumn.id) {
              return {
                ...col,
                tasks: (col.tasks || []).filter(task => task.id !== draggedTask.id)
              };
            }
            if (col.id === targetColumnId) {
              return {
                ...col,
                tasks: [...(col.tasks || []), taskWithUpdatedStatus]
              };
            }
            return col;
          }));
          
          if (onTaskUpdate) {
            onTaskUpdate();
          }
          
        } catch (error) {
          console.error('Ошибка при перемещении задачи:', error);
          toast.error('Ошибка при перемещении задачи');
        }
      }
    }
    
    handleDragEnd();
  };

  // Открытие модального окна создания задачи
  const handleCreateTask = (column: Column) => {
    setSelectedColumn(column);
    setShowCreateTask(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="h-full p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{board.name}</h1>
          {board.description && (
            <p className="text-gray-400 mt-1">{board.description}</p>
          )}
        </div>
        
        {/* Колонки создаются автоматически при создании доски */}
        <div className="text-gray-400 text-sm">
          Колонки созданы автоматически
        </div>
      </div>

      {/* Columns */}
      <div className="flex space-x-4 overflow-x-auto pb-4 h-full">
        {columns.map((column) => {
          const columnTasks = getTasksForColumn(column);
          return (
              <KanbanColumnDark
              key={column.id}
              column={column}
              tasks={columnTasks}
              users={projectMembers.length > 0 ? projectMembers : users}
              onTaskCreate={() => handleCreateTask(column)}
              onTaskUpdate={handleTaskUpdated}
              onTaskDelete={handleTaskDeleted}
              onTaskComplete={(task) => handleTaskComplete(task)}
              onTaskOpen={(task) => { setEditingTask(task); setShowTaskModal(true); }}
              onDragStart={(e, type, item) => handleDragStart(e, type, item)}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDrop={(e) => handleDrop(e, column.id)}
              onDragEnd={handleDragEnd}
              isDragOver={dragState.dragOverColumn === column.id}
            />
          );
        })}
        
        {/* Если нет колонок, отображаем сообщение */}
        {columns.length === 0 && !loading && (
          <div className="flex items-center justify-center w-full h-96 text-gray-400">
            <div className="text-center">
              <p className="text-lg mb-2">Колонки не найдены</p>
              <p className="text-sm">Колонки должны были создаться автоматически</p>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateTask && selectedColumn && (
        <CreateTaskModal
          isOpen={showCreateTask}
          onClose={() => {
            setShowCreateTask(false);
            setSelectedColumn(null);
          }}
          onTaskCreated={(task) => handleTaskCreated(task, selectedColumn.id)}
          columnId={selectedColumn.id}
          boardId={board.id}
          users={projectMembers.length > 0 ? projectMembers : users}
        />
      )}

      {showTaskModal && editingTask && (
        <TaskModal
          task={editingTask}
          isOpen={showTaskModal}
          onClose={() => { setShowTaskModal(false); setEditingTask(null); }}
          onSave={(updated) => {
            // Обновляем задачу в локальном состоянии
            setColumns(prev => prev.map(col => ({
              ...col,
              tasks: (col.tasks || []).map(t => t.id === updated.id ? { ...t, ...updated } : t)
            })));
            setShowTaskModal(false);
            setEditingTask(null);
            if (onTaskUpdate) onTaskUpdate();
          }}
          onDelete={async (taskToDelete) => {
            try {
              const res = await fetch(`/api/tasks/${taskToDelete.id}`, {
                method: 'DELETE',
                credentials: 'include'
              });
              if (!res.ok) {
                let errorText = '';
                try {
                  const ct = res.headers.get('content-type') || '';
                  if (ct.includes('application/json')) {
                    const j = await res.json();
                    errorText = j?.error || JSON.stringify(j);
                  } else {
                    errorText = await res.text();
                  }
                } catch (_) {}
                const msg = errorText || `Не удалось удалить задачу (HTTP ${res.status})`;
                console.error('Delete failed:', res.status, msg);
                if (typeof window !== 'undefined') alert(msg);
                return;
              }
              // Удаляем локально
              handleTaskDeleted(taskToDelete.id);
              setShowTaskModal(false);
              setEditingTask(null);
            } catch (e) {
              console.error('Ошибка удаления задачи:', e);
              if (typeof window !== 'undefined') alert(`Ошибка удаления задачи: ${e instanceof Error ? e.message : String(e)}`);
            }
          }}
        />
      )}

    </div>
  );
};

export default KanbanBoard;