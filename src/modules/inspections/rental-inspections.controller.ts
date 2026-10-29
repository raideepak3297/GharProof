import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtPayload } from '../auth/interfaces/auth.interface';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { InspectionsService } from './inspections.service';
import { IInspection } from './interfaces/inspection.interface';

@Controller('rentals/:rentalId/inspections')
export class RentalInspectionsController {
  constructor(private readonly inspectionsService: InspectionsService) {}

  @Roles(Role.LANDLORD)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  async createInspection(
    @Param('rentalId') rentalId: string,
    @Body() dto: CreateInspectionDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<IInspection> {
    return this.inspectionsService.createInspection(rentalId, dto, user);
  }

  @Roles(Role.LANDLORD, Role.TENANT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  async getInspections(
    @Param('rentalId') rentalId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<IInspection[]> {
    return this.inspectionsService.getInspectionsByRental(rentalId, user);
  }
}
