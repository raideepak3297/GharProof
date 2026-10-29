import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { InspectionStatus, InspectionType, RentalStatus, Role } from '../../common/enums';
import { computeSha256 } from '../../common/utils/crypto-hash.util';
import {
  assertRentalAccess,
  extractEntityId,
  isUserLandlord,
  isUserTenant,
} from '../../common/utils/rental-access.util';
import { MongoDbInspectionService } from '../../mongoDb/mongo-db-inspection.service';
import { MongoDbRentalService } from '../../mongoDb/mongo-db-rental.service';
import { MongoDbRoomItemService } from '../../mongoDb/mongo-db-room-item.service';
import { MongoDbUploadService } from '../../mongoDb/mongo-db-upload.service';
import { JwtPayload } from '../auth/interfaces/auth.interface';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { CreateRoomItemDto } from './dto/create-room-item.dto';
import { SignOffInspectionDto } from './dto/sign-off-inspection.dto';
import { UpdateInspectionDto } from './dto/update-inspection.dto';
import { UpdateRoomItemDto } from './dto/update-room-item.dto';
import { IInspection, IInspectionDetail, IRoomItem } from './interfaces/inspection.interface';

@Injectable()
export class InspectionsService {
  constructor(
    private readonly mongoDbInspectionService: MongoDbInspectionService,
    private readonly mongoDbRoomItemService: MongoDbRoomItemService,
    private readonly mongoDbRentalService: MongoDbRentalService,
    private readonly mongoDbUploadService: MongoDbUploadService,
  ) {}

  async createInspection(
    rentalId: string,
    dto: CreateInspectionDto,
    user: JwtPayload,
  ): Promise<IInspection> {
    if (user.role !== Role.LANDLORD) {
      throw new ForbiddenException('Only landlords can create inspections');
    }

    const rental = await this.mongoDbRentalService.findById(rentalId);
    if (!rental) {
      throw new NotFoundException(`Rental with ID ${rentalId} not found`);
    }

    assertRentalAccess(rental, user, 'inspections for this rental');

    if (rental.status !== RentalStatus.ACTIVE && rental.status !== RentalStatus.COMPLETED) {
      throw new BadRequestException(
        'Cannot record inspections until the tenant has accepted the rental agreement',
      );
    }

    const existing = await this.mongoDbInspectionService.findByRentalAndType(rentalId, dto.type);
    if (existing) {
      throw new ConflictException(`A ${dto.type} inspection already exists for this rental`);
    }

    // When creating a move-out inspection, require that move-in inspection is locked
    let moveInItemsToClone: IRoomItem[] = [];
    if (dto.type === InspectionType.MOVE_OUT) {
      const moveIn = await this.mongoDbInspectionService.findByRentalAndType(
        rentalId,
        InspectionType.MOVE_IN,
      );
      if (!moveIn || moveIn.status !== InspectionStatus.LOCKED) {
        throw new BadRequestException(
          'Move-in inspection must be completed and locked before creating a move-out inspection',
        );
      }
      moveInItemsToClone = await this.mongoDbRoomItemService.findByInspectionId(
        moveIn._id.toString(),
      );
    }

    const createdInspection = await this.mongoDbInspectionService.create({
      rentalId,
      type: dto.type,
      notes: dto.notes,
    });

    // Auto-clone checklist items from move-in as move-out inspection templates
    if (dto.type === InspectionType.MOVE_OUT && moveInItemsToClone.length > 0) {
      const clonedItems = moveInItemsToClone.map((item) => ({
        inspectionId: createdInspection._id.toString(),
        roomName: item.roomName,
        itemName: item.itemName,
        condition: item.condition,
        notes: '',
        photos: [],
      }));
      await this.mongoDbRoomItemService.createMany(clonedItems);
    }

    return createdInspection;
  }

