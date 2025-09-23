// Project Service Implementation
// Handles business logic for project management

import { IProjectService, IProjectRepository, IProjectValidator } from '../interfaces';
import {
  Project,
  ProjectRole,
  ProjectPermissions,
  SearchFilters,
  SortOptions,
  PaginationOptions
} from '../../data/types';
import { projectRepository } from '../../data/repositories';
import { ProjectValidator } from '../validators';

export class ProjectService implements IProjectService {
  private repository: IProjectRepository;
  private validator: IProjectValidator;

  constructor(
    repository: IProjectRepository = projectRepository,
    validator: IProjectValidator = new ProjectValidator()
  ) {
    this.repository = repository;
    this.validator = validator;
  }

  async getById(id: string, userId: string): Promise<Project> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid project ID: ${validation.errors.join(', ')}`);
    }

    const userValidation = this.validator.validateId(userId);
    if (!userValidation.isValid) {
      throw new Error(`Invalid user ID: ${userValidation.errors.join(', ')}`);
    }

    const project = await this.repository.findById(id);
    if (!project) {
      throw new Error('Project not found');
    }

    // Check if user has access to this project
    const hasAccess = await this.canUserAccess(id, userId);
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    return project;
  }

  async getByUserId(
    userId: string,
    filters$1: SearchFilters
  ): Promise<Project[]> {
    const validation = this.validator.validateId(userId);
    if (!validation.isValid) {
      throw new Error(`Invalid user ID: ${validation.errors.join(', ')}`);
    }

    return await this.repository.findByUserId(userId, filters);
  }

  async getAll(
    filters$1: SearchFilters,
    sort$2: SortOptions,
    pagination$3: PaginationOptions
  ): Promise<Project[]> {
    if (filters) {
      const validation = this.validator.validateSearchFilters(filters);
      if (!validation.isValid) {
        throw new Error(`Invalid search filters: ${validation.errors.join(', ')}`);
      }
    }

    if (sort) {
      const validation = this.validator.validateSortOptions(sort);
      if (!validation.isValid) {
        throw new Error(`Invalid sort options: ${validation.errors.join(', ')}`);
      }
    }

    if (pagination) {
      const validation = this.validator.validatePaginationOptions(pagination);
      if (!validation.isValid) {
        throw new Error(`Invalid pagination options: ${validation.errors.join(', ')}`);
      }
    }

    return await this.repository.findAll(filters, sort, pagination);
  }

  async create(
    projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'members' | 'statistics'>,
    userId: string
  ): Promise<Project> {
    const validation = this.validator.validateCreate(projectData);
    if (!validation.isValid) {
      throw new Error(`Invalid project data: ${validation.errors.join(', ')}`);
    }

    const userValidation = this.validator.validateId(userId);
    if (!userValidation.isValid) {
      throw new Error(`Invalid user ID: ${userValidation.errors.join(', ')}`);
    }

    // Business logic: Set default values
    const projectWithDefaults = {
      ...projectData,
      ownerId: userId,
      color: projectData.color || '#3B82F6',
      isArchived: projectData.isArchived || false,
      settings: projectData.settings || {
        allowPublicAccess: false,
        requireApprovalForTasks: false,
        enableTimeTracking: true,
        defaultTaskPriority: 'medium',
        autoArchiveCompletedTasks: false
      },
      members: [{
        userId,
        role: 'owner' as const,
        joinedAt: new Date(),
        permissions: this.getDefaultPermissions('owner')
      }],
      statistics: {
        totalBoards: 0,
        totalTasks: 0,
        completedTasks: 0,
        overdueTasks: 0,
        activeMembersCount: 1
      }
    };

    return await this.repository.create(projectWithDefaults);
  }

  async update(
    id: string,
    projectData: Partial<Project>,
    userId: string
  ): Promise<Project> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid project ID: ${validation.errors.join(', ')}`);
    }

    const userValidation = this.validator.validateId(userId);
    if (!userValidation.isValid) {
      throw new Error(`Invalid user ID: ${userValidation.errors.join(', ')}`);
    }

    const updateValidation = this.validator.validateUpdate(projectData);
    if (!updateValidation.isValid) {
      throw new Error(`Invalid update data: ${updateValidation.errors.join(', ')}`);
    }

    const existingProject = await this.repository.findById(id);
    if (!existingProject) {
      throw new Error('Project not found');
    }

    // Check if user has permission to update this project
    const hasPermission = await this.canUserModify(id, userId);
    if (!hasPermission) {
      throw new Error('Access denied');
    }

    return await this.repository.update(id, projectData);
  }

  async delete(id: string, userId: string): Promise<void> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid project ID: ${validation.errors.join(', ')}`);
    }

    const userValidation = this.validator.validateId(userId);
    if (!userValidation.isValid) {
      throw new Error(`Invalid user ID: ${userValidation.errors.join(', ')}`);
    }

    const existingProject = await this.repository.findById(id);
    if (!existingProject) {
      throw new Error('Project not found');
    }

    // Check if user has permission to delete this project
    const hasPermission = await this.canUserModify(id, userId);
    if (!hasPermission) {
      throw new Error('Access denied');
    }

    // Business logic: Only allow deletion of archived projects
    if (!existingProject.isArchived) {
      throw new Error('Project must be archived before deletion');
    }

    await this.repository.delete(id);
  }


  async archive(id: string, userId: string): Promise<Project> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid project ID: ${validation.errors.join(', ')}`);
    }

    const userValidation = this.validator.validateId(userId);
    if (!userValidation.isValid) {
      throw new Error(`Invalid user ID: ${userValidation.errors.join(', ')}`);
    }

    const hasPermission = await this.canUserModify(id, userId);
    if (!hasPermission) {
      throw new Error('Access denied');
    }

    return await this.repository.update(id, { isArchived: true });
  }

  async restore(id: string, userId: string): Promise<Project> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid project ID: ${validation.errors.join(', ')}`);
    }

    const userValidation = this.validator.validateId(userId);
    if (!userValidation.isValid) {
      throw new Error(`Invalid user ID: ${userValidation.errors.join(', ')}`);
    }

    const hasPermission = await this.canUserModify(id, userId);
    if (!hasPermission) {
      throw new Error('Access denied');
    }

    return await this.repository.update(id, { isArchived: false });
  }

  async duplicate(id: string, userId: string, newName$1: string): Promise<Project> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid project ID: ${validation.errors.join(', ')}`);
    }

    const userValidation = this.validator.validateId(userId);
    if (!userValidation.isValid) {
      throw new Error(`Invalid user ID: ${userValidation.errors.join(', ')}`);
    }

    const originalProject = await this.getById(id, userId);
    const duplicateData = {
      ...originalProject,
      name: newName || `${originalProject.name} (Copy)`,
      isArchived: false
    };
    
    // Remove fields that shouldn't be duplicated
    delete (duplicateData as any).id;
    delete (duplicateData as any).createdAt;
    delete (duplicateData as any).updatedAt;
    delete (duplicateData as any).members;
    delete (duplicateData as any).statistics;

    return await this.create(duplicateData, userId);
  }

  async updatePosition(id: string, newPosition: number): Promise<void> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid project ID: ${validation.errors.join(', ')}`);
    }

    if (newPosition < 0) {
      throw new Error('Position must be non-negative');
    }

    await this.repository.updatePosition(id, newPosition);
  }

  async getStatistics(projectId: string, userId: string): Promise<any> {
    const validation = this.validator.validateId(projectId);
    if (!validation.isValid) {
      throw new Error(`Invalid project ID: ${validation.errors.join(', ')}`);
    }

    const userValidation = this.validator.validateId(userId);
    if (!userValidation.isValid) {
      throw new Error(`Invalid user ID: ${userValidation.errors.join(', ')}`);
    }

    const hasAccess = await this.canUserAccess(projectId, userId);
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    return await this.repository.getStatistics(projectId);
  }

  async getMembers(id: string): Promise<Project['members']> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid project ID: ${validation.errors.join(', ')}`);
    }

    return await this.repository.getMembers(id);
  }

  async addMember(
    projectId: string,
    memberData: { userId: string; role: string },
    userId: string
  ): Promise<void> {
    const idValidation = this.validator.validateId(projectId);
    if (!idValidation.isValid) {
      throw new Error(`Invalid project ID: ${idValidation.errors.join(', ')}`);
    }

    const userValidation = this.validator.validateId(userId);
    if (!userValidation.isValid) {
      throw new Error(`Invalid user ID: ${userValidation.errors.join(', ')}`);
    }

    const hasPermission = await this.canUserModify(projectId, userId);
    if (!hasPermission) {
      throw new Error('Access denied');
    }

    // Check if project exists
    const existingProject = await this.repository.findById(projectId);
    if (!existingProject) {
      throw new Error('Project not found');
    }

    // Business logic: Check if user is already a member
    const existingMembers = await this.repository.getMembers(projectId);
    const isAlreadyMember = existingMembers.some(m => m.userId === memberData.userId);
    if (isAlreadyMember) {
      throw new Error('User is already a member of this project');
    }

    // Set default permissions based on role
    const memberWithDefaults = {
      userId: memberData.userId,
      role: memberData.role as any,
      joinedAt: new Date(),
      permissions: this.getDefaultPermissions(memberData.role)
    };

    await this.repository.addMember(projectId, memberWithDefaults);
  }

  async removeMember(projectId: string, memberId: string, userId: string): Promise<void> {
    const projectIdValidation = this.validator.validateId(projectId);
    if (!projectIdValidation.isValid) {
      throw new Error(`Invalid project ID: ${projectIdValidation.errors.join(', ')}`);
    }

    const userIdValidation = this.validator.validateId(userId);
    if (!userIdValidation.isValid) {
      throw new Error(`Invalid user ID: ${userIdValidation.errors.join(', ')}`);
    }

    const memberIdValidation = this.validator.validateId(memberId);
    if (!memberIdValidation.isValid) {
      throw new Error(`Invalid member ID: ${memberIdValidation.errors.join(', ')}`);
    }

    const hasPermission = await this.canUserModify(projectId, userId);
    if (!hasPermission) {
      throw new Error('Access denied');
    }

    // Check if project exists
    const existingProject = await this.repository.findById(projectId);
    if (!existingProject) {
      throw new Error('Project not found');
    }

    // Business logic: Cannot remove project owner
    if (existingProject.ownerId === memberId) {
      throw new Error('Cannot remove project owner');
    }

    await this.repository.removeMember(projectId, memberId);
  }

  async updateMemberRole(
    projectId: string,
    memberId: string,
    role: ProjectRole,
    userId: string
  ): Promise<void> {
    const projectIdValidation = this.validator.validateId(projectId);
    if (!projectIdValidation.isValid) {
      throw new Error(`Invalid project ID: ${projectIdValidation.errors.join(', ')}`);
    }

    const userIdValidation = this.validator.validateId(userId);
    if (!userIdValidation.isValid) {
      throw new Error(`Invalid user ID: ${userIdValidation.errors.join(', ')}`);
    }

    const memberIdValidation = this.validator.validateId(memberId);
    if (!memberIdValidation.isValid) {
      throw new Error(`Invalid member ID: ${memberIdValidation.errors.join(', ')}`);
    }

    const hasPermission = await this.canUserModify(projectId, userId);
    if (!hasPermission) {
      throw new Error('Access denied');
    }

    if (!['owner', 'admin', 'member', 'viewer'].includes(role)) {
      throw new Error('Invalid role');
    }

    // Check if project exists
    const existingProject = await this.repository.findById(projectId);
    if (!existingProject) {
      throw new Error('Project not found');
    }

    // Business logic: Cannot change owner role
    if (existingProject.ownerId === memberId && role !== 'owner') {
      throw new Error('Cannot change project owner role');
    }

    await this.repository.updateMemberRole(projectId, memberId, role);
  }

  async checkPermissions(projectId: string, userId: string, permission: string): Promise<boolean> {
    const validation = this.validator.validateId(projectId);
    if (!validation.isValid) {
      return false;
    }

    const userValidation = this.validator.validateId(userId);
    if (!userValidation.isValid) {
      return false;
    }

    return await this.repository.checkPermissions(projectId, userId, permission);
  }

  private async canUserAccess(projectId: string, userId: string): Promise<boolean> {
    const projectIdValidation = this.validator.validateId(projectId);
    if (!projectIdValidation.isValid) {
      return false;
    }

    const userIdValidation = this.validator.validateId(userId);
    if (!userIdValidation.isValid) {
      return false;
    }

    try {
      const project = await this.repository.findById(projectId);
      if (!project) {
        return false;
      }

      // Owner always has access
      if (project.ownerId === userId) {
        return true;
      }

      // Check if user is a member
      const members = await this.repository.getMembers(projectId);
      return members.some(member => member.userId === userId);
    } catch {
      return false;
    }
  }

  private async canUserModify(projectId: string, userId: string): Promise<boolean> {
    const hasAccess = await this.canUserAccess(projectId, userId);
    if (!hasAccess) {
      return false;
    }

    try {
      const project = await this.repository.findById(projectId);
      if (!project) {
        return false;
      }

      // Owner always can modify
      if (project.ownerId === userId) {
        return true;
      }

      // Check member permissions
      const members = await this.repository.getMembers(projectId);
      const member = members.find(m => m.userId === userId);
      
      return member$1.permissions$2.canEditProject || false;
    } catch {
      return false;
    }
  }

  async canUserEdit(projectId: string, userId: string): Promise<boolean> {
    return await this.canUserModify(projectId, userId);
  }

  private getDefaultPermissions(role: string): ProjectPermissions {
    switch (role) {
      case 'owner':
        return {
          canCreateBoards: true,
          canEditProject: true,
          canManageMembers: true,
          canDeleteProject: true,
          canArchiveProject: true
        };
      case 'admin':
        return {
          canCreateBoards: true,
          canEditProject: true,
          canManageMembers: true,
          canDeleteProject: false,
          canArchiveProject: true
        };
      case 'member':
        return {
          canCreateBoards: true,
          canEditProject: false,
          canManageMembers: false,
          canDeleteProject: false,
          canArchiveProject: false
        };
      case 'viewer':
        return {
          canCreateBoards: false,
          canEditProject: false,
          canManageMembers: false,
          canDeleteProject: false,
          canArchiveProject: false
        };
      default:
        return {
          canCreateBoards: false,
          canEditProject: false,
          canManageMembers: false,
          canDeleteProject: false,
          canArchiveProject: false
        };
    }
  }
}

// Export singleton instance
export const projectService = new ProjectService();