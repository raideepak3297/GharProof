import { Injectable, OnModuleInit, OnApplicationShutdown, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class DatabaseService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger('Database');

  constructor(@InjectConnection() private readonly connection: Connection) {}

  onModuleInit() {
    const { host, port, name } = this.connection;

    if (this.connection.readyState === 1) {
      this.logger.log(`MongoDB connected successfully to: mongodb://${host}:${port}/${name}`);
    }

    this.connection.on('connected', () => {
      this.logger.log(
        `MongoDB connected successfully to: mongodb://${this.connection.host}:${this.connection.port}/${this.connection.name}`,
      );
    });

    this.connection.on('error', (error) => {
      this.logger.error(`MongoDB connection error: ${error.message}`);
    });

    this.connection.on('disconnected', () => {
      this.logger.warn('MongoDB connection lost');
    });
  }

  onApplicationShutdown() {
    this.logger.log('Closing MongoDB connection...');
  }
}
