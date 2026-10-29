import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('ComparisonController (e2e)', () => {
  let app: INestApplication;
  let landlordToken: string;
  let tenantToken: string;
  let outsiderToken: string;
  let rentalId: string;
  let moveInInspectionId: string;
  let moveOutInspectionId: string;
  let moveInUploadId: string;
  let moveOutUploadId: string;

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
    const landlordEmail = `landlord-comp-${timestamp}@example.com`;
    await request(app.getHttpServer()).post('/auth/register').send({
      firstName: 'Comparison',
      lastName: 'Landlord',
      email: landlordEmail,
      phone: '+919876543301',
      password: 'Password123!',
      role: 'landlord',
    });
    const landlordLogin = await request(app.getHttpServer()).post('/auth/login').send({
      email: landlordEmail,
      password: 'Password123!',
    });
    landlordToken = landlordLogin.body?.data?.accessToken || landlordLogin.body?.accessToken;

    // 2. Register Tenant
    const tenantEmail = `tenant-comp-${timestamp}@example.com`;
    await request(app.getHttpServer()).post('/auth/register').send({
      firstName: 'Comparison',
      lastName: 'Tenant',
      email: tenantEmail,
      phone: '+919876543302',
      password: 'Password123!',
      role: 'tenant',
    });
    const tenantLogin = await request(app.getHttpServer()).post('/auth/login').send({
      email: tenantEmail,
      password: 'Password123!',
    });
    tenantToken = tenantLogin.body?.data?.accessToken || tenantLogin.body?.accessToken;

    // 3. Register Outsider Tenant
    const outsiderEmail = `outsider-comp-${timestamp}@example.com`;
    await request(app.getHttpServer()).post('/auth/register').send({
      firstName: 'Comparison',
      lastName: 'Outsider',
      email: outsiderEmail,
      phone: '+919876543303',
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
          line1: 'Apt 101, Palm Grove',
          city: 'Bengaluru',
          state: 'Karnataka',
          postalCode: '560001',
        },
        monthlyRent: 45000,
        depositAmount: 150000,
        startDate: '2026-11-01T00:00:00.000Z',
        endDate: '2027-10-31T00:00:00.000Z',
        tenantInviteEmail: tenantEmail,
      })
      .expect(201);
    const rentalBody = rentalRes.body?.data || rentalRes.body;
    rentalId = rentalBody._id;

    // 5. Tenant accepts invite
    await request(app.getHttpServer())
      .post(`/rentals/${rentalId}/accept-invite`)
      .set('Authorization', `Bearer ${tenantToken}`)
      .expect(200);

    // 6. Upload move-in photo
    const moveInPhotoRes = await request(app.getHttpServer())
      .post('/uploads')
      .set('Authorization', `Bearer ${landlordToken}`)
      .attach('file', Buffer.from('move-in-ac-photo-bytes'), {
        filename: 'move-in-ac.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);
    moveInUploadId = (moveInPhotoRes.body?.data || moveInPhotoRes.body)._id;

    // 7. Upload move-out photo
    const moveOutPhotoRes = await request(app.getHttpServer())
      .post('/uploads')
      .set('Authorization', `Bearer ${tenantToken}`)
      .attach('file', Buffer.from('move-out-ac-damaged-photo-bytes'), {
        filename: 'move-out-ac-damaged.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);
    moveOutUploadId = (moveOutPhotoRes.body?.data || moveOutPhotoRes.body)._id;
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('GET /rentals/:rentalId/comparison returns empty comparisons initially', async () => {
    const res = await request(app.getHttpServer())
      .get(`/rentals/${rentalId}/comparison`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .expect(200);

    const body = res.body?.data || res.body;
    expect(body.rentalId).toBe(rentalId);
    expect(body.moveInInspectionId).toBeNull();
    expect(body.moveInLocked).toBe(false);
    expect(body.moveOutInspectionId).toBeNull();
    expect(body.moveOutLocked).toBe(false);
    expect(body.comparisons).toHaveLength(0);
    expect(body.summary.totalItems).toBe(0);
  });

  it('POST /rentals/:rentalId/inspections for move_out fails before move_in exists', async () => {
    const res = await request(app.getHttpServer())
      .post(`/rentals/${rentalId}/inspections`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({
        type: 'move_out',
        notes: 'Attempt early move out',
      })
      .expect(400);

    const body = res.body?.data || res.body;
    expect(body.message).toContain('Move-in inspection must be completed and locked');
  });

  it('Creates move-in inspection and adds room items', async () => {
    const inspRes = await request(app.getHttpServer())
      .post(`/rentals/${rentalId}/inspections`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({
        type: 'move_in',
        notes: 'Move-in room inventory',
      })
      .expect(201);

    const inspBody = inspRes.body?.data || inspRes.body;
    moveInInspectionId = inspBody._id;

    // Add Split AC
    await request(app.getHttpServer())
      .post(`/inspections/${moveInInspectionId}/items`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({
        roomName: 'Living Room',
        itemName: 'Split AC',
        condition: 'good',
        notes: 'Brand new, cool air working',
        photos: [moveInUploadId],
      })
      .expect(201);

    // Add Wooden Wardrobe
    await request(app.getHttpServer())
      .post(`/inspections/${moveInInspectionId}/items`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({
        roomName: 'Bedroom',
        itemName: 'Wooden Wardrobe',
        condition: 'good',
        notes: 'Clean and sturdy',
      })
      .expect(201);
  });

  it('POST /rentals/:rentalId/inspections for move_out fails when move_in is not locked', async () => {
    await request(app.getHttpServer())
      .post(`/rentals/${rentalId}/inspections`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({
        type: 'move_out',
      })
      .expect(400);
  });

  it('Dual sign-off locks move-in inspection', async () => {
    await request(app.getHttpServer())
      .post(`/inspections/${moveInInspectionId}/sign-off`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({ agree: true })
      .expect(201);

    const signRes = await request(app.getHttpServer())
      .post(`/inspections/${moveInInspectionId}/sign-off`)
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({ agree: true })
      .expect(201);

    const body = signRes.body?.data || signRes.body;
    expect(body.status).toBe('locked');
    expect(body.rootHash).toBeDefined();
  });

  it('Creates move-out inspection and verifies auto-cloned items', async () => {
    const inspRes = await request(app.getHttpServer())
      .post(`/rentals/${rentalId}/inspections`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({
        type: 'move_out',
        notes: 'Move-out final inspection',
      })
      .expect(201);

    const inspBody = inspRes.body?.data || inspRes.body;
    moveOutInspectionId = inspBody._id;

    // Fetch move-out inspection details to inspect cloned checklist items
    const getRes = await request(app.getHttpServer())
      .get(`/inspections/${moveOutInspectionId}`)
      .set('Authorization', `Bearer ${tenantToken}`)
      .expect(200);

    const getBody = getRes.body?.data || getRes.body;
    expect(getBody.items).toHaveLength(2);

    const clonedAc = getBody.items.find((i: any) => i.itemName === 'Split AC');
    const clonedWardrobe = getBody.items.find((i: any) => i.itemName === 'Wooden Wardrobe');

    expect(clonedAc).toBeDefined();
    expect(clonedWardrobe).toBeDefined();
    expect(clonedAc.condition).toBe('good');

    // Update Split AC at move-out to damaged with moveOut photo
    await request(app.getHttpServer())
      .patch(`/inspections/${moveOutInspectionId}/items/${clonedAc._id}`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({
        condition: 'damaged',
        notes: 'Compressor broken, exterior panel dented',
        photos: [moveOutUploadId],
      })
      .expect(200);

    // Add a new item added during tenancy: Clothes Drying Rack
    await request(app.getHttpServer())
      .post(`/inspections/${moveOutInspectionId}/items`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({
        roomName: 'Balcony',
        itemName: 'Clothes Drying Rack',
        condition: 'good',
        notes: 'Left behind on balcony',
      })
      .expect(201);
  });

  it('Dual sign-off locks move-out inspection', async () => {
    await request(app.getHttpServer())
      .post(`/inspections/${moveOutInspectionId}/sign-off`)
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({ agree: true })
      .expect(201);

    const signRes = await request(app.getHttpServer())
      .post(`/inspections/${moveOutInspectionId}/sign-off`)
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({ agree: true })
      .expect(201);

    const body = signRes.body?.data || signRes.body;
    expect(body.status).toBe('locked');
    expect(body.rootHash).toBeDefined();
  });

  it('GET /rentals/:rentalId/comparison returns complete side-by-side comparison matrix', async () => {
    const res = await request(app.getHttpServer())
      .get(`/rentals/${rentalId}/comparison`)
      .set('Authorization', `Bearer ${tenantToken}`)
      .expect(200);

    const body = res.body?.data || res.body;
    expect(body.rentalId).toBe(rentalId);
    expect(body.moveInInspectionId).toBe(moveInInspectionId);
    expect(body.moveInLocked).toBe(true);
    expect(body.moveOutInspectionId).toBe(moveOutInspectionId);
    expect(body.moveOutLocked).toBe(true);

    // Summary validation
    expect(body.summary).toEqual({
      totalItems: 3,
      unchangedCount: 1,
      minorWearCount: 0,
      damagedCount: 1,
      missingCount: 0,
      addedCount: 1,
    });

    // Comparisons array
    expect(body.comparisons).toHaveLength(3);

    // 1. Balcony - Clothes Drying Rack (ADDED_DURING_TENANCY)
    const rackComp = body.comparisons.find((c: any) => c.itemName === 'Clothes Drying Rack');
    expect(rackComp).toBeDefined();
    expect(rackComp.diffStatus).toBe('added_during_tenancy');
    expect(rackComp.moveIn).toBeNull();
    expect(rackComp.moveOut).toBeDefined();
    expect(rackComp.moveOut.condition).toBe('good');

    // 2. Bedroom - Wooden Wardrobe (UNCHANGED)
    const wardrobeComp = body.comparisons.find((c: any) => c.itemName === 'Wooden Wardrobe');
    expect(wardrobeComp).toBeDefined();
    expect(wardrobeComp.diffStatus).toBe('unchanged');
    expect(wardrobeComp.moveIn.condition).toBe('good');
    expect(wardrobeComp.moveOut.condition).toBe('good');

    // 3. Living Room - Split AC (DAMAGED_SINCE_MOVE_IN)
    const acComp = body.comparisons.find((c: any) => c.itemName === 'Split AC');
    expect(acComp).toBeDefined();
    expect(acComp.diffStatus).toBe('damaged_since_move_in');
    expect(acComp.moveIn.condition).toBe('good');
    expect(acComp.moveIn.photos).toHaveLength(1);
    expect(acComp.moveIn.photos[0]._id).toBe(moveInUploadId);
    expect(acComp.moveIn.photos[0].sha256Hash).toHaveLength(64);

    expect(acComp.moveOut.condition).toBe('damaged');
    expect(acComp.moveOut.photos).toHaveLength(1);
    expect(acComp.moveOut.photos[0]._id).toBe(moveOutUploadId);
    expect(acComp.moveOut.photos[0].sha256Hash).toHaveLength(64);
  });

  it('GET /rentals/:rentalId/comparison returns 403 Forbidden for outsider', async () => {
    await request(app.getHttpServer())
      .get(`/rentals/${rentalId}/comparison`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .expect(403);
  });
});
