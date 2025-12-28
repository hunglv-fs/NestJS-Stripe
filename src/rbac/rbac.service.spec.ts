import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RbacService } from './rbac.service';
import { Role } from './entities/role.entity';
import { Permission, PermissionModule, PermissionAction } from './entities/permission.entity';
import { UserRole } from './entities/user-role.entity';
import { User } from '../user/entities/user.entity';

describe('RbacService', () => {
  let service: RbacService;
  let userRepository: jest.Mocked<Repository<User>>;
  let roleRepository: jest.Mocked<Repository<Role>>;
  let permissionRepository: jest.Mocked<Repository<Permission>>;
  let userRoleRepository: jest.Mocked<Repository<UserRole>>;

  const mockUser = { id: 'user1', is_active: true } as any;
  const mockRole = { id: 'role1', name: 'Test Role', isActive: true } as Role;
  const mockPermission = {
    id: 'perm1',
    module: PermissionModule.PRODUCT,
    action: PermissionAction.VIEW,
    isActive: true
  } as Permission;

  beforeEach(async () => {
    const mockUserRepo = {
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RbacService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
        {
          provide: getRepositoryToken(Role),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Permission),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserRole),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RbacService>(RbacService);
    userRepository = module.get(getRepositoryToken(User));
    roleRepository = module.get(getRepositoryToken(Role));
    permissionRepository = module.get(getRepositoryToken(Permission));
    userRoleRepository = module.get(getRepositoryToken(UserRole));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('assignRoleToUser', () => {
    it('should assign role to user', async () => {
      const userRole = { id: 'ur1', userId: 'user1', roleId: 'role1' };
      userRoleRepository.create.mockReturnValue(userRole as any);
      userRoleRepository.save.mockResolvedValue(userRole as any);

      const result = await service.assignRoleToUser('user1', 'role1');

      expect(userRoleRepository.create).toHaveBeenCalledWith({
        userId: 'user1',
        roleId: 'role1',
        assignedById: undefined,
      });
      expect(result).toEqual(userRole);
    });
  });

  describe('removeRoleFromUser', () => {
    it('should remove role from user', async () => {
      userRoleRepository.delete.mockResolvedValue({ affected: 1 } as any);

      await service.removeRoleFromUser('user1', 'role1');

      expect(userRoleRepository.delete).toHaveBeenCalledWith({ userId: 'user1', roleId: 'role1' });
    });
  });

  describe('getUserRoles', () => {
    it('should return active roles for user', async () => {
      const userRoles = [{ role: mockRole }];
      userRoleRepository.find.mockResolvedValue(userRoles as any);

      const result = await service.getUserRoles('user1');

      expect(userRoleRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user1' },
        relations: ['role'],
      });
      expect(result).toEqual([mockRole]);
    });
  });

  describe('userHasPermission', () => {
    it('should return true when user has permission', async () => {
      const mockQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockUser),
      };
      userRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.userHasPermission('user1', 'product', 'view');

      expect(result).toBe(true);
    });

    it('should return false when user does not have permission', async () => {
      const mockQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      userRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.userHasPermission('user1', 'product', 'view');

      expect(result).toBe(false);
    });
  });

  describe('ensureRegisteredUserRole', () => {
    it('should return existing role if found', async () => {
      roleRepository.findOne.mockResolvedValue(mockRole as any);

      const result = await service.ensureRegisteredUserRole();

      expect(result).toEqual(mockRole);
      expect(roleRepository.create).not.toHaveBeenCalled();
    });

    it('should create new role with permissions if not found', async () => {
      roleRepository.findOne.mockResolvedValue(null);
      roleRepository.create.mockReturnValue(mockRole);
      roleRepository.save.mockResolvedValue(mockRole as any);
      permissionRepository.findOne.mockResolvedValue(null);
      permissionRepository.create.mockImplementation((data) => ({ ...data, id: 'perm_' + data.module + '_' + data.action } as any));
      permissionRepository.save.mockImplementation((perm) => Promise.resolve(perm as any));

      const result = await service.ensureRegisteredUserRole();

      expect(roleRepository.create).toHaveBeenCalled();
      expect(roleRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockRole);
    });
  });

  describe('getAllPermissions', () => {
    it('should return all active permissions', async () => {
      const permissions = [mockPermission];
      permissionRepository.find.mockResolvedValue(permissions as any);

      const result = await service.getAllPermissions();

      expect(permissionRepository.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { module: 'ASC', action: 'ASC' },
      });
      expect(result).toEqual(permissions);
    });
  });
});
