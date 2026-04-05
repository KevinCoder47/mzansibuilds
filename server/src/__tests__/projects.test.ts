import request from 'supertest';
import app from '../app';

// We'll store a token here to use in protected route tests
let authToken = '';

// Before all tests — register and login to get a token
beforeAll(async () => {
  const { clearUsers } = require('../data/store');
  clearUsers();

  // Register a developer
  await request(app).post('/api/auth/register').send({
    username: 'sipho',
    email: 'sipho@example.com',
    password: 'Password123!',
  });

  // Login to get the token
  const loginRes = await request(app).post('/api/auth/login').send({
    email: 'sipho@example.com',
    password: 'Password123!',
  });

  authToken = loginRes.body.token;
});

// Reset projects before each test
beforeEach(() => {
  const { clearProjects } = require('../data/store'); // ✅ Fixed: was ../../data/store
  clearProjects();
});

// ─── CREATE PROJECT ───────────────────────────────────────────────────────────

describe('POST /api/projects', () => {
  it('should create a new project when logged in', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'MzansiBuilds',
        description: 'A platform for building in public',
        techStack: ['React', 'Node.js'],
        stage: 'planning',
        supportRequired: 'Looking for a designer',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('title', 'MzansiBuilds');
    expect(res.body).toHaveProperty('stage', 'planning');
  });

  it('should return 401 if not logged in', async () => {
    const res = await request(app).post('/api/projects').send({
      title: 'Secret project',
      description: 'No auth provided',
      techStack: [],
      stage: 'planning',
      supportRequired: '',
    });

    expect(res.status).toBe(401);
  });

  it('should return 400 if title is missing', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        description: 'No title here',
        techStack: [],
        stage: 'planning',
        supportRequired: '',
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

// ─── GET FEED ─────────────────────────────────────────────────────────────────

describe('GET /api/projects', () => {
  it('should return an empty feed when no projects exist', async () => {
    const res = await request(app).get('/api/projects');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('projects');
    expect(Array.isArray(res.body.projects)).toBe(true);
    expect(res.body.projects.length).toBe(0);
  });

  it('should return all projects in the feed', async () => {
    // Create a project first
    await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'My First Build',
        description: 'Building in public',
        techStack: ['Vue.js'],
        stage: 'building',
        supportRequired: '',
      });

    const res = await request(app).get('/api/projects');

    expect(res.status).toBe(200);
    expect(res.body.projects.length).toBe(1);
    expect(res.body.projects[0]).toHaveProperty('title', 'My First Build');
  });
});

// ─── ADD MILESTONE ────────────────────────────────────────────────────────────

describe('POST /api/projects/:id/milestones', () => {
  it('should add a milestone to a project', async () => {
    // Create a project first
    const projectRes = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'My Build',
        description: 'Building stuff',
        techStack: ['React'],
        stage: 'building',
        supportRequired: '',
      });

    const projectId = projectRes.body.id;

    // Now add a milestone to it
    const res = await request(app)
      .post(`/api/projects/${projectId}/milestones`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Finished the login page',
        description: 'Users can now register and log in',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('title', 'Finished the login page');
  });

  it('should return 404 if project does not exist', async () => {
    const res = await request(app)
      .post('/api/projects/nonexistent-id/milestones')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Ghost milestone',
        description: 'This should fail',
      });

    expect(res.status).toBe(404);
  });
});
