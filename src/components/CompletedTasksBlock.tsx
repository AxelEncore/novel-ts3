"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight, Archive, Trash2 } from "lucide-react";
import { Task } from "@/types";
import { TaskCard } from "./TaskCard";
import { useAppContext } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";

interface CompletedTasksBlockProps {
  tasks: Task[];
  className?: string;
}

export function CompletedTasksBlock({ tasks, className }: CompletedTasksBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { archiveTask, deleteTask, currentUser } = useAppContext();

  const completedTasks = tasks.filter(task => task.status === "done");

  if (completedTasks.length === 0) {
    return null;
  }

  const handleArchiveAll = () => {
    completedTasks.forEach(task => {
      archiveTask(task.id);
    });
  };

  const handleDeleteAll = () => {
    if (window.confirm(`Вы уверены, что хотите удалить все ${completedTasks.length} завершенных задач? Это действие нельзя отменить.`)) {
      completedTasks.forEach(task => {
        deleteTask(task.id);
      });
    }
  };

  const isAdmin = currentUser?.role === "admin";

  return (
    <div className={cn("mt-4 border-t border-white/10 pt-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 transition-transform group-hover:scale-110" />
          ) : (
            <ChevronRight className="w-4 h-4 transition-transform group-hover:scale-110" />
          )}
          <span className="text-sm font-medium">
            Завершенные задачи ({completedTasks.length})
          </span>
        </button>

        {isExpanded && completedTasks.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleArchiveAll}
              className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
              title="Архивировать все"
            >
              <Archive className="w-4 h-4" />
            </button>
            {isAdmin && (
              <button
                onClick={handleDeleteAll}
                className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                title="Удалить все"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tasks */}
      {isExpanded && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {completedTasks.map((task) => (
            <div key={task.id} className="opacity-75 hover:opacity-100 transition-opacity">
              <TaskCard task={task} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}