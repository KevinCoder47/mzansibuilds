import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import NewProject from '../../pages/NewProject';

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
    create: vi.fn(),
    getAll: vi.fn(),
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
// Helpers
// ---------------------------------------------------------------------------

const renderNewProject = () =>
  render(
    <MemoryRouter initialEntries={['/projects/new']}>
      <Routes>
        <Route path="/projects/new" element={<NewProject />} />
        <Route path="/feed" element={<div>Feed</div>} />
      </Routes>
    </MemoryRouter>,
  );

const createdProject = {
  id: 'proj-new',
  developerId: 'dev-1',
  title: 'My Awesome Build',
  description: 'A detailed description.',
  techStack: ['React'],
  stage: 'planning' as const,
  supportRequired: '',
  milestones: [],
  isCompleted: false,
  createdAt: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// Helper: add a tech stack item via the UI
// The tech input is unlabelled; find it by placeholder text.
// ---------------------------------------------------------------------------
const addTechItem = async (tech: string) => {
  const techInput = screen.getByPlaceholderText(/react, node/i);
  await userEvent.type(techInput, tech);
  await userEvent.click(screen.getByRole('button', { name: /^add$/i }));
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockProjectsApi.create.mockResolvedValue(createdProject);
});

describe('NewProject page – rendering', () => {
  // Page heading text is "Log Your Build"
  it('renders a page heading', () => {
    renderNewProject();
    expect(screen.getByRole('heading', { name: /log your build/i })).toBeInTheDocument();
  });

  it('renders a title input', () => {
    renderNewProject();
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
  });

  it('renders a description input or textarea', () => {
    renderNewProject();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  });

  // Submit button text is "Log My Build →"
  it('renders a submit button', () => {
    renderNewProject();
    expect(screen.getByRole('button', { name: /log my build/i })).toBeInTheDocument();
  });
});

describe('NewProject page – validation', () => {
  // The component uses JavaScript validation for the tech stack
  // (title/description use HTML5 required which jsdom does not enforce).
  it('shows an error when no tech stack items have been added', async () => {
    renderNewProject();

    await userEvent.type(screen.getByLabelText(/title/i), 'My Build');
    await userEvent.type(screen.getByLabelText(/description/i), 'A detailed description.');

    // Submit without adding any tech — triggers the JS validation guard
    await userEvent.click(screen.getByRole('button', { name: /log my build/i }));

    expect(await screen.findByText(/technology|tech stack/i)).toBeInTheDocument();
    expect(mockProjectsApi.create).not.toHaveBeenCalled();
  });
});

describe('NewProject page – successful submission', () => {
  it('calls projectsApi.create() with at least title, description, and techStack', async () => {
    renderNewProject();

    await userEvent.type(screen.getByLabelText(/title/i), 'My Awesome Build');
    await userEvent.type(screen.getByLabelText(/description/i), 'A detailed description.');
    await addTechItem('React');

    await userEvent.click(screen.getByRole('button', { name: /log my build/i }));

    await waitFor(() => expect(mockProjectsApi.create).toHaveBeenCalledOnce());

    const payload = mockProjectsApi.create.mock.calls[0][0];
    expect(payload.title).toBe('My Awesome Build');
    expect(payload.description).toBe('A detailed description.');
    expect(payload.techStack).toContain('React');
  });

  it('navigates to /feed after a successful project creation', async () => {
    renderNewProject();

    await userEvent.type(screen.getByLabelText(/title/i), 'My Awesome Build');
    await userEvent.type(screen.getByLabelText(/description/i), 'A detailed description.');
    await addTechItem('React');

    await userEvent.click(screen.getByRole('button', { name: /log my build/i }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith(expect.stringMatching(/\/feed/)));
  });
});

describe('NewProject page – failed submission', () => {
  it('shows an error message when projectsApi.create() throws', async () => {
    mockProjectsApi.create.mockRejectedValue(new Error('Server error'));
    renderNewProject();

    await userEvent.type(screen.getByLabelText(/title/i), 'My Build');
    await userEvent.type(screen.getByLabelText(/description/i), 'A detailed description.');
    await addTechItem('React');

    await userEvent.click(screen.getByRole('button', { name: /log my build/i }));

    expect(
      await screen.findByText(/error|failed|try again|something went wrong/i),
    ).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('disables the submit button while the request is pending', async () => {
    mockProjectsApi.create.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 500)),
    );
    renderNewProject();

    await userEvent.type(screen.getByLabelText(/title/i), 'My Build');
    await userEvent.type(screen.getByLabelText(/description/i), 'A detailed description.');
    await addTechItem('React');

    await userEvent.click(screen.getByRole('button', { name: /log my build/i }));

    // While loading the button text changes to "Logging build..."
    expect(screen.getByRole('button', { name: /logging build/i })).toBeDisabled();
  });
});
