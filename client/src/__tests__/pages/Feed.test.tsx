import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Feed from '../../pages/Feed';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'dev-1', username: 'neo', email: 'neo@mzansi.co.za' },
    token: 'tok_123',
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  })),
}));

vi.mock('../../services/api', () => ({
  projectsApi: {
    getAll: vi.fn(),
    complete: vi.fn(),
  },
  authApi: { login: vi.fn(), register: vi.fn() },
}));

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

import { projectsApi } from '../../services/api';
const mockProjectsApi = vi.mocked(projectsApi);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeProject = (overrides = {}) => ({
  id: 'proj-1',
  developerId: 'dev-1',
  title: 'Mzansi Market',
  description: 'Local e-commerce.',
  techStack: ['React'],
  stage: 'building' as const,
  supportRequired: '',
  milestones: [],
  isCompleted: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

const projects = [
  makeProject({ id: 'proj-1', title: 'Mzansi Market', developerId: 'dev-1' }),
  makeProject({ id: 'proj-2', title: 'Ubuntu Tracker', developerId: 'dev-2' }),
  makeProject({
    id: 'proj-3',
    title: 'Joburg Jobs',
    stage: 'launched' as const,
    developerId: 'dev-1',
  }),
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const renderFeed = () =>
  render(
    <MemoryRouter initialEntries={['/feed']}>
      <Routes>
        <Route path="/feed" element={<Feed />} />
        <Route path="/projects/new" element={<div>New Project</div>} />
      </Routes>
    </MemoryRouter>,
  );

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockProjectsApi.getAll.mockResolvedValue(projects as any);
});

describe('Feed page – loading state', () => {
  it('shows a loading indicator before projects arrive', () => {
    mockProjectsApi.getAll.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 500)),
    );
    renderFeed();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});

describe('Feed page – rendering projects', () => {
  it('renders all projects returned from projectsApi.getAll()', async () => {
    renderFeed();
    await waitFor(() => expect(screen.getByText('Mzansi Market')).toBeInTheDocument());
    expect(screen.getByText('Ubuntu Tracker')).toBeInTheDocument();
    expect(screen.getByText('Joburg Jobs')).toBeInTheDocument();
  });

  it('shows an empty-state message when no projects exist', async () => {
    mockProjectsApi.getAll.mockResolvedValue([]);
    renderFeed();
    expect(await screen.findByText(/no projects|empty|be the first|nothing/i)).toBeInTheDocument();
  });

  it('shows an error message when the API call fails', async () => {
    mockProjectsApi.getAll.mockRejectedValue(new Error('Network error'));
    renderFeed();
    expect(
      await screen.findByText(/error|failed|try again|something went wrong/i),
    ).toBeInTheDocument();
  });

  it('calls projectsApi.getAll() on mount', async () => {
    renderFeed();
    await waitFor(() => expect(mockProjectsApi.getAll).toHaveBeenCalledOnce());
  });
});

describe('Feed page – "New Project" CTA', () => {
  // The CTA link text is "+ Log My Build" — not "New Project" / "Create"
  it('shows a button or link to create a new project', async () => {
    renderFeed();
    await waitFor(() => screen.getByText('Mzansi Market'));

    const cta =
      screen.queryByRole('link', { name: /log my build/i }) ??
      screen.queryByRole('button', { name: /log my build/i });
    expect(cta).toBeInTheDocument();
  });
});

describe('Feed page – page heading', () => {
  it('renders a page heading', async () => {
    renderFeed();
    await waitFor(() => screen.getByText('Mzansi Market'));
    expect(screen.getAllByRole('heading').length).toBeGreaterThan(0);
  });
});
