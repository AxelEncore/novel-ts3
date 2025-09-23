"use client";

import React, { createContext, useContext, useReducer, ReactNode, useEffect, useCallback } from "react";
import { Task, Project, User, Board, Column, TaskStatus, TaskAction } from "@/types";
import { generateId } from "@/lib/utils";
import { api, type User as ApiUser, type Project as ApiProject, type Board as ApiBoard, type Task as ApiTask } from "@/lib/api";
import { projectService } from "@/services";

// Helper function to create notifications
function createNotification(
  type: Notification["type"],
  title: string,
  message: string,
  userId: string,
  projectId: string,
  taskId: string
): Notification {
  return {
    id: generateId(),
    type,
    title,
    message,
    taskId,
    projectId,
    userId,
    isRead: false,
    createdAt: new Date()
  };
}

interface Notification {
  id: string;
  type: "task_assigned" | "task_completed" | "task_updated" | "task_created" | "deadline_reminder";
  title: string;
  message: string;
  taskId: string;
  projectId: string;
  userId: string;
  isRead: boolean;
  createdAt: Date;
}

interface AppState {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  projects: Project[];
  boards: Board[];
  tasks: Task[];
  archivedTasks: Task[];
  filteredTasks: Task[] | null;
  users: User[];
  selectedProject: Project | null;
  taskActions: TaskAction[];
  selectedBoard: Board | null;
  readNotifications: string[];
  notifications: Notification[];
  pendingUserNotifications: User[];
  filters: {
    assignee: string;
    priority: string;
    status: string;
    deadline: string;
  };
  sortBy: "priority" | "deadline" | "created" | "updated";
  sortOrder: "asc" | "desc";
  settings: {
    theme: "dark" | "light" | "auto";
    language: "ru" | "en";
    compactMode: boolean;
    showAvatars: boolean;
    emailNotifications: boolean;
    pushNotifications: boolean;
    taskReminders: boolean;
    telegramNotifications: boolean;
    taskAssigned: boolean;
    taskCompleted: boolean;
    deadlineReminder: boolean;
    projectUpdates: boolean;
  };
}

type AppAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_CURRENT_USER"; payload: User }
  | { type: "LOGIN"; payload: User }
  | { type: "LOGOUT" }
  | { type: "SET_USERS"; payload: User[] }
  | { type: "ADD_USER"; payload: User }
  | { type: "UPDATE_USER"; payload: User }
  | { type: "APPROVE_USER"; payload: string }
  | { type: "REJECT_USER"; payload: string }
  | { type: "ADD_PENDING_USER_NOTIFICATION"; payload: User }
  | { type: "SET_PROJECTS"; payload: Project[] }
  | { type: "ADD_PROJECT"; payload: Project }
  | { type: "UPDATE_PROJECT"; payload: Project }
  | { type: "DELETE_PROJECT"; payload: string }
  | { type: "SELECT_PROJECT"; payload: Project | null }
  | { type: "SET_BOARDS"; payload: Board[] }
  | { type: "ADD_BOARD"; payload: Board }
  | { type: "UPDATE_BOARD"; payload: Board }
  | { type: "DELETE_BOARD"; payload: string }
  | { type: "SELECT_BOARD"; payload: Board | null }
  | { type: "SET_TASKS"; payload: Task[] }
  | { type: "ADD_TASK"; payload: Task }
  | { type: "UPDATE_TASK"; payload: Task }
  | { type: "DELETE_TASK"; payload: string }
  | { type: "ARCHIVE_TASK"; payload: string }
  | { type: "UNARCHIVE_TASK"; payload: string }
  | { type: "SET_ARCHIVED_TASKS"; payload: Task[] }
  | {
      type: "MOVE_TASK";
      payload: { taskId: string; newStatus: TaskStatus; newPosition: number };
    }
  | { type: "ADD_COLUMN"; payload: { boardId: string; column: Column } }
  | { type: "UPDATE_COLUMN"; payload: { boardId: string; column: Column } }
  | { type: "DELETE_COLUMN"; payload: { boardId: string; columnId: string } }
  | { type: "SET_FILTERS"; payload: Partial<AppState["filters"]> }
  | {
      type: "SET_SORT";
      payload: { sortBy: AppState["sortBy"]; sortOrder: AppState["sortOrder"] };
    }
  | { type: "SET_FILTERED_TASKS"; payload: Task[] }
  | { type: "CLEAR_FILTERED_TASKS" }
  | { type: "ADD_NOTIFICATION"; payload: Notification }
  | { type: "MARK_NOTIFICATION_READ"; payload: string }
  | { type: "MARK_ALL_NOTIFICATIONS_READ" }
  | { type: "UPDATE_SETTINGS"; payload: Partial<AppState["settings"]> }
  | { type: "ADD_TASK_ACTION"; payload: TaskAction };

