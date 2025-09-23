"use client";

import React, { useState, useEffect, useRef } from "react";
import { Task, TaskPriority, User } from "@/types";
import { useApp } from "@/contexts/AppContext";
import { cn, formatDate, getInitials } from "@/lib/utils";
import {
  X,
  Calendar,
  User as UserIcon,
  Flag,
  Paperclip,
  MessageSquare,
  Plus,
  Trash2,
  Save } from
"lucide-react";
import { CustomSelect } from "./CustomSelect";
import { MultiSelect } from "./MultiSelect";
import { logTaskAssigneesChanged } from "@/utils/taskLogger";

interface TaskModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
}

const priorityOptions: {value: TaskPriority;label: string;color: string;}[] =
[
{ value: "low", label: "Низкий", color: "text-green-500" },
{ value: "medium", label: "Средний", color: "text-yellow-500" },
{ value: "high", label: "Высокий", color: "text-orange-500" },
{ value: "urgent", label: "Срочный", color: "text-red-500" }];

const statusLabels: Record<string, string> = {
  "todo": "К выполнению",
  "in-progress": "В работе",
  "review": "На проверке",
  "done": "Выполнено"
};

const statusColors: Record<string, string> = {
  "todo": "bg-gray-500/20 text-gray-300 border-gray-500/30",
  "in-progress": "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  "review": "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "done": "bg-emerald-500/25 text-emerald-300 border-emerald-500/40"
};


