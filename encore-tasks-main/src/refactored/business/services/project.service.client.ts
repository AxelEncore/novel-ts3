import {
  Project,
  CreateProjectData,
  UpdateProjectData,
  ProjectStatus,
  ProjectSortBy,
  SortOrder,
  PaginationParams,
  PaginatedResponse,
  SearchFilters
} from '../../data/types';
import { IProjectService } from '../interfaces';

export interface ProjectFilters {
  status?: ProjectStatus;
  search?: string;
  sortBy?: ProjectSortBy;
  sortOrder?: SortOrder;
  showArchived?: boolean;
  pagination?: PaginationParams;
}

export class ClientProjectService implements IProjectService {
  private baseUrl = '/api/projects';

  async getProjects(filters: ProjectFilters = {}): Promise<PaginatedResponse<Project>> {
    const params = new URLSearchParams();
    
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('query', filters.search);
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
    if (filters.showArchived !== undefined) params.append('showArchived', filters.showArchived.toString());
    if (filters.pagination?.page) params.append('page', filters.pagination.page.toString());
    if (filters.pagination?.limit) params.append('limit', filters.pagination.limit.toString());

    const response = await fetch(`${this.baseUrl}?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }
    
    return response.json();
  }

  async getById(id: string, userId: string): Promise<Project> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    if (!response.ok) {
      if (response.status === 404) throw new Error('Project not found');
      throw new Error(`Failed to fetch project: ${response.statusText}`);
    }
    
    return response.json();
  }

  async create(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'members' | 'statistics'>, userId: string): Promise<Project> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...projectData, userId }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create project: ${response.statusText}`);
    }
    
    return response.json();
  }

  async update(id: string, updates: Partial<Project>, userId: string): Promise<Project> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...updates, userId }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update project: ${response.statusText}`);
    }
    
    return response.json();
  }

  async delete(id: string, userId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete project: ${response.statusText}`);
    }
  }

  async archive(id: string, userId: string): Promise<Project> {
    const response = await fetch(`${this.baseUrl}/${id}/archive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to archive project: ${response.statusText}`);
    }
    
    return response.json();
  }

  async restore(id: string, userId: string): Promise<Project> {
    const response = await fetch(`${this.baseUrl}/${id}/restore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to restore project: ${response.statusText}`);
    }
    
    return response.json();
  }

  async getByUserId(userId: string, filters: SearchFilters): Promise<Project[]> {
    const params = new URLSearchParams();
    if (filters.statuses) params.append('statuses', filters.statuses.join(','));
    if (filters.query) params.append('query', filters.query);
    
    const response = await fetch(`${this.baseUrl}?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch user projects: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.data?.projects || result.data || result;
  }

  async getProjectMembers(projectId: string): Promise<unknown[]> {
    const response = await fetch(`${this.baseUrl}/${projectId}/members`);
    if (!response.ok) {
      throw new Error(`Failed to fetch project members: ${response.statusText}`);
    }
    
    return response.json();
  }

  async addMember(projectId: string, memberData: Omit<Project['members'][0], 'joinedAt'>, userId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${projectId}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...memberData, userId }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to add project member: ${response.statusText}`);
    }
  }

  async removeMember(projectId: string, memberId: string, userId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${projectId}/members/${memberId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to remove project member: ${response.statusText}`);
    }
  }

  async duplicate(id: string, newName: string, userId: string): Promise<Project> {
    const response = await fetch(`${this.baseUrl}/${id}/duplicate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ newName, userId }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to duplicate project: ${response.statusText}`);
    }
    
    return response.json();
  }

  async updateMemberRole(projectId: string, memberId: string, role: Project['members'][0]['role'], userId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${projectId}/members/${memberId}/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role, userId }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update member role: ${response.statusText}`);
    }
  }

  async getStatistics(id: string, userId: string): Promise<Project['statistics']> {
    const response = await fetch(`${this.baseUrl}/${id}/statistics`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get project statistics: ${response.statusText}`);
    }
    
    return response.json();
  }

  async checkPermissions(projectId: string, userId: string, permission: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/${projectId}/permissions/${userId}/${permission}`);
    
    if (!response.ok) {
      throw new Error(`Failed to check permissions: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.hasPermission || false;
  }
}

export const clientProjectService = new ClientProjectService();