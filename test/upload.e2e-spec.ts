import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('UploadController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

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

    // Register a user to obtain auth token
    const uniqueEmail = `test-upload-${Date.now()}@example.com`;
    const regRes = await request(app.getHttpServer()).post('/auth/register').send({
      name: 'Upload Tester',
      email: uniqueEmail,
      phone: '+919999988888',
      password: 'Password123!',
      role: 'landlord',
    });

    authToken = regRes.body?.data?.accessToken || regRes.body?.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /uploads without auth token should return 401 Unauthorized', () => {
    return request(app.getHttpServer()).post('/uploads').expect(401);
  });

  it('GET /uploads/some-id without auth token should return 401 Unauthorized', () => {
    return request(app.getHttpServer()).get('/uploads/some-id').expect(401);
  });

  it('POST /uploads with auth and valid file should return upload record with _id and sha256Hash', async () => {
    const fileBuffer = Buffer.from('fake-jpeg-image-bytes-for-testing');

    const res = await request(app.getHttpServer())
      .post('/uploads')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', fileBuffer, {
        filename: 'room-wall.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);

    const body = res.body?.data || res.body;
    expect(body).toBeDefined();
    expect(body._id).toBeDefined();
    expect(body.originalName).toBe('room-wall.jpg');
    expect(body.mimeType).toBe('image/jpeg');
    expect(body.sha256Hash).toBeDefined();
    expect(body.sha256Hash).toHaveLength(64);

    // Verify metadata retrieval
    const metaRes = await request(app.getHttpServer())
      .get(`/uploads/${body._id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const metaBody = metaRes.body?.data || metaRes.body;
    expect(metaBody._id).toBe(body._id);
    expect(metaBody.sha256Hash).toBe(body.sha256Hash);
  });
});
