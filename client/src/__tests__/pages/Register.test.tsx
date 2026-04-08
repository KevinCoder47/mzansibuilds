import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Register from '../../pages/Register';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Register page uses useAuth().register(username, email, password)
const mockRegister = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: null,
    token: null,
    isLoading: false,
    login: vi.fn(),
    register: mockRegister,
    logout: vi.fn(),
  })),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const renderRegister = () =>
  render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/feed" element={<div>Feed Page</div>} />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>,
  );

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => vi.clearAllMocks());

describe('Register page – rendering', () => {
  it('renders a register/sign-up heading', () => {
    renderRegister();
    // h1 text is "Join the movement"
    expect(screen.getByRole('heading', { name: /join the movement/i })).toBeInTheDocument();
  });

  it('renders a username input', () => {
    renderRegister();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
  });

  it('renders an email input', () => {
    renderRegister();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('renders a password input', () => {
    renderRegister();
    expect(screen.getAllByLabelText(/password/i).length).toBeGreaterThan(0);
  });

  // Button text is "Start Building →" (not "Register" / "Sign Up")
  it('renders a submit button', () => {
    renderRegister();
    expect(screen.getByRole('button', { name: /start building/i })).toBeInTheDocument();
  });

  it('shows a link back to the login page', () => {
    renderRegister();
    expect(screen.getByRole('link', { name: /login|sign in/i })).toBeInTheDocument();
  });
});

describe('Register page – validation', () => {
  // The form relies on HTML5 required attributes for empty-field validation.
  // jsdom does not enforce browser-native validation, so we assert the
  // required attribute is present on each field.
  it('marks the username field as required', () => {
    renderRegister();
    expect(screen.getByLabelText(/username/i)).toBeRequired();
  });

  it('marks the email field as required', () => {
    renderRegister();
    expect(screen.getByLabelText(/email/i)).toBeRequired();
  });

  it('marks the password field as required', () => {
    renderRegister();
    expect(screen.getAllByLabelText(/password/i)[0]).toBeRequired();
  });
});

describe('Register page – successful registration flow', () => {
  it('calls useAuth().register() with username, email, and password', async () => {
    mockRegister.mockResolvedValue(undefined);
    renderRegister();

    await userEvent.type(screen.getByLabelText(/username/i), 'neo');
    await userEvent.type(screen.getByLabelText(/email/i), 'neo@mzansi.co.za');
    await userEvent.type(screen.getAllByLabelText(/password/i)[0], 'SecurePass1!');

    await userEvent.click(screen.getByRole('button', { name: /start building/i }));

    await waitFor(() => expect(mockRegister).toHaveBeenCalled());
    const [calledUsername, calledEmail, calledPassword] = mockRegister.mock.calls[0];
    expect(calledUsername).toBe('neo');
    expect(calledEmail).toBe('neo@mzansi.co.za');
    expect(calledPassword).toBe('SecurePass1!');
  });

  it('redirects to /feed after a successful registration', async () => {
    mockRegister.mockResolvedValue(undefined);
    renderRegister();

    await userEvent.type(screen.getByLabelText(/username/i), 'neo');
    await userEvent.type(screen.getByLabelText(/email/i), 'neo@mzansi.co.za');
    await userEvent.type(screen.getAllByLabelText(/password/i)[0], 'SecurePass1!');

    await userEvent.click(screen.getByRole('button', { name: /start building/i }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith(expect.stringMatching(/feed/)));
  });
});

describe('Register page – failed registration flow', () => {
  it('shows an error when register() throws', async () => {
    // The component catches the error and falls back to the generic message
    // "Registration failed. Please try again." when there is no response body.
    mockRegister.mockRejectedValue(new Error('Email already in use'));
    renderRegister();

    await userEvent.type(screen.getByLabelText(/username/i), 'dup');
    await userEvent.type(screen.getByLabelText(/email/i), 'dup@mzansi.co.za');
    await userEvent.type(screen.getAllByLabelText(/password/i)[0], 'SecurePass1!');

    await userEvent.click(screen.getByRole('button', { name: /start building/i }));

    expect(
      await screen.findByText(/taken|already|exist|error|failed|registration/i),
    ).toBeInTheDocument();
  });

  it('does not navigate on registration failure', async () => {
    mockRegister.mockRejectedValue(new Error('Server error'));
    renderRegister();

    await userEvent.type(screen.getByLabelText(/username/i), 'neo');
    await userEvent.type(screen.getByLabelText(/email/i), 'neo@mzansi.co.za');
    await userEvent.type(screen.getAllByLabelText(/password/i)[0], 'SecurePass1!');

    await userEvent.click(screen.getByRole('button', { name: /start building/i }));

    await waitFor(() => screen.findByText(/registration failed/i));
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