  async getInspectionsByRental(rentalId: string, user: JwtPayload): Promise<IInspection[]> {
    if (!Types.ObjectId.isValid(rentalId)) {
      throw new BadRequestException('Invalid rental ID format');
    }

    const rental = await this.mongoDbRentalService.findById(rentalId);
    if (!rental) {
      throw new NotFoundException('Rental not found');
    }

    assertRentalAccess(rental, user, 'inspections for this rental');

    return this.mongoDbInspectionService.findByRental(rentalId);
  }

  async getInspection(inspectionId: string, user: JwtPayload): Promise<IInspectionDetail> {
    const inspection = await this.mongoDbInspectionService.findById(inspectionId);
    if (!inspection) {
      throw new NotFoundException(`Inspection with ID ${inspectionId} not found`);
    }

    const rentalId = extractEntityId(inspection.rentalId);
    if (rentalId) {
      const rental = await this.mongoDbRentalService.findById(rentalId);
      if (rental) {
        assertRentalAccess(rental, user, 'inspections for this rental');
      }
    }

    const items = await this.mongoDbRoomItemService.findByInspectionId(inspectionId);
    return {
      ...inspection,
      items,
    };
  }

  async updateInspection(
    inspectionId: string,
    dto: UpdateInspectionDto,
    user: JwtPayload,
  ): Promise<IInspection> {
    await this.getEditableInspectionWithAccess(inspectionId, user);

    const updated = await this.mongoDbInspectionService.update(inspectionId, {
      notes: dto.notes,
    });
    if (!updated) {
      throw new NotFoundException(`Inspection with ID ${inspectionId} not found`);
    }

    return updated;
  }

  async addRoomItem(
    inspectionId: string,
    dto: CreateRoomItemDto,
    user: JwtPayload,
  ): Promise<IRoomItem> {
    await this.getEditableInspectionWithAccess(inspectionId, user);
    await this.validatePhotosExist(dto.photos);

    return this.mongoDbRoomItemService.create({
      inspectionId,
      roomName: dto.roomName,
      itemName: dto.itemName,
      condition: dto.condition,
      notes: dto.notes,
      photos: dto.photos,
    });
  }

  async updateRoomItem(
    inspectionId: string,
    itemId: string,
    dto: UpdateRoomItemDto,
    user: JwtPayload,
  ): Promise<IRoomItem> {
    await this.getEditableInspectionWithAccess(inspectionId, user);

    const item = await this.mongoDbRoomItemService.findById(itemId);
    if (!item || item.inspectionId.toString() !== inspectionId) {
      throw new NotFoundException(`Room item with ID ${itemId} not found in this inspection`);
    }

    await this.validatePhotosExist(dto.photos);

    const updated = await this.mongoDbRoomItemService.update(itemId, dto);
    if (!updated) {
      throw new NotFoundException(`Room item with ID ${itemId} not found`);
    }
    return updated;
  }

  private async getEditableInspectionWithAccess(
    inspectionId: string,
    user: JwtPayload,
  ): Promise<IInspection> {
    if (user.role !== Role.LANDLORD) {
      throw new ForbiddenException('Only landlords can add or modify inspection room items');
    }

    const inspection = await this.mongoDbInspectionService.findById(inspectionId);
    if (!inspection) {
      throw new NotFoundException(`Inspection with ID ${inspectionId} not found`);
    }

    if (inspection.status === InspectionStatus.LOCKED) {
      throw new ForbiddenException('Inspection is locked and cannot be modified');
    }

    const rentalId = extractEntityId(inspection.rentalId);
    if (rentalId) {
      const rental = await this.mongoDbRentalService.findById(rentalId);
      if (rental) {
        assertRentalAccess(rental, user, 'inspections for this rental');
        if (rental.status !== RentalStatus.ACTIVE && rental.status !== RentalStatus.COMPLETED) {
          throw new BadRequestException(
            'Cannot add checklist items until the tenant has accepted the rental agreement',
          );
        }
      }
    }

    return inspection;
  }

  private async validatePhotosExist(photos?: string[]): Promise<void> {
    if (photos && photos.length > 0) {
      const uploads = await this.mongoDbUploadService.findByIds(photos);
      if (uploads.length !== photos.length) {
        throw new BadRequestException('One or more photo upload IDs are invalid or not found');
      }
    }
  }

