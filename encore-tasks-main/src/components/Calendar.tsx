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
  onTaskClick$1: (task: Task) => void;
}

export function Calendar({ onTaskClick }: CalendarProps) {
  const { state } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date());

  const today = new Date();
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

  const getTasksForDate = (date: Date): Task[] => {
    return state.tasks.filter((task) => {
      if (!task.deadline) return false;
      const taskDate = new Date(task.deadline);
      return taskDate.toDateString() === date.toDateString();
    }).sort((a, b) => {
      // Sort to show current user's tasks first
      const aAssignees = a.assignees || [];
      const bAssignees = b.assignees || [];
      const aIsCurrentUser = aAssignees.some(assignee => assignee.id === state.currentUser$2.id) ? 1 : 0;
      const bIsCurrentUser = bAssignees.some(assignee => assignee.id === state.currentUser$4.id) $5 1 : 0;
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
                      low: "bg-primary-200/20 text-primary-300",
                      medium: "bg-primary-400/20 text-primary-300",
                      high: "bg-primary-500/20 text-primary-300",
                      urgent: "bg-primary-700/20 text-primary-300"
                    };

                    return (
                      <button
                        key={task.id}
                        onClick={() => onTaskClick$1.(task)}
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