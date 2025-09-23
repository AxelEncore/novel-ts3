import React from 'react';
import { TaskAction } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { AppAction } from '@/contexts/AppContext';

export const createTaskAction = (
  taskId: string,
  boardId: string,
  projectId: string,
  userId: string,
  userName: string,
  action: TaskAction['action'],
  description: string,
  oldValue$1: string,
  newValue$2: string,
  changes$3: TaskAction['changes']
): TaskAction => {
  return {
    id: uuidv4(),
    taskId,
    boardId,
    projectId,
    userId,
    userName,
    action,
    description,
    timestamp: new Date().toISOString(),
    oldValue,
    newValue,
    changes
  };
};

export const logTaskCreated = (
  dispatch: React.Dispatch<AppAction>,
  taskId: string,
  boardId: string,
  projectId: string,
  taskTitle: string,
  userId: string,
  userName: string
) => {
  const action = createTaskAction(
    taskId,
    boardId,
    projectId,
    userId,
    userName,
    'created',
    `Создана задача "${taskTitle}"`
  );
  dispatch({ type: 'ADD_TASK_ACTION', payload: action });
};

export const logTaskDeleted = (
  dispatch: React.Dispatch<AppAction>,
  taskId: string,
  boardId: string,
  projectId: string,
  taskTitle: string,
  userId: string,
  userName: string
) => {
  const action = createTaskAction(
    taskId,
    boardId,
    projectId,
    userId,
    userName,
    'deleted',
    `Удалена задача "${taskTitle}"`
  );
  dispatch({ type: 'ADD_TASK_ACTION', payload: action });
};

export const logTaskMoved = (
  dispatch: React.Dispatch<AppAction>,
  taskId: string,
  boardId: string,
  projectId: string,
  taskTitle: string,
  userId: string,
  userName: string,
  fromColumn: string,
  toColumn: string
) => {
  const action = createTaskAction(
    taskId,
    boardId,
    projectId,
    userId,
    userName,
    'moved',
    `Перемещена задача "${taskTitle}" из "${fromColumn}" в "${toColumn}"`,
    fromColumn,
    toColumn
  );
  dispatch({ type: 'ADD_TASK_ACTION', payload: action });
};

export const logTaskAssigned = (
  dispatch: React.Dispatch<AppAction>,
  taskId: string,
  boardId: string,
  projectId: string,
  taskTitle: string,
  userId: string,
  userName: string,
  assigneeName: string
) => {
  const action = createTaskAction(
    taskId,
    boardId,
    projectId,
    userId,
    userName,
    'assigned',
    `Назначен исполнитель "${assigneeName}" для задачи "${taskTitle}"`
  );
  dispatch({ type: 'ADD_TASK_ACTION', payload: action });
};

export const logTaskAssigneesChanged = (
  dispatch: React.Dispatch<AppAction>,
  taskId: string,
  boardId: string,
  projectId: string,
  taskTitle: string,
  userId: string,
  userName: string,
  oldAssignees: string[],
  newAssignees: string[]
) => {
  const added = newAssignees.filter(name => !oldAssignees.includes(name));
  const removed = oldAssignees.filter(name => !newAssignees.includes(name));
  
  let description = `Изменены исполнители задачи "${taskTitle}"`;
  if (added.length > 0) {
    description += `. Добавлены: ${added.join(', ')}`;
  }
  if (removed.length > 0) {
    description += `. Удалены: ${removed.join(', ')}`;
  }
  
  const action = createTaskAction(
    taskId,
    boardId,
    projectId,
    userId,
    userName,
    'assigned',
    description,
    oldAssignees.join(', '),
    newAssignees.join(', ')
  );
  dispatch({ type: 'ADD_TASK_ACTION', payload: action });
};

export const logTaskUnassigned = (
  dispatch: React.Dispatch<AppAction>,
  taskId: string,
  boardId: string,
  projectId: string,
  taskTitle: string,
  userId: string,
  userName: string,
  assigneeName: string
) => {
  const action = createTaskAction(
    taskId,
    boardId,
    projectId,
    userId,
    userName,
    'unassigned',
    `Снят исполнитель "${assigneeName}" с задачи "${taskTitle}"`
  );
  dispatch({ type: 'ADD_TASK_ACTION', payload: action });
};

export const logTaskStatusChanged = (
  dispatch: React.Dispatch<AppAction>,
  taskId: string,
  boardId: string,
  projectId: string,
  taskTitle: string,
  userId: string,
  userName: string,
  oldStatus: string,
  newStatus: string
) => {
  const action = createTaskAction(
    taskId,
    boardId,
    projectId,
    userId,
    userName,
    'status_changed',
    `Изменен статус задачи "${taskTitle}" с "${oldStatus}" на "${newStatus}"`,
    oldStatus,
    newStatus
  );
  dispatch({ type: 'ADD_TASK_ACTION', payload: action });
};

export const logTaskPriorityChanged = (
  dispatch: React.Dispatch<AppAction>,
  taskId: string,
  boardId: string,
  projectId: string,
  taskTitle: string,
  userId: string,
  userName: string,
  oldPriority: string,
  newPriority: string
) => {
  const action = createTaskAction(
    taskId,
    boardId,
    projectId,
    userId,
    userName,
    'priority_changed',
    `Изменен приоритет задачи "${taskTitle}" с "${oldPriority}" на "${newPriority}"`,
    oldPriority,
    newPriority
  );
  dispatch({ type: 'ADD_TASK_ACTION', payload: action });
};

export const logTaskUpdated = (
  dispatch: React.Dispatch<AppAction>,
  taskId: string,
  boardId: string,
  projectId: string,
  taskTitle: string,
  userId: string,
  userName: string,
  changes: TaskAction['changes']
) => {
  const changeDescriptions = changes$1.map(change => {
    const fieldNames: Record<string, string> = {
      title: 'название',
      description: 'описание',
      priority: 'приоритет',
      assignees: 'исполнители',
      deadline: 'срок выполнения',
      tags: 'теги'
    };
    return `${fieldNames[change.field] || change.field}: "${change.oldValue}" → "${change.newValue}"`;
  }) || [];
  
  const action = createTaskAction(
    taskId,
    boardId,
    projectId,
    userId,
    userName,
    'updated',
    `Обновлена задача "${taskTitle}": ${changeDescriptions.join(', ')}`,
    undefined,
    undefined,
    changes
  );
  dispatch({ type: 'ADD_TASK_ACTION', payload: action });
};