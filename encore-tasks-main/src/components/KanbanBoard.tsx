import React, { useState, useEffect } from 'react';
import { Plus, MoreHorizontal, Edit, Trash2, Users } from 'lucide-react';
import { Board, Column, Task, User } from '@/types';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';
import KanbanColumnDark from './KanbanColumnDark';
import ArchivedTasksModal from './ArchivedTasksModal';
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
  const { state, dispatch } = useApp();
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
  const [isArchivedTasksModalOpen, setIsArchivedTasksModalOpen] = useState(false);
  
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
        
        // Применяем ограничение для колонки Выполнено сразу после загрузки
        const afterEnforce = columnsWithTasks.map((col: any) => ({ ...col, tasks: Array.isArray(col.tasks) ? [...col.tasks] : [] }));
        const toArchive: any[] = [];
        for (const col of afterEnforce) {
          if (isDoneColumn(col) && Array.isArray(col.tasks) && col.tasks.length > 7) {
            const { nextTasks, archived } = enforceDoneLimit(col.tasks);
            col.tasks = nextTasks;
            if (archived.length) toArchive.push(...archived);
          }
        }
        setColumns(afterEnforce);
        if (toArchive.length) {
          console.log('Auto-archiving on load:', toArchive.length);
          for (const t of toArchive) {
            const bid = (t as any).board_id || (t as any).boardId || board.id;
            dispatch({ type: 'ARCHIVE_TASK', payload: { task: { ...t, board_id: bid, boardId: bid }, archivedAt: new Date(), archivedBy: state.currentUser?.id } as any } as any);
          }
        }
        console.log('✅ KanbanBoard: Loaded', afterEnforce.length, 'columns with tasks');
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

  // Обновляем колонки при событиях обновления задач (после восстановления из архива и т.п.)
  useEffect(() => {
    const handler = () => loadColumns();
    if (typeof window !== 'undefined') {
      window.addEventListener('tasks-updated', handler);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('tasks-updated', handler);
      }
    };
  }, [board.id]);

  // Обработка создания новой задачи
  const handleTaskCreated = async (newTask: Task, columnId: string) => {
    // Обновляем статус задачи на основе колонки
    const column = columns.find(col => col.id === columnId);
    const correctStatus = column ? statusMapping[column.id] : newTask.status;
    const taskWithCorrectStatus: any = {
      ...newTask,
      status: correctStatus
    };

    let toArchive: any[] = [];
    setColumns(prev => {
      const next = prev.map(col => ({ ...col }));
      const idx = next.findIndex(c => String(c.id) === String(columnId));
      if (idx !== -1) {
        const before = [...(next[idx].tasks || []), taskWithCorrectStatus];
        if (correctStatus === 'done') {
          const { nextTasks, archived } = enforceDoneLimit(before);
          next[idx] = { ...next[idx], tasks: nextTasks };
          toArchive = archived;
        } else {
          next[idx] = { ...next[idx], tasks: before };
        }
      }
      return next;
    });

    if (Array.isArray(toArchive) && toArchive.length > 0) {
      for (const t of toArchive) {
        const bid = (t as any).board_id || (t as any).boardId || board.id;
        const archivedAt = new Date();
        dispatch({ type: 'ARCHIVE_TASK', payload: { task: { ...t, board_id: bid, boardId: bid }, archivedAt, archivedBy: state.currentUser?.id } as any } as any);
        // Persist on server
        try {
          await fetch(`/api/tasks/${t.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ isArchived: true, archivedAt: archivedAt.toISOString() })
          });
        } catch {}
      }
    }
    
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

  // Вспомогательная функция: проверяет, является ли колонка "Выполнено"
  const isDoneColumn = (col: Column): boolean => {
    const mapped = statusMapping[col.id];
    if (mapped === 'done') return true;
    const name = String(col.name || col.title || '').toLowerCase().trim();
    return /(?:^|\s)(выполнено|готово|завершено|done)(?:$|\s)/.test(name);
  };

  // Унифицированное принудительное ограничение количества задач в Done до 7
  const enforceDoneLimit = (tasks: any[]): { nextTasks: any[]; archived: any[] } => {
    try {
      const list = Array.isArray(tasks) ? [...tasks] : [];
      if (list.length <= 7) return { nextTasks: list, archived: [] };
      const sortedAsc = [...list].sort((a: any, b: any) => {
        const at = new Date(a.updated_at || a.updatedAt || a.created_at || a.createdAt || Date.now()).getTime();
        const bt = new Date(b.updated_at || b.updatedAt || b.created_at || b.createdAt || Date.now()).getTime();
        return at - bt;
      });
      const needArchive = sortedAsc.length - 7;
      const archived = sortedAsc.slice(0, needArchive);
      const archivedIds = new Set(archived.map((t: any) => String(t.id)));
      const nextTasks = list.filter(t => !archivedIds.has(String(t.id)));
      return { nextTasks, archived };
    } catch {
      return { nextTasks: Array.isArray(tasks) ? tasks : [], archived: [] };
    }
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

      // Синхронно рассчитываем новое состояние колонок и задачу для архивации
      let toArchive: any = null;
      const nextColumns = (() => {
        const next = columns.map(col => ({ ...col, tasks: Array.isArray(col.tasks) ? [...col.tasks] : [] } as any));
        const fromIdx = sourceColumn ? next.findIndex(c => String(c.id) === String(sourceColumn!.id)) : -1;
        const toIdx = next.findIndex(c => String(c.id) === String(targetColumnId));

        if (fromIdx !== -1) {
          next[fromIdx].tasks = (next[fromIdx].tasks || []).filter((t: any) => t.id !== task.id);
        }

        if (toIdx !== -1) {
          const inserted = { ...task, ...updatedTask } as any;
          const before = [...(next[toIdx].tasks || []), inserted];
          if (isDoneColumn(next[toIdx])) {
            const { nextTasks, archived } = enforceDoneLimit(before);
            console.log('[toggle] Done before:', before.length, 'after:', nextTasks.length, 'archived:', archived.length);
            next[toIdx].tasks = nextTasks;
            if (archived.length > 0) toArchive = archived; // список
          } else {
            next[toIdx].tasks = before;
          }
        }
        return next;
      })();

      setColumns(nextColumns as any);

      if (Array.isArray(toArchive) && toArchive.length > 0) {
        for (const t of toArchive) {
          const bid = (t as any).board_id || (t as any).boardId || board.id;
          const archivedAt = new Date();
          dispatch({ type: 'ARCHIVE_TASK', payload: { task: { ...t, board_id: bid, boardId: bid }, archivedAt, archivedBy: state.currentUser?.id } as any } as any);
          // Persist on server
          try {
            await fetch(`/api/tasks/${t.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ isArchived: true, archivedAt: archivedAt.toISOString() })
            });
          } catch {}
        }
      }

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
          // Синхронно рассчитываем новое состояние и задачу для архивации
          let toArchive: any = null;
          const nextColumns = (() => {
            const next = columns.map(c => ({ ...c, tasks: Array.isArray(c.tasks) ? [...c.tasks] : [] } as any));
            const srcIdx = next.findIndex(c => String(c.id) === String(sourceColumn.id));
            const tgtIdx = next.findIndex(c => String(c.id) === String(targetColumnId));
            if (srcIdx !== -1) {
              next[srcIdx].tasks = (next[srcIdx].tasks || []).filter((t: any) => t.id !== draggedTask.id);
            }
            if (tgtIdx !== -1) {
              const before = [...(next[tgtIdx].tasks || []), taskWithUpdatedStatus as any];
              if (isDoneColumn(next[tgtIdx])) {
                const { nextTasks, archived } = enforceDoneLimit(before);
                console.log('[dnd] Done before:', before.length, 'after:', nextTasks.length, 'archived:', archived.length);
                next[tgtIdx].tasks = nextTasks;
                if (archived.length > 0) toArchive = archived; // список
              } else {
                next[tgtIdx].tasks = before;
              }
            }
            return next;
          })();

          setColumns(nextColumns as any);
          if (Array.isArray(toArchive) && toArchive.length > 0) {
            for (const t of toArchive) {
              const bid = (t as any).board_id || (t as any).boardId || board.id;
              const archivedAt = new Date();
              dispatch({ type: 'ARCHIVE_TASK', payload: { task: { ...t, board_id: bid, boardId: bid }, archivedAt, archivedBy: state.currentUser?.id } as any } as any);
              // Persist on server
              try {
                await fetch(`/api/tasks/${t.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({ isArchived: true, archivedAt: archivedAt.toISOString() })
                });
              } catch {}
            }
          }
          
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
      {/* Columns */}
      <div className="flex items-start space-x-4 overflow-x-auto pb-4">
        {columns
          .filter(col => {
            const name = String(col.name || col.title || '').toLowerCase();
            return !name.includes('беклог') && !name.includes('backlog');
          })
          .map((column) => {
          const rawTasksAny = getTasksForColumn(column);
          const safeTasks: any[] = Array.isArray(rawTasksAny) ? rawTasksAny : [];
          const columnTasks = safeTasks.filter((task: any) => {
            try {
              // Text search across title, description, tags, assignees
              const q = String(state.filters?.search || '').trim().toLowerCase();
              if (q) {
                const names = (Array.isArray(task.assignees) ? task.assignees : [])
                  .map((a: any) => (a && (a.name || a.username)) || '')
                  .filter(Boolean);
                const tags = Array.isArray(task.tags) ? task.tags : [];
                const hay = [
                  String(task.title || ''),
                  String(task.description || ''),
                  ...tags,
                  ...names
                ].join(' ').toLowerCase();
                if (!hay.includes(q)) return false;
              }
              // Assignee filter
              if (state.filters.assignee) {
                const asgs = Array.isArray(task.assignees) ? task.assignees : [];
                const hasAssignee = asgs.some((a: any) => String(a?.id || a?.user_id || a?.userId || '') === String(state.filters.assignee))
                  || String(task.assignee_id || task.assigneeId || '') === String(state.filters.assignee);
                if (!hasAssignee) return false;
              }
              // Priority filter
              if (state.filters.priority) {
                if (String(task.priority || '').toLowerCase() !== String(state.filters.priority)) return false;
              }
              // Status filter
              if (state.filters.status) {
                if (String(task.status || '').toLowerCase() !== String(state.filters.status)) return false;
              }
              return true;
            } catch (e) {
              console.error('Filter error for task', task?.id, e);
              return true; // Fail-open to avoid hard crashes
            }
          });
          return (
              <KanbanColumnDark
              key={column.id}
              column={column}
              tasks={columnTasks}
              users={projectMembers.length > 0 ? projectMembers : state.users}
              onTaskCreate={() => handleCreateTask(column)}
              onTaskUpdate={handleTaskUpdated}
              onTaskDelete={handleTaskDeleted}
              onTaskComplete={(task) => handleTaskComplete(task)}
              onTaskOpen={(task) => { setEditingTask(task); setShowTaskModal(true); }}
              archivedCount={(() => {
                if (!isDoneColumn(column)) return 0;
                const count = (state.archivedTasks || []).filter((t: any) => String(t.board_id || t.boardId) === String(board.id)).length;
                if (count > 0) console.log('[archive-count]', column.id, column.title || column.name, '=>', count);
                return count;
              })()}
              onOpenArchive={() => setIsArchivedTasksModalOpen(true)}
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
          users={projectMembers.length > 0 ? projectMembers : state.users}
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

      {isArchivedTasksModalOpen && state.selectedBoard && (
        <ArchivedTasksModal
          isOpen={isArchivedTasksModalOpen}
          onClose={() => setIsArchivedTasksModalOpen(false)}
          boardId={state.selectedBoard.id}
        />
      )}

    </div>
  );
};

export default KanbanBoard;
