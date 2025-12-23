import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RbacService } from './rbac.service';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { UserRole } from './entities/user-role.entity';
import { RolePermission } from './entities/role-permission.entity';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User, // Add User entity here since RbacService needs UserRepository
      Role,
      Permission,
      UserRole,
      RolePermission,
    ]),
  ],
  providers: [RbacService],
  exports: [RbacService],
})
export class RbacModule {}
