// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OnboardingGuide, { isOnboardingDismissed, onboardingKey } from './OnboardingGuide.tsx';

const USER = 'user-123';

beforeEach(() => {
  localStorage.removeItem(onboardingKey(USER));
});

describe('OnboardingGuide', () => {
  it('renders the 3 steps with an upload CTA', () => {
    render(<OnboardingGuide userId={USER} onUpload={() => {}} />);
    expect(screen.getByText(/first insights in 3 steps/i)).toBeInTheDocument();
    expect(screen.getByText(/upload a statement/i)).toBeInTheDocument();
    expect(screen.getByText(/review ai categories/i)).toBeInTheDocument();
    expect(screen.getByText(/explore insights/i)).toBeInTheDocument();
  });

  it('upload button calls onUpload', async () => {
    const user = userEvent.setup();
    const onUpload = vi.fn();
    render(<OnboardingGuide userId={USER} onUpload={onUpload} />);
    await user.click(screen.getByRole('button', { name: /upload statement/i }));
    expect(onUpload).toHaveBeenCalledTimes(1);
  });

  it('dismiss persists per user and hides the guide', async () => {
    const user = userEvent.setup();
    expect(isOnboardingDismissed(USER)).toBe(false);
    render(<OnboardingGuide userId={USER} onUpload={() => {}} />);
    await user.click(screen.getByRole('button', { name: /dismiss getting started/i }));
    expect(isOnboardingDismissed(USER)).toBe(true);
    expect(screen.queryByText(/first insights in 3 steps/i)).not.toBeInTheDocument();
  });

  it('stays hidden when already dismissed', () => {
    localStorage.setItem(onboardingKey(USER), '1');
    render(<OnboardingGuide userId={USER} onUpload={() => {}} />);
    expect(screen.queryByText(/first insights in 3 steps/i)).not.toBeInTheDocument();
  });
});