  async signOff(
    inspectionId: string,
    dto: SignOffInspectionDto,
    user: JwtPayload,
  ): Promise<IInspectionDetail> {
    const inspectionDoc = await this.mongoDbInspectionService.findByIdRaw(inspectionId);
    if (!inspectionDoc) {
      throw new NotFoundException(`Inspection with ID ${inspectionId} not found`);
    }

    if (inspectionDoc.status === InspectionStatus.LOCKED) {
      throw new ForbiddenException('Inspection is already locked and immutable');
    }

    const rental = await this.mongoDbRentalService.findById(
      extractEntityId(inspectionDoc.rentalId)!,
    );
    if (!rental) {
      throw new NotFoundException('Associated rental not found');
    }

    const isLandlord = isUserLandlord(rental, user);
    const isTenant = isUserTenant(rental, user);

    if (!isLandlord && !isTenant) {
      throw new ForbiddenException('You are not authorized to sign off on this inspection');
    }

    const existingItems = await this.mongoDbRoomItemService.findByInspectionId(inspectionId);
    if (existingItems.length === 0) {
      throw new BadRequestException('Cannot sign off on an inspection with no checklist items');
    }

    if (!dto.agree) {
      // Disagreement keeps or returns to draft
      if (isLandlord) {
        inspectionDoc.landlordSigned = false;
        inspectionDoc.landlordSignedAt = null;
      }
      if (isTenant) {
        inspectionDoc.tenantSigned = false;
        inspectionDoc.tenantSignedAt = null;
      }
      inspectionDoc.status = InspectionStatus.DRAFT;
      await inspectionDoc.save();

      const items = await this.mongoDbRoomItemService.findByInspectionId(inspectionId);
      return {
        ...inspectionDoc.toObject(),
        items,
      };
    }

    // Record agreement timestamp
    const now = new Date();
    if (isLandlord) {
      inspectionDoc.landlordSigned = true;
      inspectionDoc.landlordSignedAt = now;
    }
    if (isTenant) {
      inspectionDoc.tenantSigned = true;
      inspectionDoc.tenantSignedAt = now;
    }

    // Check if both parties have signed
    if (inspectionDoc.landlordSigned && inspectionDoc.tenantSigned) {
      const items = await this.mongoDbRoomItemService.findByInspectionId(inspectionId);

      // Construct canonical JSON payload for composite SHA-256 root hash
      const canonicalPayload = {
        inspectionId: inspectionDoc._id.toString(),
        rentalId: inspectionDoc.rentalId.toString(),
        type: inspectionDoc.type,
        landlordSignedAt: inspectionDoc.landlordSignedAt?.toISOString(),
        tenantSignedAt: inspectionDoc.tenantSignedAt?.toISOString(),
        items: items.map((item) => ({
          id: item._id.toString(),
          roomName: item.roomName,
          itemName: item.itemName,
          condition: item.condition,
          notes: item.notes || '',
          photos: (item.photos as any[]).map((photo) => ({
            id: photo._id?.toString() || photo.toString(),
            sha256: photo.sha256Hash || '',
          })),
        })),
      };

      const rootHash = computeSha256(JSON.stringify(canonicalPayload));

      inspectionDoc.rootHash = rootHash;
      inspectionDoc.status = InspectionStatus.LOCKED;
      inspectionDoc.lockedAt = now;

      // When move_out checkout inspection is dual-signed and locked, the physical tenancy concludes
      if (inspectionDoc.type === InspectionType.MOVE_OUT) {
        const rentalIdStr = extractEntityId(inspectionDoc.rentalId);
        if (rentalIdStr) {
          await this.mongoDbRentalService.updateStatus(rentalIdStr, RentalStatus.COMPLETED);
        }
      }
    } else {
      inspectionDoc.status = InspectionStatus.PENDING_SIGNATURES;
    }

    await inspectionDoc.save();

    const items = await this.mongoDbRoomItemService.findByInspectionId(inspectionId);
    return {
      ...inspectionDoc.toObject(),
      items,
    };
  }
}
