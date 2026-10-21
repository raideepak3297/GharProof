import { Inject, Injectable } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import {
  ICreateRoomItemInput,
  IRoomItem,
  IUpdateRoomItemInput,
} from '../modules/inspections/interfaces/inspection.interface';
import { RoomItemDocument } from './schema/room-item.schema';
import { ROOM_ITEM_MODEL } from './type/constant';

@Injectable()
export class MongoDbRoomItemService {
  constructor(
    @Inject(ROOM_ITEM_MODEL)
    private readonly roomItemModel: Model<RoomItemDocument>,
  ) {}

  async create(data: ICreateRoomItemInput): Promise<IRoomItem> {
    const photoObjectIds = (data.photos || [])
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    const created = await this.roomItemModel.create({
      inspectionId: new Types.ObjectId(data.inspectionId),
      roomName: data.roomName.trim(),
      itemName: data.itemName.trim(),
      condition: data.condition,
      notes: data.notes?.trim(),
      photos: photoObjectIds,
    });

    const populated = await created.populate(POPULATE_TAB);
    return populated.toObject();
  }

  async findByInspectionId(inspectionId: string): Promise<IRoomItem[]> {
    if (!Types.ObjectId.isValid(inspectionId)) {
      return [];
    }
    return this.roomItemModel
      .find({ inspectionId: new Types.ObjectId(inspectionId) })
      .sort({ roomName: 1, itemName: 1 })
      .populate(POPULATE_TAB)
      .lean<IRoomItem[]>()
      .exec();
  }

  async findById(id: string): Promise<IRoomItem | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.roomItemModel.findById(id).populate(POPULATE_TAB).lean<IRoomItem | null>().exec();
  }

  async findByIdRaw(id: string): Promise<RoomItemDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.roomItemModel.findById(id).exec();
  }

  async update(id: string, updateData: IUpdateRoomItemInput): Promise<IRoomItem | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    const payload: Record<string, unknown> = {};
    if (updateData.roomName !== undefined) payload.roomName = updateData.roomName.trim();
    if (updateData.itemName !== undefined) payload.itemName = updateData.itemName.trim();
    if (updateData.condition !== undefined) payload.condition = updateData.condition;
    if (updateData.notes !== undefined) payload.notes = updateData.notes.trim();
    if (updateData.photos !== undefined) {
      payload.photos = updateData.photos
        .filter((photoId) => Types.ObjectId.isValid(photoId))
        .map((photoId) => new Types.ObjectId(photoId));
    }

    return this.roomItemModel
      .findByIdAndUpdate(id, payload, { new: true })
      .populate(POPULATE_TAB)
      .lean<IRoomItem | null>()
      .exec();
  }

  async delete(id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) {
      return false;
    }
    const result = await this.roomItemModel.findByIdAndDelete(id).exec();
    return !!result;
  }
}

const POPULATE_TAB = [
  {
    path: 'photos',
    select: 'originalName fileName mimeType size path sha256Hash createdAt',
  },
];
