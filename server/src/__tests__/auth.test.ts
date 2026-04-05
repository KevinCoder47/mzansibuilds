import request from 'supertest';
import app from '../app';

// We clear our fake database before each test so tests don't affect each other
beforeEach(() => {
  // Import the in-memory store and clear it
  const { clearUsers } = require('../data/store');
  clearUsers();
});

// ─── REGISTER ────────────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  it('should register a new developer and return 201', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'thabo',
      email: 'thabo@example.com',
      password: 'Password123!',
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('message', 'Account created successfully');
    expect(res.body).toHaveProperty('token');
    // Password must NEVER be returned
    expect(res.body).not.toHaveProperty('password');
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it('should return 400 if email is already taken', async () => {
    // Register once
    await request(app).post('/api/auth/register').send({
      username: 'thabo',
      email: 'thabo@example.com',
      password: 'Password123!',
    });

    // Try to register again with the same email
    const res = await request(app).post('/api/auth/register').send({
      username: 'thabo2',
      email: 'thabo@example.com',
      password: 'Password123!',
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Email already in use');
  });

  it('should return 400 if required fields are missing', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'noemail@example.com',
      // missing username and password
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('should return 400 if password is too short', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'thabo',
      email: 'thabo@example.com',
      password: '123', // too short
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

// ─── LOGIN ────────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  // Register a user before each login test
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send({
      username: 'thabo',
      email: 'thabo@example.com',
      password: 'Password123!',
    });
  });

  it('should login with correct credentials and return a token', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'thabo@example.com',
      password: 'Password123!',
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.developer).toHaveProperty('email', 'thabo@example.com');
    expect(res.body.developer).not.toHaveProperty('passwordHash');
  });

  it('should return 401 for wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'thabo@example.com',
      password: 'WrongPassword!',
    });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'Invalid email or password');
  });

  it('should return 401 for email that does not exist', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'ghost@example.com',
      password: 'Password123!',
    });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'Invalid email or password');
  });
});
