import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('ReportsController (e2e)', () => {
  let app: INestApplication;
  let landlordToken: string;
  let tenantToken: string;
  let outsiderToken: string;
  let rentalId: string;
  let moveInInspectionId: string;
  let moveOutInspectionId: string;
  let photoUploadId: string;

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
    const landlordEmail = `landlord-rep-${timestamp}@example.com`;
    await request(app.getHttpServer()).post('/auth/register').send({
      firstName: 'Report',
      lastName: 'Landlord',
      email: landlordEmail,
      phone: '+919876543501',
      password: 'Password123!',
      role: 'landlord',
    });
    const landlordLogin = await request(app.getHttpServer()).post('/auth/login').send({
      email: landlordEmail,
      password: 'Password123!',
    });
    landlordToken = landlordLogin.body?.data?.accessToken || landlordLogin.body?.accessToken;

    // 2. Register Tenant
    const tenantEmail = `tenant-rep-${timestamp}@example.com`;
    await request(app.getHttpServer()).post('/auth/register').send({
      firstName: 'Report',
      lastName: 'Tenant',
      email: tenantEmail,
      phone: '+919876543502',
      password: 'Password123!',
      role: 'tenant',
    });
    const tenantLogin = await request(app.getHttpServer()).post('/auth/login').send({
      email: tenantEmail,
      password: 'Password123!',
    });
    tenantToken = tenantLogin.body?.data?.accessToken || tenantLogin.body?.accessToken;

    // 3. Register Outsider
    const outsiderEmail = `outsider-rep-${timestamp}@example.com`;
    await request(app.getHttpServer()).post('/auth/register').send({
      firstName: 'Report',
      lastName: 'Outsider',
      email: outsiderEmail,
      phone: '+919876543503',
      password: 'Password123!',
      role: 'tenant',
    });
    const outsiderLogin = await request(app.getHttpServer()).post('/auth/login').send({
      email: outsiderEmail,
      password: 'Password123!',
    });
    outsiderToken = outsiderLogin.body?.data?.accessToken || outsiderLogin.body?.accessToken;

    // 4. Create Rental
    const rentalRes = await request(app.getHttpServer())
      .post('/rentals')
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({
        propertyAddress: {
          line1: 'Flat 1204, Cyber Heights',
          city: 'Hyderabad',
          state: 'Telangana',
          postalCode: '500081',
        },
        monthlyRent: 42000,
        depositAmount: 120000,
        startDate: '2026-11-01T00:00:00.000Z',
        endDate: '2027-10-31T00:00:00.000Z',
        tenantInviteEmail: tenantEmail,
      })
      .expect(201);
    rentalId = (rentalRes.body?.data || rentalRes.body)._id;

    // 5. Tenant accepts invite
    await request(app.getHttpServer())
      .post(`/rentals/${rentalId}/accept-invite`)
      .set('Authorization', `Bearer ${tenantToken}`)
      .expect(200);

    // 6. Upload photo
    const uploadRes = await request(app.getHttpServer())
      .post('/uploads')
      .set('Authorization', `Bearer ${landlordToken}`)
      .attach('file', Buffer.from('report-ac-condition-photo-bytes'), {
        filename: 'ac-photo.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);
    photoUploadId = (uploadRes.body?.data || uploadRes.body)._id;

    // 7. Create Move-In inspection
    const moveInRes = await request(app.getHttpServer())
      .post(`/rentals/${rentalId}/inspections`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({
        type: 'move_in',
        notes: 'Initial move-in survey',
      })
      .expect(201);
    moveInInspectionId = (moveInRes.body?.data || moveInRes.body)._id;

    // 8. Add item to Move-In
    await request(app.getHttpServer())
      .post(`/inspections/${moveInInspectionId}/items`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({
        roomName: 'Living Room',
        itemName: 'Daikin AC',
        condition: 'good',
        notes: 'Cold airflow normal',
        photos: [photoUploadId],
      })
      .expect(201);

    // 9. Dual sign-off move-in -> locks
    await request(app.getHttpServer())
      .post(`/inspections/${moveInInspectionId}/sign-off`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({ agree: true })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/inspections/${moveInInspectionId}/sign-off`)
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({ agree: true })
      .expect(201);

    // 10. Create Move-Out inspection -> auto-clones
    const moveOutRes = await request(app.getHttpServer())
      .post(`/rentals/${rentalId}/inspections`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({
        type: 'move_out',
        notes: 'Move-out final survey',
      })
      .expect(201);
    moveOutInspectionId = (moveOutRes.body?.data || moveOutRes.body)._id;

    // 11. Dual sign-off move-out -> locks
    await request(app.getHttpServer())
      .post(`/inspections/${moveOutInspectionId}/sign-off`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({ agree: true })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/inspections/${moveOutInspectionId}/sign-off`)
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({ agree: true })
      .expect(201);

    // 12. Create dispute and tenant accepts
    const disputeRes = await request(app.getHttpServer())
      .post(`/rentals/${rentalId}/disputes`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({
        category: 'cleaning',
        proposedDeduction: 3500,
        description: 'Deep carpet shampoo cleaning',
      })
      .expect(201);
    const disputeId = (disputeRes.body?.data || disputeRes.body)._id;

    await request(app.getHttpServer())
      .patch(`/rentals/${rentalId}/disputes/${disputeId}`)
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({
        tenantStatus: 'accepted',
        tenantComment: 'Agreed with cleaning deduction',
      })
      .expect(200);
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('GET /rentals/:rentalId/report.pdf without auth returns 401 Unauthorized', async () => {
    await request(app.getHttpServer()).get(`/rentals/${rentalId}/report.pdf`).expect(401);
  });

  it('GET /rentals/:rentalId/report.pdf as outsider returns 403 Forbidden', async () => {
    await request(app.getHttpServer())
      .get(`/rentals/${rentalId}/report.pdf`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .expect(403);
  });

  it('GET /rentals/:rentalId/report.pdf as Landlord streams valid PDF document', async () => {
    const res = await request(app.getHttpServer())
      .get(`/rentals/${rentalId}/report.pdf`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .expect(200);

    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.headers['content-disposition']).toContain(
      `attachment; filename="GharProof-Inspection-Report-${rentalId}.pdf"`,
    );

    const bodyBuffer = Buffer.isBuffer(res.body) ? res.body : Buffer.from(res.text, 'binary');
    expect(bodyBuffer.length).toBeGreaterThan(500);

    // Validate PDF magic header
    const magicHeader = bodyBuffer.subarray(0, 5).toString('ascii');
    expect(magicHeader).toBe('%PDF-');
  });

  it('GET /rentals/:rentalId/report.pdf as Tenant streams valid PDF document', async () => {
    const res = await request(app.getHttpServer())
      .get(`/rentals/${rentalId}/report.pdf`)
      .set('Authorization', `Bearer ${tenantToken}`)
      .expect(200);

    expect(res.headers['content-type']).toContain('application/pdf');

    const bodyBuffer = Buffer.isBuffer(res.body) ? res.body : Buffer.from(res.text, 'binary');
    expect(bodyBuffer.length).toBeGreaterThan(500);

    const magicHeader = bodyBuffer.subarray(0, 5).toString('ascii');
    expect(magicHeader).toBe('%PDF-');
  });
});
