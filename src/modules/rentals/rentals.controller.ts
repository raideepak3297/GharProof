import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtPayload } from '../auth/interfaces/auth.interface';
import { CreateRentalDto } from './dto/create-rental.dto';
import { ListRentalsDto } from './dto/list-rentals.dto';
import { IPaginatedRentalsResponse } from './interfaces/rental.interface';
import { RentalsService } from './rentals.service';

@Controller('rentals')
export class RentalsController {
  constructor(private readonly rentalsService: RentalsService) {}

  @Post()
  @Roles(Role.LANDLORD)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async create(@CurrentUser() user: JwtPayload, @Body() createRentalDto: CreateRentalDto) {
    return this.rentalsService.create(user.userId, createRentalDto);
  }

  @Get()
  @Roles(Role.LANDLORD, Role.TENANT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListRentalsDto,
  ): Promise<IPaginatedRentalsResponse> {
    return this.rentalsService.findAllForUser(user, query);
  }

  @Get(':id')
  @Roles(Role.LANDLORD, Role.TENANT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.rentalsService.findByIdWithAuth(id, user);
  }

  @Post(':id/accept-invite')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.TENANT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async acceptInvite(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.rentalsService.acceptInvite(id, user);
  }
}
