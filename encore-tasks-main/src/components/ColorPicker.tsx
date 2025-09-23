"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Palette, Pipette } from "lucide-react";

interface ColorPickerProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
  className?: string;
}

const colorPalettes = {
  "Основные": [
    "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e",
    "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1",
    "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#64748b"
  ],
  "Пастельные": [
    "#fecaca", "#fed7aa", "#fde68a", "#fef3c7", "#d9f99d", "#bbf7d0",
    "#a7f3d0", "#99f6e4", "#a5f3fc", "#bae6fd", "#bfdbfe", "#c7d2fe",
    "#ddd6fe", "#e9d5ff", "#f3e8ff", "#fce7f3", "#fecdd3", "#e2e8f0"
  ],
  "Темные": [
    "#991b1b", "#9a3412", "#92400e", "#854d0e", "#365314", "#14532d",
    "#064e3b", "#134e4a", "#164e63", "#0c4a6e", "#1e3a8a", "#312e81",
    "#581c87", "#701a75", "#86198f", "#be185d", "#be123c", "#334155"
  ],
  "Градиенты": [
    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
    "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
    "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
    "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
    "linear-gradient(135deg, #fad0c4 0%, #ffd1ff 100%)",
    "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
    "linear-gradient(135deg, #ff8a80 0%, #ea80fc 100%)"
  ],
  "Профессиональные": [
    "#1f2937", "#374151", "#4b5563", "#6b7280", "#9ca3af", "#d1d5db",
    "#1e40af", "#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#dbeafe",
    "#059669", "#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#d1fae5",
    "#dc2626", "#ef4444", "#f87171", "#fca5a5", "#fecaca", "#fee2e2"
  ],
  "Природные": [
    "#365314", "#4d7c0f", "#65a30d", "#84cc16", "#a3e635", "#bef264",
    "#0f766e", "#0d9488", "#14b8a6", "#2dd4bf", "#5eead4", "#99f6e4",
    "#92400e", "#c2410c", "#ea580c", "#fb923c", "#fdba74", "#fed7aa",
    "#7c2d12", "#9a3412", "#c2410c", "#ea580c", "#f97316", "#fb923c"
  ]
};

export function ColorPicker({ selectedColor, onColorSelect, className }: ColorPickerProps) {
  const [activeTab, setActiveTab] = useState("Основные");
  const [customColor, setCustomColor] = useState("#6366f1");
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  const handleCustomColorChange = (color: string) => {
    setCustomColor(color);
    onColorSelect(color);
  };

  const isGradient = (color: string) => color.startsWith('linear-gradient');

  return (
    <div className={cn("w-full", className)}>
      {/* Tabs */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-1 mb-3">
          {Object.keys(colorPalettes).map((palette) => (
            <button
              key={palette}
              onClick={() => setActiveTab(palette)}
              className={cn(
                "px-3 py-1 text-sm rounded-full transition-colors",
                activeTab === palette
                  ? "bg-primary-500 text-white"
                  : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
              )}
            >
              {palette}
            </button>
          ))}
          <button
            onClick={() => setShowCustomPicker(!showCustomPicker)}
            className={cn(
              "px-3 py-1 text-sm rounded-full transition-colors flex items-center gap-1",
              showCustomPicker
                ? "bg-primary-500 text-white"
                : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
            )}
          >
            <Pipette className="w-3 h-3" />
            Свой цвет
          </button>
        </div>
      </div>

      {/* Custom Color Picker */}
      {showCustomPicker && (
        <div className="mb-4 p-3 bg-white/5 border border-white/10 rounded-lg">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={customColor}
              onChange={(e) => handleCustomColorChange(e.target.value)}
              className="w-12 h-8 rounded border border-white/20 bg-transparent cursor-pointer"
            />
            <input
              type="text"
              value={customColor}
              onChange={(e) => handleCustomColorChange(e.target.value)}
              placeholder="#6366f1"
              className="flex-1 px-3 py-1 bg-white/5 border border-white/10 rounded text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
            />
            <button
              onClick={() => onColorSelect(customColor)}
              className="px-3 py-1 bg-primary-500 hover:bg-primary-600 text-white rounded transition-colors"
            >
              Применить
            </button>
          </div>
        </div>
      )}

      {/* Color Grid */}
      {!showCustomPicker && (
        <div className="grid grid-cols-8 gap-1.5">
          {colorPalettes[activeTab as keyof typeof colorPalettes].map((color, index) => (
            <button
              key={`${activeTab}-${index}`}
              onClick={() => onColorSelect(color)}
              className={cn(
                "w-8 h-8 rounded-lg border-2 transition-all hover:scale-105 relative overflow-hidden",
                selectedColor === color
                  ? "border-white scale-110 shadow-lg"
                  : "border-white/20 hover:border-white/40"
              )}
              style={{
                background: color
              }}
              title={color}
            >
              {selectedColor === color && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 bg-white rounded-full shadow-lg" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Selected Color Preview */}
      <div className="mt-4 p-3 bg-white/5 border border-white/10 rounded-lg">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded border border-white/20"
            style={{ background: selectedColor }}
          />
          <div className="flex-1">
            <div className="text-sm text-gray-300">Выбранный цвет:</div>
            <div className="text-xs text-gray-400 font-mono">
              {isGradient(selectedColor) ? 'Градиент' : selectedColor}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}