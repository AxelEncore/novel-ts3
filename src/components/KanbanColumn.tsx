"use client";

import React, { memo, useMemo, useCallback, useEffect } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy } from
"@dnd-kit/sortable";
import { Column, Task } from "@/types";
import { TaskCard } from "./TaskCard";
import { cn } from "@/lib/utils";
import { Plus, MoreHorizontal } from "lucide-react";
import CompletedTasksBlock from "./CompletedTasksBlock";
import { useApp } from "@/contexts/AppContext";

interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
  onAddTask?: () => void;
  onTaskClick?: (task: Task) => void;
  onViewCompleted?: () => void;
}

const KanbanColumnComponent = ({
  column,
  tasks,
  onAddTask,
  onTaskClick,
  onViewCompleted
}: KanbanColumnProps) => {

  const { state, dispatch } = useApp();
  const droppableData = useMemo(() => ({
    type: "column" as const,
    column: column,
    accepts: ["task"] as const
  }), [column]);
  
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: droppableData
  });
  
  const taskIds = useMemo(() => tasks.map(task => task.id), [tasks]);
  
  const handleTaskClick = useCallback((task: Task) => {
    onTaskClick?.(task);
  }, [onTaskClick]);
  
  const handleAddTask = useCallback(() => {
    onAddTask?.();
  }, [onAddTask]);

  // Логика автоматического архивирования для колонки Done
  useEffect(() => {
    if ((column.name === "Done" || column.name === "Выполнено") && tasks.length > 0) {
      const timer = setTimeout(() => {
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        // Архивируем старые задачи (больше недели)
        const oldTasks = tasks.filter(task => {
          const completedDate = task.completedAt || task.updatedAt;
          return completedDate && new Date(completedDate) < oneWeekAgo;
        });
        
        // Архивируем старые задачи по одной с интервалом
        oldTasks.forEach((task, index) => {
          setTimeout(() => {
            dispatch({ type: "ARCHIVE_TASK", payload: task.id });
          }, index * 100);
        });
        
        // Если задач больше 5 (после архивирования старых), архивируем самые старые
        setTimeout(() => {
          const remainingTasks = tasks.filter(task => !oldTasks.includes(task));
          if (remainingTasks.length > 5) {
            const sortedTasks = [...remainingTasks]
              .sort((a, b) => {
                const aDate = a.completedAt || a.updatedAt;
                const bDate = b.completedAt || b.updatedAt;
                return new Date(aDate).getTime() - new Date(bDate).getTime();
              });
            
            const tasksToArchive = sortedTasks.slice(0, remainingTasks.length - 5);
            
            tasksToArchive.forEach((task, index) => {
              setTimeout(() => {
                dispatch({ type: "ARCHIVE_TASK", payload: task.id });
              }, index * 100);
            });
          }
        }, oldTasks.length * 100 + 200);
      }, 1000); // Задержка в 1 секунду
      
      return () => clearTimeout(timer);
    }
  }, [column.name, tasks.length, dispatch]);

  const handleViewCompleted = useCallback(() => {
    onViewCompleted?.();
  }, [onViewCompleted]);

  // Подсчитываем количество архивированных задач для этой доски
  const archivedTasksCount = useMemo(() => {
    return state.archivedTasks.filter(task => 
      task.boardId === state.selectedBoard?.id && task.status === "done"
    ).length;
  }, [state.archivedTasks, state.selectedBoard?.id]);

  const isDoneColumn = column.name === "Done" || column.name === "Выполнено";

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col h-full min-w-[260px] w-[280px] lg:min-w-[280px] lg:max-w-[320px] flex-shrink-0 animate-scale-in hover-lift transition-all duration-300",
        isOver && "ring-2 ring-primary-500/30 scale-[1.01] bg-primary-500/10"
      )}
      data-oid="baevvrb">

      {/* Column header */}
      <div
        className="flex items-center justify-between p-3 lg:p-4 backdrop-blur-sm border border-white/10 rounded-t-lg flex-shrink-0 animate-slide-in-left animate-delay-100"
        style={{ backgroundColor: `${column.color}20` }}
        data-oid="x9qxwd-">

        <div className="flex items-center gap-2" data-oid="zp7bg-6">
          <div
            className="w-3 h-3 rounded-full animate-bounce-in animate-delay-200"
            style={{ backgroundColor: column.color || "#6b7280" }}
            data-oid="zknb_rz" />


          <h3 className="font-medium text-white animate-slide-in-left animate-delay-300" data-oid="uc-rl45">
            {column.name}
          </h3>
          <span
            className="px-2 py-1 text-xs bg-white/10 text-gray-300 rounded-full badge animate-delay-400"
            data-oid="ucetj-m">

            {tasks.length}
          </span>
        </div>
        <div className="flex items-center gap-1" data-oid="k:fwdbq">
          <button
            onClick={handleAddTask}
            className="p-1 hover:bg-white/10 rounded transition-colors"
            title="Добавить задачу"
            data-oid="0vd2-:n">

            <Plus className="w-4 h-4 text-gray-400" data-oid="0-5f3lo" />
          </button>
          <button
            className="p-1 hover:bg-white/10 rounded transition-colors"
            data-oid="qewdylh">

            <MoreHorizontal
              className="w-4 h-4 text-gray-400"
              data-oid="d90:62i" />

          </button>
        </div>
      </div>

      {/* Tasks container */}
      <div
        data-column-id={column.id}
        className={cn(
          "flex-1 p-3 lg:p-4 bg-white/5 backdrop-blur-sm border-x border-b border-white/10 rounded-b-lg transition-all duration-200 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent",
          tasks.length === 0 ? "min-h-[400px]" : "min-h-[200px]"
        )}
        data-oid="0_737rg">

        <SortableContext
          items={taskIds}
          strategy={verticalListSortingStrategy}
          data-oid="md:ek_j">

          <div 
            className="space-y-3" 
            data-oid="ojk-ldx">
            {tasks.map((task) =>
            <TaskCard
              key={task.id}
              task={task}
              onViewDetails={() => handleTaskClick(task)}
              onEdit={() => handleTaskClick(task)}
              data-oid="nko.htr" />

            )}

            {/* Empty column drop zone */}
            {tasks.length === 0 && (
              <div 
                className={cn(
                  "w-full p-8 border-2 border-dashed border-white/20 rounded-lg transition-all min-h-[200px] flex flex-col items-center justify-center gap-4",
                  isOver ? "border-primary-500/50 bg-primary-500/10" : "border-white/20"
                )}>
                <div className="text-center text-gray-400">
                  <div className="text-sm opacity-60">
                    {isOver ? "Отпустите, чтобы переместить задачу сюда" : "Перетащите задачу сюда"}
                  </div>
                </div>
                
                {/* Add task button inside drop zone */}
                {onAddTask && (
                  <button
                  onClick={(e) => {
                     e.preventDefault();
                     e.stopPropagation();
                     handleAddTask();
                   }}
                  className="px-4 py-2 border-2 border-dashed border-white/30 bg-white/5 rounded-lg text-white/70 hover:border-white/50 hover:text-white transition-all group flex items-center gap-2"
                  data-oid="i7h0k2e">
                    <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span className="text-sm">Добавить задачу</span>
                  </button>
                )}
              </div>
            )}

            {/* Add task button for non-empty columns */}
            {tasks.length > 0 && onAddTask && (
            <button
              onClick={(e) => {
                 e.preventDefault();
                 e.stopPropagation();
                 handleAddTask();
               }}
              className="w-full p-4 border-2 border-dashed border-white/30 bg-white/5 rounded-lg text-white/70 hover:border-white/50 hover:text-white transition-all group mt-3"
              data-oid="i7h0k2e-nonempty">

                <div
                className="flex flex-col items-center gap-2"
                data-oid="74fq3xl">

                  <Plus
                  className="w-6 h-6 group-hover:scale-110 transition-transform"
                  data-oid="d00xrgp" />

                  <span className="text-sm" data-oid="ip_3ezx">
                    Добавить задачу
                  </span>
                </div>
              </button>
            )}

            {/* Drop zone indicator when dragging */}
            {isOver && tasks.length > 0 && (
              <div className="space-y-2">
                <div className="w-full h-1 bg-primary-500/50 rounded-full animate-pulse" />
                <div className="w-full p-4 border-2 border-dashed border-primary-500/50 bg-primary-500/10 rounded-lg flex items-center justify-center">
                  <div className="text-primary-300 text-sm font-medium animate-pulse">
                    Отпустите, чтобы переместить задачу сюда
                  </div>
                </div>
                <div className="w-full h-1 bg-primary-500/50 rounded-full animate-pulse" />
              </div>
            )}
          </div>
        </SortableContext>
        
        {/* Completed Tasks Block for Done column */}
        {isDoneColumn && (
          <CompletedTasksBlock
            completedTasksCount={archivedTasksCount}
            onViewCompleted={handleViewCompleted}
          />
        )}
      </div>
    </div>);

};

// Мемоизированный экспорт для оптимизации производительности
export const KanbanColumn = memo(KanbanColumnComponent, (prevProps, nextProps) => {
  // Сравниваем только необходимые свойства
  return (
    prevProps.column.id === nextProps.column.id &&
    prevProps.column.name === nextProps.column.name &&
    prevProps.tasks.length === nextProps.tasks.length &&
    prevProps.tasks.every((task, index) => 
      task.id === nextProps.tasks[index]?.id &&
      task.title === nextProps.tasks[index]?.title &&
      task.status === nextProps.tasks[index]?.status
    ) &&
    prevProps.onAddTask === nextProps.onAddTask &&
    prevProps.onTaskClick === nextProps.onTaskClick &&
    prevProps.onViewCompleted === nextProps.onViewCompleted
  );
});