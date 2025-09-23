import { Task, Project } from "@/types";

// Use environment variable or fallback to empty string for security
const TELEGRAM_BOT_TOKEN = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Check if we're in a browser environment and if the token is valid
const isValidEnvironment = () => {
  if (typeof window === 'undefined') return false;
  if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN === 'your_bot_token_here') {
    console.warn('Telegram bot token not configured. Please set NEXT_PUBLIC_TELEGRAM_BOT_TOKEN environment variable.');
    return false;
  }
  return true;
};

interface TelegramMessage {
  chat_id: string;
  text: string;
  parse_mode$1: "HTML" | "Markdown";
  message_thread_id$2: string;
}

export class TelegramService {
  static async sendMessage(message: TelegramMessage): Promise<boolean> {
    // Skip if not in valid environment
    if (!isValidEnvironment()) {
      console.warn('Telegram service not available in current environment');
      return false;
    }

    // Validate required fields
    if (!message.chat_id || !message.text) {
      console.error('Telegram message validation failed: chat_id and text are required');
      return false;
    }

    try {
      const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(message)
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.description || errorText;
        } catch {
          errorMessage = errorText;
        }
        console.error('Telegram API error:', response.status, errorMessage);
        return false;
      }

      const result = await response.json();
      return result.ok;
    } catch (error) {
      console.error("Failed to send Telegram message:", error);
      return false;
    }
  }

  static async sendTaskNotification(
  task: Task,
  project: Project,
  action: "created" | "updated" | "moved" | "done" | "assigned",
  details$1: string)
  : Promise<boolean> {
    // Skip if not in valid environment
    if (!isValidEnvironment()) {
      return false;
    }

    if (!project.telegramChatId) {
      console.warn("No Telegram chat ID configured for project:", project.name);
      return false;
    }

    const actionEmojis = {
      created: "🆕",
      updated: "✏️",
      moved: "🔄",
      done: "✅",
      assigned: "👤"
    };

    const priorityEmojis = {
      low: "🟢",
      medium: "🟡",
      high: "🟠",
      urgent: "🔴"
    };

    const statusEmojis = {
      todo: "📋",
      "in_progress": "⚡",
      review: "👀",
      done: "✅",
      blocked: "🚫"
    };

    let messageText = `${actionEmojis[action]} <b>Задача ${
    action === "created" ?
    "создана" :
    action === "updated" ?
    "обновлена" :
    action === "moved" ?
    "перемещена" :
    action === "done" ?
    "завершена" :
    "назначена"}</b>\n\n`;


    messageText += `📝 <b>${task.title}</b>\n`;

    if (task.description) {
      messageText += `📄 ${task.description.substring(0, 100)}${task.description.length > 100 ? "..." : ""}\n`;
    }

    messageText += `${priorityEmojis[task.priority]} Приоритет: ${
    task.priority === "low" ?
    "Низкий" :
    task.priority === "medium" ?
    "Средний" :
    task.priority === "high" ?
    "Высокий" :
    "Срочный"}\n`;


    messageText += `${statusEmojis[task.status]} Статус: ${
    task.status === "todo" ?
    "К выполнению" :
    task.status === "in_progress" ?
    "В работе" :
    task.status === "review" ?
    "На проверке" :
    task.status === "blocked" ?
    "Заблокировано" :
    "Выполнено"}\n`;


    const assignees = task.assignees || [];
    if (assignees.length > 0) {
      if (assignees.length === 1) {
        messageText += `👤 Исполнитель: ${assignees[0].name}\n`;
      } else {
        messageText += `👥 Исполнители: ${assignees.map(a => a.name).join(", ")}\n`;
      }
    }

    if (task.due_date) {
      const deadline = new Date(task.due_date);
      messageText += `⏰ Дедлайн: ${deadline.toLocaleDateString("ru-RU")}\n`;
    }

    messageText += `🏷️ Проект: ${project.name}\n`;

    if (details) {
      messageText += `\n💬 ${details}`;
    }

    const message: TelegramMessage = {
      chat_id: project.telegramChatId,
      text: messageText,
      parse_mode: "HTML"
    };

    if (project.telegramTopicId) {
      message.message_thread_id = project.telegramTopicId;
    }

    return await this.sendMessage(message);
  }

  static async sendProjectNotification(
  project: Project,
  message: string,
  type: "info" | "warning" | "error" = "info")
  : Promise<boolean> {
    if (!project.telegramChatId) {
      return false;
    }

    const typeEmojis = {
      info: "ℹ️",
      warning: "⚠️",
      error: "❌"
    };

    const messageText = `${typeEmojis[type]} <b>Проект: ${project.name}</b>\n\n${message}`;

    const telegramMessage: TelegramMessage = {
      chat_id: project.telegramChatId,
      text: messageText,
      parse_mode: "HTML"
    };

    if (project.telegramTopicId) {
      telegramMessage.message_thread_id = project.telegramTopicId;
    }

    return await this.sendMessage(telegramMessage);
  }

  static async sendDailyReport(
  project: Project,
  tasks: Task[])
  : Promise<boolean> {
    if (!project.telegramChatId) {
      return false;
    }

    const today = new Date();
    const todayTasks = tasks.filter((task) => {
      const taskDate = new Date(task.created_at);
      return taskDate.toDateString() === today.toDateString();
    });

    const completedTasks = tasks.filter((task) => task.status === "done");
    const inProgressTasks = tasks.filter(
      (task) => task.status === "in_progress"
    );
    const overdueTasks = tasks.filter((task) => {
      if (!task.due_date) return false;
      return new Date(task.due_date) < today && task.status !== "done";
    });

    let messageText = `📊 <b>Ежедневный отчет - ${today.toLocaleDateString("ru-RU")}</b>\n`;
    messageText += `🏷️ Проект: ${project.name}\n\n`;

    messageText += `📈 <b>Статистика:</b>\n`;
    messageText += `• Всего задач: ${tasks.length}\n`;
    messageText += `• Создано сегодня: ${todayTasks.length}\n`;
    messageText += `• Выполнено: ${completedTasks.length}\n`;
    messageText += `• В работе: ${inProgressTasks.length}\n`;
    messageText += `• Просрочено: ${overdueTasks.length}\n\n`;

    if (overdueTasks.length > 0) {
      messageText += `⚠️ <b>Просроченные задачи:</b>\n`;
      overdueTasks.slice(0, 5).forEach((task) => {
        const assignees = task.assignees || [];
        const assigneeText = assignees.length > 0 ? assignees.map(a => a.name).join(", ") : "Не назначено";
        messageText += `• ${task.title} (${assigneeText})\n`;
      });
      if (overdueTasks.length > 5) {
        messageText += `• ... и еще ${overdueTasks.length - 5} задач\n`;
      }
    }

    const message: TelegramMessage = {
      chat_id: project.telegramChatId,
      text: messageText,
      parse_mode: "HTML"
    };

    if (project.telegramTopicId) {
      message.message_thread_id = project.telegramTopicId;
    }

    return await this.sendMessage(message);
  }

  static async testConnection(
  chatId: string,
  topicId?: string)
  : Promise<boolean> {
    const message: TelegramMessage = {
      chat_id: chatId,
      text: "🤖 Тестовое сообщение от ENCORE | TASKS\n\nИнтеграция с Telegram настроена успешно!",
      parse_mode: "HTML"
    };

    if (topicId) {
      message.message_thread_id = topicId;
    }

    return await this.sendMessage(message);
  }
}