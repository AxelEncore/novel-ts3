"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverEvent,
  closestCenter,
  pointerWithin,
  rectIntersection,
  MouseSensor
} from "@dnd-kit/core";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import { arrayMove } from "@dnd-kit/sortable";
import { Task, TaskStatus } from "@/types";
import { useApp } from "@/contexts/AppContext";
import { KanbanColumn } from "./KanbanColumn";
import { TaskCard } from "./TaskCard";
import { TaskModal } from "./TaskModal";
import ArchivedTasksModal from "./ArchivedTasksModal";
import { logTaskMoved, logTaskCreated, logTaskUpdated } from "@/utils/taskLogger";

// Динамическое сопоставление колонок со статусами на основе позиции
const getStatusMapping = (columns: { id: string; position: number; name: string }[]): Record<string, TaskStatus> => {
  const sortedColumns = [...columns].sort((a, b) => a.position - b.position);
  const mapping: Record<string, TaskStatus> = {};
  
  sortedColumns.forEach((column, index) => {
    // Определяем статус на основе названия колонки или позиции
    let status: TaskStatus;
    
    if (column.name.toLowerCase().includes('выполнено') || column.name.toLowerCase().includes('done') || column.name.toLowerCase().includes('завершено')) {
      status = 'done';
    } else if (column.name.toLowerCase().includes('работе') || column.name.toLowerCase().includes('progress') || column.name.toLowerCase().includes('процессе')) {
      status = 'in-progress';
    } else if (column.name.toLowerCase().includes('проверк') || column.name.toLowerCase().includes('review') || column.name.toLowerCase().includes('тест')) {
      status = 'review';
    } else {
      // Для первой колонки или неопознанных - todo
      status = 'todo';
    }
    
    mapping[column.id] = status;
  });
  
  return mapping;
};

