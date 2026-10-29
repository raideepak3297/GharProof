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

  it('GET /users/tenants without auth returns 401 Unauthorized', () => {
    return request(app.getHttpServer()).get('/users/tenants').expect(401);
  });

  it('Landlord can search registered tenants and link tenant during rental creation', async () => {
    const timestamp = Date.now();
    const landlordEmail = `landlord-search-${timestamp}@example.com`;
    const tenantEmail = `tenant-search-${timestamp}@example.com`;

    // 1. Register Landlord
    await request(app.getHttpServer()).post('/auth/register').send({
      firstName: 'Search',
      lastName: 'Landlord',
      email: landlordEmail,
      phone: '+919876540001',
      password: 'Password123!',
      role: 'landlord',
    });
    const landlordLogin = await request(app.getHttpServer()).post('/auth/login').send({
      email: landlordEmail,
      password: 'Password123!',
    });
    const landlordToken = landlordLogin.body?.data?.accessToken || landlordLogin.body?.accessToken;

    // 2. Register Tenant
    await request(app.getHttpServer()).post('/auth/register').send({
      firstName: 'Deepak',
      lastName: 'Tenant',
      email: tenantEmail,
      phone: '+919876540002',
      password: 'Password123!',
      role: 'tenant',
    });

    // 3. Landlord searches registered tenants
    const tenantsRes = await request(app.getHttpServer())
      .get('/users/tenants?search=Deepak')
      .set('Authorization', `Bearer ${landlordToken}`)
      .expect(200);

    const tenants = tenantsRes.body?.data || tenantsRes.body;
    expect(Array.isArray(tenants)).toBe(true);
    const foundTenant = tenants.find((t: any) => t.email === tenantEmail);
    expect(foundTenant).toBeDefined();
    expect(foundTenant.firstName).toBe('Deepak');

    // 4. Landlord creates rental selecting tenantId
    const createRes = await request(app.getHttpServer())
      .post('/rentals')
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({
        propertyAddress: {
          line1: 'Flat 901, Sky Tower',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400001',
        },
        monthlyRent: 35000,
        depositAmount: 70000,
        startDate: '2026-11-01',
        tenantId: foundTenant._id,
      })
      .expect(201);

    const rental = createRes.body?.data || createRes.body;
    expect(rental.status).toBe('invited');
    expect(rental.tenantInviteEmail).toBe(tenantEmail);
  });
});
