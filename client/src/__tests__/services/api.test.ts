import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock the axios instance that api.ts creates internally.
// vi.hoisted() runs BEFORE vi.mock() hoisting so the variable is in scope.
// ---------------------------------------------------------------------------

const mockAxios = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  interceptors: { request: { use: vi.fn() } },
}));

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockAxios),
  },
}));

// Import AFTER mocking so the module picks up our fake axios instance
import { authApi, projectsApi } from '../../services/api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ok = <T>(data: T) => Promise.resolve({ data, status: 200 });

const fail = (status: number, message: string) =>
  Promise.reject(Object.assign(new Error(message), { response: { status, data: { message } } }));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// authApi
// ---------------------------------------------------------------------------

describe('authApi.register', () => {
  it('calls POST /auth/register with username, email, password', async () => {
    mockAxios.post.mockReturnValue(
      ok({
        token: 'tok_r',
        developer: { id: '1', username: 'neo', email: 'neo@x.com' },
        message: 'Created',
      }),
    );

    await authApi.register('neo', 'neo@x.com', 'pass123');

    expect(mockAxios.post).toHaveBeenCalledWith('/auth/register', {
      username: 'neo',
      email: 'neo@x.com',
      password: 'pass123',
    });
  });

  it('returns token and developer on success', async () => {
    const developer = { id: '1', username: 'neo', email: 'neo@x.com' };
    mockAxios.post.mockReturnValue(ok({ token: 'tok_r', developer, message: 'Created' }));

    const result = await authApi.register('neo', 'neo@x.com', 'pass123');

    expect(result.token).toBe('tok_r');
    expect(result.developer).toEqual(developer);
  });

  it('propagates errors when the API returns a non-2xx response', async () => {
    mockAxios.post.mockReturnValue(fail(400, 'Email taken'));

    await expect(authApi.register('dup', 'dup@x.com', '123')).rejects.toThrow();
  });
});

describe('authApi.login', () => {
  it('calls POST /auth/login with email and password', async () => {
    mockAxios.post.mockReturnValue(
      ok({ token: 'tok_l', developer: { id: '1', username: 'neo', email: 'neo@x.com' } }),
    );

    await authApi.login('neo@x.com', 'pass123');

    expect(mockAxios.post).toHaveBeenCalledWith('/auth/login', {
      email: 'neo@x.com',
      password: 'pass123',
    });
  });

  it('returns token and developer on success', async () => {
    const developer = { id: '1', username: 'neo', email: 'neo@x.com' };
    mockAxios.post.mockReturnValue(ok({ token: 'tok_l', developer }));

    const result = await authApi.login('neo@x.com', 'pass123');

    expect(result.token).toBe('tok_l');
    expect(result.developer.username).toBe('neo');
  });

  it('propagates errors on 401 invalid credentials', async () => {
    mockAxios.post.mockReturnValue(fail(401, 'Invalid credentials'));

    await expect(authApi.login('wrong@x.com', 'wrong')).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// projectsApi
// ---------------------------------------------------------------------------

describe('projectsApi.getAll', () => {
  it('calls GET /projects', async () => {
    mockAxios.get.mockReturnValue(ok({ projects: [] }));

    await projectsApi.getAll();

    expect(mockAxios.get).toHaveBeenCalledWith('/projects');
  });

  it('returns the projects array from the response', async () => {
    const projects = [
      {
        id: '1',
        developerId: 'd1',
        title: 'Mzansi App',
        description: 'Cool',
        techStack: ['React'],
        stage: 'building',
        supportRequired: '',
        milestones: [],
        isCompleted: false,
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ];
    mockAxios.get.mockReturnValue(ok({ projects }));

    const result = await projectsApi.getAll();

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Mzansi App');
  });
});

describe('projectsApi.getById', () => {
  it('calls GET /projects/:id', async () => {
    mockAxios.get.mockReturnValue(
      ok({
        id: '5',
        title: 'Test',
        developerId: 'd1',
        description: '',
        techStack: [],
        stage: 'planning',
        supportRequired: '',
        milestones: [],
        isCompleted: false,
        createdAt: '',
      }),
    );

    await projectsApi.getById('5');

    expect(mockAxios.get).toHaveBeenCalledWith('/projects/5');
  });
});

describe('projectsApi.create', () => {
  const payload = {
    title: 'New Build',
    description: 'A great project',
    techStack: ['React', 'Node'],
    stage: 'planning' as const,
    supportRequired: 'Need a designer',
  };

  it('calls POST /projects with the payload', async () => {
    mockAxios.post.mockReturnValue(
      ok({
        id: '2',
        developerId: 'd1',
        ...payload,
        milestones: [],
        isCompleted: false,
        createdAt: '',
      }),
    );

    await projectsApi.create(payload);

    expect(mockAxios.post).toHaveBeenCalledWith('/projects', payload);
  });

  it('returns the newly created project', async () => {
    mockAxios.post.mockReturnValue(
      ok({
        id: '2',
        developerId: 'd1',
        ...payload,
        milestones: [],
        isCompleted: false,
        createdAt: '',
      }),
    );

    const result = await projectsApi.create(payload);

    expect(result.title).toBe('New Build');
    expect(result.techStack).toEqual(['React', 'Node']);
  });
});

describe('projectsApi.update', () => {
  it('calls PATCH /projects/:id with partial data', async () => {
    mockAxios.patch.mockReturnValue(
      ok({
        id: '3',
        title: 'Updated',
        developerId: 'd1',
        description: '',
        techStack: [],
        stage: 'launched' as const,
        supportRequired: '',
        milestones: [],
        isCompleted: false,
        createdAt: '',
      }),
    );

    await projectsApi.update('3', { title: 'Updated' });

    expect(mockAxios.patch).toHaveBeenCalledWith('/projects/3', { title: 'Updated' });
  });
});

describe('projectsApi.addMilestone', () => {
  it('calls POST /projects/:id/milestones with title and description', async () => {
    mockAxios.post.mockReturnValue(
      ok({ id: 'm1', projectId: '3', title: 'v1.0', description: 'First release', achievedAt: '' }),
    );

    await projectsApi.addMilestone('3', 'v1.0', 'First release');

    expect(mockAxios.post).toHaveBeenCalledWith('/projects/3/milestones', {
      title: 'v1.0',
      description: 'First release',
    });
  });
});

describe('projectsApi.complete', () => {
  it('calls POST /projects/:id/complete', async () => {
    mockAxios.post.mockReturnValue(
      ok({
        project: {
          id: '3',
          isCompleted: true,
          developerId: 'd1',
          title: '',
          description: '',
          techStack: [],
          stage: 'completed' as const,
          supportRequired: '',
          milestones: [],
          createdAt: '',
        },
      }),
    );

    await projectsApi.complete('3');

    expect(mockAxios.post).toHaveBeenCalledWith('/projects/3/complete');
  });

  it('returns the completed project', async () => {
    const project = {
      id: '3',
      isCompleted: true,
      developerId: 'd1',
      title: 'Done',
      description: '',
      techStack: [],
      stage: 'completed' as const,
      supportRequired: '',
      milestones: [],
      createdAt: '',
    };
    mockAxios.post.mockReturnValue(ok({ project }));

    const result = await projectsApi.complete('3');

    expect(result.isCompleted).toBe(true);
  });
});