export function TaskModal({ task, isOpen, onClose, onSave }: TaskModalProps) {
  const { state, dispatch, updateTask } = useApp();
  const [editedTask, setEditedTask] = useState<Task>(task);
  const [newComment, setNewComment] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditedTask(task);
  }, [task]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const newAttachments = Array.from(files).map(file => ({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: file.name,
        url: URL.createObjectURL(file),
        type: file.type.startsWith('image/') ? 'image' as const : 
              file.type.includes('pdf') || file.type.includes('document') ? 'document' as const : 
              'other' as const,
        size: file.size,
        uploadedBy: state.currentUser?.id || '',
        uploadedAt: new Date()
      }));
      
      setEditedTask({
        ...editedTask,
        attachments: [...(editedTask.attachments || []), ...newAttachments]
      });
    }
    // Reset file input
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    setEditedTask({
      ...editedTask,
      attachments: (editedTask.attachments || []).filter(att => att.id !== attachmentId)
    });
  };

  if (!isOpen) return null;

  const handleSave = async () => {
    try {
      // Log assignees changes if they occurred
      const originalAssignees = task.assignees || (task.assignee ? [task.assignee] : []);
      const newAssignees = editedTask.assignees || [];
      
      const originalNames = originalAssignees.map(a => a.name);
      const newNames = newAssignees.map(a => a.name);
      
      if (JSON.stringify(originalNames.sort()) !== JSON.stringify(newNames.sort()) && state.currentUser) {
        logTaskAssigneesChanged(
          dispatch,
          task.id,
          task.boardId,
          task.projectId,
          task.title,
          state.currentUser.id,
          state.currentUser.name,
          originalNames,
          newNames
        );
      }
      
      const updatedTask = {
        ...editedTask,
        updatedAt: new Date()
      };
      
      await updateTask(editedTask.id, updatedTask);
      onClose();
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleAddComment = () => {
    if (!newComment.trim() || !state.currentUser) return;

    const comment = {
      id: Date.now().toString(),
      content: newComment,
      author: state.currentUser,
      createdAt: new Date()
    };

    setEditedTask({
      ...editedTask,
      comments: [...editedTask.comments, comment]
    });
    setNewComment("");
  };

  const availableUsers = state.selectedProject?.members || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      data-oid=".x7bai8">

      <div
        className="glass-dark w-full max-w-4xl max-h-[90vh] overflow-hidden"
        data-oid="a6d2100">

        {/* Header */}
        <div
          className="flex items-center justify-between p-6 border-b border-white/10"
          data-oid="ktojc2t">

          <h2 className="text-xl font-semibold text-white" data-oid="-pvm16q">
            Редактирование задачи
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            data-oid="d2gg2sp">

            <X className="w-5 h-5 text-gray-400" data-oid="be2lgo5" />
          </button>
        </div>

        <div className="flex h-[calc(90vh-80px)]" data-oid="l200d2:">
          {/* Main content */}
          <div className="flex-1 p-6 overflow-y-auto" data-oid="0yg709e">
            {/* Title */}
            <div className="mb-6" data-oid="fxsuh7d">
              <label
                className="block text-sm font-medium text-gray-300 mb-2"
                data-oid=":ubc.od">

                Название задачи
              </label>
              <input
                type="text"
                value={editedTask.title}
                onChange={(e) =>
                setEditedTask({ ...editedTask, title: e.target.value })
                }
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
                placeholder="Введите название задачи"
                data-oid="4b-h4w1" />

            </div>

            {/* Description */}
            <div className="mb-6" data-oid="q4k0.uw">
              <label
                className="block text-sm font-medium text-gray-300 mb-2"
                data-oid="3oa_2fy">

                Описание
              </label>
              <textarea
                value={editedTask.description || ""}
                onChange={(e) =>
                setEditedTask({ ...editedTask, description: e.target.value })
                }
                rows={4}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 resize-none"
                placeholder="Добавьте описание задачи"
                data-oid="5:ze-bw" />

            </div>

            {/* Properties */}
            <div
              className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6"
              data-oid="26u4lyl">

              {/* Assignees */}
              <div data-oid="frcbsgd">
                <label
                  className="block text-sm font-medium text-gray-300 mb-2"
                  data-oid="folklz:">

                  Исполнители
                </label>
                <MultiSelect
                  value={editedTask.assignees || (editedTask.assignee ? [editedTask.assignee] : [])}
                  onChange={(users) => {
                    setEditedTask({ 
                      ...editedTask, 
                      assignees: users,
                      assignee: users.length > 0 ? users[0] : undefined // Keep backward compatibility
                    });
                  }}
                  options={availableUsers}
                  placeholder="Выберите исполнителей"
                />
              </div>

              {/* Priority */}
              <div data-oid="vwb1low">
                <label
                  className="block text-sm font-medium text-gray-300 mb-2"
                  data-oid="t.69qd2">

                  Приоритет
                </label>
                <CustomSelect
                  value={editedTask.priority}
                  onChange={(value) =>
                  setEditedTask({
                    ...editedTask,
                    priority: value as TaskPriority
                  })
                  }
                  options={priorityOptions.map((option) => ({
                    value: option.value,
                    label: option.label
                  }))}
                  placeholder="Выберите приоритет"
                />
              </div>

              {/* Deadline */}
              <div data-oid="ppr_wxo">
                <label
                  className="block text-sm font-medium text-gray-300 mb-2"
                  data-oid="hhl_o2h">

                  Дедлайн
                </label>
                <input
                  type="date"
                  value={
                  editedTask.deadline ?
                  editedTask.deadline.toISOString().split("T")[0] :
                  ""
                  }
                  onChange={(e) => {
                    const date = e.target.value ? (() => {
                      const newDate = new Date(e.target.value);
                      return isNaN(newDate.getTime()) ? undefined : newDate;
                    })() : undefined;
                    setEditedTask({ ...editedTask, deadline: date });
                  }}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  data-oid="esq072m" />

              </div>

              {/* Tags */}
              <div data-oid="-q29zox">
                <label
                  className="block text-sm font-medium text-gray-300 mb-2"
                  data-oid="43e09wy">

                  Теги
                </label>
                <input
                  type="text"
                  value={editedTask.tags?.join(", ") || ""}
                  onChange={(e) => {
                    const tags = e.target.value.
                    split(",").
                    map((tag) => tag.trim()).
                    filter(Boolean);
                    setEditedTask({ ...editedTask, tags });
                  }}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
                  placeholder="Введите теги через запятую"
                  data-oid="wh370-5" />

              </div>
            </div>

            {/* Comments */}
            <div className="mb-6" data-oid="gp.jsd0">
              <h3
                className="text-lg font-medium text-white mb-4"
                data-oid="nbvw-e7">

                Комментарии
              </h3>

              {/* Add comment */}
              <div className="mb-4" data-oid="475evbq">
                <div className="flex gap-3" data-oid="-lc2a3c">
                  {state.settings?.showAvatars && (
                    <div className="flex-shrink-0" data-oid="ky0_ms0">
                      {state.currentUser?.avatar ?
                      <img
                        src={state.currentUser.avatar}
                        alt={state.currentUser.name}
                        className="w-8 h-8 rounded-full"
                        data-oid="atbpn0_" /> :


                      <div
                        className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-sm text-white"
                        data-oid="luwz7cn">

                          {state.currentUser ?
                        getInitials(state.currentUser.name) :
                        "?"}
                        </div>
                      }
                    </div>
                  )}
                  <div className="flex-1" data-oid="865f59w">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 resize-none"
                      placeholder="Добавить комментарий..."
                      data-oid="q5rai27" />


                    <div className="flex justify-end mt-2" data-oid="jk.3u53">
                      <button
                        onClick={handleAddComment}
                        disabled={!newComment.trim()}
                        className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        data-oid="h-4:r_m">

                        Добавить
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comments list */}
              <div className="space-y-4" data-oid="ot-bjl:">
                {editedTask.comments?.map((comment) =>
                <div
                  key={comment.id}
                  className="flex gap-3"
                  data-oid="beb5_vl">

                    <div className="flex-shrink-0" data-oid="9j:s0:d">
                      {comment.author.avatar ?
                    <img
                      src={comment.author.avatar}
                      alt={comment.author.name}
                      className="w-8 h-8 rounded-full"
                      data-oid="enozgl9" /> :


                    <div
                      className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-sm text-white"
                      data-oid="sjsm.b1">

                          {getInitials(comment.author.name)}
                        </div>
                    }
                    </div>
                    <div className="flex-1" data-oid="84ugd7p">
                      <div
                      className="flex items-center gap-2 mb-1"
                      data-oid="9h_i0nf">

                        <span
                        className="text-sm font-medium text-white"
                        data-oid="2vn.s7k">

                          {comment.author.name}
                        </span>
                        <span
                        className="text-xs text-gray-400"
                        data-oid="kf2s72y">

                          {formatDate(new Date(comment.createdAt))}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300" data-oid="..0.xv9">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div
            className="w-80 border-l border-white/10 p-6 bg-white/5"
            data-oid="ql.poch">

            <h3
              className="text-lg font-medium text-white mb-4"
              data-oid=".nenowg">

              Информация
            </h3>

            <div className="space-y-4" data-oid="wql9ct0">
              {/* Status */}
              <div data-oid="w:-8-5r">
                <span className="text-sm text-gray-400" data-oid="l6pzqoc">
                  Статус:
                </span>
                <div className="mt-1">
                  <span className={cn(
                    "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border",
                    statusColors[editedTask.status] || "bg-gray-500/20 text-gray-300 border-gray-500/30"
                  )}>
                    {statusLabels[editedTask.status] || editedTask.status?.replace("-", " ") || "Не указан"}
                  </span>
                </div>
              </div>

              {/* Created */}
              <div data-oid="_34srde">
                <span className="text-sm text-gray-400" data-oid="56ub_4q">
                  Создано:
                </span>
                <p className="text-white" data-oid=":_-upsr">
                  {formatDate(new Date(editedTask.createdAt))}
                </p>
              </div>

              {/* Reporter */}
              <div data-oid="xv3obyt">
                <span className="text-sm text-gray-400" data-oid="kjy3ugs">
                  Автор:
                </span>
                <p className="text-white" data-oid="blsrf4i">
                  {editedTask.reporter.name}
                </p>
              </div>

              {/* Attachments */}
              <div data-oid="540:wz3">
                <div
                  className="flex items-center justify-between mb-2"
                  data-oid="zg:g:-r">

                  <span className="text-sm text-gray-400" data-oid="q7-wgrp">
                    Вложения:
                  </span>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                    title="Добавить вложение"
                    data-oid="-g-tqxr">

                    <Plus
                      className="w-4 h-4 text-gray-400"
                      data-oid="pcbp3w3" />

                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileUpload}
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.zip,.rar"
                  />
                </div>
                {editedTask.attachments.length === 0 ?
                <p className="text-sm text-gray-500" data-oid="_-6em6z">
                    Нет вложений
                  </p> :

                <div className="space-y-2" data-oid="ojm172r">
                    {editedTask.attachments?.map((attachment) =>
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between gap-2 p-2 bg-white/5 rounded hover:bg-white/10 transition-colors"
                    data-oid="vhpzgr7">

                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Paperclip
                            className="w-4 h-4 text-gray-400 flex-shrink-0"
                            data-oid="3c2foa5" />

                          <span
                            className="text-sm text-white truncate"
                            data-oid="95zy.66">

                            {attachment.name}
                          </span>
                          <span className="text-xs text-gray-500 flex-shrink-0">
                            ({(attachment.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        
                        <button
                          onClick={() => handleRemoveAttachment(attachment.id)}
                          className="p-1 hover:bg-primary-500/20 rounded transition-colors flex-shrink-0"
                          title="Удалить вложение">
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </button>
                      </div>
                  )}
                  </div>
                }
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 space-y-3" data-oid="9-lejip">
              <button
                onClick={handleSave}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                data-oid="pc_b6cs">

                <Save className="w-4 h-4" data-oid="q6bf507" />
                Сохранить
              </button>
              <button
                onClick={onClose}
                className="w-full px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                data-oid="2cl-_l8">

                Отмена
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>);

}