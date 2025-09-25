"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
  color?: string;
}

interface CustomSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function CustomSelect({
  options,
  value,
  onChange,
  placeholder = "Выберите...",
  className,
  disabled = false
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuRect, setMenuRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const selectRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(option => option.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsideTrigger = selectRef.current && selectRef.current.contains(target);
      const clickedInsideMenu = menuRef.current && menuRef.current.contains(target);
      if (!clickedInsideTrigger && !clickedInsideMenu) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const openMenu = () => {
    if (disabled) return;
    setIsOpen((prev) => {
      const next = !prev;
      if (!prev && selectRef.current) {
        const rect = selectRef.current.getBoundingClientRect();
        setMenuRect({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX, width: rect.width });
      }
      return next;
    });
  };

  return (
    <div ref={selectRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={openMenu}
        disabled={disabled}
        className={cn(
          "w-full min-w-[200px] px-4 py-3 bg-gray-800/80 backdrop-blur-sm border border-white/20 rounded-xl text-white",
          "focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-400/20 transition-all duration-200",
          "flex items-center justify-between shadow-lg hover:bg-gray-700/80 hover:border-white/30",
          disabled && "opacity-50 cursor-not-allowed",
          isOpen && "border-primary-400 ring-2 ring-primary-400/20 bg-gray-700/80"
        )}
      >
        <span className="flex items-center gap-2 truncate">
          {selectedOption?.color && (
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: selectedOption.color }}
            />
          )}
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ml-2",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && menuRect && createPortal(
        <div
          ref={menuRef}
          className="bg-gray-800/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl z-[99999] max-h-60 overflow-y-auto"
          style={{ position: 'fixed', top: menuRect.top + 8, left: menuRect.left, width: menuRect.width }}
          onMouseDown={(e) => {
            // предотвращаем всплытие mousedown до document, чтобы не закрывать меню раньше времени
            e.stopPropagation();
          }}
        >
          {options.map((option, index) => (
            <button
              key={`${option.value}-${index}`}
              type="button"
              onMouseDown={() => handleSelect(option.value)}
              className={cn(
                "w-full px-4 py-3 text-left hover:bg-white/15 transition-all duration-150",
                "flex items-center justify-between first:rounded-t-xl last:rounded-b-xl",
                "border-b border-white/5 last:border-b-0",
                option.value === value && "bg-primary-500/25 text-primary-200 hover:bg-primary-500/30"
              )}
            >
              <span className="flex items-center gap-3 truncate">
                {option.color && (
                  <div
                    className="w-3 h-3 rounded-full shadow-sm flex-shrink-0"
                    style={{ backgroundColor: option.color }}
                  />
                )}
                <span className="font-medium truncate">{option.label}</span>
              </span>
              {option.value === value && (
                <Check className="w-4 h-4 text-primary-300 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}