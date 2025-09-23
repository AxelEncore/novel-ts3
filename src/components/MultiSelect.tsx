"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, X } from "lucide-react";
import { User } from "@/types";
import { getInitials } from "@/lib/utils";

interface MultiSelectProps {
  value: User[];
  onChange: (users: User[]) => void;
  options: User[];
  placeholder?: string;
  className?: string;
  maxDisplay?: number;
}

export function MultiSelect({
  value,
  onChange,
  options,
  placeholder = "Выберите исполнителей",
  className = "",
  maxDisplay = 3
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleUser = (user: User) => {
    const isSelected = value.some(u => u.id === user.id);
    if (isSelected) {
      onChange(value.filter(u => u.id !== user.id));
    } else {
      onChange([...value, user]);
    }
  };

  const handleRemoveUser = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter(u => u.id !== userId));
  };

  const displayUsers = value.slice(0, maxDisplay);
  const remainingCount = value.length - maxDisplay;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-left focus:outline-none focus:border-primary-500 transition-colors flex items-center justify-between min-h-[42px]"
      >
        <div className="flex items-center gap-2 flex-wrap">
          {value.length === 0 ? (
            <span className="text-gray-400">{placeholder}</span>
          ) : (
            <>
              {displayUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-1 bg-primary-500/20 text-primary-300 px-2 py-1 rounded text-sm"
                >
                  <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center text-xs text-white">
                    {getInitials(user.name)}
                  </div>
                  <span className="truncate max-w-[80px]">{user.name}</span>
                  <span
                    onClick={(e) => handleRemoveUser(user.id, e)}
                    className="hover:bg-primary-500/30 rounded p-0.5 transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </span>
                </div>
              ))}
              {remainingCount > 0 && (
                <div className="bg-gray-500/20 text-gray-300 px-2 py-1 rounded text-sm">
                  +{remainingCount}
                </div>
              )}
            </>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-white/10 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
          {options.length === 0 ? (
            <div className="px-4 py-2 text-gray-400 text-sm">
              Нет доступных пользователей
            </div>
          ) : (
            options.map((user) => {
              const isSelected = value.some(u => u.id === user.id);
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleToggleUser(user)}
                  className={`w-full px-4 py-2 text-left hover:bg-white/5 transition-colors flex items-center gap-3 ${
                    isSelected ? "bg-primary-500/20 text-primary-300" : "text-white"
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-sm text-white">
                    {getInitials(user.name)}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-gray-400">{user.email}</div>
                  </div>
                  {isSelected && (
                    <div className="w-4 h-4 rounded-full bg-primary-500 flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}