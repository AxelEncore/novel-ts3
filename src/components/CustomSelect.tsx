"use client";

import React, { useState, useRef, useEffect } from "react";
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
  const selectRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(option => option.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
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

  return (
    <div ref={selectRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
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

      {isOpen && (
        <div className="absolute top-full left-0 w-full min-w-[200px] mt-2 bg-gray-800/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto">
          {options.map((option, index) => (
            <button
              key={`${option.value}-${index}`}
              type="button"
              onClick={() => handleSelect(option.value)}
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
        </div>
      )}
    </div>
  );
}