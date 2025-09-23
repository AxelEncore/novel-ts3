"use client";

import React, { useState } from "react";
import {
  // Business & Office
  Briefcase, Building, Calculator, Calendar, BarChart3, PieChart,
  Clipboard, Clock, CreditCard, Database, DollarSign, FileText, Folder,
  Globe, Home, Laptop, Mail, MapPin, Monitor, Phone,
  Printer, Search, Settings, Shield, Target, TrendingUp, Users, Wallet,
  
  // Development & Tech
  Code, Code2, Cpu, GitBranch, Github, HardDrive,
  Layers, Network, Package, Server, Smartphone,
  Terminal, Wifi, Zap,
  
  // Creative & Design
  Brush, Camera, Edit, Edit2, Edit3, Eye, Image, Palette, PenTool, Scissors,
  Sparkles, Type, Video, Volume2,
  
  // Communication & Social
  AtSign, Bell, MessageCircle, MessageSquare, Mic, Phone as PhoneCall, Send, Share,
  Share2, Users as Users2,
  
  // Education & Learning
  Award, Book, BookOpen, GraduationCap, Lightbulb,
  Star, Trophy,
  
  // Health & Medical
  Activity, Heart, Pill, Plus,
  
  // Transportation & Travel
  Car, Plane, Navigation,
  
  // Food & Dining
  Coffee, Utensils,
  
  // Sports & Recreation
  Gamepad2, Music, Play, Pause, SkipForward, SkipBack, Volume, Headphones,
  
  // Nature & Weather
  Cloud, CloudRain, Sun, Moon, Leaf,
  
  // Shopping & E-commerce
  ShoppingBag, ShoppingCart, Store, Tag, Gift,
  
  // Security & Safety
  Lock, Unlock, Key, AlertTriangle, CheckCircle,
  
  // Tools & Utilities
  Hammer, Wrench,
  
  // Gaming & Entertainment
  Gamepad, Film, Tv,
  
  // Arrows & Navigation
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ChevronUp, ChevronDown,
  ChevronLeft, ChevronRight,
  
  // Shapes & Symbols
  Circle, Square, Bookmark, Flag, Paperclip,
  
  // Actions & Controls
  RotateCcw, RotateCw, RefreshCw, Download, Upload, Save, Trash, Trash2,
  
  // Status & Indicators
  Check, X, AlertCircle, Info, HelpCircle, MinusCircle, PlusCircle,
  XCircle, CheckCircle2,
  
  // Files & Documents
  File, Archive, Link,
  
  // Miscellaneous
  Anchor, Atom, Battery, Bluetooth, Box,
  Bug, Crown, Feather, Fingerprint, Flame, Gem, Glasses,
  Infinity, Rocket, Umbrella, Watch
} from "lucide-react";
import { cn } from "@/lib/utils";

interface IconPickerProps {
  selectedIcon$1: string;
  onIconSelect: (iconName: string) => void;
  className$2: string;
}

