import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { Role } from '../../common/enums';

jest.mock('bcrypt');

describe('AuthService', () => {
  let authService: AuthService;
  let mockUsersService: any;
  let mockJwtService: any;

  beforeEach(async () => {
    mockUsersService = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      findCleanById: jest.fn(),
    };

    mockJwtService = {
      sign: jest.fn().mockReturnValue('mockJwtToken'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  describe('register', () => {
    const registerDto = {
      firstName: 'Rohan',
      lastName: 'Sharma',
      email: 'rohan@example.com',
      phone: '+919999999999',
      password: 'StrongPassword123!',
      role: Role.TENANT,
    };

    it('should register a new tenant successfully', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      mockUsersService.create.mockResolvedValue({
        _id: 'userObjId123',
        ...registerDto,
      });

      const result = await authService.register(registerDto);

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(registerDto.email);
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 10);
      expect(result).toEqual({
        message: 'User registered successfully',
        user: {
          id: 'userObjId123',
          firstName: 'Rohan',
          lastName: 'Sharma',
          role: Role.TENANT,
        },
      });
      expect(result).not.toHaveProperty('accessToken');
      expect((result as any).user).not.toHaveProperty('email');
      expect((result as any).user).not.toHaveProperty('phone');
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if email is already taken', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ _id: 'existingId' });

      await expect(authService.register(registerDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'rohan@example.com',
      password: 'StrongPassword123!',
    };

    it('should login successfully with valid credentials', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        _id: 'userObjId123',
        email: loginDto.email,
        passwordHash: 'hashedSecret',
        firstName: 'Rohan',
        lastName: 'Sharma',
        phone: '1234567890',
        role: Role.TENANT,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await authService.login(loginDto);
      expect(result).toHaveProperty('accessToken', 'mockJwtToken');
      expect(result.user.email).toBe(loginDto.email);
    });

    it('should throw UnauthorizedException if email does not exist', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(authService.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        _id: 'userObjId123',
        passwordHash: 'hashedSecret',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });
});
