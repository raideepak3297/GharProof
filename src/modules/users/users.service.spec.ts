import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '../../common/enums';
import { MongoDbUserService } from '../../mongoDb/mongo-db-user.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let mockMongoDbUserService: any;

  beforeEach(async () => {
    mockMongoDbUserService = {
      create: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findCleanById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: MongoDbUserService,
          useValue: mockMongoDbUserService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and return a new user', async () => {
      const dto = {
        name: 'Test Landlord',
        email: 'landlord@example.com',
        phone: '+919876543210',
        passwordHash: 'hashedSecret',
        role: Role.LANDLORD,
      };

      mockMongoDbUserService.create.mockResolvedValue({
        _id: 'user123',
        ...dto,
      });

      const result = await service.create(dto);
      expect(mockMongoDbUserService.create).toHaveBeenCalledWith(dto);
      expect(result).toHaveProperty('_id', 'user123');
      expect(result.email).toBe(dto.email);
    });
  });

  describe('findByEmail', () => {
    it('should find user by lowercase email', async () => {
      const user = { _id: 'u1', email: 'test@example.com' };
      mockMongoDbUserService.findByEmail.mockResolvedValue(user);

      const result = await service.findByEmail('TEST@example.com');
      expect(mockMongoDbUserService.findByEmail).toHaveBeenCalledWith('TEST@example.com');
      expect(result).toEqual(user);
    });
  });
});
