import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../../context/AuthContext';

// ---------------------------------------------------------------------------
// Mock authApi so no real HTTP requests are made
// ---------------------------------------------------------------------------

vi.mock('../../services/api', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
  },
}));

// Import AFTER vi.mock so we get the mocked version
import { authApi } from '../../services/api';
const mockAuthApi = authApi as {
  login: ReturnType<typeof vi.fn>;
  register: ReturnType<typeof vi.fn>;
};

// ---------------------------------------------------------------------------
// Consumer component — exposes context values to assertions
// ---------------------------------------------------------------------------

const AuthConsumer = () => {
  const { user, token, isLoading, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="token">{token ?? 'none'}</span>
      <span data-testid="username">{user?.username ?? 'none'}</span>
      <button onClick={() => login('test@test.com', 'pass123')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

const renderWithAuth = () =>
  render(
    <AuthProvider>
      <AuthConsumer />
    </AuthProvider>,
  );

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('AuthContext', () => {
  // --- Initial state ---

  it('starts with no user and no token', async () => {
    renderWithAuth();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('username')).toHaveTextContent('none');
    expect(screen.getByTestId('token')).toHaveTextContent('none');
  });

  it('resolves isLoading to false on mount', async () => {
    renderWithAuth();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
  });

  // --- Restoring session from localStorage ---

  it('restores an existing session from localStorage on mount', async () => {
    const storedUser = { id: '1', username: 'neo', email: 'neo@mzansi.co.za' };
    localStorage.setItem('mb_token', 'stored_tok');
    localStorage.setItem('mb_user', JSON.stringify(storedUser));

    renderWithAuth();

    await waitFor(() => expect(screen.getByTestId('username')).toHaveTextContent('neo'));
    expect(screen.getByTestId('token')).toHaveTextContent('stored_tok');
  });

  it('stays unauthenticated when localStorage is empty', async () => {
    renderWithAuth();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('username')).toHaveTextContent('none');
    expect(screen.getByTestId('token')).toHaveTextContent('none');
  });

  it('only restores session when BOTH mb_token and mb_user are present', async () => {
    // Only token stored, no user
    localStorage.setItem('mb_token', 'orphan_tok');

    renderWithAuth();

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('username')).toHaveTextContent('none');
  });

  // --- login() ---

  it('sets user and token in state after a successful login()', async () => {
    mockAuthApi.login.mockResolvedValue({
      token: 'tok_abc',
      developer: { id: '1', username: 'neo', email: 'neo@mzansi.co.za' },
    });

    renderWithAuth();
    await userEvent.click(screen.getByRole('button', { name: /^login$/i }));

    await waitFor(() => expect(screen.getByTestId('username')).toHaveTextContent('neo'));
    expect(screen.getByTestId('token')).toHaveTextContent('tok_abc');
  });

  it('persists mb_token and mb_user to localStorage after login()', async () => {
    const developer = { id: '1', username: 'neo', email: 'neo@mzansi.co.za' };
    mockAuthApi.login.mockResolvedValue({ token: 'tok_abc', developer });

    renderWithAuth();
    await userEvent.click(screen.getByRole('button', { name: /^login$/i }));

    await waitFor(() => expect(localStorage.getItem('mb_token')).toBe('tok_abc'));
    expect(JSON.parse(localStorage.getItem('mb_user')!)).toEqual(developer);
  });

  it('calls authApi.login with the correct email and password', async () => {
    mockAuthApi.login.mockResolvedValue({
      token: 'tok_abc',
      developer: { id: '1', username: 'neo', email: 'neo@mzansi.co.za' },
    });

    renderWithAuth();
    await userEvent.click(screen.getByRole('button', { name: /^login$/i }));

    await waitFor(() => expect(mockAuthApi.login).toHaveBeenCalledWith('test@test.com', 'pass123'));
  });

  // --- logout() ---

  it('clears user and token from state after logout()', async () => {
    mockAuthApi.login.mockResolvedValue({
      token: 'tok_abc',
      developer: { id: '1', username: 'neo', email: 'neo@mzansi.co.za' },
    });

    renderWithAuth();
    await userEvent.click(screen.getByRole('button', { name: /^login$/i }));
    await waitFor(() => expect(screen.getByTestId('username')).toHaveTextContent('neo'));

    await userEvent.click(screen.getByRole('button', { name: /^logout$/i }));

    expect(screen.getByTestId('username')).toHaveTextContent('none');
    expect(screen.getByTestId('token')).toHaveTextContent('none');
  });

  it('removes mb_token and mb_user from localStorage on logout()', async () => {
    mockAuthApi.login.mockResolvedValue({
      token: 'tok_abc',
      developer: { id: '1', username: 'neo', email: 'neo@mzansi.co.za' },
    });

    renderWithAuth();
    await userEvent.click(screen.getByRole('button', { name: /^login$/i }));
    await waitFor(() => expect(localStorage.getItem('mb_token')).toBe('tok_abc'));

    await userEvent.click(screen.getByRole('button', { name: /^logout$/i }));

    expect(localStorage.getItem('mb_token')).toBeNull();
    expect(localStorage.getItem('mb_user')).toBeNull();
  });

  // --- useAuth guard ---

  it('throws when useAuth is used outside of AuthProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<AuthConsumer />)).toThrow('useAuth must be used within AuthProvider');
    spy.mockRestore();
  });
});
