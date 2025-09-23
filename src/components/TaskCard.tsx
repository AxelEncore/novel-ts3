"use client";

import React, { memo, useMemo, useCallback, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Task, TaskPriority } from "@/types";
import { cn, formatDate, getDaysUntilDeadline, getInitials } from "@/lib/utils";
import { logTaskDeleted } from "@/utils/taskLogger";
import {
  Calendar,
  MessageSquare,
  Paperclip,
  User,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Trash2,
  Check } from
"lucide-react";
import { useApp } from "@/contexts/AppContext";
import DeleteConfirmationModal from "./DeleteConfirmationModal";

interface TaskCardProps {
  task: Task;
  onViewDetails?: () => void;
  onEdit?: () => void;
  isDragOverlay?: boolean;
}

// Removed priority colors for left border

const statusColors: Record<string, string> = {
  "todo": "bg-gray-500/10 border-gray-500/20",
  "in-progress": "bg-blue-500/15 border-blue-500/30",
  "review": "bg-purple-500/15 border-purple-500/30",
  "done": "bg-green-500/15 border-green-500/30"
};

const priorityIcons: Record<TaskPriority, React.ReactNode> = {
  low: <CheckCircle2 className="w-4 h-4 text-green-400 drop-shadow-sm" data-oid="hklu-g4" />,
  medium: <Clock className="w-4 h-4 text-yellow-400 drop-shadow-sm" data-oid="rnv5m:0" />,
  high: <AlertTriangle className="w-4 h-4 text-orange-400 drop-shadow-sm" data-oid="0r:wuf:" />,
  urgent: <AlertTriangle className="w-4 h-4 text-red-400 drop-shadow-sm animate-pulse" data-oid="ke7azx6" />
};

