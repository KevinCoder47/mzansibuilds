import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Login from '../../pages/Login';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockLogin = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: null,
    token: null,
    isLoading: false,
    login: mockLogin,
    register: vi.fn(),
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

const renderLogin = () =>
  render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/feed" element={<div>Feed Page</div>} />
      </Routes>
    </MemoryRouter>,
  );

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Login page – rendering', () => {
  // h1 text is "Welcome back", not "Login"
  it('renders a login heading', () => {
    renderLogin();
    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  });

  it('renders an email input', () => {
    renderLogin();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('renders a password input', () => {
    renderLogin();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  // Button text is "Sign In →"
  it('renders a submit button', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows a link to the register page', () => {
    renderLogin();
    expect(screen.getByRole('link', { name: /register|sign up|join/i })).toBeInTheDocument();
  });
});

describe('Login page – validation', () => {
  // The form relies on HTML5 required attributes for empty-field validation.
  // jsdom does not enforce browser-native validation, so we assert the
  // required attribute is present on each field.
  it('marks the email field as required', () => {
    renderLogin();
    expect(screen.getByLabelText(/email/i)).toBeRequired();
  });

  it('marks the password field as required', () => {
    renderLogin();
    expect(screen.getByLabelText(/password/i)).toBeRequired();
  });
});

describe('Login page – successful login flow', () => {
  it('calls useAuth().login() with the entered email and password', async () => {
    mockLogin.mockResolvedValue(undefined);
    renderLogin();

    await userEvent.type(screen.getByLabelText(/email/i), 'neo@mzansi.co.za');
    await userEvent.type(screen.getByLabelText(/password/i), 'correctPass1');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('neo@mzansi.co.za', 'correctPass1'));
  });

  it('redirects to /feed after a successful login', async () => {
    mockLogin.mockResolvedValue(undefined);
    renderLogin();

    await userEvent.type(screen.getByLabelText(/email/i), 'neo@mzansi.co.za');
    await userEvent.type(screen.getByLabelText(/password/i), 'correctPass1');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/feed'));
  });
});

describe('Login page – failed login flow', () => {
  it('displays an error message when login() throws', async () => {
    mockLogin.mockRejectedValue(new Error('Invalid credentials'));
    renderLogin();

    await userEvent.type(screen.getByLabelText(/email/i), 'bad@mzansi.co.za');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrongPass');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/invalid|incorrect|failed|error/i)).toBeInTheDocument();
  });

  it('does not navigate away on a failed login', async () => {
    mockLogin.mockRejectedValue(new Error('Invalid credentials'));
    renderLogin();

    await userEvent.type(screen.getByLabelText(/email/i), 'bad@mzansi.co.za');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrongPass');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => screen.findByText(/invalid|incorrect|failed|error/i));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('disables the submit button while the request is in flight', async () => {
    mockLogin.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 500)));
    renderLogin();

    await userEvent.type(screen.getByLabelText(/email/i), 'neo@mzansi.co.za');
    await userEvent.type(screen.getByLabelText(/password/i), 'correctPass1');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    // While loading, the button text changes to "Signing in..."
    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
  });
});
