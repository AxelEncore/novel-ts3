"use client";

import React, { useState, useMemo } from "react";
import { useApp } from "@/contexts/AppContext";
import { TelegramService } from "@/services/telegram";
import { formatDateTime } from "@/lib/utils";
import {
  Bell,
  MessageCircle,
  Settings,
  Check,
  X,
  Send,
  TestTube,
  AlertCircle,
  CheckCircle2,
  Info
} from "lucide-react";

// Using Notification interface from AppContext

export function NotificationsPage() {
  const { state, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState<"notifications" | "settings">(
    "notifications"
  );
  const [testChatId, setTestChatId] = useState("");
  const [testTopicId, setTestTopicId] = useState("");
  const [testStatus, setTestStatus] = useState<
    "idle" | "testing" | "success" | "error">(
    "idle");

  // Get user notifications from state
  const userNotifications = useMemo(() => {
    const currentUserId = state.currentUser?.id;
    if (!currentUserId) return [];

    // Filter notifications for current user and sort by creation date (newest first)
    return state.notifications
      .filter(notification => notification.userId === currentUserId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [state.notifications, state.currentUser?.id]);

  // Add pending user notifications for admins
  const adminNotifications = useMemo(() => {
    if (state.currentUser?.role !== 'admin') return [];
    
    return state.pendingUserNotifications?.map(user => ({
      id: `pending-user-${user.id}`,
      title: "Новая заявка на регистрацию",
      message: `Пользователь ${user.name} (${user.email}) ожидает подтверждения`,
      type: "info" as const,
      isRead: false,
      createdAt: new Date(user.created_at).toISOString(),
      userId: user.id
    })) || [];
  }, [state.pendingUserNotifications, state.currentUser?.role]);

  const allNotifications = [...userNotifications, ...adminNotifications];

  const handleMarkAsRead = (notificationId: string) => {
    dispatch({ type: "MARK_NOTIFICATION_READ", payload: notificationId });
  };

  const unreadCount = allNotifications.filter(n => !n.isRead).length;

  const handleTestTelegram = async () => {
    if (!testChatId.trim()) return;

    setTestStatus("testing");

    try {
      const success = await TelegramService.testConnection(
        testChatId,
        testTopicId || undefined
      );

      setTestStatus(success ? "success" : "error");
      setTimeout(() => setTestStatus("idle"), 3000);
    } catch (error) {
      setTestStatus("error");
      setTimeout(() => setTestStatus("idle"), 3000);
    }
  };

  const handleNotificationClick = (notification: any) => {
    if (notification.taskId) {
      // Navigate to the task
      const task = state.tasks.find((t) => t.id === notification.taskId);
      if (task) {
        const project = state.projects.find((p) => p.id === task.project_id);
        const board = state.boards.find((b) => b.id === task.board_id);

        if (project && board) {
          // This would trigger navigation to boards - implement as needed
          console.log("Navigate to task:", task.id);
        }
      }
    } else if (notification.id.startsWith('pending-user-')) {
      // Navigate to admin panel for user approval
      window.location.hash = '#admin';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "task_assigned":
        return <Bell className="w-5 h-5 text-purple-400" data-oid="task-assigned" />;
      case "task_updated":
        return <AlertCircle className="w-5 h-5 text-yellow-400" data-oid="task-updated" />;
      case "task_completed":
        return <CheckCircle2 className="w-5 h-5 text-green-400" data-oid="task-completed" />;
      case "task_created":
        return <Info className="w-5 h-5 text-gray-400" data-oid="task-created" />;
      case "info":
        return <Info className="w-5 h-5 text-gray-400" data-oid="info" />;
      case "success":
        return <CheckCircle2 className="w-5 h-5 text-green-400" data-oid="success" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-yellow-400" data-oid="warning" />;
      case "error":
        return <X className="w-5 h-5 text-red-400" data-oid="error" />;
      default:
        return <Bell className="w-5 h-5 text-gray-400" data-oid="default" />;
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in" data-oid="zxkmrf3">
      {/* Header */}
      <div className="flex items-center justify-between" data-oid="flxaiyu">
        <h1
          className="text-2xl font-bold text-white flex items-center gap-2 animate-slide-in-left"
          data-oid="o93qcx">

          <Bell className="w-6 h-6" data-oid="lj2i92z" />
          Уведомления
          {unreadCount > 0 && (
            <span
              className="px-2 py-1 bg-primary-700 text-white text-xs rounded-full"
              data-oid="e6q6-4">
              {unreadCount}
            </span>
          )}
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex bg-white/5 rounded-lg p-1" data-oid="sik9ug9">
        <button
          onClick={() => setActiveTab("notifications")}
          className={`flex-1 px-4 py-2 rounded text-sm transition-colors ${
          activeTab === "notifications" ?
          "bg-primary-500 text-white" :
          "text-gray-400 hover:text-white"}`
          }
          data-oid="rwg73k">

          Уведомления
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`flex-1 px-4 py-2 rounded text-sm transition-colors ${
          activeTab === "settings" ?
          "bg-primary-500 text-white" :
          "text-gray-400 hover:text-white"}`
          }
          data-oid="oi7ss0v">

          Настройки
        </button>
      </div>

      {activeTab === "notifications" ? (
        // Notifications List
        <div className="space-y-4" data-oid="g6om2s5">
          {allNotifications.length > 0 ? (
            allNotifications.map((notification) => (
              <div
                key={notification.id}
                data-notification-id={notification.id}
                className={`p-4 rounded-xl border transition-colors cursor-pointer hover:bg-white/10 ${
                  notification.isRead ?
                  "bg-white/5 border-white/10" :
                  "bg-primary-500/10 border-primary-500/20"
                }`}
                onClick={() => handleNotificationClick(notification)}
                data-oid="xvvwcp9">

                <div className="flex items-start gap-4" data-oid="_1i.e4x">
                  <div className="flex-shrink-0 mt-1" data-oid="6-loqze">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0" data-oid="r0p_xzc">
                    <div
                className="flex items-start justify-between gap-4"
                data-oid="p272a_z">

                      <div data-oid="ujaukg5">
                        <h3
                    className={`font-medium ${
                    notification.isRead ? "text-gray-300" : "text-white"}`
                    }
                    data-oid="l-.pavp">

                          {notification.title}
                        </h3>
                        <p
                    className={`text-sm mt-1 ${
                    notification.isRead ?
                    "text-gray-400" :
                    "text-gray-300"}`
                    }
                    data-oid="m14gp33">

                          {notification.message}
                        </p>
                        <p
                    className="text-xs text-gray-500 mt-2"
                    data-oid="k::06wk">

                          {formatDateTime(new Date(notification.createdAt))}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <button
                          className="p-1 hover:bg-white/10 rounded transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notification.id);
                          }}
                          data-oid="93w5tu9">
                          <Check
                            className="w-4 h-4 text-gray-400"
                            data-oid="ok4hz8t" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12" data-oid="n_j465l">
              <Bell
                className="w-12 h-12 text-gray-400 mx-auto mb-4"
                data-oid="wa6_i.x" />
              <p className="text-gray-400" data-oid="9lrmohd">
                Уведомлений пока нет
              </p>
            </div>
          )}
        </div>) : (
        // Settings
        <div className="space-y-6" data-oid="kd2b.cd">
          {/* Telegram Integration */}
          <div
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6"
          data-oid="8p4eo4">

            <h2
            className="text-lg font-semibold text-white mb-4 flex items-center gap-2"
            data-oid="a1eu-e">

              <MessageCircle className="w-5 h-5" data-oid="xvf2-d5" />
              Интеграция с Telegram
            </h2>

            <div className="space-y-4" data-oid="s9w802h">
              {!process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                    <div className="text-sm text-red-300">
                      <p className="font-medium mb-1">Telegram бот не настроен</p>
                      <p>Для работы уведомлений необходимо настроить переменную окружения NEXT_PUBLIC_TELEGRAM_BOT_TOKEN в файле .env.local</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div
              className="p-4 bg-primary-500/10 border border-primary-500/20 rounded-lg"
              data-oid="j2cdawm">

                <div className="flex items-start gap-3" data-oid="0m1js2">
                  <Info
                  className="w-5 h-5 text-gray-400 mt-0.5"
                  data-oid="32pyb-f" />

                  <div className="text-sm text-gray-300" data-oid="5nwalso">
                    <p className="font-medium mb-1" data-oid="pk_o2n6">
                      Как настроить уведомления:
                    </p>
                    <ol
                    className="list-decimal list-inside space-y-1 text-gray-200"
                    data-oid="v:9tk3k">

                      <li data-oid="t0xecsx">
                        Создайте группу в Telegram или используйте существующую
                      </li>
                      <li data-oid="gms:8n5">
                        Добавьте бота @ENCORETASKSBot в группу
                      </li>
                      <li data-oid="o0q4-ew">
                        Получите ID чата (можно через @userinfobot)
                      </li>
                      <li data-oid="r9cf6bm">
                        Введите ID чата в настройках проекта
                      </li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Test Connection */}
              <div className="space-y-4" data-oid="9b-ug">
                <h3 className="text-white font-medium" data-oid="h_3pkgv">
                  Тестирование подключения
                </h3>

                <div
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
                data-oid="imufzct">

                  <div data-oid="x4-6tk">
                    <label
                    className="block text-sm text-gray-400 mb-2"
                    data-oid="s_727uv">

                      ID чата/группы *
                    </label>
                    <input
                    type="text"
                    value={testChatId}
                    onChange={(e) => setTestChatId(e.target.value)}
                    placeholder="-1001234567890"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
                    data-oid="jm9njn7" />

                  </div>

                  <div data-oid="1t16g_e">
                    <label
                    className="block text-sm text-gray-400 mb-2"
                    data-oid="uiy-wdd">

                      ID топика (необязательно)
                    </label>
                    <input
                    type="text"
                    value={testTopicId}
                    onChange={(e) => setTestTopicId(e.target.value)}
                    placeholder="123"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
                    data-oid="npqeidy" />

                  </div>
                </div>

                <button
                onClick={handleTestTelegram}
                disabled={!testChatId.trim() || testStatus === "testing"}
                className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                data-oid="j-zr9tx">

                  {testStatus === "testing" ?
                <>
                      <div
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                    data-oid="9-cdno" />

                      Отправка...
                    </> :

                <>
                      <TestTube className="w-4 h-4" data-oid="wf5ryct" />
                      Отправить тестовое сообщение
                    </>
                }
                </button>

                {testStatus === "success" &&
              <div
                className="flex items-center gap-2 p-3 bg-primary-600/10 border border-primary-600/20 rounded-lg"
                data-oid="w8q-kts">

                    <CheckCircle2
                  className="w-5 h-5 text-green-400"
                  data-oid="683-f9v" />

                    <span className="text-green-300" data-oid="auqdszy">
                      Сообщение успешно отправлено!
                    </span>
                  </div>
              }

                {testStatus === "error" &&
              <div
                className="flex items-center gap-2 p-3 bg-primary-700/10 border border-primary-700/20 rounded-lg"
                data-oid="2_e-9gq">

                    <X className="w-5 h-5 text-red-400" data-oid="ym0v6sp" />
                    <span className="text-red-300" data-oid="qpl8-w">
                      Ошибка отправки. Проверьте настройки.
                    </span>
                  </div>
              }
              </div>
            </div>
          </div>

          {/* Project Settings */}
          <div
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6"
          data-oid="jra-4u">

            <h2
            className="text-lg font-semibold text-white mb-4 flex items-center gap-2"
            data-oid="6-ux22a">

              <Settings className="w-5 h-5" data-oid="4d1w-e5" />
              Настройки проектов
            </h2>

            <div className="space-y-4" data-oid="syhnadn">
              {state.projects.map((project) =>
            <div
              key={project.id}
              className="p-4 bg-white/5 rounded-lg"
              data-oid="qk-n_2i">

                  <div
                className="flex items-center gap-3 mb-3"
                data-oid="p99fvo9">

                    <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: project.color }}
                  data-oid="n1almqx" />

                    <h3 className="text-white font-medium" data-oid="tif-fca">
                      {project.name}
                    </h3>
                  </div>

                  <div
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
                data-oid="cel892n">

                    <div data-oid="pdrzr45">
                      <label
                    className="block text-sm text-gray-400 mb-1"
                    data-oid="n_txcr7">

                        ID чата Telegram
                      </label>
                      <input
                    type="text"
                    value={project.telegramChatId || ""}
                    readOnly
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm"
                    placeholder="Не настроено"
                    data-oid="nqrspga" />

                    </div>

                    <div data-oid="6kt1029">
                      <label
                    className="block text-sm text-gray-400 mb-1"
                    data-oid="xsp-my1">

                        ID топика
                      </label>
                      <input
                    type="text"
                    value={project.telegramTopicId || ""}
                    readOnly
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded text-white text-sm"
                    placeholder="Не настроено"
                    data-oid="-38mqui" />

                    </div>
                  </div>

                  <div
                className="flex items-center justify-between mt-4"
                data-oid="z7fawmd">

                    <div className="flex items-center gap-2" data-oid="q81s4_3">
                      <div
                    className={`w-2 h-2 rounded-full ${
                    project.telegramChatId ?
                    "bg-primary-600" :
                    "bg-gray-500"}`
                    }
                    data-oid="in1m9z7" />

                      <span
                    className="text-sm text-gray-400"
                    data-oid="tcjmg_b">

                        {project.telegramChatId ? "Настроено" : "Не настроено"}
                      </span>
                    </div>

                    <button
                  className="px-3 py-1 bg-primary-500/20 text-primary-300 rounded hover:bg-primary-500/30 transition-colors text-sm"
                  data-oid="9121kc6">

                      Настроить
                    </button>
                  </div>
                </div>
            )}
            </div>
          </div>
        </div>)
      }
    </div>);

}