const iconCategories = {
  "Бизнес и офис": [
    { name: "Briefcase", icon: Briefcase },
    { name: "Building", icon: Building },
    { name: "Calculator", icon: Calculator },
    { name: "Calendar", icon: Calendar },
    { name: "BarChart3", icon: BarChart3 },
    { name: "TrendingUp", icon: TrendingUp },
    { name: "PieChart", icon: PieChart },
    { name: "Clipboard", icon: Clipboard },
    { name: "Clock", icon: Clock },
    { name: "CreditCard", icon: CreditCard },
    { name: "Database", icon: Database },
    { name: "DollarSign", icon: DollarSign },
    { name: "FileText", icon: FileText },
    { name: "Folder", icon: Folder },
    { name: "Globe", icon: Globe },
    { name: "Home", icon: Home },
    { name: "Laptop", icon: Laptop },
    { name: "Mail", icon: Mail },
    { name: "MapPin", icon: MapPin },
    { name: "Monitor", icon: Monitor },
    { name: "Phone", icon: Phone },
    { name: "Printer", icon: Printer },
    { name: "Search", icon: Search },
    { name: "Settings", icon: Settings },
    { name: "Shield", icon: Shield },
    { name: "Target", icon: Target },
    { name: "Users", icon: Users },
    { name: "Wallet", icon: Wallet }
  ],
  "Разработка и технологии": [
    { name: "Code", icon: Code },
    { name: "Code2", icon: Code2 },
    { name: "Cpu", icon: Cpu },
    { name: "GitBranch", icon: GitBranch },
    { name: "Github", icon: Github },
    { name: "HardDrive", icon: HardDrive },
    { name: "Layers", icon: Layers },
    { name: "Network", icon: Network },
    { name: "Package", icon: Package },
    { name: "Server", icon: Server },
    { name: "Smartphone", icon: Smartphone },
    { name: "Terminal", icon: Terminal },
    { name: "Wifi", icon: Wifi },
    { name: "Zap", icon: Zap }
  ],
  "Творчество и дизайн": [
    { name: "Brush", icon: Brush },
    { name: "Camera", icon: Camera },
    { name: "Edit", icon: Edit },
    { name: "Edit2", icon: Edit2 },
    { name: "Edit3", icon: Edit3 },
    { name: "Eye", icon: Eye },
    { name: "Image", icon: Image },
    { name: "Palette", icon: Palette },
    { name: "PenTool", icon: PenTool },
    { name: "Scissors", icon: Scissors },
    { name: "Sparkles", icon: Sparkles },
    { name: "Type", icon: Type },
    { name: "Video", icon: Video },
    { name: "Volume2", icon: Volume2 }
  ],
  "Коммуникации": [
    { name: "AtSign", icon: AtSign },
    { name: "Bell", icon: Bell },
    { name: "MessageCircle", icon: MessageCircle },
    { name: "MessageSquare", icon: MessageSquare },
    { name: "Mic", icon: Mic },
    { name: "Phone", icon: PhoneCall },
    { name: "Send", icon: Send },
    { name: "Share", icon: Share },
    { name: "Share2", icon: Share2 },
    { name: "Users", icon: Users2 }
  ],
  "Образование": [
    { name: "Award", icon: Award },
    { name: "Book", icon: Book },
    { name: "BookOpen", icon: BookOpen },
    { name: "GraduationCap", icon: GraduationCap },
    { name: "Lightbulb", icon: Lightbulb },
    { name: "Star", icon: Star },
    { name: "Trophy", icon: Trophy }
  ],
  "Здоровье": [
    { name: "Activity", icon: Activity },
    { name: "Heart", icon: Heart },
    { name: "Pill", icon: Pill },
    { name: "Plus", icon: Plus }
  ],
  "Транспорт": [
    { name: "Car", icon: Car },
    { name: "Plane", icon: Plane },
    { name: "Navigation", icon: Navigation }
  ],
  "Еда и напитки": [
    { name: "Coffee", icon: Coffee },
    { name: "Utensils", icon: Utensils }
  ],
  "Развлечения": [
    { name: "Gamepad2", icon: Gamepad2 },
    { name: "Music", icon: Music },
    { name: "Play", icon: Play },
    { name: "Pause", icon: Pause },
    { name: "SkipForward", icon: SkipForward },
    { name: "SkipBack", icon: SkipBack },
    { name: "Volume", icon: Volume },
    { name: "Headphones", icon: Headphones }
  ],
  "Природа": [
    { name: "Cloud", icon: Cloud },
    { name: "CloudRain", icon: CloudRain },
    { name: "Sun", icon: Sun },
    { name: "Moon", icon: Moon },
    { name: "Leaf", icon: Leaf }
  ],
  "Покупки": [
    { name: "ShoppingBag", icon: ShoppingBag },
    { name: "ShoppingCart", icon: ShoppingCart },
    { name: "Store", icon: Store },
    { name: "Tag", icon: Tag },
    { name: "Gift", icon: Gift }
  ],
  "Безопасность": [
    { name: "Lock", icon: Lock },
    { name: "Unlock", icon: Unlock },
    { name: "Key", icon: Key },
    { name: "AlertTriangle", icon: AlertTriangle },
    { name: "CheckCircle", icon: CheckCircle }
  ],
  "Инструменты": [
    { name: "Hammer", icon: Hammer },
    { name: "Wrench", icon: Wrench }
  ],
  "Игры": [
    { name: "Gamepad", icon: Gamepad },
    { name: "Film", icon: Film },
    { name: "Tv", icon: Tv }
  ],
  "Стрелки": [
    { name: "ArrowUp", icon: ArrowUp },
    { name: "ArrowDown", icon: ArrowDown },
    { name: "ArrowLeft", icon: ArrowLeft },
    { name: "ArrowRight", icon: ArrowRight },
    { name: "ChevronUp", icon: ChevronUp },
    { name: "ChevronDown", icon: ChevronDown },
    { name: "ChevronLeft", icon: ChevronLeft },
    { name: "ChevronRight", icon: ChevronRight }
  ],
  "Формы": [
    { name: "Circle", icon: Circle },
    { name: "Square", icon: Square },
    { name: "Bookmark", icon: Bookmark },
    { name: "Flag", icon: Flag },
    { name: "Paperclip", icon: Paperclip }
  ],
  "Действия": [
    { name: "Square", icon: Square },
    { name: "RotateCcw", icon: RotateCcw },
    { name: "RotateCw", icon: RotateCw },
    { name: "RefreshCw", icon: RefreshCw },
    { name: "Download", icon: Download },
    { name: "Upload", icon: Upload },
    { name: "Save", icon: Save },
    { name: "Trash", icon: Trash },
    { name: "Trash2", icon: Trash2 }
  ],
  "Статус": [
    { name: "Check", icon: Check },
    { name: "X", icon: X },
    { name: "AlertCircle", icon: AlertCircle },
    { name: "Info", icon: Info },
    { name: "HelpCircle", icon: HelpCircle },
    { name: "MinusCircle", icon: MinusCircle },
    { name: "PlusCircle", icon: PlusCircle },
    { name: "XCircle", icon: XCircle },
    { name: "CheckCircle2", icon: CheckCircle2 }
  ],
  "Файлы": [
    { name: "File", icon: File },
    { name: "Archive", icon: Archive },
    { name: "Link", icon: Link }
  ],
  "Разное": [
    { name: "Anchor", icon: Anchor },
    { name: "Atom", icon: Atom },
    { name: "Battery", icon: Battery },
    { name: "Bluetooth", icon: Bluetooth },
    { name: "Box", icon: Box },
    { name: "Bug", icon: Bug },
    { name: "Crown", icon: Crown },
    { name: "Feather", icon: Feather },
    { name: "Fingerprint", icon: Fingerprint },
    { name: "Flame", icon: Flame },
    { name: "Gem", icon: Gem },
    { name: "Glasses", icon: Glasses },
    { name: "Infinity", icon: Infinity },
    { name: "Rocket", icon: Rocket },
    { name: "Umbrella", icon: Umbrella },
    { name: "Watch", icon: Watch }
  ]
};

