import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('DisputesController (e2e)', () => {
  let app: INestApplication;
  let landlordToken: string;
  let tenantToken: string;
  let outsiderToken: string;
  let rentalId: string;
  let damageDisputeId: string;
  let cleaningDisputeId: string;
  let evidencePhotoId: string;

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

    const timestamp = Date.now();

    // 1. Register Landlord
    const landlordEmail = `landlord-disp-${timestamp}@example.com`;
    await request(app.getHttpServer()).post('/auth/register').send({
      firstName: 'Dispute',
      lastName: 'Landlord',
      email: landlordEmail,
      phone: '+919876543401',
      password: 'Password123!',
      role: 'landlord',
    });
    const landlordLogin = await request(app.getHttpServer()).post('/auth/login').send({
      email: landlordEmail,
      password: 'Password123!',
    });
    landlordToken = landlordLogin.body?.data?.accessToken || landlordLogin.body?.accessToken;

    // 2. Register Tenant
    const tenantEmail = `tenant-disp-${timestamp}@example.com`;
    await request(app.getHttpServer()).post('/auth/register').send({
      firstName: 'Dispute',
      lastName: 'Tenant',
      email: tenantEmail,
      phone: '+919876543402',
      password: 'Password123!',
      role: 'tenant',
    });
    const tenantLogin = await request(app.getHttpServer()).post('/auth/login').send({
      email: tenantEmail,
      password: 'Password123!',
    });
    tenantToken = tenantLogin.body?.data?.accessToken || tenantLogin.body?.accessToken;

    // 3. Register Outsider
    const outsiderEmail = `outsider-disp-${timestamp}@example.com`;
    await request(app.getHttpServer()).post('/auth/register').send({
      firstName: 'Dispute',
      lastName: 'Outsider',
      email: outsiderEmail,
      phone: '+919876543403',
      password: 'Password123!',
      role: 'tenant',
    });
    const outsiderLogin = await request(app.getHttpServer()).post('/auth/login').send({
      email: outsiderEmail,
      password: 'Password123!',
    });
    outsiderToken = outsiderLogin.body?.data?.accessToken || outsiderLogin.body?.accessToken;

    // 4. Create Rental (deposit: 90000)
    const rentalRes = await request(app.getHttpServer())
      .post('/rentals')
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({
        propertyAddress: {
          line1: 'Tower B, Suite 501, Lakeview',
          city: 'Hyderabad',
          state: 'Telangana',
          postalCode: '500081',
        },
        monthlyRent: 30000,
        depositAmount: 90000,
        startDate: '2026-11-01T00:00:00.000Z',
        endDate: '2027-10-31T00:00:00.000Z',
        tenantInviteEmail: tenantEmail,
      })
      .expect(201);
    const rentalBody = rentalRes.body?.data || rentalRes.body;
    rentalId = rentalBody._id;

    // 5. Tenant accepts invitation
    await request(app.getHttpServer())
      .post(`/rentals/${rentalId}/accept-invite`)
      .set('Authorization', `Bearer ${tenantToken}`)
      .expect(200);

    // 6. Upload evidence photo
    const uploadRes = await request(app.getHttpServer())
      .post('/uploads')
      .set('Authorization', `Bearer ${landlordToken}`)
      .attach('file', Buffer.from('broken-window-glass-photo-bytes'), {
        filename: 'broken-window.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);
    evidencePhotoId = (uploadRes.body?.data || uploadRes.body)._id;
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('GET /rentals/:rentalId/disputes returns empty array initially', async () => {
    const res = await request(app.getHttpServer())
      .get(`/rentals/${rentalId}/disputes`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .expect(200);

    const body = res.body?.data || res.body;
    expect(Array.isArray(body.list)).toBe(true);
    expect(body.list).toHaveLength(0);
    expect(body.total).toBe(0);
  });

  it('Tenant cannot create deduction dispute (403 Forbidden)', async () => {
    await request(app.getHttpServer())
      .post(`/rentals/${rentalId}/disputes`)
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({
        category: 'damage',
        proposedDeduction: 8000,
        description: 'Broken window panel replacement',
      })
      .expect(403);
  });

  it('Landlord creates damage dispute with evidence photo upload', async () => {
    const res = await request(app.getHttpServer())
      .post(`/rentals/${rentalId}/disputes`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({
        category: 'damage',
        proposedDeduction: 8000,
        description: 'Broken window panel replacement',
        evidencePhotos: [evidencePhotoId],
      })
      .expect(201);

    const body = res.body?.data || res.body;
    expect(body._id).toBeDefined();
    expect(body.category).toBe('damage');
    expect(body.proposedDeduction).toBe(8000);
    expect(body.tenantStatus).toBe('pending');
    expect(body.resolved).toBe(false);
    expect(body.evidencePhotos).toHaveLength(1);
    expect(body.evidencePhotos[0]._id).toBe(evidencePhotoId);
    expect(body.evidencePhotos[0].sha256Hash).toBeDefined();

    damageDisputeId = body._id;
  });

  it('Landlord creates second deduction dispute for cleaning', async () => {
    const res = await request(app.getHttpServer())
      .post(`/rentals/${rentalId}/disputes`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({
        category: 'cleaning',
        proposedDeduction: 4000,
        description: 'Professional deep cleaning for kitchen and bathroom',
      })
      .expect(201);

    const body = res.body?.data || res.body;
    expect(body._id).toBeDefined();
    expect(body.category).toBe('cleaning');
    expect(body.proposedDeduction).toBe(4000);

    cleaningDisputeId = body._id;
  });

  it('GET /rentals/:rentalId/disputes/settlement calculates initial settlement', async () => {
    const res = await request(app.getHttpServer())
      .get(`/rentals/${rentalId}/disputes/settlement`)
      .set('Authorization', `Bearer ${tenantToken}`)
      .expect(200);

    const body = res.body?.data || res.body;
    expect(body.rentalId).toBe(rentalId);
    expect(body.settlement).toEqual({
      depositAmount: 90000,
      totalProposedDeductions: 12000,
      totalAgreedDeductions: 0,
      estimatedRefundAmount: 90000,
      pendingDisputesCount: 2,
      resolvedDisputesCount: 0,
      totalDisputesCount: 2,
    });
    expect(body.disputes).toHaveLength(2);
  });

  it('Landlord cannot respond to tenant disputes (403 Forbidden)', async () => {
    await request(app.getHttpServer())
      .patch(`/rentals/${rentalId}/disputes/${damageDisputeId}`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({
        tenantStatus: 'accepted',
      })
      .expect(403);
  });

  it('Tenant accepts damage dispute -> locks agreed deduction and marks resolved', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/rentals/${rentalId}/disputes/${damageDisputeId}`)
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({
        tenantStatus: 'accepted',
        tenantComment: 'I accept responsibility for the broken window',
      })
      .expect(200);

    const body = res.body?.data || res.body;
    expect(body._id).toBe(damageDisputeId);
    expect(body.tenantStatus).toBe('accepted');
    expect(body.resolved).toBe(true);
    expect(body.agreedDeduction).toBe(8000);
    expect(body.resolvedAt).toBeDefined();
  });

  it('Tenant disputes cleaning deduction with counter offer', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/rentals/${rentalId}/disputes/${cleaningDisputeId}`)
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({
        tenantStatus: 'disputed',
        counterAmount: 1500,
        tenantComment: 'Flat was cleaned; standard wear and tear only justifies 1500',
      })
      .expect(200);

    const body = res.body?.data || res.body;
    expect(body._id).toBe(cleaningDisputeId);
    expect(body.tenantStatus).toBe('disputed');
    expect(body.counterAmount).toBe(1500);
    expect(body.resolved).toBe(false);
  });

  it('Tenant cannot respond again to already resolved dispute (409 Conflict)', async () => {
    await request(app.getHttpServer())
      .patch(`/rentals/${rentalId}/disputes/${damageDisputeId}`)
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({
        tenantStatus: 'accepted',
      })
      .expect(409);
  });

  it('GET /rentals/:rentalId/disputes/settlement reflects updated refund and agreed deduction', async () => {
    const res = await request(app.getHttpServer())
      .get(`/rentals/${rentalId}/disputes/settlement`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .expect(200);

    const body = res.body?.data || res.body;
    expect(body.settlement).toEqual({
      depositAmount: 90000,
      totalProposedDeductions: 12000,
      totalAgreedDeductions: 8000,
      estimatedRefundAmount: 82000, // 90000 - 8000
      pendingDisputesCount: 1,
      resolvedDisputesCount: 1,
      totalDisputesCount: 2,
    });
  });

  it('Outsider cannot access disputes or settlement (403 Forbidden)', async () => {
    await request(app.getHttpServer())
      .get(`/rentals/${rentalId}/disputes`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get(`/rentals/${rentalId}/disputes/settlement`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .expect(403);
  });
});
