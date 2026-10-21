import { Module } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { MongoDbRentalService } from './mongo-db-rental.service';
import { MongoDbUserService } from './mongo-db-user.service';
import { Rental, RentalSchema } from './schema/rental.schema';
import { User, UserSchema } from './schema/user.schema';
import { MONGODB_CONNECTION, RENTAL_MODEL, USER_MODEL } from './type/constant';

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
    MongoDbUserService,
    MongoDbRentalService,
  ],
  exports: [MongoDbUserService, MongoDbRentalService, USER_MODEL, RENTAL_MODEL],
})
export class MongoDbModule {}
