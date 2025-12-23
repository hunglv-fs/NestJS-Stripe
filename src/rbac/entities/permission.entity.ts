import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToMany, OneToMany } from 'typeorm';
import { Role } from './role.entity';
import { RolePermission } from './role-permission.entity';

export enum PermissionModule {
  PRODUCT = 'product',
  ORDER = 'order',
  USER = 'user',
  PAYMENT = 'payment'
}

export enum PermissionAction {
  VIEW = 'view',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  REFUND = 'refund'
}

@Entity('permissions')
@Index(['module', 'action'], { unique: true })
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  module: PermissionModule;

  @Column({ length: 100 })
  action: PermissionAction;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Many-to-many relationship with Roles through RolePermission
  @OneToMany(() => RolePermission, rolePermission => rolePermission.permission)
  rolePermissions: RolePermission[];

  // Direct many-to-many for easier querying
  @ManyToMany(() => Role, role => role.permissions)
  roles: Role[];

  // Helper method to get permission string
  getPermissionString(): string {
    return `${this.module}:${this.action}`;
  }

  // Static method to parse permission string
  static parsePermissionString(permissionString: string): { module: PermissionModule; action: PermissionAction } | null {
    const parts = permissionString.split(':');
    if (parts.length !== 2) return null;

    const [module, action] = parts;
    if (!Object.values(PermissionModule).includes(module as PermissionModule)) return null;
    if (!Object.values(PermissionAction).includes(action as PermissionAction)) return null;

    return { module: module as PermissionModule, action: action as PermissionAction };
  }
}
