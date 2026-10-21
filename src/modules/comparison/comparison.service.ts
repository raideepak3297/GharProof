import { Injectable, NotFoundException } from '@nestjs/common';
import { assertRentalAccess } from '../../common/utils/rental-access.util';
import {
  ComparisonDiffStatus,
  InspectionStatus,
  InspectionType,
  ItemCondition,
} from '../../common/enums';
import { MongoDbInspectionService } from '../../mongoDb/mongo-db-inspection.service';
import { MongoDbRentalService } from '../../mongoDb/mongo-db-rental.service';
import { MongoDbRoomItemService } from '../../mongoDb/mongo-db-room-item.service';
import { JwtPayload } from '../auth/interfaces/auth.interface';
import { IRoomItem } from '../inspections/interfaces/inspection.interface';
import {
  IComparisonSummary,
  IInspectionItemSnapshot,
  IItemComparison,
  IRentalComparisonResponse,
} from './interfaces/comparison.interface';

@Injectable()
export class ComparisonService {
  constructor(
    private readonly mongoDbRentalService: MongoDbRentalService,
    private readonly mongoDbInspectionService: MongoDbInspectionService,
    private readonly mongoDbRoomItemService: MongoDbRoomItemService,
  ) {}

  async getComparison(rentalId: string, user: JwtPayload): Promise<IRentalComparisonResponse> {
    const rental = await this.mongoDbRentalService.findById(rentalId);
    if (!rental) {
      throw new NotFoundException(`Rental with ID ${rentalId} not found`);
    }

    assertRentalAccess(rental, user, 'comparisons for this rental');

    const [moveIn, moveOut] = await Promise.all([
      this.mongoDbInspectionService.findByRentalAndType(rentalId, InspectionType.MOVE_IN),
      this.mongoDbInspectionService.findByRentalAndType(rentalId, InspectionType.MOVE_OUT),
    ]);

    const [moveInItems, moveOutItems] = await Promise.all([
      moveIn
        ? this.mongoDbRoomItemService.findByInspectionId(moveIn._id.toString())
        : Promise.resolve([]),
      moveOut
        ? this.mongoDbRoomItemService.findByInspectionId(moveOut._id.toString())
        : Promise.resolve([]),
    ]);

    const comparisons = this.diffItems(moveInItems, moveOutItems);
    const summary = this.computeSummary(comparisons);

    return {
      rentalId,
      moveInInspectionId: moveIn ? moveIn._id.toString() : null,
      moveInLocked: moveIn?.status === InspectionStatus.LOCKED,
      moveOutInspectionId: moveOut ? moveOut._id.toString() : null,
      moveOutLocked: moveOut?.status === InspectionStatus.LOCKED,
      summary,
      comparisons,
    };
  }

  private diffItems(moveInItems: IRoomItem[], moveOutItems: IRoomItem[]): IItemComparison[] {
    const makeKey = (room: string, item: string) =>
      `${room.trim().toLowerCase()}:::${item.trim().toLowerCase()}`;

    const moveInMap = new Map<string, IRoomItem>();
    for (const item of moveInItems) {
      moveInMap.set(makeKey(item.roomName, item.itemName), item);
    }

    const moveOutMap = new Map<string, IRoomItem>();
    for (const item of moveOutItems) {
      moveOutMap.set(makeKey(item.roomName, item.itemName), item);
    }

    const allKeys = new Set([...moveInMap.keys(), ...moveOutMap.keys()]);
    const comparisons: IItemComparison[] = [];

    for (const key of allKeys) {
      const inItem = moveInMap.get(key);
      const outItem = moveOutMap.get(key);

      const roomName = inItem?.roomName || outItem?.roomName || '';
      const itemName = inItem?.itemName || outItem?.itemName || '';

      const moveInSnapshot: IInspectionItemSnapshot | null = inItem
        ? {
            _id: inItem._id.toString(),
            condition: inItem.condition,
            notes: inItem.notes,
            photos: inItem.photos as any[],
          }
        : null;

      const moveOutSnapshot: IInspectionItemSnapshot | null = outItem
        ? {
            _id: outItem._id.toString(),
            condition: outItem.condition,
            notes: outItem.notes,
            photos: outItem.photos as any[],
          }
        : null;

      let diffStatus: ComparisonDiffStatus;

      if (inItem && outItem) {
        diffStatus = this.classifyConditionChange(inItem.condition, outItem.condition);
      } else if (inItem && !outItem) {
        diffStatus = ComparisonDiffStatus.MISSING_AT_MOVE_OUT;
      } else {
        diffStatus = ComparisonDiffStatus.ADDED_DURING_TENANCY;
      }

      comparisons.push({
        roomName,
        itemName,
        diffStatus,
        moveIn: moveInSnapshot,
        moveOut: moveOutSnapshot,
      });
    }

    // Sort comparisons by roomName, then itemName
    comparisons.sort((a, b) => {
      const roomCmp = a.roomName.localeCompare(b.roomName);
      if (roomCmp !== 0) return roomCmp;
      return a.itemName.localeCompare(b.itemName);
    });

    return comparisons;
  }

  private classifyConditionChange(
    moveInCondition: ItemCondition,
    moveOutCondition: ItemCondition,
  ): ComparisonDiffStatus {
    if (moveInCondition === moveOutCondition) {
      return ComparisonDiffStatus.UNCHANGED;
    }

    // Severe damage introduced
    if (
      moveOutCondition === ItemCondition.DAMAGED ||
      moveOutCondition === ItemCondition.NOT_WORKING
    ) {
      return ComparisonDiffStatus.DAMAGED_SINCE_MOVE_IN;
    }

    // Minor scratch or wear from good
    if (
      moveInCondition === ItemCondition.GOOD &&
      moveOutCondition === ItemCondition.MINOR_SCRATCH
    ) {
      return ComparisonDiffStatus.MINOR_WEAR;
    }

    // Any other deterioration
    return ComparisonDiffStatus.MINOR_WEAR;
  }

  private computeSummary(comparisons: IItemComparison[]): IComparisonSummary {
    let unchangedCount = 0;
    let minorWearCount = 0;
    let damagedCount = 0;
    let missingCount = 0;
    let addedCount = 0;

    for (const comp of comparisons) {
      switch (comp.diffStatus) {
        case ComparisonDiffStatus.UNCHANGED:
          unchangedCount++;
          break;
        case ComparisonDiffStatus.MINOR_WEAR:
          minorWearCount++;
          break;
        case ComparisonDiffStatus.DAMAGED_SINCE_MOVE_IN:
          damagedCount++;
          break;
        case ComparisonDiffStatus.MISSING_AT_MOVE_OUT:
          missingCount++;
          break;
        case ComparisonDiffStatus.ADDED_DURING_TENANCY:
          addedCount++;
          break;
      }
    }

    return {
      totalItems: comparisons.length,
      unchangedCount,
      minorWearCount,
      damagedCount,
      missingCount,
      addedCount,
    };
  }
}
