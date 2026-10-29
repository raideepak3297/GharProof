import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponse, RegisterResponse } from './interfaces/auth.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<RegisterResponse> {
    const existing = await this.usersService.findByEmail(registerDto.email);
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(registerDto.password, saltRounds);

    const user = await this.usersService.create({
      firstName: registerDto.firstName,
      lastName: registerDto.lastName || '',
      email: registerDto.email,
      phone: registerDto.phone,
      passwordHash,
      role: registerDto.role,
    });

    return {
      message: 'User registered successfully',
      user: {
        id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName || '',
        role: user.role,
      },
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = this.generateToken(user._id.toString(), user.email, user.role);

    return {
      accessToken,
      user: this.toAuthUser(user),
    };
  }

  async getMe(userId: string) {
    const user = await this.usersService.findCleanById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  private toAuthUser(user: {
    _id: { toString(): string };
    firstName: string;
    lastName?: string;
    email: string;
    phone: string;
    role: any;
  }) {
    return {
      id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName || '',
      email: user.email,
      phone: user.phone,
      role: user.role,
    };
  }

  private generateToken(userId: string, email: string, role: string): string {
    return this.jwtService.sign({
      sub: userId,
      userId,
      email,
      role,
    });
  }
}
