import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtPayload } from '../auth/interfaces/auth.interface';
import { ComparisonService } from './comparison.service';
import { IRentalComparisonResponse } from './interfaces/comparison.interface';

@Controller('rentals/:rentalId/comparison')
export class ComparisonController {
  constructor(private readonly comparisonService: ComparisonService) {}

  @Roles(Role.LANDLORD, Role.TENANT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  async getComparison(
    @Param('rentalId') rentalId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<IRentalComparisonResponse> {
    return this.comparisonService.getComparison(rentalId, user);
  }
}