const TaskCardComponent = ({ task, onViewDetails, onEdit, isDragOverlay = false }: TaskCardProps) => {
  const { state, dispatch, deleteTask, updateTask } = useApp();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const sortableData = useMemo(() => ({
    type: "task" as const,
    task: task
  }), [task]);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: task.id,
    data: sortableData,
    disabled: isDragOverlay
  });

  const style = useMemo(() => {
    if (isDragOverlay) {
      return {
        transform: 'none',
        transition: 'none',
        cursor: 'grabbing'
      };
    }
    
    return {
      transform: CSS.Transform.toString(transform),
      transition: isDragging ? 'none' : transition,
      zIndex: isDragging ? 1000 : 'auto',
      opacity: isDragging ? 0.5 : 1
    };
  }, [isDragOverlay, transform, transition, isDragging]);

  const daysUntilDeadline = task.deadline ?
  getDaysUntilDeadline(task.deadline) :
  null;
  const isOverdue = daysUntilDeadline !== null && daysUntilDeadline < 0;
  const isDueSoon =
  daysUntilDeadline !== null &&
  daysUntilDeadline <= 2 &&
  daysUntilDeadline >= 0;

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteModal(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    try {
      await deleteTask(task.id);
      
      // Логирование удаления задачи
      if (state.currentUser) {
        const taskAction = logTaskDeleted(
          dispatch,
          task.id,
          state.selectedBoard?.id || '',
          state.selectedProject?.id || '',
          task.title,
          state.currentUser.id,
          state.currentUser.name
        );
      }
      
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  }, [deleteTask, task.id, state.currentUser]);

  const handleCardClick = useCallback((e: React.MouseEvent) => {
    // Don't trigger onClick if clicking on action buttons or if dragging
    if ((e.target as HTMLElement).closest(".task-actions") || (e.target as HTMLElement).closest(".task-checkbox") || isDragging) {
      return;
    }
    onViewDetails?.();
  }, [onViewDetails, isDragging]);



  const handleCompleteTask = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const newStatus = task.status === 'done' ? 'todo' : 'done';
      const updatedTask = { ...task, status: newStatus, updatedAt: new Date() };
      await updateTask(task.id, { status: newStatus });
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  }, [updateTask, task]);

  // Handle multiple assignees with backward compatibility
  const assignees = task.assignees || (task.assignee ? [task.assignee] : []);

  return (
    <div
      ref={isDragOverlay ? undefined : setNodeRef}
      style={style}
      {...(isDragOverlay ? {} : attributes)}
      {...(isDragOverlay ? {} : listeners)}
      className={cn(
        "group relative cursor-pointer task-card hover-lift animate-scale-in backdrop-blur-xl border rounded-xl p-4 transition-all duration-300",
        statusColors[task.status] || "bg-white/5 border-white/10",
        task.status === 'done' && "opacity-70 saturate-75 contrast-90",
        isDragging && "opacity-50 shadow-2xl scale-105 rotate-2 bg-white/20",
        "hover:shadow-lg hover:scale-[1.02]"
      )}
      onClick={handleCardClick}
      data-oid="quv.626">

      {/* Subtasks counter */}
      {task.subtasks.length > 0 &&
      <div className="flex justify-end mb-1">
        <div className="text-xs text-gray-400" data-oid="kathmuh">
          {task.subtasks.filter((st) => st.status === "done").length}/
          {task.subtasks.length}
        </div>
      </div>
      }

      {/* Task title with checkbox and actions */}
      <div className="flex items-start gap-2 mb-2">
        <button
          onClick={handleCompleteTask}
          className={cn(
            "task-checkbox w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 mt-0.5",
            task.status === 'done' 
              ? "bg-green-500 border-green-500 text-white" 
              : "border-gray-400 hover:border-green-400"
          )}
          title={task.status === 'done' ? "Отметить как невыполненную" : "Отметить как выполненную"}
        >
          {task.status === 'done' && <Check className="w-3 h-3" />}
        </button>
        <h3
          className={cn(
            "text-sm font-medium line-clamp-2 flex-1",
            task.status === 'done' ? "text-gray-300" : "text-white"
          )}
          data-oid="fq7kujc">
          {task.title}
        </h3>
        
        {/* Task actions */}
        <div className="task-actions flex items-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          {/* Only task creator, admins, or managers can delete tasks */}
          {(state.currentUser?.id === task.reporter.id || 
            state.currentUser?.role === 'admin' || 
            state.currentUser?.role === 'manager') && (
            <button
              onClick={handleDelete}
              className="p-1 hover:bg-primary-500/20 rounded transition-colors"
              title="Удалить задачу"
              data-oid="delete-btn">
              <Trash2 className="w-3 h-3 text-red-400" />
            </button>
          )}
        </div>
      </div>

      {/* Task description */}
      {task.description &&
      <p
        className={cn(
          "text-xs mb-3 line-clamp-2",
          task.status === 'done' ? "text-gray-500" : "text-gray-400"
        )}
        data-oid="soff5zg">

          {task.description}
        </p>
      }

      {/* Tags */}
      {task.tags?.length > 0 &&
      <div className="flex flex-wrap gap-1 mb-3" data-oid="l6a3ze.">
          {task.tags?.slice(0, 3).map((tag, index) =>
        <span
          key={`${task.id}-tag-${index}`}
          className="px-2 py-1 text-xs bg-primary-500/20 text-primary-300 rounded-full"
          data-oid="1.37n8b">

              {tag}
            </span>
        )}
          {task.tags?.length > 3 &&
        <span
          className="px-2 py-1 text-xs bg-gray-500/20 text-gray-400 rounded-full"
          data-oid="g0ql3g:">

              +{task.tags.length - 3}
            </span>
        }
        </div>
      }

      {/* Deadline */}
      {task.deadline &&
      <div
        className={cn(
          "flex items-center gap-1 mb-2 text-xs",
          isOverdue && "text-red-400",
          isDueSoon && "text-yellow-400",
          !isOverdue && !isDueSoon && "text-gray-400"
        )}
        data-oid="73h4pgz">

          <Calendar className="w-3 h-3" data-oid="-.8767z" />
          <span data-oid="d69j4.m">{!isNaN(new Date(task.deadline).getTime()) ? formatDate(new Date(task.deadline)) : 'Неверная дата'}</span>
          {isOverdue &&
        <span className="text-red-400" data-oid="9lat1ca">
              (просрочено)
            </span>
        }
          {isDueSoon &&
        <span className="text-yellow-400" data-oid="9liw4fa">
              ({Math.abs(daysUntilDeadline!)} дн.)
            </span>
        }
        </div>
      }

      {/* Bottom section */}
      <div className="flex items-center justify-between" data-oid="qmks2-3">
        {/* Assignees */}
        <div className="flex items-center gap-2" data-oid="yid2xpu">
          {assignees.length > 0 ?
          <div className="flex items-center gap-1" data-oid="adz7fpr">
              {/* Show avatars for multiple assignees */}
              {state.settings?.showAvatars && (
                <div className="flex -space-x-1" data-oid="4z3qxlj">
                  {assignees.slice(0, 3).map((assignee, index) =>
                <div
                  key={assignee.id}
                  className="relative"
                  data-oid="6vc888p">

                      {assignee.avatar ?
                  <img
                    src={assignee.avatar}
                    alt={assignee.name}
                    className="w-5 h-5 lg:w-6 lg:h-6 rounded-full border border-white/20"
                    title={assignee.name}
                    data-oid="_id-0_w" /> :


                  <div
                    className="w-5 h-5 lg:w-6 lg:h-6 bg-primary-500 rounded-full flex items-center justify-center text-xs text-white border border-white/20"
                    title={assignee.name}
                    data-oid="omx5dpx">

                          {getInitials(assignee.name)}
                        </div>
                  }
                    </div>
                )}
                  {assignees.length > 3 &&
                <div
                  className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center text-xs text-white border border-white/20"
                  title={`+${assignees.length - 3} еще`}
                  data-oid="hs5ik9.">

                      +{assignees.length - 3}
                    </div>
                }
                </div>
              )}
              {/* Show name only for single assignee */}
              {assignees.length === 1 &&
            <span
              className="text-xs text-gray-400 hidden sm:inline"
              data-oid="3q8q4kj">

                  {assignees.length > 0 ? assignees[0].name.split(" ")[0] : 'Не назначен'}
                </span>
            }
              {/* Show count for multiple assignees */}
              {assignees.length > 1 &&
            <span
              className="text-xs text-gray-400 hidden sm:inline"
              data-oid="c4igr7q">

                  {assignees.length} исп.
                </span>
            }
            </div> :

          <div
            className="flex items-center gap-1 text-gray-500"
            data-oid="7jmjpnf">

              <User className="w-3 h-3 lg:w-4 lg:h-4" data-oid="y87f1.0" />
              <span className="text-xs" data-oid="uvmeo5a">
                Не назначено
              </span>
            </div>
          }
        </div>

        {/* Attachments, comments and priority */}
        <div className="flex items-center gap-2" data-oid="wx2esgm">
          {task.attachments.length > 0 &&
          <div
            className="flex items-center gap-1 text-gray-400"
            data-oid="t.c6u7s">

              <Paperclip className="w-3 h-3" data-oid="zzl-zwp" />
              <span className="text-xs" data-oid="k2t-5rf">
                {task.attachments.length}
              </span>
            </div>
          }
          {task.comments.length > 0 &&
          <div
            className="flex items-center gap-1 text-gray-400"
            data-oid="a50y8rh">

              <MessageSquare className="w-3 h-3" data-oid="tqxpzuv" />
              <span className="text-xs" data-oid="4ngdj-7">
                {task.comments.length}
              </span>
            </div>
          }
          {/* Priority icon */}
          <div 
            className="flex items-center ml-auto"
            title={`Приоритет: ${task.priority === 'low' ? 'низкий' : task.priority === 'medium' ? 'средний' : task.priority === 'high' ? 'высокий' : 'срочный'}`}
          >
            {priorityIcons[task.priority]}
          </div>
        </div>
      </div>

      {/* Hover overlay */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-primary-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg pointer-events-none"
        data-oid="n-:kn_p" />

      {/* Темно-зеленое перекрытие для выполненных задач */}
      {task.status === "done" && (
        <div className="absolute inset-0 bg-primary-900/20 rounded-lg pointer-events-none" />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="Удаление задачи"
        message={`Вы уверены, что хотите удалить задачу "${task.title}"? Это действие нельзя отменить.`}
      />
    </div>);

};

// Мемоизированный экспорт для оптимизации производительности
export const TaskCard = memo(TaskCardComponent, (prevProps, nextProps) => {
  // Сравниваем только необходимые свойства для предотвращения лишних рендеров
  return (
    prevProps.task.id === nextProps.task.id &&
    prevProps.task.title === nextProps.task.title &&
    prevProps.task.status === nextProps.task.status &&
    prevProps.task.priority === nextProps.task.priority &&
    prevProps.task.deadline === nextProps.task.deadline &&
    prevProps.task.assignee === nextProps.task.assignee &&
    JSON.stringify(prevProps.task.assignees) === JSON.stringify(nextProps.task.assignees) &&
    prevProps.task.attachments.length === nextProps.task.attachments.length &&
    prevProps.task.comments.length === nextProps.task.comments.length &&
    prevProps.isDragOverlay === nextProps.isDragOverlay &&
    prevProps.onViewDetails === nextProps.onViewDetails &&
    prevProps.onEdit === nextProps.onEdit
  );
});