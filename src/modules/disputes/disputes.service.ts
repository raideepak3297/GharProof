import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DisputeTenantStatus } from '../../common/enums';
import { MongoDbDisputeService } from '../../mongoDb/mongo-db-dispute.service';
import { MongoDbRentalService } from '../../mongoDb/mongo-db-rental.service';
import { MongoDbRoomItemService } from '../../mongoDb/mongo-db-room-item.service';
import { MongoDbUploadService } from '../../mongoDb/mongo-db-upload.service';
import { JwtPayload } from '../auth/interfaces/auth.interface';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { RespondDisputeDto } from './dto/respond-dispute.dto';
import {
  IDispute,
  IDisputeSettlementResponse,
  IDisputeSettlementSummary,
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
    const rental = await this.mongoDbRentalService.findById(rentalId);
    if (!rental) {
      throw new NotFoundException(`Rental with ID ${rentalId} not found`);
    }

    const landlordIdStr =
      (rental.landlordId as any)?._id?.toString() || rental.landlordId?.toString();
    if (landlordIdStr !== user.userId) {
      throw new ForbiddenException('Only the landlord of this rental can propose deductions');
    }

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

  async getDisputesByRental(rentalId: string, user: JwtPayload): Promise<IDispute[]> {
    const rental = await this.mongoDbRentalService.findById(rentalId);
    if (!rental) {
      throw new NotFoundException(`Rental with ID ${rentalId} not found`);
    }

    this.verifyRentalAccess(rental, user);
    return this.mongoDbDisputeService.findByRentalId(rentalId);
  }

  async getDisputeById(rentalId: string, disputeId: string, user: JwtPayload): Promise<IDispute> {
    const rental = await this.mongoDbRentalService.findById(rentalId);
    if (!rental) {
      throw new NotFoundException(`Rental with ID ${rentalId} not found`);
    }

    this.verifyRentalAccess(rental, user);

    const dispute = await this.mongoDbDisputeService.findById(disputeId);
    if (!dispute || dispute.rentalId.toString() !== rentalId) {
      throw new NotFoundException(`Dispute with ID ${disputeId} not found for this rental`);
    }

    return dispute;
  }

  async respondToDispute(
    rentalId: string,
    disputeId: string,
    dto: RespondDisputeDto,
    user: JwtPayload,
  ): Promise<IDispute> {
    const rental = await this.mongoDbRentalService.findById(rentalId);
    if (!rental) {
      throw new NotFoundException(`Rental with ID ${rentalId} not found`);
    }

    const tenantIdStr = (rental.tenantId as any)?._id?.toString() || rental.tenantId?.toString();
    const tenantInviteEmail = rental.tenantInviteEmail?.toLowerCase();
    const userEmail = user.email.toLowerCase();

    const isTenant =
      tenantIdStr === user.userId || (tenantInviteEmail && tenantInviteEmail === userEmail);

    if (!isTenant) {
      throw new ForbiddenException('Only the tenant of this rental can respond to deductions');
    }

    const dispute = await this.mongoDbDisputeService.findById(disputeId);
    if (!dispute || dispute.rentalId.toString() !== rentalId) {
      throw new NotFoundException(`Dispute with ID ${disputeId} not found for this rental`);
    }

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
    const rental = await this.mongoDbRentalService.findById(rentalId);
    if (!rental) {
      throw new NotFoundException(`Rental with ID ${rentalId} not found`);
    }

    this.verifyRentalAccess(rental, user);

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

  private verifyRentalAccess(rental: any, user: JwtPayload): void {
    const landlordIdStr =
      (rental.landlordId as any)?._id?.toString() || rental.landlordId?.toString();
    const tenantIdStr = (rental.tenantId as any)?._id?.toString() || rental.tenantId?.toString();
    const tenantInviteEmail = rental.tenantInviteEmail?.toLowerCase();
    const userEmail = user.email.toLowerCase();

    const isAuthorized =
      landlordIdStr === user.userId ||
      tenantIdStr === user.userId ||
      (tenantInviteEmail && tenantInviteEmail === userEmail);

    if (!isAuthorized) {
      throw new ForbiddenException('You do not have access to disputes for this rental');
    }
  }
}
