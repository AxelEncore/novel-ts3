"use client";

import React from "react";
import { useApp } from "@/contexts/AppContext";
import { formatDate, getDaysUntilDeadline } from "@/lib/utils";
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Users,
  Target,
  Activity } from
"lucide-react";

interface HomePageProps {
  onNavigate: (page: string) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const { state, dispatch } = useApp();

  const today = new Date();
  
  // Filter tasks for current user only
  const userTasks = state.tasks.filter((task) => 
    task.assignees?.some((a: any) => a.id === state.currentUser?.id) || false
  );
  
  const todayTasks = userTasks.filter((task) => {
    const taskDate = new Date(task.created_at);
    return taskDate.toDateString() === today.toDateString();
  });

  const completedTasks = userTasks.filter((task) => task.status === "done");
  const inProgressTasks = userTasks.filter(
    (task) => task.status === "in_progress"
  );
  const overdueTasks = userTasks.filter((task) => {
    if (!task.due_date) return false;
    return new Date(task.due_date) < today && task.status !== "done";
  });

  const dueSoonTasks = userTasks.filter((task) => {
    if (!task.due_date) return false;
    const days = getDaysUntilDeadline(new Date(task.due_date));
    return days <= 3 && days >= 0 && task.status !== "done";
  });

  const myTasks = state.tasks.filter(
    (task) => task.assignees?.some((a: any) => a.id === state.currentUser?.id) || false
  );

  const handleTaskClick = (task: any) => {
    // Navigate to the board with this task
    const project = state.projects.find((p) => p.id === task.projectId);
    const board = state.boards.find((b) => b.id === task.boardId);

    if (project && board) {
      dispatch({ type: "SELECT_PROJECT", payload: project });
      dispatch({ type: "SELECT_BOARD", payload: board });
      onNavigate("boards");
    }
  };

  const stats = [{
    title: "Всего задач",
    value: userTasks.length,
    icon: Target,
    color: "text-gray-400",
    bgColor: "bg-gray-500/10"
  },
  {
    title: "В работе",
    value: inProgressTasks.length,
    icon: Activity,
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10"
  },
  {
    title: "Выполнено",
    value: completedTasks.length,
    icon: CheckCircle2,
    color: "text-green-400",
    bgColor: "bg-green-500/10"
  },
  {
    title: "Просрочено",
    value: overdueTasks.length,
    icon: AlertTriangle,
    color: "text-red-400",
    bgColor: "bg-red-500/10"
  }];


  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6 animate-fade-in" data-oid="-hvz.x2">
      {/* Welcome Section */}
      <div
        className="glass-card bg-gradient-to-r from-primary-500/20 to-purple-500/20"
        data-oid="pt7dysp">

        <h1 className="text-xl lg:text-2xl font-bold text-white mb-2" data-oid="mlrhtje">
          Добро пожаловать, {state.currentUser?.name}!
        </h1>
        <p className="text-gray-300 text-sm lg:text-base" data-oid="je:jqbu">
          Сегодня {formatDate(today)}. У вас {myTasks.length} активных задач.
        </p>
      </div>

      {/* Stats Grid */}
      <div
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6"
        data-oid="9adl1hq">

