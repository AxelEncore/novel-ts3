import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date): string {
  if (!date || isNaN(date.getTime())) {
    return 'Неверная дата';
  }
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

export function formatDateTime(date: Date): string {
  if (!date || isNaN(date.getTime())) {
    return 'Неверная дата';
  }
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function isOverdue(date: Date): boolean {
  if (!date || isNaN(date.getTime())) {
    return false;
  }
  return date < new Date();
}

export function getDaysUntilDeadline(date: Date): number {
  if (!date || isNaN(date.getTime())) {
    return 0;
  }
  const today = new Date();
  const deadline = new Date(date);
  const diffTime = deadline.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getInitials(name: string): string {
  return name.
  split(" ").
  map((word) => word.charAt(0)).
  join("").
  toUpperCase().
  slice(0, 2);
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}