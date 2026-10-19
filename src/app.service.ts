import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: 'gharproof-backend',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