export function IconPicker({ selectedIcon, onIconSelect, className }: IconPickerProps) {
  const [activeCategory, setActiveCategory] = useState(Object.keys(iconCategories)[0]);
  const [searchTerm, setSearchTerm] = useState("");

  const allIcons = Object.values(iconCategories).flat();
  const filteredIcons = searchTerm
    ? allIcons.filter(icon => 
        icon.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : iconCategories[activeCategory as keyof typeof iconCategories];

  return (
    <div className={cn("w-full", className)}>
      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Поиск иконок..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
        />
      </div>

      {/* Categories */}
      {!searchTerm && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {Object.keys(iconCategories).map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={cn(
                  "px-3 py-1 text-sm rounded-full transition-colors",
                  activeCategory === category
                    ? "bg-primary-500 text-white"
                    : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                )}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Icons Grid */}
      <div className="grid grid-cols-8 gap-2 max-h-64 overflow-y-auto">
        {filteredIcons.map(({ name, icon: IconComponent }) => (
          <button
            key={name}
            onClick={() => onIconSelect(name)}
            className={cn(
              "p-3 rounded-lg border transition-all hover:scale-105",
              selectedIcon === name
                ? "border-primary-500 bg-primary-500/20 text-primary-300"
                : "border-white/10 bg-white/5 text-gray-400 hover:border-white/20 hover:text-white"
            )}
            title={name}
          >
            <IconComponent className="w-5 h-5" />
          </button>
        ))}
      </div>

      {filteredIcons.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          Иконки не найдены
        </div>
      )}
    </div>
  );
}