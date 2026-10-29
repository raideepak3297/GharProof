import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DisputeTenantStatus } from '../../common/enums';
import {
  assertLandlordAccess,
  assertRentalAccess,
  assertTenantAccess,
} from '../../common/utils/rental-access.util';
import { MongoDbDisputeService } from '../../mongoDb/mongo-db-dispute.service';
import { MongoDbRentalService } from '../../mongoDb/mongo-db-rental.service';
import { MongoDbRoomItemService } from '../../mongoDb/mongo-db-room-item.service';
import { MongoDbUploadService } from '../../mongoDb/mongo-db-upload.service';
import { JwtPayload } from '../auth/interfaces/auth.interface';
import { IRental } from '../rentals/interfaces/rental.interface';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { ListDisputesDto } from './dto/list-disputes.dto';
import { RespondDisputeDto } from './dto/respond-dispute.dto';
import {
  IDispute,
  IDisputeSettlementResponse,
  IDisputeSettlementSummary,
  IPaginatedDisputesResponse,
} from './interfaces/dispute.interface';

@Injectable()
export class DisputesService {
  constructor(
    private readonly mongoDbDisputeService: MongoDbDisputeService,
    private readonly mongoDbRentalService: MongoDbRentalService,
    private readonly mongoDbRoomItemService: MongoDbRoomItemService,
    private readonly mongoDbUploadService: MongoDbUploadService,
  ) {}

  async createDispute(
    rentalId: string,
    dto: CreateDisputeDto,
    user: JwtPayload,
  ): Promise<IDispute> {
    const rental = await this.getRentalOrThrow(rentalId);
    assertLandlordAccess(rental, user, 'propose deductions for this rental');

    if (dto.roomItemId) {
      const roomItem = await this.mongoDbRoomItemService.findById(dto.roomItemId);
      if (!roomItem) {
        throw new NotFoundException(`Room item with ID ${dto.roomItemId} not found`);
      }
    }

    if (dto.evidencePhotos && dto.evidencePhotos.length > 0) {
      const uploads = await this.mongoDbUploadService.findByIds(dto.evidencePhotos);
      if (uploads.length !== dto.evidencePhotos.length) {
        throw new BadRequestException(
          'One or more evidence photo upload IDs are invalid or not found',
        );
      }
    }

    return this.mongoDbDisputeService.create({
      rentalId,
      category: dto.category,
      proposedDeduction: dto.proposedDeduction,
      description: dto.description,
      roomItemId: dto.roomItemId,
      evidencePhotos: dto.evidencePhotos,
    });
  }

  async getDisputesByRental(
    rentalId: string,
    user: JwtPayload,
    query?: ListDisputesDto,
  ): Promise<IPaginatedDisputesResponse> {
    const rental = await this.getRentalOrThrow(rentalId);
    assertRentalAccess(rental, user, 'disputes for this rental');
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    return this.mongoDbDisputeService.findByRentalIdPaginated(rentalId, page, limit);
  }

  async getDisputeById(rentalId: string, disputeId: string, user: JwtPayload): Promise<IDispute> {
    const rental = await this.getRentalOrThrow(rentalId);
    assertRentalAccess(rental, user, 'disputes for this rental');
    return this.getDisputeOrThrow(rentalId, disputeId);
  }

  async respondToDispute(
    rentalId: string,
    disputeId: string,
    dto: RespondDisputeDto,
    user: JwtPayload,
  ): Promise<IDispute> {
    const rental = await this.getRentalOrThrow(rentalId);
    assertTenantAccess(rental, user, 'respond to deductions for this rental');

    const dispute = await this.getDisputeOrThrow(rentalId, disputeId);

    if (dispute.resolved) {
      throw new ConflictException('This dispute is already resolved');
    }

    const updatePayload: Partial<IDispute> = {
      tenantStatus: dto.tenantStatus,
      tenantComment: dto.tenantComment,
    };

    if (dto.tenantStatus === DisputeTenantStatus.ACCEPTED) {
      updatePayload.agreedDeduction = dispute.proposedDeduction;
      updatePayload.resolved = true;
      updatePayload.resolvedAt = new Date();
    } else if (dto.tenantStatus === DisputeTenantStatus.DISPUTED) {
      updatePayload.counterAmount = dto.counterAmount;
    }

    const updated = await this.mongoDbDisputeService.update(disputeId, updatePayload);
    if (!updated) {
      throw new NotFoundException(`Dispute with ID ${disputeId} not found`);
    }
    return updated;
  }

  async getSettlementSummary(
    rentalId: string,
    user: JwtPayload,
  ): Promise<IDisputeSettlementResponse> {
    const rental = await this.getRentalOrThrow(rentalId);
    assertRentalAccess(rental, user, 'disputes for this rental');

    const disputes = await this.mongoDbDisputeService.findByRentalId(rentalId);
    const depositAmount = rental.depositAmount || 0;

    let totalProposedDeductions = 0;
    let totalAgreedDeductions = 0;
    let pendingDisputesCount = 0;
    let resolvedDisputesCount = 0;

    for (const d of disputes) {
      totalProposedDeductions += d.proposedDeduction || 0;
      if (d.resolved && d.agreedDeduction) {
        totalAgreedDeductions += d.agreedDeduction;
        resolvedDisputesCount++;
      } else {
        pendingDisputesCount++;
      }
    }

    const estimatedRefundAmount = Math.max(0, depositAmount - totalAgreedDeductions);

    const settlement: IDisputeSettlementSummary = {
      depositAmount,
      totalProposedDeductions,
      totalAgreedDeductions,
      estimatedRefundAmount,
      pendingDisputesCount,
      resolvedDisputesCount,
      totalDisputesCount: disputes.length,
    };

    return {
      rentalId,
      settlement,
      disputes,
    };
  }

  private async getRentalOrThrow(rentalId: string): Promise<IRental> {
    const rental = await this.mongoDbRentalService.findById(rentalId);
    if (!rental) {
      throw new NotFoundException(`Rental with ID ${rentalId} not found`);
    }
    return rental;
  }

  private async getDisputeOrThrow(rentalId: string, disputeId: string): Promise<IDispute> {
    const dispute = await this.mongoDbDisputeService.findById(disputeId);
    if (!dispute || dispute.rentalId.toString() !== rentalId) {
      throw new NotFoundException(`Dispute with ID ${disputeId} not found for this rental`);
    }
    return dispute;
  }
}
