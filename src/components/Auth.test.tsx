// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Auth from './Auth.tsx';

// Deterministic regardless of local `.env`: exercise the unconfigured path.
vi.mock('../services/neonClient.ts', () => ({
  client: null,
  authClient: null,
  isNeonConfigured: false,
}));

describe('Auth', () => {
  it('renders the sign-in form with disabled buttons until input', () => {
    render(<Auth />);
    expect(screen.getByText('Finance Dashboard')).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /create account/i })).toBeDisabled();
  });

  it('enables actions once email + password are entered', async () => {
    const user = userEvent.setup();
    render(<Auth />);
    await user.type(screen.getByLabelText(/email address/i), 'a@example.com');
    await user.type(screen.getByLabelText(/password/i), 'secret123');
    expect(screen.getByRole('button', { name: /sign in/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /create account/i })).toBeEnabled();
  });

  it('shows a configuration error when auth is not configured (test env)', async () => {
    const user = userEvent.setup();
    render(<Auth />);
    await user.type(screen.getByLabelText(/email address/i), 'a@example.com');
    await user.type(screen.getByLabelText(/password/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));
    expect(await screen.findByText(/auth not configured/i)).toBeInTheDocument();
  });

  it('modal close button calls onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Auth isModal onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
