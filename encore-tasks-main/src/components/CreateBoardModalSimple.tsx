"use client";

import React, { useState } from "react";
import { Board } from "@/types";
import { generateId } from "@/lib/utils";
import { X, Save, Kanban } from "lucide-react";


interface CreateBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (board: Omit<Board, "id" | "createdAt">) => void;
  projectId: string;
}

export function CreateBoardModalSimple({ isOpen, onClose, onSave, projectId }: CreateBoardModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: ""
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  if (!isOpen) return null;

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = "Название доски обязательно";
    } else if (formData.name.length < 2) {
      newErrors.name = "Название должно содержать минимум 2 символа";
    } else if (formData.name.length > 100) {
      newErrors.name = "Название не должно превышать 100 символов";
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = "Описание не должно превышать 500 символов";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const boardData: Omit<Board, "id" | "createdAt"> = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      project_id: projectId, // Используем project_id для соответствия серверной схеме
      created_by: "", // Will be set by the backend
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    onSave(boardData);
    
    // Reset form
    setFormData({
      name: "",
      description: ""
    });
    setErrors({});
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Kanban className="w-5 h-5" />
            Создать доску
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              Название доски *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Введите название доски"
              className={`w-full px-3 py-2 bg-white/5 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 transition-colors ${
                errors.name ? 'border-red-500' : 'border-white/20'
              }`}
              autoFocus
            />
            {errors.name && (
              <p className="text-sm text-red-400">{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              Описание
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Введите описание доски (необязательно)"
              rows={3}
              className={`w-full px-3 py-2 bg-white/5 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 transition-colors resize-none ${
                errors.description ? 'border-red-500' : 'border-white/20'
              }`}
            />
            {errors.description && (
              <p className="text-sm text-red-400">{errors.description}</p>
            )}
          </div>



          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Создать
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateBoardModalSimple;