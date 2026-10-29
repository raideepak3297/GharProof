import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtPayload } from '../auth/interfaces/auth.interface';
import { DisputesService } from './disputes.service';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { ListDisputesDto } from './dto/list-disputes.dto';
import { RespondDisputeDto } from './dto/respond-dispute.dto';
import {
  IDispute,
  IDisputeSettlementResponse,
  IPaginatedDisputesResponse,
} from './interfaces/dispute.interface';

@Controller('rentals/:rentalId/disputes')
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Roles(Role.LANDLORD)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  async createDispute(
    @Param('rentalId') rentalId: string,
    @Body() dto: CreateDisputeDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<IDispute> {
    return this.disputesService.createDispute(rentalId, dto, user);
  }

  @Roles(Role.LANDLORD, Role.TENANT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  async getDisputes(
    @Param('rentalId') rentalId: string,
    @CurrentUser() user: JwtPayload,
    @Query() query: ListDisputesDto,
  ): Promise<IPaginatedDisputesResponse> {
    return this.disputesService.getDisputesByRental(rentalId, user, query);
  }

  @Roles(Role.LANDLORD, Role.TENANT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('settlement')
  async getSettlement(
    @Param('rentalId') rentalId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<IDisputeSettlementResponse> {
    return this.disputesService.getSettlementSummary(rentalId, user);
  }

  @Roles(Role.LANDLORD, Role.TENANT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':disputeId')
  async getDisputeById(
    @Param('rentalId') rentalId: string,
    @Param('disputeId') disputeId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<IDispute> {
    return this.disputesService.getDisputeById(rentalId, disputeId, user);
  }

  @Roles(Role.TENANT)
  @UseGuards(JwtAuthGuard, RolesGuard)
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
