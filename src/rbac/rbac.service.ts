import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { Role } from './entities/role.entity';
import { Permission, PermissionModule, PermissionAction } from './entities/permission.entity';
import { UserRole } from './entities/user-role.entity';
import { RolePermission } from './entities/role-permission.entity';

@Injectable()
export class RbacService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    @InjectRepository(UserRole)
    private userRoleRepository: Repository<UserRole>,
    @InjectRepository(RolePermission)
    private rolePermissionRepository: Repository<RolePermission>,
  ) {}

  // User Role Management
  async assignRoleToUser(userId: string, roleId: string, assignedBy?: string): Promise<UserRole> {
    const userRole = this.userRoleRepository.create({
      userId,
      roleId,
      assignedById: assignedBy,
    });
    return this.userRoleRepository.save(userRole);
  }

  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    await this.userRoleRepository.delete({ userId, roleId });
  }

  async getUserRoles(userId: string): Promise<Role[]> {
    const userRoles = await this.userRoleRepository.find({
      where: { userId },
      relations: ['role'],
    });
    return userRoles.map(ur => ur.role).filter(role => role.isActive);
  }

  // Role Permission Management
  async assignPermissionToRole(roleId: string, permissionId: string, grantedBy?: string): Promise<RolePermission> {
    const rolePermission = this.rolePermissionRepository.create({
      roleId,
      permissionId,
      grantedById: grantedBy,
    });
    return this.rolePermissionRepository.save(rolePermission);
  }

  async removePermissionFromRole(roleId: string, permissionId: string): Promise<void> {
    await this.rolePermissionRepository.delete({ roleId, permissionId });
  }

  async getRolePermissions(roleId: string): Promise<Permission[]> {
    const rolePermissions = await this.rolePermissionRepository.find({
      where: { roleId },
      relations: ['permission'],
    });
    return rolePermissions.map(rp => rp.permission).filter(permission => permission.isActive);
  }

  // Permission Checking
  async userHasPermission(userId: string, module: string, action: string): Promise<boolean> {
    const query = this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.userRoles', 'userRole')
      .leftJoin('userRole.role', 'role')
      .leftJoin('role.rolePermissions', 'rolePermission')
      .leftJoin('rolePermission.permission', 'permission')
      .where('user.id = :userId', { userId })
      .andWhere('user.is_active = true')
      .andWhere('role.is_active = true')
      .andWhere('permission.is_active = true')
      .andWhere('permission.module = :module', { module })
      .andWhere('permission.action = :action', { action });

    const result = await query.getOne();
    return !!result;
  }

  async userHasAnyPermission(userId: string, permissions: Array<{ module: string; action: string }>): Promise<boolean> {
    for (const permission of permissions) {
      if (await this.userHasPermission(userId, permission.module, permission.action)) {
        return true;
      }
    }
    return false;
  }

  // Bulk Operations
  async assignMultipleRolesToUser(userId: string, roleIds: string[], assignedBy?: string): Promise<UserRole[]> {
    const userRoles = roleIds.map(roleId => ({
      userId,
      roleId,
      assignedById: assignedBy,
    }));

    return this.userRoleRepository.save(userRoles);
  }

  async assignMultiplePermissionsToRole(roleId: string, permissionIds: string[], grantedBy?: string): Promise<RolePermission[]> {
    const rolePermissions = permissionIds.map(permissionId => ({
      roleId,
      permissionId,
      grantedById: grantedBy,
    }));

    return this.rolePermissionRepository.save(rolePermissions);
  }

  // Data Retrieval
  async getUserWithRolesAndPermissions(userId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id: userId },
      relations: [
        'userRoles',
        'userRoles.role',
        'userRoles.role.rolePermissions',
        'userRoles.role.rolePermissions.permission'
      ],
    });
  }

  async getAllRolesWithPermissions(): Promise<Role[]> {
    return this.roleRepository.find({
      relations: ['rolePermissions', 'rolePermissions.permission'],
      where: { isActive: true },
    });
  }

  async getAllPermissions(): Promise<Permission[]> {
    return this.permissionRepository.find({
      where: { isActive: true },
      order: { module: 'ASC', action: 'ASC' },
    });
  }

  // Ensure default "Registered User" role exists with basic permissions
  async ensureRegisteredUserRole(): Promise<Role> {
    const roleName = 'Registered User';

    // Check if role already exists
    let role = await this.roleRepository.findOne({
      where: { name: roleName, isActive: true },
      relations: ['rolePermissions', 'rolePermissions.permission'],
    });

    if (role) {
      return role;
    }

    // Create the role if it doesn't exist
    role = this.roleRepository.create({
      name: roleName,
      description: 'Default role for registered users with basic shopping permissions',
    });

    const savedRole = await this.roleRepository.save(role);

    // Define permissions for registered users
    const requiredPermissions = [
      { module: PermissionModule.PRODUCT, action: PermissionAction.VIEW },
      { module: PermissionModule.ORDER, action: PermissionAction.CREATE },
      { module: PermissionModule.ORDER, action: PermissionAction.VIEW },
      { module: PermissionModule.PAYMENT, action: PermissionAction.CREATE },
      { module: PermissionModule.PAYMENT, action: PermissionAction.VIEW },
      { module: PermissionModule.USER, action: PermissionAction.VIEW },
      { module: PermissionModule.USER, action: PermissionAction.UPDATE },
    ];

    // Get or create permissions
    const permissionIds: string[] = [];
    for (const perm of requiredPermissions) {
      let permission = await this.permissionRepository.findOne({
        where: { module: perm.module, action: perm.action, isActive: true },
      });

      if (!permission) {
        permission = this.permissionRepository.create({
          module: perm.module,
          action: perm.action,
          description: `${perm.action} ${perm.module}`,
        });
        permission = await this.permissionRepository.save(permission);
      }

      permissionIds.push(permission.id);
    }

    // Assign permissions to role
    await this.assignMultiplePermissionsToRole(savedRole.id, permissionIds);

    return savedRole;
  }
}