export function KanbanBoard() {
  const { state, dispatch, loadBoards, loadTasks, updateTask, deleteTask, createTask } = useApp();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isArchivedTasksModalOpen, setIsArchivedTasksModalOpen] = useState(false);
  
  // Получаем динамическое сопоставление колонок и статусов
  const statusMapping = state.selectedBoard ? getStatusMapping(state.selectedBoard.columns) : {};

  // Load boards when project is selected
  useEffect(() => {
    if (state.selectedProject && state.selectedProject.id && state.isAuthenticated) {
      loadBoards(state.selectedProject.id);
    }
  }, [state.selectedProject?.id, state.isAuthenticated, loadBoards]);

  // Load tasks when board is selected
  useEffect(() => {
    if (state.selectedBoard && state.isAuthenticated) {
      loadTasks({ boardId: state.selectedBoard.id });
    }
  }, [state.selectedBoard?.id, state.isAuthenticated, loadTasks]);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 1
      }
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: (event, { context: { active, droppableRects, droppableContainers, collisionRect } }) => {
        if (event.code === 'Space') {
          event.preventDefault();
          return;
        }
        
        if (!active?.rect?.current?.translated) {
          return;
        }
        
        const translated = active.rect.current.translated;
          // Handle both ClientRect and coordinate object types
          const x = 'x' in translated && typeof translated.x === 'number' ? translated.x : 0;
          const y = 'y' in translated && typeof translated.y === 'number' ? translated.y : 0;
        
        switch (event.code) {
          case 'ArrowDown':
            return { x, y: y + 25 };
          case 'ArrowUp':
            return { x, y: y - 25 };
          case 'ArrowRight':
            return { x: x + 25, y };
          case 'ArrowLeft':
            return { x: x - 25, y };
        }
        
        return undefined;
      }
    })
  );

  // Filter and sort tasks for current board only
  const getFilteredAndSortedTasks = (tasks: Task[]) => {
    // Use search filtered tasks if available, otherwise use all tasks
    const tasksToFilter = state.filteredTasks || tasks;
    let filteredTasks = tasksToFilter.filter(
      (task) =>
      task.projectId === state.selectedProject?.id &&
      task.boardId === state.selectedBoard?.id
    );

    // Apply filters
    if (state.filters.assignee) {
      filteredTasks = filteredTasks.filter(
        (task) => {
          const assignees = task.assignees || (task.assignee ? [task.assignee] : []);
          return assignees.some(a => a.id === state.filters.assignee);
        }
      );
    }

    if (state.filters.priority) {
      filteredTasks = filteredTasks.filter(
        (task) => task.priority === state.filters.priority
      );
    }

    if (state.filters.status) {
      filteredTasks = filteredTasks.filter(
        (task) => task.status === state.filters.status
      );
    }

    if (state.filters.deadline) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const monthFromNow = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        today.getDate()
      );

      filteredTasks = filteredTasks.filter((task) => {
        if (!task.deadline) return state.filters.deadline === "";

        const deadline = new Date(task.deadline);

        switch (state.filters.deadline) {
          case "overdue":
            return deadline < today;
          case "today":
            return deadline.toDateString() === today.toDateString();
          case "week":
            return deadline >= today && deadline <= weekFromNow;
          case "month":
            return deadline >= today && deadline <= monthFromNow;
          default:
            return true;
        }
      });
    }

    // Apply sorting
    filteredTasks.sort((a, b) => {
      let comparison = 0;

      switch (state.sortBy) {
        case "priority":
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        case "deadline":
          if (!a.deadline && !b.deadline) comparison = 0;else
          if (!a.deadline) comparison = 1;else
          if (!b.deadline) comparison = -1;else

          comparison =
          new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
          break;
        case "created":
          comparison =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "updated":
          comparison =
          new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        default:
          comparison = a.position - b.position;
      }

      return state.sortOrder === "asc" ? comparison : -comparison;
    });

    return filteredTasks;
  };

  const findContainer = (id: string): TaskStatus | null => {
    // Check if it's a column ID
    if (statusMapping[id]) {
      return statusMapping[id];
    }
    
    // Check if it's a task ID
    const task = state.tasks.find(t => t.id === id);
    return task ? task.status : null;
  };

  const getTasksByStatus = (status: TaskStatus) => {
    return getFilteredAndSortedTasks(state.tasks).filter(
      (task) => task.status === status &&
                task.projectId === state.selectedProject?.id &&
                task.boardId === state.selectedBoard?.id
    );
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = active.data.current?.task || state.tasks.find((t) => t.id === active.id);
    if (task) {
      setActiveTask(task);
      // Announce drag start for screen readers
      const announcement = `Начато перетаскивание задачи: ${task.title}`;
      const liveRegion = document.getElementById('dnd-live-region');
      if (liveRegion) {
        liveRegion.textContent = announcement;
      }
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over || !active) return;
    
    const overId = over.id as string;
    const activeId = active.id as string;
    
    // Validate targets
    const isOverColumn = statusMapping[overId];
    const overTask = state.tasks.find(task => task.id === overId);
    const activeTask = state.tasks.find(task => task.id === activeId);
    
    if (!activeTask) return;
    if (!isOverColumn && !overTask) return;
    
    // Provide audio feedback for screen readers
    const targetName = isOverColumn 
      ? `колонку ${over.data.current?.column?.name || 'неизвестную'}`
      : `задачу ${overTask?.title || 'неизвестную'}`;
    
    const announcement = `Над ${targetName}`;
    const liveRegion = document.getElementById('dnd-live-region');
    if (liveRegion && liveRegion.textContent !== announcement) {
      liveRegion.textContent = announcement;
    }
  };
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const draggedTask = activeTask;
    setActiveTask(null);
    
    // Clear live region
    const liveRegion = document.getElementById('dnd-live-region');
    if (liveRegion) {
      liveRegion.textContent = '';
    }
    
    if (!over || !draggedTask) {
      // Announce cancelled drag
      if (liveRegion && draggedTask) {
        liveRegion.textContent = `Перетаскивание задачи "${draggedTask.title}" отменено`;
      }
      return;
    }
    
    const activeId = active.id as string;
    const overId = over.id as string;
    
    // Prevent dropping on self
    if (activeId === overId) return;
    
    // Determine target status
    let targetStatus: TaskStatus | null = null;
    let targetColumnTitle = '';
    
    if (statusMapping[overId]) {
      targetStatus = statusMapping[overId];
      targetColumnTitle = over.data.current?.column?.name || 'неизвестную колонку';
    } else {
      const overTask = state.tasks.find(task => task.id === overId);
      if (overTask) {
        targetStatus = overTask.status;
        const targetColumn = state.selectedBoard?.columns.find(col => statusMapping[col.id] === overTask.status);
        targetColumnTitle = targetColumn?.name || 'неизвестную колонку';
      }
    }
    
    if (!targetStatus) {
      if (liveRegion) {
        liveRegion.textContent = `Невозможно переместить задачу "${draggedTask.title}" в недопустимое место`;
      }
      return;
    }
    
    const activeContainer = draggedTask.status;
    const overContainer = targetStatus;
    
    try {
      // Handle cross-column moves
      if (activeContainer !== overContainer) {
        const updatedTask = {
          ...draggedTask,
          status: overContainer,
          updatedAt: new Date(),
          // Устанавливаем completedAt при перемещении в Done
          ...(overContainer === "done" && { completedAt: new Date() })
        };
        
        // Update task via API
        updateTask(updatedTask.id, updatedTask);
        
        // Логирование перемещения задачи
        if (state.currentUser) {
          const oldColumn = state.selectedBoard?.columns.find(col => statusMapping[col.id] === activeContainer);
          const newColumn = state.selectedBoard?.columns.find(col => statusMapping[col.id] === overContainer);
          logTaskMoved(
            dispatch,
            draggedTask.id,
            state.selectedBoard?.id || '',
            state.selectedProject?.id || '',
            draggedTask.title,
            state.currentUser.id,
            state.currentUser.name,
            oldColumn?.name || activeContainer,
            newColumn?.name || overContainer
          );
        }
        
        // Announce successful move
        if (liveRegion) {
          liveRegion.textContent = `Задача "${draggedTask.title}" перемещена в ${targetColumnTitle}`;
        }
      }
      // Handle reordering within same column
      else if (!statusMapping[overId]) {
        const columnTasks = getTasksByStatus(activeContainer);
        const activeIndex = columnTasks.findIndex(task => task.id === activeId);
        const overIndex = columnTasks.findIndex(task => task.id === overId);
        
        if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
          const reorderedTasks = arrayMove(columnTasks, activeIndex, overIndex);
          
          // Batch update positions
          reorderedTasks.forEach((task, index) => {
            dispatch({
              type: "UPDATE_TASK",
              payload: {
                ...task,
                position: index,
                updatedAt: new Date()
              }
            });
          });
          
          // Announce reorder
          if (liveRegion) {
            const direction = activeIndex < overIndex ? 'вниз' : 'вверх';
            liveRegion.textContent = `Задача "${draggedTask.title}" перемещена ${direction} в колонке ${targetColumnTitle}`;
          }
        }
      }
    } catch (error) {
      console.error('Ошибка при перетаскивании:', error);
      if (liveRegion) {
        liveRegion.textContent = `Ошибка при перемещении задачи "${draggedTask.title}"`;
      }
    }
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  };

  const handleAddTask = useCallback(async (columnId: string | number) => {
    // Ensure columnId is treated as string for statusMapping lookup
    const columnIdStr = String(columnId);
    
    const status = statusMapping[columnIdStr];
    console.log('Column ID:', columnId, 'Type:', typeof columnId);
    console.log('Column ID as string:', columnIdStr);
    console.log('Status mapping:', statusMapping);
    console.log('Mapped status:', status);
    console.log('Selected board:', state.selectedBoard);
    
    if (!status || !state.selectedBoard) {
      console.log('Early return: no status or board');
      return;
    }

    // Create a new task with default values
    const newTaskData = {
      title: "Новая задача",
      description: "",
      status,
      priority: "medium" as const,
      columnId: columnIdStr, // Use string columnId for API
      position: 0,
      tags: []
    };

    try {
      const success = await createTask(newTaskData);
      
      if (success) {
        // Wait a bit for state to update, then find and open the task
        setTimeout(() => {
          // Find the newly created task in the state (get the most recent one)
          const createdTasks = state.tasks
            .filter(task => 
              task.title === newTaskData.title && 
              task.projectId === newTaskData.projectId &&
              task.boardId === newTaskData.boardId &&
              task.status === newTaskData.status
            )
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          
          const createdTask = createdTasks[0]; // Get the most recent one
          
          if (createdTask) {
            setSelectedTask(createdTask);
            setIsTaskModalOpen(true);
          }
        }, 100);
      }
    } catch (error) {
      console.error('Ошибка при создании задачи:', error);
    }
  }, [statusMapping, state.selectedBoard, state.selectedProject, state.tasks, createTask, loadTasks]);

  if (!state.selectedBoard) {
    return (
      <div
        className="flex items-center justify-center h-full text-gray-400"
        data-oid="miujqkr">

        <div className="text-center" data-oid="5y43:ig">
          <p data-oid="10:187z">Выберите доску для работы</p>
          <p className="text-sm mt-2" data-oid="dgvjqa9">
            Используйте боковое меню для выбора проекта и доски
          </p>
        </div>
      </div>);

  }

  return (
    <div className="h-full flex flex-col animate-fade-in" data-oid="-kpg_.1">
      {/* Live region for screen reader announcements */}
      <div
        id="dnd-live-region"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        role="status"
      />
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        accessibility={{
          announcements: {
            onDragStart: ({ active }) => {
              const task = active.data.current?.task;
              return task ? `Начато перетаскивание задачи: ${task.title}` : 'Начато перетаскивание';
            },
            onDragOver: ({ active, over }) => {
              if (!over) return 'Перетаскивание';
              const isOverColumn = statusMapping[over.id as string];
              const targetName = isOverColumn 
                ? `колонку ${over.data.current?.column?.name || 'неизвестную'}`
                : 'задачу';
              return `Над ${targetName}`;
            },
            onDragEnd: ({ active, over }) => {
              const task = active.data.current?.task;
              if (!over || !task) return `Перетаскивание задачи "${task?.title || 'неизвестной'}" отменено`;
              
              const isOverColumn = statusMapping[over.id as string];
              const targetName = isOverColumn 
                ? over.data.current?.column?.title || 'неизвестную колонку'
                : 'другую позицию';
              return `Задача "${task.title}" перемещена в ${targetName}`;
            },
            onDragCancel: ({ active }) => {
              const task = active.data.current?.task;
              return `Перетаскивание задачи "${task?.title || 'неизвестной'}" отменено`;
            }
          }
        }}
        data-oid="mpofvb6">

        <div
          className="flex gap-4 lg:gap-6 h-full overflow-x-auto overflow-y-hidden p-4 lg:p-6 min-h-0"
          style={{ scrollbarWidth: 'thin' }}
          data-oid="_skbiyy">

          {state.selectedBoard?.columns?.map((column) => {
            const columnTasks = state.tasks.filter(
              (task) =>
              task.projectId === state.selectedProject?.id &&
              task.boardId === state.selectedBoard?.id &&
              task.status === statusMapping[column.id]
            );

            const filteredAndSortedTasks =
            getFilteredAndSortedTasks(columnTasks);

            return (
              <KanbanColumn
                key={column.id}
                column={column}
                tasks={filteredAndSortedTasks}
                onAddTask={() => handleAddTask(column.id)}
                onTaskClick={handleTaskClick}
                onViewCompleted={() => setIsArchivedTasksModalOpen(true)}
                data-oid="kd4guir" />);


          })}
        </div>

        <DragOverlay
          adjustScale={false}
          modifiers={[snapCenterToCursor]}
          style={{
            cursor: 'grabbing'
          }}
          dropAnimation={{
            duration: 200,
            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)'
          }}
          data-oid="u3n2_9u">
          {activeTask ?
          <div className="opacity-90 shadow-2xl transform-none" data-oid="wl0c6uw">
              <TaskCard task={activeTask} isDragOverlay={true} data-oid="yp0pnz9" />
            </div> :
          null}
        </DragOverlay>
      </DndContext>

      {/* Task Modal */}
      {selectedTask &&
      <TaskModal
        task={selectedTask}
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setSelectedTask(null);
        }}
        onSave={(updatedTask) => {
          dispatch({ type: "UPDATE_TASK", payload: updatedTask });
          
          // Логирование обновления задачи
          if (state.currentUser && selectedTask) {
            const changes = [];
            if (selectedTask.title !== updatedTask.title) {
              changes.push({ field: 'title', oldValue: selectedTask.title, newValue: updatedTask.title });
            }
            if (selectedTask.description !== updatedTask.description) {
              changes.push({ field: 'description', oldValue: selectedTask.description, newValue: updatedTask.description });
            }
            if (selectedTask.priority !== updatedTask.priority) {
              changes.push({ field: 'priority', oldValue: selectedTask.priority, newValue: updatedTask.priority });
            }
            if (JSON.stringify(selectedTask.assignees) !== JSON.stringify(updatedTask.assignees)) {
              const oldAssignees = selectedTask.assignees?.map((assignee: any) => assignee.name).filter(Boolean).join(', ') || 'Не назначено';
              const newAssignees = updatedTask.assignees?.map((assignee: any) => assignee.name).filter(Boolean).join(', ') || 'Не назначено';
              changes.push({ field: 'assignees', oldValue: oldAssignees, newValue: newAssignees });
            }
            if (selectedTask.deadline !== updatedTask.deadline) {
              changes.push({ field: 'deadline', oldValue: selectedTask.deadline || 'Не установлен', newValue: updatedTask.deadline || 'Не установлен' });
            }
            if (JSON.stringify(selectedTask.tags) !== JSON.stringify(updatedTask.tags)) {
              changes.push({ field: 'tags', oldValue: selectedTask.tags?.join(', ') || 'Нет тегов', newValue: updatedTask.tags?.join(', ') || 'Нет тегов' });
            }
            
            if (changes.length > 0) {
              logTaskUpdated(
                dispatch,
                updatedTask.id,
                state.selectedBoard?.id || '',
                state.selectedProject?.id || '',
                updatedTask.title,
                state.currentUser.id,
                state.currentUser.name,
                changes
              );
            }
          }
          
          setIsTaskModalOpen(false);
          setSelectedTask(null);
        }}
        data-oid="cjfjdu0" />

      }
      
      {/* Archived Tasks Modal */}
      <ArchivedTasksModal
        isOpen={isArchivedTasksModalOpen}
        onClose={() => setIsArchivedTasksModalOpen(false)}
        boardId={state.selectedBoard?.id || ''}
      />
    </div>);

}