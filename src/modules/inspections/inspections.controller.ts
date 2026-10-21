import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/auth.interface';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { CreateRoomItemDto } from './dto/create-room-item.dto';
import { SignOffInspectionDto } from './dto/sign-off-inspection.dto';
import { UpdateRoomItemDto } from './dto/update-room-item.dto';
import { InspectionsService } from './inspections.service';
import { IInspection, IInspectionDetail, IRoomItem } from './interfaces/inspection.interface';

@Controller('inspections')
export class InspectionsController {
  constructor(private readonly inspectionsService: InspectionsService) {}

  @UseGuards(JwtAuthGuard)
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

  @UseGuards(JwtAuthGuard)
  @Post('rental/:rentalId')
  async createInspectionForRental(
    @Param('rentalId') rentalId: string,
    @Body() dto: CreateInspectionDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<IInspection> {
    return this.inspectionsService.createInspection(rentalId, dto, user);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getInspection(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<IInspectionDetail> {
    return this.inspectionsService.getInspection(id, user);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/items')
  async addRoomItem(
    @Param('id') id: string,
    @Body() dto: CreateRoomItemDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<IRoomItem> {
    return this.inspectionsService.addRoomItem(id, dto, user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/items/:itemId')
  async updateRoomItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateRoomItemDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<IRoomItem> {
    return this.inspectionsService.updateRoomItem(id, itemId, dto, user);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/sign-off')
  async signOff(
    @Param('id') id: string,
    @Body() dto: SignOffInspectionDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<IInspectionDetail> {
    return this.inspectionsService.signOff(id, dto, user);
  }
}
