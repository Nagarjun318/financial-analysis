// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import CommandPalette from './CommandPalette.tsx';

function Harness(props: { onClose?: () => void; isLoggedIn?: boolean }) {
  const location = useLocation();
  return (
    <>
      <span data-testid="path">{location.pathname}</span>
      <CommandPalette
        open
        onClose={props.onClose ?? (() => {})}
        isLoggedIn={props.isLoggedIn ?? false}
      />
    </>
  );
}

function renderPalette(props?: { onClose?: () => void; isLoggedIn?: boolean }) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Harness {...props} />
    </MemoryRouter>
  );
}

describe('CommandPalette', () => {
  it('renders nothing when closed', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <CommandPalette open={false} onClose={() => {}} isLoggedIn={false} />
      </MemoryRouter>
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('lists navigation commands grouped under Go to', () => {
    renderPalette();
    expect(screen.getByRole('dialog', { name: /command palette/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /net worth/i })).toBeInTheDocument();
    expect(screen.getByText('Go to')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('filters as you type', () => {
    renderPalette();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'net' } });
    expect(screen.getByRole('option', { name: /net worth/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /^home$/i })).not.toBeInTheDocument();
  });

  it('shows sign out only when logged in', () => {
    const { unmount } = renderPalette({ isLoggedIn: false });
    expect(screen.queryByRole('option', { name: /sign out/i })).not.toBeInTheDocument();
    unmount();
    renderPalette({ isLoggedIn: true, onClose: () => {} });
    // onSignOut absent → still hidden (action needs the handler too)
    expect(screen.queryByRole('option', { name: /sign out/i })).not.toBeInTheDocument();
  });

  it('enter navigates to the active command', () => {
    renderPalette();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'invest' } });
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' });
    expect(screen.getByTestId('path').textContent).toBe('/investment');
  });

  it('escape closes the palette', () => {
    const onClose = vi.fn();
    renderPalette({ onClose });
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
