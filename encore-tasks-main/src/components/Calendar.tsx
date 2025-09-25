"use client";

import React, { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { Task } from "@/types";
import { cn, formatDate } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon } from
"lucide-react";

interface CalendarProps {
  onTaskClick: (task: Task) => void;
}

export function Calendar({ onTaskClick }: CalendarProps) {
  const { state } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date());

  const today = new Date();
  // Debug: log a small sample
  React.useEffect(() => {
    try {
      const sample = (state.tasks || []).slice(0, 5).map((t: any) => ({ id: t.id, title: t.title, due_date: t?.due_date, deadline: t?.deadline, dueDate: t?.dueDate }));
      console.log('[Calendar] Debug sample tasks:', sample);
    } catch {}
  }, [state.tasks]);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get first day of month and number of days
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const firstDayWeekday = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  // Generate calendar days
  const calendarDays = [];

  // Previous month days
  const prevMonth = new Date(year, month - 1, 0);
  for (let i = firstDayWeekday - 1; i >= 0; i--) {
    calendarDays.push({
      date: new Date(year, month - 1, prevMonth.getDate() - i),
      isCurrentMonth: false
    });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push({
      date: new Date(year, month, day),
      isCurrentMonth: true
    });
  }

  // Next month days to fill the grid
  const remainingDays = 42 - calendarDays.length;
  for (let day = 1; day <= remainingDays; day++) {
    calendarDays.push({
      date: new Date(year, month + 1, day),
      isCurrentMonth: false
    });
  }

  const toDayKey = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const normalizeToDayKey = (raw: any): string | null => {
    if (!raw) return null;
    if (raw instanceof Date) return toDayKey(raw);
    if (typeof raw === 'number') {
      const ms = raw < 1e12 ? raw * 1000 : raw;
      const d = new Date(ms);
      return isNaN(d.getTime()) ? null : toDayKey(d);
    }
    if (typeof raw === 'string') {
      const s = raw.trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
      const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
      if (m) {
        const dd = m[1], mm = m[2], yyyy = m[3];
        return `${yyyy}-${mm}-${dd}`;
      }
      const d = new Date(s);
      if (!isNaN(d.getTime())) return toDayKey(d);
      return null;
    }
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : toDayKey(d);
  };
  const extractRawDate = (task: any): any => {
    // Only deadline/due-like keys
    const candidates = [task?.due_date, task?.deadline, task?.dueDate];
    const first = candidates.find((v) => !!v);
    if (first) return first;
    try {
      const keyMatches = (key: string) => /(dead|due|end)/i.test(key) && !/created/i.test(key);
      for (const [k, v] of Object.entries(task || {})) {
        if (!v) continue;
        if (keyMatches(k) && (typeof v === 'string' || typeof v === 'number' || v instanceof Date)) {
          const candidate = normalizeToDayKey(v);
          if (candidate) return v;
        }
        if (typeof v === 'object' && !Array.isArray(v)) {
          for (const [kk, vv] of Object.entries(v || {})) {
            if (!vv) continue;
            if (keyMatches(kk) && (typeof vv === 'string' || typeof vv === 'number' || vv instanceof Date)) {
              const candidate = normalizeToDayKey(vv);
              if (candidate) return vv;
            }
          }
        }
      }
    } catch {}
    return null;
  };
  const getTasksForDate = (date: Date): Task[] => {
    const dayKey = toDayKey(date);
    return state.tasks.filter((task: any) => {
      const rawPrimary = task?.due_date ?? task?.deadline ?? task?.dueDate;
      const raw = rawPrimary ?? extractRawDate(task);
      const taskKey = normalizeToDayKey(raw);
      if (!taskKey) return false;
      const isArchived = (task as any)?.isArchived || (task as any)?.is_archived || false;
      if (task?.status === 'done' || isArchived) return false;
      return taskKey === dayKey;
    }).sort((a: any, b: any) => {
      // Sort to show current user's tasks first (tolerate different id shapes)
      const toAssignees = (t: any) => (t.assignees && t.assignees.length > 0) ? t.assignees : (t.assignee ? [t.assignee] : []);
      const uid = state.currentUser?.id;
      const idMatches = (x: any) => {
        if (!uid) return false;
        if (!x) return false;
        if (typeof x === 'string') return x === uid;
        return (x.id || x.userId || x.user_id) === uid;
      };
      const aSingle = a.assignee_id || a.assigneeId || a.assigned_to || a.assignedTo;
      const bSingle = b.assignee_id || b.assigneeId || b.assigned_to || b.assignedTo;
      const aIsCurrentUser = toAssignees(a).some(idMatches) || (aSingle ? String(aSingle) === String(uid) : false) ? 1 : 0;
      const bIsCurrentUser = toAssignees(b).some(idMatches) || (bSingle ? String(bSingle) === String(uid) : false) ? 1 : 0;
      return bIsCurrentUser - aIsCurrentUser;
    });
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const monthNames = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь"];


  const weekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

  return (
    <div
      className="h-full flex flex-col bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl"
      data-oid="94f-b5g">

      {/* Header */}
      <div
        className="flex items-center justify-between p-6 border-b border-white/10"
        data-oid="bqck.x8">

        <div className="flex items-center gap-3" data-oid="lgkp1vp">
          <CalendarIcon
            className="w-6 h-6 text-primary-400"
            data-oid="sb_:rzh" />

          <h2 className="text-xl font-semibold text-white" data-oid="8104r.6">
            {monthNames[month]} {year}
          </h2>
        </div>
        <div className="flex items-center gap-2" data-oid="k:7.v-z">
          <button
            onClick={() => navigateMonth("prev")}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            data-oid="ulcy72j">

            <ChevronLeft className="w-5 h-5 text-gray-400" data-oid="m2fswz6" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-2 text-sm bg-primary-500/20 text-primary-300 rounded-lg hover:bg-primary-500/30 transition-colors"
            data-oid=".lzlia1">

            Сегодня
          </button>
          <button
            onClick={() => navigateMonth("next")}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            data-oid="qu.zdp_">

            <ChevronRight
              className="w-5 h-5 text-gray-400"
              data-oid="yrc9456" />

          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 p-6" data-oid="swfq_64">
        {/* Week days header */}
        <div className="grid grid-cols-7 gap-1 mb-4" data-oid="rqeq87.">
          {weekDays.map((day) =>
          <div
            key={day}
            className="p-2 text-center text-sm font-medium text-gray-400"
            data-oid="q7n4ryf">

              {day}
            </div>
          )}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1 h-full" data-oid="cs_:lf-">
          {calendarDays.map((calendarDay, index) => {
            const tasks = getTasksForDate(calendarDay.date);
            const isToday =
            calendarDay.date.toDateString() === today.toDateString();
            const isPast = calendarDay.date < today;

            return (
              <div
                key={calendarDay.date.toISOString()}
                className={cn(
                  "p-2 min-h-[100px] border border-white/5 rounded-lg transition-colors",
                  calendarDay.isCurrentMonth ? "bg-white/5 hover:bg-white/10" :
                  "bg-white/2 text-gray-600",
                  isToday && "ring-2 ring-primary-500 bg-primary-500/10",
                  isPast && "opacity-60"
                )}
                data-oid="5swr7jb">

                <div
                  className="flex items-center justify-between mb-2"
                  data-oid="spxoi9q">

                  <span
                    className={cn(
                      "text-sm font-medium",
                      calendarDay.isCurrentMonth ? "text-white" :
                      "text-gray-500",
                      isToday && "text-primary-300"
                    )}
                    data-oid="jdk_v0x">

                    {calendarDay.date.getDate()}
                  </span>
                  {tasks.length > 0 &&
                  <span
                    className="text-xs bg-primary-500/20 text-primary-300 px-1.5 py-0.5 rounded-full"
                    data-oid="5lai5p6">

                      {tasks.length}
                    </span>
                  }
                </div>

                {/* Tasks */}
                <div className="space-y-1" data-oid="rxftoi4">
                  {tasks.slice(0, 3).map((task) => {
                    const priorityColors = {
                      low: "bg-blue-500/20 text-blue-300",
                      medium: "bg-yellow-400/20 text-yellow-300",
                      high: "bg-orange-500/20 text-orange-300",
                      urgent: "bg-red-600/20 text-red-300"
                    };

                    return (
                      <button
                        key={task.id}
                        onClick={() => onTaskClick(task)}
                        className={cn(
                          "w-full text-left p-1.5 rounded text-xs truncate transition-colors hover:scale-105",
                          priorityColors[task.priority]
                        )}
                        title={task.title}
                        data-oid="1fr-5nd">

                        {task.title}
                      </button>);

                  })}
                  {tasks.length > 3 &&
                  <div
                    className="text-xs text-gray-400 text-center"
                    data-oid="5ca60xf">

                      +{tasks.length - 3} еще
                    </div>
                  }
                </div>
              </div>);

          })}
        </div>
      </div>
    </div>);

}