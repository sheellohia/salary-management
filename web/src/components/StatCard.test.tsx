import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { StatCard } from './StatCard';

function renderCard(ui: React.ReactNode) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

describe('StatCard', () => {
  it('renders the label and value', () => {
    renderCard(<StatCard label="Active headcount" value="9,873" />);
    expect(screen.getByText('Active headcount')).toBeInTheDocument();
    expect(screen.getByText('9,873')).toBeInTheDocument();
  });

  it('shows a skeleton (and hides the value) while loading', () => {
    renderCard(<StatCard label="Total payroll" value="$1.2B" loading />);
    expect(screen.queryByText('$1.2B')).not.toBeInTheDocument();
  });
});
