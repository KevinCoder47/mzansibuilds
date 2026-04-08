import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Navbar from '../../components/Navbar';

// ---------------------------------------------------------------------------
// Mock useAuth — Navbar calls it directly, AuthContext is NOT exported
// ---------------------------------------------------------------------------

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../../context/AuthContext';
const mockUseAuth = vi.mocked(useAuth);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const renderNavbar = (initialPath = '/') =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Navbar />
    </MemoryRouter>,
  );

const loggedOut = () =>
  mockUseAuth.mockReturnValue({
    user: null,
    token: null,
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  });

const loggedIn = (username = 'neo', logout = vi.fn()) =>
  mockUseAuth.mockReturnValue({
    user: { id: '1', username, email: `${username}@mzansi.co.za` },
    token: 'tok_123',
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout,
  });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => vi.clearAllMocks());

describe('Navbar – unauthenticated', () => {
  it('renders the MzansiBuilds brand / logo', () => {
    loggedOut();
    renderNavbar();
    expect(screen.getByText(/mzansibuilds/i)).toBeInTheDocument();
  });

  it('logo links to the home page', () => {
    loggedOut();
    renderNavbar();
    expect(screen.getByRole('link', { name: /mzansibuilds/i })).toHaveAttribute('href', '/');
  });

  it('shows "Log My Build" navigation link', () => {
    loggedOut();
    renderNavbar();
    expect(screen.getByRole('link', { name: /log my build/i })).toBeInTheDocument();
  });

  it('shows "Community" navigation link', () => {
    loggedOut();
    renderNavbar();
    expect(screen.getByRole('link', { name: /community/i })).toBeInTheDocument();
  });

  it('shows "Join the Movement" CTA linking to /register', () => {
    loggedOut();
    renderNavbar();
    const cta = screen.getByRole('link', { name: /join the movement/i });
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveAttribute('href', '/register');
  });

  it('does not show a Logout button when unauthenticated', () => {
    loggedOut();
    renderNavbar();
    expect(screen.queryByRole('button', { name: /logout/i })).not.toBeInTheDocument();
  });

  it('does not show the username when unauthenticated', () => {
    loggedOut();
    renderNavbar();
    expect(screen.queryByText(/@/)).not.toBeInTheDocument();
  });
});

describe('Navbar – authenticated', () => {
  it('displays the logged-in username prefixed with @', () => {
    loggedIn('neo');
    renderNavbar();
    expect(screen.getByText('@neo')).toBeInTheDocument();
  });

  it('shows a "New Project" link when authenticated', () => {
    loggedIn();
    renderNavbar();
    expect(screen.getByRole('link', { name: /new project/i })).toBeInTheDocument();
  });

  it('"New Project" links to /projects/new', () => {
    loggedIn();
    renderNavbar();
    expect(screen.getByRole('link', { name: /new project/i })).toHaveAttribute(
      'href',
      '/projects/new',
    );
  });

  it('shows the Logout button when authenticated', () => {
    loggedIn();
    renderNavbar();
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });

  it('hides "Join the Movement" when authenticated', () => {
    loggedIn();
    renderNavbar();
    expect(screen.queryByRole('link', { name: /join the movement/i })).not.toBeInTheDocument();
  });

  it('calls logout() when the Logout button is clicked', async () => {
    const logout = vi.fn();
    loggedIn('neo', logout);
    renderNavbar();

    await userEvent.click(screen.getByRole('button', { name: /logout/i }));

    expect(logout).toHaveBeenCalledOnce();
  });

  it('still shows "Log My Build" and "Community" links when authenticated', () => {
    loggedIn();
    renderNavbar();
    expect(screen.getByRole('link', { name: /log my build/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /community/i })).toBeInTheDocument();
  });
});

describe('Navbar – active link highlighting', () => {
  it('marks "Log My Build" as active when on /feed', () => {
    loggedIn();
    renderNavbar('/feed');
    expect(screen.getByRole('link', { name: /log my build/i })).toHaveClass('active');
  });

  it('marks "Community" as active when on /celebration', () => {
    loggedIn();
    renderNavbar('/celebration');
    expect(screen.getByRole('link', { name: /community/i })).toHaveClass('active');
  });
});
