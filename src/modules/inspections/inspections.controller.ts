import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { CreateRoomItemDto } from './dto/create-room-item.dto';
import { SignOffInspectionDto } from './dto/sign-off-inspection.dto';
import { UpdateInspectionDto } from './dto/update-inspection.dto';
import { UpdateRoomItemDto } from './dto/update-room-item.dto';
import { InspectionsService } from './inspections.service';
import { IInspection, IInspectionDetail, IRoomItem } from './interfaces/inspection.interface';

@Controller('inspections')
export class InspectionsController {
  constructor(private readonly inspectionsService: InspectionsService) {}

  @Roles(Role.LANDLORD)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  async createInspection(
    @Body() dto: CreateInspectionDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<IInspection> {
    if (!dto.rentalId) {
      throw new BadRequestException('rentalId is required when creating an inspection');
    }
    return this.inspectionsService.createInspection(dto.rentalId, dto, user);
  }

  @Roles(Role.LANDLORD, Role.TENANT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  async getInspections(
    @Query('rentalId') rentalId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<IInspection[]> {
    if (!rentalId) {
      throw new BadRequestException('rentalId query parameter is required');
    }
    return this.inspectionsService.getInspectionsByRental(rentalId, user);
  }

  @Roles(Role.LANDLORD, Role.TENANT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':id')
  async getInspection(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<IInspectionDetail> {
    return this.inspectionsService.getInspection(id, user);
  }

  @Roles(Role.LANDLORD)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id')
  async updateInspection(
    @Param('id') id: string,
    @Body() dto: UpdateInspectionDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<IInspection> {
    return this.inspectionsService.updateInspection(id, dto, user);
  }

  @Roles(Role.LANDLORD)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post(':id/items')
  async addRoomItem(
    @Param('id') id: string,
    @Body() dto: CreateRoomItemDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<IRoomItem> {
    return this.inspectionsService.addRoomItem(id, dto, user);
  }

  @Roles(Role.LANDLORD)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id/items/:itemId')
  async updateRoomItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateRoomItemDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<IRoomItem> {
    return this.inspectionsService.updateRoomItem(id, itemId, dto, user);
  }

  @Roles(Role.LANDLORD, Role.TENANT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post(':id/sign-off')
  async signOff(
    @Param('id') id: string,
    @Body() dto: SignOffInspectionDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<IInspectionDetail> {
    return this.inspectionsService.signOff(id, dto, user);
  }
}
