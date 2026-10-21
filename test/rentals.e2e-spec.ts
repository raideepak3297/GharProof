import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('RentalsController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /rentals without auth token should return 401 Unauthorized', () => {
    return request(app.getHttpServer()).get('/rentals').expect(401);
  });

  it('POST /rentals without auth token should return 401 Unauthorized', () => {
    return request(app.getHttpServer()).post('/rentals').send({ monthlyRent: 20000 }).expect(401);
  });

  it('GET /rentals/123 without auth token should return 401 Unauthorized', () => {
    return request(app.getHttpServer()).get('/rentals/123').expect(401);
  });

  it('POST /rentals/123/accept-invite without auth token should return 401 Unauthorized', () => {
    return request(app.getHttpServer()).post('/rentals/123/accept-invite').expect(401);
  });
});
