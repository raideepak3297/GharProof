import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { User } from './schemas/user.schema';
import { Role } from '../../common/enums';

describe('UsersService', () => {
  let service: UsersService;
  let mockUserModel: any;

  beforeEach(async () => {
    mockUserModel = jest.fn().mockImplementation((dto) => ({
      ...dto,
      save: jest.fn().mockResolvedValue({ _id: 'user123', ...dto }),
    }));

    mockUserModel.findOne = jest.fn();
    mockUserModel.findById = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
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

      const result = await service.create(dto);
      expect(result).toHaveProperty('_id', 'user123');
      expect(result.email).toBe(dto.email);
    });
  });

  describe('findByEmail', () => {
    it('should find user by lowercase email', async () => {
      const user = { _id: 'u1', email: 'test@example.com' };
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(user),
      });

      const result = await service.findByEmail('TEST@example.com');
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(result).toEqual(user);
    });
  });
});
