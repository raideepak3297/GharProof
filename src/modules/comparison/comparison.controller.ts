import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/auth.interface';
import { ComparisonService } from './comparison.service';
import { IRentalComparisonResponse } from './interfaces/comparison.interface';

@Controller('rentals/:rentalId/comparison')
export class ComparisonController {
  constructor(private readonly comparisonService: ComparisonService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getComparison(
    @Param('rentalId') rentalId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<IRentalComparisonResponse> {
    return this.comparisonService.getComparison(rentalId, user);
  }
}