        {stats.map((stat, index) =>
        <div
          key={stat.title}
          className="glass-card"
          data-oid="lua4b-.">

            <div
            className="flex items-center justify-between"
            data-oid="2d7k1k7">

              <div data-oid=":5t0ubq">
                <p className="text-xs lg:text-sm text-gray-400 mb-1" data-oid="w-xbdoi">
                  {stat.title}
                </p>
                <p className="text-lg lg:text-2xl font-bold text-white" data-oid=":u9n7::">
                  {stat.value}
                </p>
              </div>
              <div
              className={`p-2 lg:p-3 rounded-lg ${stat.bgColor}`}
              data-oid="t79b67h">

                <stat.icon
                className={`w-4 h-4 lg:w-6 lg:h-6 ${stat.color}`}
                data-oid="jg1_imk" />

              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-oid="pbj9dii">
        {/* Recent Tasks */}
        <div
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6"
          data-oid="pqe0xe4">

          <h2
            className="text-lg font-semibold text-white mb-4 flex items-center gap-2"
            data-oid="-ue_lmr">

            <Clock className="w-5 h-5" data-oid="ptar6l6" />
            Недавние задачи
          </h2>
          <div className="space-y-3" data-oid="6m_h.tk">
            {todayTasks.slice(0, 5).map((task) =>
            <div
              key={task.id}
              className="flex items-center gap-3 p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors"
              onClick={() => handleTaskClick(task)}
              data-oid="k2e564f">

                <div
                className={`w-2 h-2 rounded-full ${
                task.priority === "urgent" ?
                "bg-red-600" :
                task.priority === "high" ?
                "bg-orange-500" :
                task.priority === "medium" ?
                "bg-yellow-500" :
                "bg-gray-400"}`
                }
                data-oid="j6zdr8_" />

                <div className="flex-1 min-w-0" data-oid=".zzv8z-">
                  <p
                  className="text-white text-sm font-medium truncate"
                  data-oid="_fc.20_">

                    {task.title}
                  </p>
                  <p className="text-gray-400 text-xs" data-oid="zar8w_a">
                    {task.assignees?.[0]?.name || "Не назначено"}
                  </p>
                </div>
                <div
                className={`px-2 py-1 rounded text-xs ${
                task.status === "done" ?
                "bg-green-500/20 text-green-400" :
                task.status === "in_progress" ?
                  "bg-yellow-500/20 text-yellow-400" :
                "bg-gray-500/20 text-gray-400"}`
                }
                data-oid="t1772y.">

                  {task.status === "done" ?
                "Выполнено" :
                task.status === "in_progress" ?
                  "В работе" : "К выполнению"}
                </div>
              </div>
            )}
            {todayTasks.length === 0 &&
            <p className="text-gray-400 text-center py-4" data-oid="rcdgb-3">
                Сегодня задач не создавалось
              </p>
            }
          </div>
        </div>

        {/* Urgent Tasks */}
        <div
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6"
          data-oid="t:oim5y">

          <h2
            className="text-lg font-semibold text-white mb-4 flex items-center gap-2"
            data-oid="32j-8qg">

            <AlertTriangle
              className="w-5 h-5 text-red-400"
              data-oid="wuiir:k" />

            Требуют внимания
          </h2>
          <div className="space-y-3" data-oid="a.o_d8p">
            {[...overdueTasks, ...dueSoonTasks].slice(0, 5).map((task) =>
            <div
              key={task.id}
              className="flex items-center gap-3 p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors"
              onClick={() => handleTaskClick(task)}
              data-oid="rgs.6ru">

                <div className="flex-shrink-0" data-oid="-q65nu5">
                  {overdueTasks.includes(task) ?
                <AlertTriangle
                  className="w-4 h-4 text-red-400"
                  data-oid="5okzcm4" /> :
                <Clock
                  className="w-4 h-4 text-yellow-400"
                  data-oid="ibytq5-" />
                }
                </div>
                <div className="flex-1 min-w-0" data-oid="ddwudgr">
                  <p
                  className="text-white text-sm font-medium truncate"
                  data-oid="kwb83fu">

                    {task.title}
                  </p>
                  <p className="text-gray-400 text-xs" data-oid="99pmkc:">
                    {task.due_date &&
                  <>
                        {overdueTasks.includes(task) ? "Просрочено" : "Срок"}:{" "}
                        {!isNaN(new Date(task.due_date).getTime()) ? formatDate(new Date(task.due_date)) : 'Неверная дата'}
                      </>
                  }
                  </p>
                </div>
                <div className="text-xs text-gray-400" data-oid="-7wwd.a">
                  {task.assignees?.[0]?.name || "Не назначено"}
                </div>
              </div>
            )}
            {[...overdueTasks, ...dueSoonTasks].length === 0 &&
            <p className="text-gray-400 text-center py-4" data-oid="my.svq8">
                Все задачи под контролем
              </p>
            }
          </div>
        </div>
      </div>

      {/* Projects Overview */}
      <div
        className="glass-card"
        data-oid="s:k5u-b">

        <h2
          className="text-lg font-semibold text-white mb-4 flex items-center gap-2"
          data-oid="chrb7l1">

          <TrendingUp className="w-5 h-5" data-oid="qjgc3ro" />
          Обзор проектов
        </h2>
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          data-oid="st7l0fg">

          {state.projects.map((project) => {
            const projectTasks = state.tasks.filter(
              (t) => t.project_id === project.id
            );
            const completedCount = projectTasks.filter(
              (t) => t.status === "done"
            ).length;
            const progress =
            projectTasks.length > 0 ?
            completedCount / projectTasks.length * 100 :
            0;

            return (
              <div
                key={project.id}
                className="p-4 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors"
                onClick={() => {
                  dispatch({ type: "SELECT_PROJECT", payload: project });
                  onNavigate("boards");
                }}
                data-oid="chcizh6">

                <div
                  className="flex items-center gap-2 mb-3"
                  data-oid="7gk8wyj">

                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: project.color }}
                    data-oid="373jaie" />

                  <h3
                    className="text-white font-medium truncate"
                    data-oid="ky1-8jz">

                    {project.name}
                  </h3>
                </div>
                <div className="space-y-2" data-oid="z0_2592">
                  <div
                    className="flex justify-between text-sm"
                    data-oid="ajn7flz">

                    <span className="text-gray-400" data-oid="9yf4h1f">
                      Прогресс
                    </span>
                    <span className="text-white" data-oid="gwf0vsz">
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <div
                    className="w-full bg-gray-700 rounded-full h-2"
                    data-oid="2q07ls_">

                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                      data-oid="7sivf0y" />

                  </div>
                  <div
                    className="flex justify-between text-xs text-gray-400"
                    data-oid="6xmnkjm">

                    <span data-oid="2qw53no">{projectTasks.length} задач</span>
                    <span
                      className="flex items-center gap-1"
                      data-oid="tcatz1.">

                      <Users className="w-3 h-3" data-oid="i23xaso" />
                      {project.members?.length || 0}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}