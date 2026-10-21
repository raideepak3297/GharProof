import { Module } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { MongoDbInspectionService } from './mongo-db-inspection.service';
import { MongoDbRentalService } from './mongo-db-rental.service';
import { MongoDbRoomItemService } from './mongo-db-room-item.service';
import { MongoDbUploadService } from './mongo-db-upload.service';
import { MongoDbUserService } from './mongo-db-user.service';
import { Inspection, InspectionSchema } from './schema/inspection.schema';
import { Rental, RentalSchema } from './schema/rental.schema';
import { RoomItem, RoomItemSchema } from './schema/room-item.schema';
import { Upload, UploadSchema } from './schema/upload.schema';
import { User, UserSchema } from './schema/user.schema';
import {
  INSPECTION_MODEL,
  MONGODB_CONNECTION,
  RENTAL_MODEL,
  ROOM_ITEM_MODEL,
  UPLOAD_MODEL,
  USER_MODEL,
} from './type/constant';

@Module({
  providers: [
    {
      provide: MONGODB_CONNECTION,
      useFactory: (connection: Connection) => connection,
      inject: [getConnectionToken()],
    },
    {
      provide: USER_MODEL,
      useFactory: (connection: Connection) => {
        return connection.models[User.name] || connection.model(User.name, UserSchema);
      },
      inject: [MONGODB_CONNECTION],
    },
    {
      provide: RENTAL_MODEL,
      useFactory: (connection: Connection) => {
        return connection.models[Rental.name] || connection.model(Rental.name, RentalSchema);
      },
      inject: [MONGODB_CONNECTION],
    },
    {
      provide: UPLOAD_MODEL,
      useFactory: (connection: Connection) => {
        return connection.models[Upload.name] || connection.model(Upload.name, UploadSchema);
      },
      inject: [MONGODB_CONNECTION],
    },
    {
      provide: INSPECTION_MODEL,
      useFactory: (connection: Connection) => {
        return (
          connection.models[Inspection.name] || connection.model(Inspection.name, InspectionSchema)
        );
      },
      inject: [MONGODB_CONNECTION],
    },
    {
      provide: ROOM_ITEM_MODEL,
      useFactory: (connection: Connection) => {
        return connection.models[RoomItem.name] || connection.model(RoomItem.name, RoomItemSchema);
      },
      inject: [MONGODB_CONNECTION],
    },
    MongoDbUserService,
    MongoDbRentalService,
    MongoDbUploadService,
    MongoDbInspectionService,
    MongoDbRoomItemService,
  ],
  exports: [
    MongoDbUserService,
    MongoDbRentalService,
    MongoDbUploadService,
    MongoDbInspectionService,
    MongoDbRoomItemService,
    USER_MODEL,
    RENTAL_MODEL,
    UPLOAD_MODEL,
    INSPECTION_MODEL,
    ROOM_ITEM_MODEL,
  ],
})
export class MongoDbModule {}
