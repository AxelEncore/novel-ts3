// User Service Implementation
// Handles business logic for user management

import { IUserService, IUserRepository, IUserValidator } from '../interfaces';
import {
  User,
  SearchFilters,
  SortOptions,
  PaginationOptions
} from '../../data/types';
import { userRepository } from '../../data/repositories';
import { UserValidator } from '../validators';

export class UserService implements IUserService {
  private repository: IUserRepository;
  private validator: IUserValidator;

  constructor(
    repository: IUserRepository = userRepository,
    validator: IUserValidator = new UserValidator()
  ) {
    this.repository = repository;
    this.validator = validator;
  }

  async getById(id: string): Promise<User> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid user ID: ${validation.errors.join(', ')}`);
    }

    const user = await this.repository.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  async getByEmail(email: string): Promise<User> {
    const validation = this.validator.validateEmail(email);
    if (!validation.isValid) {
      throw new Error(`Invalid email: ${validation.errors.join(', ')}`);
    }

    const user = await this.repository.findByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  async findAll(
    filters$1: SearchFilters,
    sort$2: SortOptions,
    pagination$3: PaginationOptions
  ): Promise<User[]> {
    return await this.repository.findAll(filters);
  }

  async create(
    userData: Omit<User, 'id' | 'created_at' | 'updated_at'>
  ): Promise<User> {
    const validation = this.validator.validateCreate(userData);
    if (!validation.isValid) {
      throw new Error(`Invalid user data: ${validation.errors.join(', ')}`);
    }

    // Business logic: Check if email already exists
    const existingUser = await this.repository.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Business logic: Set default values
    const userWithDefaults = {
      ...userData,
      isApproved: true
    };

    // Business logic: Hash password (in real implementation)
    // userWithDefaults.password = await this.hashPassword(userWithDefaults.password);

    return await this.repository.create(userWithDefaults);
  }

  async update(
    id: string,
    updates: Partial<User>
  ): Promise<User> {
    const idValidation = this.validator.validateId(id);
    if (!idValidation.isValid) {
      throw new Error(`Invalid user ID: ${idValidation.errors.join(', ')}`);
    }

    const updateValidation = this.validator.validateUpdate(updates);
    if (!updateValidation.isValid) {
      throw new Error(`Invalid update data: ${updateValidation.errors.join(', ')}`);
    }

    // Check if user exists
    const existingUser = await this.repository.findById(id);
    if (!existingUser) {
      throw new Error('User not found');
    }

    // Business logic: Check email uniqueness if email is being updated
    if (updates.email && updates.email !== existingUser.email) {
      const userWithEmail = await this.repository.findByEmail(updates.email);
      if (userWithEmail) {
        throw new Error('User with this email already exists');
      }
    }

    // Business logic: Prevent certain updates on inactive users
    if (!existingUser.isApproved) {
      throw new Error('Cannot update inactive user');
    }



    return await this.repository.update(id, updates);
  }

  async delete(id: string): Promise<void> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid user ID: ${validation.errors.join(', ')}`);
    }

    // Check if user exists
    const existingUser = await this.repository.findById(id);
    if (!existingUser) {
      throw new Error('User not found');
    }

    // Business logic: Deactivate instead of delete to preserve data integrity
    await this.deactivate(id);
  }

  async activate(id: string): Promise<User> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid user ID: ${validation.errors.join(', ')}`);
    }

    // Check if user exists
    const existingUser = await this.repository.findById(id);
    if (!existingUser) {
      throw new Error('User not found');
    }

    if (existingUser.isApproved) {
      throw new Error('User is already active');
    }

    return await this.repository.update(id, { isApproved: true });
  }

  async deactivate(id: string): Promise<User> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid user ID: ${validation.errors.join(', ')}`);
    }

    // Check if user exists
    const existingUser = await this.repository.findById(id);
    if (!existingUser) {
      throw new Error('User not found');
    }

    if (!existingUser.isApproved) {
      throw new Error('User is already inactive');
    }

    return await this.repository.update(id, { isApproved: false });
  }

  async updateLastLogin(id: string): Promise<void> {
    const validation = this.validator.validateId(id);
    if (!validation.isValid) {
      throw new Error(`Invalid user ID: ${validation.errors.join(', ')}`);
    }

    // Check if user exists and is active
    const existingUser = await this.repository.findById(id);
    if (!existingUser) {
      throw new Error('User not found');
    }

    if (!existingUser.isApproved) {
      throw new Error('Cannot update last login for inactive user');
    }

    await this.repository.updateLastLogin(id);
  }











  async authenticate(
    email: string,
    password: string
  ): Promise<User | null> {
    const emailValidation = this.validator.validateEmail(email);
    if (!emailValidation.isValid) {
      throw new Error(`Invalid email: ${emailValidation.errors.join(', ')}`);
    }

    if (!password) {
      throw new Error('Password is required');
    }

    // Find user by email
    const user = await this.repository.findByEmail(email);
    if (!user) {
      return null; // Don't reveal if user exists
    }

    // Check if user is active
    if (!user.isApproved) {
      throw new Error('Account is deactivated');
    }

    // Business logic: Verify password
    // const isPasswordValid = await this.verifyPassword(password, user.password);
    // if (!isPasswordValid) {
    //   return null;
    // }

    // Update last login
    await this.updateLastLogin(user.id);

    return user;
  }

  async canUserAccess(targetUserId: string, currentUserId: string): Promise<boolean> {
    const targetUserValidation = this.validator.validateId(targetUserId);
    if (!targetUserValidation.isValid) {
      return false;
    }

    const currentUserValidation = this.validator.validateId(currentUserId);
    if (!currentUserValidation.isValid) {
      return false;
    }

    try {
      // Users can always access their own profile
      if (targetUserId === currentUserId) {
        return true;
      }

      // Check if current user exists and is active
      const currentUser = await this.repository.findById(currentUserId);
      if (!currentUser || !currentUser.isApproved) {
        return false;
      }

      // Note: Role-based access control removed as User interface doesn't include role field

      // Check if target user exists and is active
      const targetUser = await this.repository.findById(targetUserId);
      if (!targetUser || !targetUser.isApproved) {
        return false;
      }

      // Regular users can access other active users (for collaboration)
      return true;
    } catch {
      return false;
    }
  }

  async canUserEdit(targetUserId: string, currentUserId: string): Promise<boolean> {
    const targetUserValidation = this.validator.validateId(targetUserId);
    if (!targetUserValidation.isValid) {
      return false;
    }

    const currentUserValidation = this.validator.validateId(currentUserId);
    if (!currentUserValidation.isValid) {
      return false;
    }

    try {
      // Users can edit their own profile
      if (targetUserId === currentUserId) {
        return true;
      }

      // Check if current user exists and is active
      const currentUser = await this.repository.findById(currentUserId);
      if (!currentUser || !currentUser.isApproved) {
        return false;
      }

      // Note: Role-based access control removed as User interface doesn't include role field
      // For now, users can only edit their own profiles
      return false;
    } catch {
      return false;
    }
  }

  // Private helper methods (would be implemented in real application)
  // private async hashPassword(password: string): Promise<string> {
  //   // Implementation using bcrypt or similar
  //   return password; // Placeholder
  // }

  // private async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  //   // Implementation using bcrypt or similar
  //   return password === hashedPassword; // Placeholder
  // }
}

// Export singleton instance
export const userService = new UserService();