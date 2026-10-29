import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtPayload } from '../auth/interfaces/auth.interface';
import { ReportsService } from './reports.service';

@Controller('rentals/:rentalId')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Roles(Role.LANDLORD, Role.TENANT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('report.pdf')
  async getReportPdf(
    @Param('rentalId') rentalId: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, filename } = await this.reportsService.generateReport(rentalId, user);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length.toString(),
    });

    res.end(buffer);
  }
}
