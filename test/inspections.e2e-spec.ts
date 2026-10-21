import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('InspectionsController (e2e)', () => {
  let app: INestApplication;
  let landlordToken: string;
  let tenantToken: string;
  let rentalId: string;
  let inspectionId: string;
  let uploadId: string;

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

    // 1. Register Landlord
    const landlordEmail = `landlord-insp-${Date.now()}@example.com`;
    const landlordRes = await request(app.getHttpServer()).post('/auth/register').send({
      name: 'Landlord Sharma',
      email: landlordEmail,
      phone: '+919876543201',
      password: 'Password123!',
      role: 'landlord',
    });
    landlordToken = landlordRes.body?.data?.accessToken || landlordRes.body?.accessToken;

    // 2. Register Tenant
    const tenantEmail = `tenant-insp-${Date.now()}@example.com`;
    const tenantRes = await request(app.getHttpServer()).post('/auth/register').send({
      name: 'Tenant Verma',
      email: tenantEmail,
      phone: '+919876543202',
      password: 'Password123!',
      role: 'tenant',
    });
    tenantToken = tenantRes.body?.data?.accessToken || tenantRes.body?.accessToken;

    // 3. Landlord creates rental
    const rentalRes = await request(app.getHttpServer())
      .post('/rentals')
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({
        propertyAddress: {
          line1: 'Flat 402, Green Heights',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
        },
        monthlyRent: 35000,
        depositAmount: 100000,
        startDate: '2026-11-01T00:00:00.000Z',
        endDate: '2027-10-31T00:00:00.000Z',
        tenantInviteEmail: tenantEmail,
      })
      .expect(201);
    const rentalBody = rentalRes.body?.data || rentalRes.body;
    rentalId = rentalBody._id;

    // 4. Tenant accepts invitation
    await request(app.getHttpServer())
      .post(`/rentals/${rentalId}/accept-invite`)
      .set('Authorization', `Bearer ${tenantToken}`)
      .expect(200);

    // 5. Landlord uploads a condition photo
    const fileBuffer = Buffer.from('mock-fan-photo-binary-bytes');
    const uploadRes = await request(app.getHttpServer())
      .post('/uploads')
      .set('Authorization', `Bearer ${landlordToken}`)
      .attach('file', fileBuffer, {
        filename: 'ceiling-fan.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);
    const uploadBody = uploadRes.body?.data || uploadRes.body;
    uploadId = uploadBody._id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /inspections without auth should return 401 Unauthorized', () => {
    return request(app.getHttpServer()).post('/inspections').expect(401);
  });

  it('POST /rentals/:rentalId/inspections creates move-in inspection', async () => {
    const res = await request(app.getHttpServer())
      .post(`/rentals/${rentalId}/inspections`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({
        type: 'move_in',
        notes: 'Initial move-in room condition inspection',
      })
      .expect(201);

    const body = res.body?.data || res.body;
    expect(body._id).toBeDefined();
    expect(body.type).toBe('move_in');
    expect(body.status).toBe('draft');
    inspectionId = body._id;
  });

  it('POST /inspections/:id/items adds checklist item with upload _id', async () => {
    const res = await request(app.getHttpServer())
      .post(`/inspections/${inspectionId}/items`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({
        roomName: 'Living Room',
        itemName: 'Ceiling Fan',
        condition: 'good',
        notes: 'Working properly with speed regulator',
        photos: [uploadId],
      })
      .expect(201);

    const body = res.body?.data || res.body;
    expect(body._id).toBeDefined();
    expect(body.roomName).toBe('Living Room');
    expect(body.itemName).toBe('Ceiling Fan');
    expect(body.photos).toHaveLength(1);
    expect(body.photos[0]._id).toBe(uploadId);
    expect(body.photos[0].sha256Hash).toBeDefined();
  });

  it('GET /inspections/:id returns inspection with populated items and photo hashes', async () => {
    const res = await request(app.getHttpServer())
      .get(`/inspections/${inspectionId}`)
      .set('Authorization', `Bearer ${tenantToken}`)
      .expect(200);

    const body = res.body?.data || res.body;
    expect(body._id).toBe(inspectionId);
    expect(body.items).toHaveLength(1);
    expect(body.items[0].photos[0]._id).toBe(uploadId);
    expect(body.items[0].photos[0].sha256Hash).toHaveLength(64);
  });

  it('Dual sign-off computes composite rootHash and locks inspection', async () => {
    // Landlord signs off
    const landlordSignRes = await request(app.getHttpServer())
      .post(`/inspections/${inspectionId}/sign-off`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({ agree: true })
      .expect(201);

    const landlordBody = landlordSignRes.body?.data || landlordSignRes.body;
    expect(landlordBody.landlordSigned).toBe(true);
    expect(landlordBody.status).toBe('pending_signatures');

    // Tenant signs off -> triggers automatic lock & rootHash calculation
    const tenantSignRes = await request(app.getHttpServer())
      .post(`/inspections/${inspectionId}/sign-off`)
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({ agree: true })
      .expect(201);

    const finalBody = tenantSignRes.body?.data || tenantSignRes.body;
    expect(finalBody.tenantSigned).toBe(true);
    expect(finalBody.status).toBe('locked');
    expect(finalBody.rootHash).toBeDefined();
    expect(finalBody.rootHash).toHaveLength(64);
    expect(finalBody.lockedAt).toBeDefined();
  });

  it('Enforces immutability: adding an item to locked inspection returns 403 Forbidden', async () => {
    await request(app.getHttpServer())
      .post(`/inspections/${inspectionId}/items`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({
        roomName: 'Balcony',
        itemName: 'Grill',
        condition: 'good',
      })
      .expect(403);
  });
});
