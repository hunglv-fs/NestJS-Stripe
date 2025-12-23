import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { UserRole } from '../../rbac/entities/user-role.entity';
import { Role } from '../../rbac/entities/role.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  password: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ name: 'stripe_customer_id', nullable: true })
  stripeCustomerId: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_login_at', nullable: true })
  lastLoginAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // RBAC Relationships
  @OneToMany(() => UserRole, userRole => userRole.user)
  userRoles: UserRole[];

  @ManyToMany(() => Role, role => role.users)
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' }
  })
  roles: Role[];

  // Helper method to check if user has specific permission
  async hasPermission(module: string, action: string): Promise<boolean> {
    // This will be implemented in the service layer
    // For now, return true for basic functionality
    return true;
  }

  // Helper method to get user roles
  getRoleNames(): string[] {
    return this.roles?.map(role => role.name) || [];
  }

  // Helper method to check if user has role
  hasRole(roleName: string): boolean {
    return this.getRoleNames().includes(roleName);
  }
}
