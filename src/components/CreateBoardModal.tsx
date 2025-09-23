"use client";

import React, { useState } from "react";
import { Board } from "@/types";
import { generateId } from "@/lib/utils";
import { X, Save, Kanban } from "lucide-react";
import { IconPicker } from "./IconPicker";

interface CreateBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (board: Omit<Board, "id" | "createdAt">) => void;
  projectId: string;
}

export function CreateBoardModal({ isOpen, onClose, onSave, projectId }: CreateBoardModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    icon: "Kanban"
  });

  const handleSave = () => {
    if (!formData.name.trim()) return;

    const newBoard: Omit<Board, "id" | "createdAt"> = {
      name: formData.name,
      projectId,
      icon: formData.icon,
      columns: [
        {
          id: "1",
          name: "К выполнению",
          title: "К выполнению",
          tasks: [],
          position: 0,
          color: "#a5b4fc"
        },
        {
          id: "2",
          name: "В работе",
          title: "В работе",
          tasks: [],
          position: 1,
          color: "#3b82f6"
        },
        {
          id: "3",
          name: "На проверке",
          title: "На проверке",
          tasks: [],
          position: 2,
          color: "#8b5cf6"
        },
        {
          id: "4",
          name: "Выполнено",
          title: "Выполнено",
          tasks: [],
          position: 3,
          color: "#4f46e5"
        }
      ]
    };

    onSave(newBoard);
    setFormData({ name: "", icon: "Kanban" });
    onClose();
  };

  const handleClose = () => {
    setFormData({ name: "", icon: "Kanban" });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">
            Создать доску
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Название доски *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
              placeholder="Введите название доски"
              autoFocus
            />
          </div>

          {/* Icon */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Иконка доски
            </label>
            <IconPicker
              selectedIcon={formData.icon}
              onIconSelect={(icon) => setFormData({ ...formData, icon })}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 p-6 border-t border-white/10">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={!formData.name.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-4 h-4" />
            Создать доску
          </button>
        </div>
      </div>
    </div>
  );
}