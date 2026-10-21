import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/auth.interface';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { InspectionsService } from './inspections.service';
import { IInspection } from './interfaces/inspection.interface';

@Controller('rentals/:rentalId/inspections')
export class RentalInspectionsController {
  constructor(private readonly inspectionsService: InspectionsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async createInspection(
    @Param('rentalId') rentalId: string,
    @Body() dto: CreateInspectionDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<IInspection> {
    return this.inspectionsService.createInspection(rentalId, dto, user);
  }
}