const initialState: AppState = {
  currentUser: null,
  isAuthenticated: false,
  isLoading: false,
  projects: [],
  boards: [],
  tasks: [],
  archivedTasks: [],
  filteredTasks: null,
  users: [],
  selectedProject: null,
  taskActions: [],
  selectedBoard: null,
  readNotifications: [],
  notifications: [],
  pendingUserNotifications: [],
  filters: {
    assignee: "",
    priority: "",
    status: "",
    deadline: ""
  },
  sortBy: "created",
  sortOrder: "desc",
  settings: {
    theme: "dark",
    language: "ru",
    compactMode: false,
    showAvatars: true,
    emailNotifications: true,
    pushNotifications: true,
    taskReminders: true,
    telegramNotifications: true,
    taskAssigned: true,
    taskCompleted: true,
    deadlineReminder: true,
    projectUpdates: true
  }
};

// Load settings from localStorage
const loadSettings = (): AppState["settings"] => {
  if (typeof window === "undefined") return initialState.settings;
  
  try {
    const saved = localStorage.getItem("encore-tasks-settings");
    if (saved) {
      return { ...initialState.settings, ...JSON.parse(saved) };
    }
  } catch (error) {
    console.error("Failed to load settings:", error);
  }
  return initialState.settings;
};

// Save settings to localStorage
const saveSettings = (settings: AppState["settings"]) => {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.setItem("encore-tasks-settings", JSON.stringify(settings));
  } catch (error) {
    console.error("Failed to save settings:", error);
  }
};

// Convert API types to app types
const convertApiUserToUser = (apiUser: ApiUser): User => ({
  id: apiUser.id,
  name: apiUser.name,
  email: apiUser.email,
  role: apiUser.role,
  isApproved: apiUser.status === 'active' || apiUser.approval_status === 'approved' || apiUser.role === 'admin',
  created_at: apiUser.createdAt,
  updated_at: apiUser.updatedAt,
  avatar: apiUser.avatar
});

const convertApiProjectToProject = (apiProject: any): Project => {
  console.log('🔄 Converting API project:', apiProject);
  return {
    id: apiProject.id,
    name: apiProject.name,
    description: apiProject.description || '',
    color: apiProject.color,
    icon_url: apiProject.icon || '📋',
    members: [], // Will be loaded separately
    created_by: apiProject.created_by || apiProject.created_by_username || 'unknown',
    created_at: apiProject.created_at,
    updated_at: apiProject.updated_at,
    telegramChatId: apiProject.telegram_chat_id,
    telegramTopicId: apiProject.telegram_topic_id
  };
};

const convertApiBoardToBoard = (apiBoard: any): Board => ({
  id: apiBoard.id,
  name: apiBoard.name,
  description: apiBoard.description,
  project_id: apiBoard.project_id || apiBoard.projectId, // Handle both field formats
  created_by: apiBoard.created_by || '', // Default value if not provided
  created_at: apiBoard.created_at || apiBoard.createdAt,
  updated_at: apiBoard.updated_at || apiBoard.updatedAt
});

