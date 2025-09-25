"use client";

import React, { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { formatDate, getDaysUntilDeadline } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  User,
  Filter,
  X,
  ExternalLink } from
"lucide-react";
import { CustomSelect } from "../CustomSelect";

interface TaskDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: any[];
  date: Date;
  onTaskClick: (task: any) => void;
}

function TaskDetailsModal({
  isOpen,
  onClose,
  tasks,
  date,
  onTaskClick
}: TaskDetailsModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      data-oid="k8-yv3n">

      <div
        className="bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl max-w-md w-full max-h-[80vh] overflow-hidden"
        data-oid="00kydku">

        <div
          className="flex items-center justify-between p-6 border-b border-white/10"
          data-oid="b920wu7">

          <h3 className="text-lg font-semibold text-white" data-oid="4:jqlf.">
            Задачи на {formatDate(date)}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            data-oid="s7za-lg">

            <X className="w-5 h-5 text-gray-400" data-oid="8zzxn2:" />
          </button>
        </div>
        <div
          className="p-6 space-y-3 max-h-96 overflow-y-auto"
          data-oid="6t8:imw">

          {tasks.map((task) =>
          <div
            key={task.id}
            className="p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
            data-oid="3ucr_27">

              <div
              className="flex items-start justify-between"
              data-oid="zyey1cy">

                <div className="flex-1" data-oid="0fhom0w">
                  <h4
                  className="text-white font-medium mb-1"
                  data-oid="i922kn9">

                    {task.title}
                  </h4>
                  {task.description &&
                <p
                  className="text-gray-400 text-sm mb-2 line-clamp-2"
                  data-oid="q2k-fb8">

                      {task.description}
                    </p>
                }
                  <div
                  className="flex items-center gap-4 text-xs text-gray-400"
                  data-oid="vqht:ji">

                    {(() => {
                    const assignees = task.assignees || (task.assignee ? [task.assignee] : []);
                    if (assignees.length === 0) return null;
                    return (
                      <div
                        className="flex items-center gap-1"
                        data-oid="rg.ryqk">
                        <User className="w-3 h-3" data-oid="u4gev1j" />
                        {assignees.length === 1 ? assignees[0].name : `${assignees[0].name} +${assignees.length - 1}`}
                      </div>
                    );
                  })()}
                    <div
                    className={`px-2 py-1 rounded-full ${
                    task.priority === "urgent" ?
                    "bg-primary-700/20 text-primary-300" :
              task.priority === "high" ?
              "bg-primary-600/20 text-primary-300" :
              task.priority === "medium" ?
              "bg-primary-500/20 text-primary-300" :
              "bg-primary-400/20 text-primary-300"}`
                    }
                    data-oid="7:4yld3">

                      {task.priority}
                    </div>
                  </div>
                </div>
                <button
                onClick={() => onTaskClick(task)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Перейти к задаче"
                data-oid="k9-wesf">

                  <ExternalLink
                  className="w-4 h-4 text-gray-400"
                  data-oid="fph6i9c" />

                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function CalendarPage() {
  const { state, dispatch } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week">("month");
  // Default to "all users" to avoid race conditions on auth init
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const today = new Date();
  // Debug: log tasks and filter summary once per month change
  React.useEffect(() => {
    try {
      const sample = (state.tasks || []).slice(0, 5).map((t: any) => ({
        id: t.id,
        title: t.title,
        keys: Object.keys(t || {}),
        due_date: t?.due_date,
        deadline: t?.deadline,
        dueDate: (t as any)?.dueDate,
        created_at: t?.created_at,
        createdAt: (t as any)?.createdAt,
        assignee_id: t?.assignee_id,
        assignees_len: Array.isArray(t?.assignees) ? t.assignees.length : 0
      }));
      console.log('[CalendarPage] Debug sample tasks:', sample);
      console.log('[CalendarPage] Selected user:', selectedUser);
      const curMonth = currentDate.getMonth();
      const curYear = currentDate.getFullYear();
      const monthKey = `${curYear}-${curMonth + 1}`;
      const counts: Record<string, number> = {};
      (state.tasks || []).forEach((t: any) => {
        const raw = t?.due_date ?? t?.deadline ?? t?.dueDate ?? t?.created_at ?? t?.createdAt;
        if (!raw) return;
        const d = typeof raw === 'string' ? new Date(raw.slice(0,10) + 'T00:00:00') : new Date(raw);
        if (isNaN(d.getTime())) return;
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        counts[key] = (counts[key] || 0) + 1;
      });
      console.log('[CalendarPage] Tasks per day in month', monthKey, counts);
    } catch {}
  }, [state.tasks, currentDate, selectedUser]);
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Generate calendar days based on view
  const calendarDays = [];
  
  if (view === "month") {
    // Get first day of month and number of days
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startingDayOfWeek = firstDayOfMonth.getDay();

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      calendarDays.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      calendarDays.push(new Date(currentYear, currentMonth, day));
    }
  } else {
    // Week view - get the week containing currentDate
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    
    // Add 7 days for the week
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      calendarDays.push(day);
    }
  }

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (view === "month") {
        if (direction === "prev") {
          newDate.setMonth(prev.getMonth() - 1);
        } else {
          newDate.setMonth(prev.getMonth() + 1);
        }
      } else {
        // Week navigation
        if (direction === "prev") {
          newDate.setDate(prev.getDate() - 7);
        } else {
          newDate.setDate(prev.getDate() + 7);
        }
      }
      return newDate;
    });
  };

  // Normalize a date or date-string to a YYYY-MM-DD key
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
      const ms = raw < 1e12 ? raw * 1000 : raw; // seconds vs ms
      const d = new Date(ms);
      return isNaN(d.getTime()) ? null : toDayKey(d);
    }
    if (typeof raw === 'string') {
      const s = raw.trim();
      // ISO-like YYYY-MM-DD...
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
      // Locale dd.MM.yyyy[, HH:mm:ss]
      const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
      if (m) {
        const dd = m[1], mm = m[2], yyyy = m[3];
        return `${yyyy}-${mm}-${dd}`;
      }
      // Fallback to Date parsing
      const d = new Date(s);
      if (!isNaN(d.getTime())) return toDayKey(d);
      return null;
    }
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : toDayKey(d);
  };
  // Heuristic to extract a date-like value from a task when common fields are empty
  const extractRawDate = (task: any): any => {
    // Only consider explicit deadline/due-like fields, never created_at
    const candidates = [task?.due_date, task?.deadline, task?.dueDate];
    const first = candidates.find((v) => !!v);
    if (first) return first;
    // Scan shallow fields for deadline/due-like keys
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
  const getTasksForDate = (date: Date) => {
    const dayKey = toDayKey(date);
    const idMatches = (a: any, uid: string) => {
      if (!a) return false;
      if (typeof a === 'string') return a === uid;
      return (a.id || a.userId || a.user_id) === uid;
    };
    return state.tasks.filter((task: any) => {
      const rawPrimary = task?.due_date ?? task?.deadline ?? task?.dueDate;
      const raw = rawPrimary ?? extractRawDate(task);
      const taskKey = normalizeToDayKey(raw);
      if (!taskKey) return false;
      const taskAssignees = (task.assignees && task.assignees.length > 0)
        ? task.assignees
        : (task.assignee ? [task.assignee] : []);
      const singleAssigneeId = task.assignee_id || task.assigneeId || task.assigned_to || task.assignedTo;
      const assignedToSelected = !selectedUser ||
        taskAssignees.some((a: any) => idMatches(a, selectedUser)) ||
        (singleAssigneeId ? String(singleAssigneeId) === String(selectedUser) : false);
      return taskKey === dayKey && assignedToSelected;
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


  const weekDays = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

  const upcomingTasks = state.tasks
  .filter((task: any) => {
    // Exclude archived and done tasks
    const isArchived = (task as any)?.isArchived || (task as any)?.is_archived || false;
    if (task?.status === 'done' || isArchived) return false;
    const rawPrimary = task?.due_date ?? task?.deadline ?? task?.dueDate;
    const raw = rawPrimary ?? extractRawDate(task);
    const key = normalizeToDayKey(raw);
    if (!key) return false;
    const parsed = new Date(key + 'T00:00:00');
    const days = getDaysUntilDeadline(parsed);
    const taskAssignees = (task.assignees && task.assignees.length > 0)
      ? task.assignees
      : (task.assignee ? [task.assignee] : []);
    const idMatches = (a: any, uid: string) => {
      if (!a) return false;
      if (typeof a === 'string') return a === uid;
      return (a.id || a.userId || a.user_id) === uid;
    };
    const singleAssigneeId = task.assignee_id || task.assigneeId || task.assigned_to || task.assignedTo;
    const assignedToSelected = !selectedUser ||
      taskAssignees.some((a: any) => idMatches(a, selectedUser)) ||
      (singleAssigneeId ? String(singleAssigneeId) === String(selectedUser) : false);
    return (
      days >= 0 &&
      days <= 7 &&
      task.status !== "done" &&
      assignedToSelected
    );
  })
  .sort((a: any, b: any) => {
    const aRaw: any = a?.due_date ?? a?.deadline ?? a?.dueDate ?? a?.created_at ?? a?.createdAt;
    const bRaw: any = b?.due_date ?? b?.deadline ?? b?.dueDate ?? b?.created_at ?? b?.createdAt;
    const aKey = normalizeToDayKey(aRaw);
    const bKey = normalizeToDayKey(bRaw);
    if (!aKey || !bKey) return 0;
    return new Date(aKey + 'T00:00:00').getTime() - new Date(bKey + 'T00:00:00').getTime();
  });

  const handleDayClick = (date: Date) => {
    const tasksForDate = getTasksForDate(date);
    if (tasksForDate.length > 0) {
      setSelectedDate(date);
      setIsTaskModalOpen(true);
    }
  };

  const handleTaskClick = (task: any) => {
    // Navigate to the board with this task
    const project = state.projects.find((p) => p.id === task.projectId);
    const board = state.boards.find((b) => b.id === task.boardId);

    if (project && board) {
      dispatch({ type: "SELECT_PROJECT", payload: project });
      dispatch({ type: "SELECT_BOARD", payload: board });
      setIsTaskModalOpen(false);
      // Navigate to boards page - this should be handled by parent component
      window.dispatchEvent(new CustomEvent("navigate-to-boards"));
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in" data-oid="97p-jv2">
      {/* Header */}
      <div className="flex items-center justify-between" data-oid="pmspjiu">
        <div className="flex items-center gap-4" data-oid="7qvo45t">
          <h1
            className="text-2xl font-bold text-white flex items-center gap-2"
            data-oid="-8qazwh">

            <CalendarIcon className="w-6 h-6" data-oid="o4tjz:b" />
            Календарь
          </h1>
          <div className="flex items-center gap-2" data-oid="ghr-z.k">
            <button
              onClick={() => navigateMonth("prev")}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              data-oid="n9wn9ta">

              <ChevronLeft
                className="w-5 h-5 text-gray-400"
                data-oid="-x1v0mr" />

            </button>
            <h2
              className="text-lg font-medium text-white min-w-[200px] text-center"
              data-oid="sxjz7k8">

              {monthNames[currentMonth]} {currentYear}
            </h2>
            <button
              onClick={() => navigateMonth("next")}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              data-oid="m4ixhka">

              <ChevronRight
                className="w-5 h-5 text-gray-400"
                data-oid="4s0d:xg" />

            </button>
          </div>
        </div>

        <div className="flex items-center gap-4" data-oid="afhoyyf">
          {/* User Filter */}
          <div className="flex items-center gap-2" data-oid="th6.ax_">
            <Filter className="w-4 h-4 text-gray-400" data-oid="4ipw3a1" />
            <CustomSelect
              value={selectedUser}
              onChange={(value) => setSelectedUser(value)}
              options={[
                { value: "", label: "Все пользователи" },
                ...state.users.filter(user => user.isApproved).map((user) => ({
                  value: user.id,
                  label: user.name
                }))
              ]}
              placeholder="Выберите пользователя"
            />
          </div>

          {/* View Toggle */}
          <div className="flex bg-white/5 rounded-lg p-1" data-oid="60:d.5m">
            <button
              onClick={() => setView("month")}
              className={`px-3 py-1 rounded text-sm transition-colors ${
              view === "month" ?
              "bg-primary-500 text-white" :
              "text-gray-400 hover:text-white"}`
              }
              data-oid="vxkd_sy">

              Месяц
            </button>
            <button
              onClick={() => setView("week")}
              className={`px-3 py-1 rounded text-sm transition-colors ${
              view === "week" ?
              "bg-primary-500 text-white" :
              "text-gray-400 hover:text-white"}`
              }
              data-oid="cc825je">

              Неделя
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" data-oid="kz3:kla">
        {/* Calendar */}
        <div className="lg:col-span-3" data-oid="vcmjs2w">
          <div
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6"
            data-oid="vbeu32v">

            {/* Week days header */}
            <div className="grid grid-cols-7 gap-1 mb-4" data-oid="9nw-a6-">
              {weekDays.map((day) =>
              <div
                key={day}
                className="p-2 text-center text-sm font-medium text-gray-400"
                data-oid="bgi7d08">

                  {day}
                </div>
              )}
            </div>

            {/* Calendar grid */}
            <div className={`grid gap-1 ${view === "month" ? "grid-cols-7" : "grid-cols-7"}`} data-oid="n9mb3i3">
              {calendarDays.map((date, index) => {
                if (!date) {
                  return (
                    <div key={`empty-${index}`} className={`p-2 ${view === "month" ? "h-24" : "h-32"}`} data-oid="37vfg8u" />
                  );
                }

                const tasksForDate = getTasksForDate(date);
                const isToday = date.toDateString() === today.toDateString();
                const isCurrentMonth = view === "week" || date.getMonth() === currentMonth;

                return (
                  <div
                    key={date.toISOString()}
                    className={`p-2 ${view === "month" ? "h-24" : "h-32"} border border-white/5 rounded-lg transition-colors hover:bg-white/5 cursor-pointer ${
                    isToday ? "bg-primary-500/20 border-primary-500/30" : ""} ${
                    !isCurrentMonth ? "opacity-50" : ""}`}
                    onClick={() => handleDayClick(date)}
                    data-oid="s97ob.x">

                    <div
                      className={`text-sm font-medium mb-1 ${
                      isToday ? "text-primary-300" : "text-white"}`
                      }
                      data-oid="-6jgadt">

                      {date.getDate()}
                    </div>
                    <div className="space-y-1" data-oid="18w31w:">
                      {tasksForDate.slice(0, view === "month" ? 2 : 4).map((task) =>
                      <div
                        key={task.id}
                        className={`text-xs p-1 rounded truncate cursor-pointer hover:scale-105 transition-transform ${
                        task.priority === "urgent" ?
                        "bg-red-600/20 text-red-300" :
                        task.priority === "high" ?
                        "bg-orange-500/20 text-orange-300" :
                        task.priority === "medium" ?
                        "bg-yellow-400/20 text-yellow-300" :
                        "bg-blue-500/20 text-blue-300"}`
                        }
                        title={task.title}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTaskClick(task);
                        }}
                        data-oid="ul.3taf">

                          {task.title}
                        </div>
                      )}
                      {tasksForDate.length > (view === "month" ? 2 : 4) &&
                      <div
                        className="text-xs text-gray-400 cursor-pointer hover:text-gray-300"
                        data-oid="o7rtoec">

                          +{tasksForDate.length - (view === "month" ? 2 : 4)} еще
                        </div>
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Upcoming Tasks Sidebar */}
        <div className="space-y-6" data-oid="3mn:9vb">
          {/* Today's Tasks */}
          <div
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6"
            data-oid="uaqj-yh">

            <h3
              className="text-lg font-semibold text-white mb-4 flex items-center gap-2"
              data-oid="-::ll9c">

              <Clock className="w-5 h-5" data-oid="pze4pfj" />
              Сегодня
            </h3>
            <div className="space-y-3" data-oid="0n7098:">
              {getTasksForDate(today).map((task) =>
              <div
                key={task.id}
                className="p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors"
                onClick={() => handleTaskClick(task)}
                data-oid="r2e:4h:">

                  <div className="flex items-start gap-2" data-oid="8zzim3-">
                      <div
                      className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                      task.priority === "urgent" ?
                      "bg-red-600" :
                      task.priority === "high" ?
                      "bg-orange-500" :
                      task.priority === "medium" ?
                      "bg-yellow-400" :
                      "bg-blue-500"}`
                      }
                      data-oid="e:4j:y-" />

                    <div className="flex-1 min-w-0" data-oid="xjh443m">
                      <p
                      className="text-white text-sm font-medium truncate"
                      data-oid="vkwes0r">

                        {task.title}
                      </p>
                      {(() => {
                        const assignees = task.assignees || [];
                        if (assignees.length === 0) return null;
                        return (
                          <p
                            className="text-gray-400 text-xs flex items-center gap-1 mt-1"
                            data-oid="t:bi_l-">
                            <User className="w-3 h-3" data-oid="pai5.cs" />
                            {assignees.length === 1 ? assignees[0].name : `${assignees[0].name} +${assignees.length - 1}`}
                          </p>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}
              {getTasksForDate(today).length === 0 &&
              <p
                className="text-gray-400 text-center py-4 text-sm"
                data-oid="nkngyxf">

                  На сегодня задач нет
                </p>
              }
            </div>
          </div>

          {/* Upcoming Tasks */}
          <div
            className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6"
            data-oid="viqts15">

            <h3
              className="text-lg font-semibold text-white mb-4"
              data-oid="9bzims4">

              Ближайшие задачи
            </h3>
            <div className="space-y-3" data-oid="st_lod7">
              {upcomingTasks.slice(0, 5).map((task) => {
                const daysUntil = task.due_date ?
                getDaysUntilDeadline(new Date(task.due_date)) :
                0;
                return (
                  <div
                    key={task.id}
                    className="p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => handleTaskClick(task)}
                    data-oid="100.6i7">

                    <div className="flex items-start gap-2" data-oid="shq_tul">
                      <div
                        className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                        daysUntil <= 1 ?
                        "bg-primary-700" :
                        daysUntil <= 3 ?
                        "bg-primary-500" :
                        "bg-primary-400"}`
                        }
                        data-oid="l:z7sul" />

                      <div className="flex-1 min-w-0" data-oid="phtece_">
                        <p
                          className="text-white text-sm font-medium truncate"
                          data-oid="kdqgvie">

                          {task.title}
                        </p>
                        <div
                          className="flex items-center justify-between mt-1"
                          data-oid=".asnt4y">

                          {(() => {
                            const assignees = task.assignees || [];
                            if (assignees.length === 0) return null;
                            return (
                              <p
                                className="text-gray-400 text-xs flex items-center gap-1"
                            data-oid="6iw-dxw">

                              <User className="w-3 h-3" data-oid="5sjc0_w" />
                              {assignees.length === 1 ? assignees[0].name : `${assignees[0].name} +${assignees.length - 1}`}
                            </p>
                            );
                          })()}
                          <p
                            className="text-xs text-gray-400"
                            data-oid="l.gjr-.">

                            {daysUntil === 0 ?
                            "Сегодня" :
                            daysUntil === 1 ?
                            "Завтра" :
                            `${daysUntil} дн.`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {upcomingTasks.length === 0 &&
              <p
                className="text-gray-400 text-center py-4 text-sm"
                data-oid="gvsesei">

                  Ближайших задач нет
                </p>
              }
            </div>
          </div>
        </div>
      </div>

      {/* Task Details Modal */}
      {selectedDate &&
      <TaskDetailsModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        tasks={getTasksForDate(selectedDate)}
        date={selectedDate}
        onTaskClick={handleTaskClick}
        data-oid="vaprerx" />
      }
    </div>
  );

}