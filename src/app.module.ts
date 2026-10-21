import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { validateEnvironment } from './config/env.validation';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { DatabaseModule } from './database/database.module';
import { MongoDbModule } from './mongoDb/mongo-db.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { RentalsModule } from './modules/rentals/rentals.module';
import { UploadModule } from './modules/upload/upload.module';
import { InspectionsModule } from './modules/inspections/inspections.module';
import { ComparisonModule } from './modules/comparison/comparison.module';
import { DisputesModule } from './modules/disputes/disputes.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnvironment,
      envFilePath: ['.env', '.env.example'],
    }),
    DatabaseModule,
    MongoDbModule,
    UsersModule,
    AuthModule,
    RentalsModule,
    UploadModule,
    InspectionsModule,
    ComparisonModule,
    DisputesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