const convertApiTaskToTask = (apiTask: ApiTask): Task => ({
  id: apiTask.id,
  title: apiTask.title,
  description: apiTask.description || '',
  status: apiTask.status as TaskStatus,
  priority: apiTask.priority,
  assignees: apiTask.assignees.map(convertApiUserToUser) || [],
  reporter_id: apiTask.reporterId,
  project_id: apiTask.projectId,
  board_id: apiTask.boardId,
  due_date: apiTask.deadline,
  attachments: [], // Will be loaded separately if needed
  comments: [], // Will be loaded separately if needed
  tags: apiTask.tags.map(tag => tag.name) || [],
  created_at: apiTask.createdAt,
  updated_at: apiTask.updatedAt,
  position: apiTask.position
});

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };

    case "SET_CURRENT_USER":
    case "LOGIN":
      return {
        ...state,
        currentUser: action.payload,
        isAuthenticated: true
      };

    case "LOGOUT":
      return {
        ...state,
        currentUser: null,
        isAuthenticated: false,
        projects: [],
        boards: [],
        tasks: [],
        users: [],
        selectedProject: null,
        selectedBoard: null
      };

    case "SET_USERS":
      return { ...state, users: action.payload };

    case "ADD_USER":
      return { ...state, users: [...state.users, action.payload] };

    case "UPDATE_USER":
      return {
        ...state,
        users: state.users.map(user =>
          user.id === action.payload.id ? action.payload : user
        ),
        currentUser:
          state.currentUser?.id === action.payload.id
            ? action.payload
            : state.currentUser
      };

    case "SET_PROJECTS":
      return { ...state, projects: action.payload };

    case "ADD_PROJECT":
      return { ...state, projects: [...state.projects, action.payload] };

    case "UPDATE_PROJECT":
      return {
        ...state,
        projects: state.projects.map(project =>
          project.id === action.payload.id ? action.payload : project
        ),
        selectedProject:
          state.selectedProject?.id === action.payload.id
            ? action.payload
            : state.selectedProject
      };

    case "DELETE_PROJECT":
      return {
        ...state,
        projects: state.projects.filter(project => project.id !== action.payload),
        selectedProject:
          state.selectedProject?.id === action.payload ? null : state.selectedProject
      };

    case "SELECT_PROJECT":
      return { ...state, selectedProject: action.payload };

    case "SET_BOARDS":
      return { ...state, boards: action.payload };

    case "ADD_BOARD":
      return { ...state, boards: [...state.boards, action.payload] };

    case "UPDATE_BOARD":
      return {
        ...state,
        boards: state.boards.map(board =>
          board.id === action.payload.id ? action.payload : board
        ),
        selectedBoard:
          state.selectedBoard?.id === action.payload.id
            ? action.payload
            : state.selectedBoard
      };

    case "DELETE_BOARD":
      return {
        ...state,
        boards: state.boards.filter(board => board.id !== action.payload),
        selectedBoard:
          state.selectedBoard?.id === action.payload ? null : state.selectedBoard
      };

    case "SELECT_BOARD":
      return { ...state, selectedBoard: action.payload };

    case "SET_TASKS":
      return { ...state, tasks: action.payload };

    case "ADD_TASK":
      return { ...state, tasks: [...state.tasks, action.payload] };

    case "UPDATE_TASK":
      return {
        ...state,
        tasks: state.tasks.map(task =>
          task.id === action.payload.id ? action.payload : task
        )
      };

    case "DELETE_TASK":
      return {
        ...state,
        tasks: state.tasks.filter(task => task.id !== action.payload)
      };

    case "SET_FILTERS":
      return {
        ...state,
        filters: { ...state.filters, ...action.payload }
      };

    case "SET_SORT":
      return {
        ...state,
        sortBy: action.payload.sortBy,
        sortOrder: action.payload.sortOrder
      };

    case "SET_FILTERED_TASKS":
      return { ...state, filteredTasks: action.payload };

    case "CLEAR_FILTERED_TASKS":
      return { ...state, filteredTasks: null };

    case "ADD_NOTIFICATION":
      return {
        ...state,
        notifications: [action.payload, ...state.notifications]
      };

    case "MARK_NOTIFICATION_READ":
      return {
        ...state,
        notifications: state.notifications.map(notification =>
          notification.id === action.payload
            ? { ...notification, isRead: true }
            : notification
        )
      };

    case "MARK_ALL_NOTIFICATIONS_READ":
      return {
        ...state,
        notifications: state.notifications.map(notification => ({
          ...notification,
          isRead: true
        }))
      };

    case "UPDATE_SETTINGS":
      const newSettings = { ...state.settings, ...action.payload };
      saveSettings(newSettings);
      return { ...state, settings: newSettings };

    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  // API methods
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  loadProjects: () => Promise<void>;
  loadBoards: (projectId: string) => Promise<void>;
  loadTasks: (params: { projectId: string; boardId: string }) => Promise<void>;
  loadUsers: () => Promise<void>;
  createProject: (projectData: { name: string; description: string; color: string }) => Promise<boolean>;
  createBoard: (boardData: { name: string; description: string; project_id: string }) => Promise<boolean>;
  createTask: (taskData: {
    title: string;
    description: string;
    status: string;
    priority: string;
    assigneeId: string;
    columnId: string;
    position: number;
    dueDate: Date;
    estimatedHours: number;
    tags: string[];
  }) => Promise<boolean>;
  updateTask: (taskId: string, updateData: any) => Promise<boolean>;
  deleteTask: (taskId: string) => Promise<boolean>;
  updateUser: (userId: string, updateData: { role: string; status: string }) => Promise<boolean>;
  deleteUser: (userId: string) => Promise<boolean>;
} | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, {
    ...initialState,
    settings: loadSettings()
  });

  // Initialize authentication on app load
  useEffect(() => {
    const initializeAuth = async () => {
      console.log('🔄 AppProvider: Starting authentication initialization');
      dispatch({ type: "SET_LOADING", payload: true });
      
      try {
        // Check if user is already authenticated
        console.log('🔍 AppProvider: Calling api.getCurrentUser()');
        const response = await api.getCurrentUser();
        console.log('📥 AppProvider: getCurrentUser response:', response);
        
        if (response.data?.user && !response.error) {
          const user = convertApiUserToUser(response.data.user);
          console.log('✅ AppProvider: User authenticated, logging in:', user);
          dispatch({ type: "LOGIN", payload: user });
          
          // Load initial data
          await Promise.all([
            loadProjects(),
            loadUsers()
          ]);
        } else {
          console.log('❌ AppProvider: No authenticated user found');
        }
      } catch (error) {
        console.log('⚠️ AppProvider: No existing session found:', error);
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
        console.log('🏁 AppProvider: Authentication initialization complete');
      }
    };
    
    initializeAuth();
  }, []);

  // API methods
  const login = async (email: string, password: string): Promise<boolean> => {
    dispatch({ type: "SET_LOADING", payload: true });
    
    try {
      const response = await api.login(email, password);
      
      if (response.error) {
        return false;
      }
      
      if (response.data.user) {
        const user = convertApiUserToUser(response.data.user);
        dispatch({ type: "LOGIN", payload: user });
        
        // Load initial data
        await Promise.all([
          loadProjects(),
          loadUsers()
        ]);
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      dispatch({ type: "LOGOUT" });
    }
  };

  const loadProjects = useCallback(async (): Promise<void> => {
    try {
      console.log('🔄 AppContext: Loading projects...');
      const response = await api.getProjects();
      console.log('📥 AppContext: Projects API response:', response);
      
      if (response.error) {
        console.error('Load projects error:', response.error);
        return;
      }
      
      // API возвращает {data: {success: true, data: {projects: [...]}}}
      const projectsData = response.data?.data?.projects || response.data?.projects;
      console.log('📊 AppContext: Extracted projects data:', projectsData);
      
      if (projectsData && Array.isArray(projectsData)) {
        // Загружаем членов для каждого проекта
        const projectsWithMembers = await Promise.all(
          projectsData.map(async (project) => {
            try {
              const membersResponse = await fetch(`/api/projects/${project.id}/members`, {
                credentials: 'include'
              });
              
              if (membersResponse.ok) {
                const membersData = await membersResponse.json();
                const members = membersData.members || membersData.data || [];
                
                // Преобразуем членов в нужный формат
                const formattedMembers = members.map((member: any) => ({
                  id: member.user_id || member.id,
                  userId: member.user_id || member.id,
                  name: member.name || member.user_name || 'Unknown',
                  email: member.email || member.user_email || '',
                  role: member.role || 'member',
                  isApproved: true,
                  created_at: member.joined_at || new Date().toISOString(),
                  updated_at: member.joined_at || new Date().toISOString()
                }));
                
                return {
                  ...convertApiProjectToProject(project),
                  members: formattedMembers
                };
              } else {
                return {
                  ...convertApiProjectToProject(project),
                  members: []
                };
              }
            } catch (error) {
              console.error(`Failed to load members for project ${project.id}:`, error);
              return {
                ...convertApiProjectToProject(project),
                members: []
              };
            }
          })
        );
        
        console.log('✅ AppContext: Converted projects with members:', projectsWithMembers.length, 'items');
        dispatch({ type: "SET_PROJECTS", payload: projectsWithMembers });
      } else {
        console.warn('❌ AppContext: No projects data found in response');
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  }, [dispatch]);

  const loadBoards = useCallback(async (projectId: string): Promise<void> => {
    try {
      console.log('🔄 AppContext: Loading boards for project:', projectId);
      const response = await api.getBoards(projectId, {
        includeArchived: false,
        sortBy: 'created_at',
        sortOrder: 'desc'
      });
      
      console.log('📨 AppContext: loadBoards API response:', response);
      
      if (response.error) {
        console.error('❌ AppContext: Load boards error:', response.error);
        return;
      }
      
      // API возвращает response.data с boards
      const boardsData = response.data?.data?.boards || response.data?.boards;
      console.log('📋 AppContext: Extracted boards data:', boardsData);
      
      if (boardsData && Array.isArray(boardsData)) {
        const boards = boardsData.map(convertApiBoardToBoard);
        console.log('✅ AppContext: Converted boards:', boards.length, 'items');
        
        dispatch({ type: "SET_BOARDS", payload: boards });
        console.log('✅ AppContext: Boards set in state');
        
        // Автоматически выбираем первую доску, если нет выбранной доски или она не принадлежит текущему проекту
        if (boards.length > 0) {
          const currentSelectedBoard = state.selectedBoard;
          const shouldSelectNewBoard = !currentSelectedBoard || 
            !boards.find(board => board.id === currentSelectedBoard.id);
          
          if (shouldSelectNewBoard) {
            console.log('🎯 AppContext: Auto-selecting first board:', boards[0].name);
            dispatch({ type: "SELECT_BOARD", payload: boards[0] });
          } else {
            console.log('🎯 AppContext: Keeping current board selection');
          }
        } else {
          console.log('⚠️ AppContext: No boards found for project');
        }
      } else {
        console.warn('⚠️ AppContext: No boards data found in response');
      }
    } catch (error) {
      console.error('❌ AppContext: Failed to load boards:', error);
    }
  }, [dispatch, state.selectedBoard]);

  const loadTasks = useCallback(async (params: { projectId: string; boardId: string }): Promise<void> => {
    try {
      const response = await api.getTasks(params);
      
      if (response.error) {
        console.error('Load tasks error:', response.error);
        return;
      }
      
      if (response.data.tasks) {
        const tasks = response.data.tasks.map(convertApiTaskToTask);
        dispatch({ type: "SET_TASKS", payload: tasks });
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  }, [dispatch]);

  const loadUsers = useCallback(async (): Promise<void> => {
    try {
      console.log('🔄 AppContext: Loading users...');
      const response = await api.getUsers();
      console.log('📥 AppContext: Users API response:', response);
      
      if (response.error) {
        console.error('Load users error:', response.error);
        return;
      }
      
      // API возвращает {data: {success: true, data: {users: [...]}}}
      const usersData = response.data?.data?.users || response.data?.users;
      console.log('📊 AppContext: Extracted users data:', usersData);
      
      if (usersData && Array.isArray(usersData)) {
        const users = usersData.map(convertApiUserToUser);
        console.log('✅ AppContext: Converted users:', users.length, 'items');
        dispatch({ type: "SET_USERS", payload: users });
      } else {
        console.warn('❌ AppContext: No users data found in response');
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  }, [dispatch]);

  // Функция для генерации уникального названия проекта
  const generateUniqueProjectName = (): string => {
    const existingProjects = state.projects || [];
    let counter = 1;
    const baseName = "Проект";
    let newName = `${baseName} #${counter}`;
    
    while (existingProjects.some(project => project.name === newName)) {
      counter++;
      newName = `${baseName} #${counter}`;
    }
    
    console.log(`Автогенерация названия проекта: ${newName}`);
    return newName;
  };

  const createProject = async (projectData: {
    name: string;
    description: string;
    color: string;
    icon: string;
    members: any[];
    createdBy: string;
    telegramChatId: string;
    telegramTopicId: string;
  }): Promise<boolean> => {
    console.log('AppContext createProject called with:', projectData);
    try {
      // Автогенерация названия если не указано
      let projectName = projectData.name.trim() || '';
      if (!projectName) {
        projectName = generateUniqueProjectName();
        console.log('Автогенерировано название:', projectName);
      }
      
      // Prepare data for API - only send fields that API expects
      const requestData = {
        name: projectName,
        description: projectData.description || '',
        color: projectData.color || '#6366f1',
        isPrivate: false
      };
      console.log('Calling api.createProject with:', requestData);
      console.log('API endpoint: /api/projects');
      
      const response = await api.createProject(requestData);
      console.log('Full API Response:', JSON.stringify(response, null, 2));
      console.log('Response structure check:');
      console.log('- response.data exists:', !!response.data);
      console.log('- response.data.success:', response.data.success);
      console.log('- response.data.data exists:', !!response.data.data);
      
      if (!response) {
        console.error('No response from API');
        return false;
      }
      
      // Check if response has data and success property
      if (!response.data || !response.data.success) {
        const errorMessage = response.data.error || 'Unknown error';
        console.error('API request failed - Response validation failed:');
        console.error('- Error message:', errorMessage);
        console.error('- Full response:', JSON.stringify(response, null, 2));
        return false;
      }
      
      // Then check if project data exists
      if (!response.data.data) {
        console.error('No project data in API response:', response);
        console.error('- Response data:', JSON.stringify(response.data, null, 2));
        return false;
      }
      
      // API возвращает {data: {success: true, data: {...}}}
      const projectDataFromApi = response.data.data;
      console.log('Project data from API:', JSON.stringify(projectDataFromApi, null, 2));
      console.log('Project creation successful - ID:', projectDataFromApi.id);
      
      if (!projectDataFromApi || !projectDataFromApi.id) {
        console.error('Project data missing ID:', projectDataFromApi);
        return false;
      }
      
      // Создаем объект проекта в формате, ожидаемом convertApiProjectToProject
      const apiProjectData = {
        id: projectDataFromApi.id,
        name: projectDataFromApi.name,
        description: projectDataFromApi.description || '',
        color: projectDataFromApi.color,
        icon: projectDataFromApi.icon || '📋',
        created_by: projectDataFromApi.created_by,
        created_at: projectDataFromApi.created_at,
        updated_at: projectDataFromApi.updated_at
      };
      
      // Convert API response to internal project format
      const project = convertApiProjectToProject(apiProjectData);
      console.log('Project converted:', project);
      
      if (!project || !project.id) {
        console.error('Failed to convert project or missing project ID');
        return false;
      }
      
      console.log('Dispatching ADD_PROJECT with:', project);
      dispatch({ type: "ADD_PROJECT", payload: project });
      console.log('ADD_PROJECT dispatched successfully');
      return true;
    } catch (error) {
      console.error('Failed to create project:', error);
      return false;
    }
  };

  const createProjectWithBoards = async (projectData: {
    name: string;
    description: string;
    color: string;
    members: string[];
    telegramChatId: string;
    boards: Array<{
      name: string;
      description: string;
      columns: Array<{
        name: string;
        status: string;
        position: number;
      }>;
    }>;
  }): Promise<{ success: boolean; project: Project; boards: Board[] }> => {
    try {
      const result = await projectService.createProjectWithBoards(projectData);
      
      if (result.success && result.project) {
        dispatch({ type: "ADD_PROJECT", payload: result.project });
        
        if (result.boards && result.boards.length > 0) {
          result.boards.forEach(board => {
            dispatch({ type: "ADD_BOARD", payload: board });
          });
        }
        
        return result;
      }
      
      return { success: false };
    } catch (error) {
      console.error('Failed to create project with boards:', error);
      return { success: false };
    }
  };

  const createBoard = async (boardData: {
    name: string;
    description: string;
    project_id: string; // Изменено с projectId для соответствия схеме
  }): Promise<boolean> => {
    try {
      console.log('🔄 Creating board with data:', boardData);
      
      const apiRequest = {
        name: boardData.name,
        description: boardData.description,
        projectId: boardData.project_id, // Преобразуем обратно для API
        visibility: 'public' as const,
        color: '#6366f1',
        allowComments: true,
        allowAttachments: true,
        autoArchive: false
      };
      
      console.log('📡 API request data:', apiRequest);
      
      const response = await api.createBoard(apiRequest);
      
      console.log('📨 API response:', response);
      
      if (response.error) {
        console.error('❌ Create board error:', response.error);
        return false;
      }
      
      // API возвращает board данные напрямую в response.data, а не в response.data.board
      if (response.data) {
        console.log('✅ Board data received:', response.data);
        const board = convertApiBoardToBoard(response.data);
        console.log('🔄 Converted board:', board);
        dispatch({ type: "ADD_BOARD", payload: board });
        console.log('✅ Board added to state successfully');
        return true;
      }
      
      console.warn('⚠️ No data in response:', response);
      return false;
    } catch (error) {
      console.error('❌ Failed to create board:', error);
      return false;
    }
  };

  const createTask = async (taskData: {
    title: string;
    description: string;
    status: string;
    priority: string;
    assigneeId: string;
    columnId: string;
    position: number;
    dueDate: Date;
    estimatedHours: number;
    tags: string[];
  }): Promise<boolean> => {
    try {
      const response = await api.createTask({
        title: taskData.title,
        description: taskData.description,
        status: taskData.status || 'todo',
        priority: taskData.priority || 'medium',
        assigneeId: taskData.assigneeId,
        columnId: taskData.columnId,
        position: taskData.position || 0,
        dueDate: taskData.dueDate.toISOString(),
        estimatedHours: taskData.estimatedHours,
        tags: taskData.tags || []
      });
      
      if (response.error) {
        console.error('Create task error:', response.error);
        return false;
      }
      
      if (response.data.task) {
        const task = convertApiTaskToTask(response.data.task);
        dispatch({ type: "ADD_TASK", payload: task });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to create task:', error);
      return false;
    }
  };

  const updateTask = async (taskId: string, updateData: any): Promise<boolean> => {
    try {
      const response = await api.updateTask(taskId, updateData);
      
      if (response.error) {
        console.error('Update task error:', response.error);
        return false;
      }
      
      if (response.data.task) {
        const task = convertApiTaskToTask(response.data.task);
        dispatch({ type: "UPDATE_TASK", payload: task });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to update task:', error);
      return false;
    }
  };

  const deleteTask = async (taskId: string): Promise<boolean> => {
    try {
      const response = await api.deleteTask(taskId);
      
      if (response.error) {
        console.error('Delete task error:', response.error);
        return false;
      }
      
      dispatch({ type: "DELETE_TASK", payload: taskId });
      return true;
    } catch (error) {
      console.error('Failed to delete task:', error);
      return false;
    }
  };

  const deleteProject = async (projectId: string): Promise<boolean> => {
    try {
      const response = await api.deleteProject(projectId);
      
      if (response.error) {
        console.error('Delete project error:', response.error);
        return false;
      }
      
      dispatch({ type: "DELETE_PROJECT", payload: projectId });
      return true;
    } catch (error) {
      console.error('Failed to delete project:', error);
      return false;
    }
  };

  const deleteBoard = async (boardId: string): Promise<boolean> => {
    try {
      const response = await api.deleteBoard(boardId);
      
      if (response.error) {
        console.error('Delete board error:', response.error);
        return false;
      }
      
      dispatch({ type: "DELETE_BOARD", payload: boardId });
      return true;
    } catch (error) {
      console.error('Failed to delete board:', error);
      return false;
    }
  };

  const updateUser = async (userId: string, updateData: { role: string; status: string }): Promise<boolean> => {
    try {
      const response = await api.updateUser(userId, updateData);
      
      if (response.error) {
        console.error('Update user error:', response.error);
        return false;
      }
      
      if (response.data.user) {
        const updatedUser = convertApiUserToUser(response.data.user);
        dispatch({ type: "UPDATE_USER", payload: updatedUser });
      }
      
      return true;
    } catch (error) {
      console.error('Failed to update user:', error);
      return false;
    }
  };

  const deleteUser = async (userId: string): Promise<boolean> => {
    try {
      const response = await api.deleteUser(userId);
      
      if (response.error) {
        console.error('Delete user error:', response.error);
        return false;
      }
      
      dispatch({ type: "REJECT_USER", payload: userId });
      return true;
    } catch (error) {
      console.error('Failed to delete user:', error);
      return false;
    }
  };

  const contextValue = {
    state,
    dispatch,
    login,
    logout,
    loadProjects,
    loadBoards,
    loadTasks,
    loadUsers,
    createProject,
    createProjectWithBoards,
    createBoard,
    createTask,
    updateTask,
    deleteTask,
    deleteProject,
    updateUser,
    deleteUser
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}

export { createNotification };
export type { Notification, AppState, AppAction };