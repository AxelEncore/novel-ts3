// Client-side Service Factory
// Uses API calls instead of direct database access

import { ClientProjectService, clientProjectService } from './project.service.client';
import { IProjectService } from '../interfaces';

// Client-side service factory for browser environment
export class ClientServiceFactory {
  private static projectServiceInstance: ClientProjectService;

  static getProjectService(): IProjectService {
    if (!this.projectServiceInstance) {
      this.projectServiceInstance = new ClientProjectService();
    }
    return this.projectServiceInstance;
  }

  // TODO: Add other client services as needed
  // static getBoardService(): IBoardService { ... }
  // static getTaskService(): ITaskService { ... }
  // static getUserService(): IUserService { ... }

  // Reset all instances (useful for testing)
  static reset(): void {
    this.projectServiceInstance = null as unknown as ClientProjectService;
  }
}

// Default client service instances for convenience
export const clientServices = {
  project: clientProjectService,
} as const;

// Export client services
export { ClientProjectService, clientProjectService };