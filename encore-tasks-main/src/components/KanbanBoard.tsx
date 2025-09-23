import React, { useState, useEffect } from 'react';
import { Plus, MoreHorizontal, Edit, Trash2, Users } from 'lucide-react';
import { Board, Column, Task, User } from '@/types';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';
import KanbanColumnDark from './KanbanColumnDark';
import CreateTaskModal from './CreateTaskModal';

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
  
  // Получаем соответствие колонок со статусами
  const statusMapping = getColumnStatusMapping(columns);
  
  // Получаем задачи для конкретной колонки
  const getTasksForColumn = (column: Column) => {
    const expectedStatus = statusMapping[column.id];
    if (!column.tasks) return [];
    
    // Фильтруем задачи по статусу
    return column.tasks.filter(task => {
      // Если у задачи есть статус, сравниваем его с ожидаемым
      if (task.status) {
        return task.status === expectedStatus;
      }
      // Если нет статуса, показываем все задачи в колонке
      return true;
    });
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
                `/api/tasks?column_id=${column.id}`,
                { credentials: 'include' }
              );
              
              if (tasksResponse.ok) {
                const tasksData = await tasksResponse.json();
                const tasks = tasksData.data?.tasks || tasksData.tasks || [];
                console.log(`Loaded ${tasks.length} tasks for column ${column.title || column.name}`);
                return {
                  ...column,
                  tasks: tasks
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
              users={users}
              onTaskCreate={() => handleCreateTask(column)}
              onTaskUpdate={handleTaskUpdated}
              onTaskDelete={handleTaskDeleted}
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

    </div>
  );
};

export default KanbanBoard;