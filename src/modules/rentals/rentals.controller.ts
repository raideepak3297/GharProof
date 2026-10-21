import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtPayload } from '../auth/interfaces/auth.interface';
import { CreateRentalDto } from './dto/create-rental.dto';
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
  @UseGuards(JwtAuthGuard)
  async findAll(@CurrentUser() user: JwtPayload) {
    return this.rentalsService.findAllForUser(user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
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
