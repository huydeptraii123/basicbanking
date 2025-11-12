const request = require('supertest');
const app = require('../src/index').default;
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

describe('Auth endpoints', () => {
  beforeAll(async () => {
    // ensure clean DB for tests
    await prisma.transaction.deleteMany();
    await prisma.bank.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('signup -> signin', async () => {
    const email = `test+${Date.now()}@example.com`;
    const signupRes = await request(app).post('/api/auth/signup').send({ email, password: 'secret', firstName: 'T', lastName: 'User' });
    expect(signupRes.statusCode).toBe(200);

    const signinRes = await request(app).post('/api/auth/signin').send({ email, password: 'secret' });
    expect(signinRes.statusCode).toBe(200);
  });
});
