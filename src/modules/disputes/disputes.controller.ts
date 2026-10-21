import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/auth.interface';
import { DisputesService } from './disputes.service';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { RespondDisputeDto } from './dto/respond-dispute.dto';
import { IDispute, IDisputeSettlementResponse } from './interfaces/dispute.interface';

@Controller('rentals/:rentalId/disputes')
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async createDispute(
    @Param('rentalId') rentalId: string,
    @Body() dto: CreateDisputeDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<IDispute> {
    return this.disputesService.createDispute(rentalId, dto, user);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getDisputes(
    @Param('rentalId') rentalId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<IDispute[]> {
    return this.disputesService.getDisputesByRental(rentalId, user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('settlement')
  async getSettlement(
    @Param('rentalId') rentalId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<IDisputeSettlementResponse> {
    return this.disputesService.getSettlementSummary(rentalId, user);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':disputeId')
  async getDisputeById(
    @Param('rentalId') rentalId: string,
    @Param('disputeId') disputeId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<IDispute> {
    return this.disputesService.getDisputeById(rentalId, disputeId, user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':disputeId')
  async respondToDispute(
    @Param('rentalId') rentalId: string,
    @Param('disputeId') disputeId: string,
    @Body() dto: RespondDisputeDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<IDispute> {
    return this.disputesService.respondToDispute(rentalId, disputeId, dto, user);
  }
}
