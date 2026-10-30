import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { PlayerCountField } from '../../src/features/landing/PlayerCountField';

afterEach(cleanup);

function Harness({ min, max, initial, error }: { min: number; max: number; initial: string; error?: string }) {
  const [value, setValue] = useState(initial);
  return <PlayerCountField min={min} max={max} value={value} onChange={setValue} error={error} />;
}

describe('PlayerCountField', () => {
  it('uses a segmented radio group for 8 or fewer values with only the allowed numbers', () => {
    render(<Harness min={2} max={4} initial="3" />);
    const group = screen.getByRole('radiogroup', { name: 'Number of players' });
    expect(group).toBeInTheDocument();
    expect(screen.getAllByRole('radio').map((radio) => (radio as HTMLInputElement).value)).toEqual(['2', '3', '4']);
    expect(screen.getByRole('radio', { name: '3' })).toBeChecked();
    expect(screen.getByText(/2 to 4 players\./)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: '4' }));
    expect(screen.getByRole('radio', { name: '4' })).toBeChecked();
  });

  it('still uses the radio group at exactly 8 values and switches to a stepper at 9', () => {
    const { unmount } = render(<Harness min={2} max={9} initial="2" />);
    expect(screen.getAllByRole('radio')).toHaveLength(8);
    unmount();
    render(<Harness min={2} max={10} initial="2" />);
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    expect(screen.getByLabelText('Number of players')).toHaveValue('2');
  });

  it('steps within the range and never past it', () => {
    render(<Harness min={2} max={100} initial="99" />);
    fireEvent.click(screen.getByRole('button', { name: 'More players' }));
    expect(screen.getByLabelText('Number of players')).toHaveValue('100');
    fireEvent.click(screen.getByRole('button', { name: 'More players' }));
    expect(screen.getByLabelText('Number of players')).toHaveValue('100');
    fireEvent.change(screen.getByLabelText('Number of players'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Fewer players' }));
    expect(screen.getByLabelText('Number of players')).toHaveValue('2');
  });

  it('shows the platform limit note when the range reaches 100', () => {
    render(<Harness min={2} max={100} initial="100" />);
    expect(screen.getByText(/2 to 100 players\. Rooms hold at most 100 players\./)).toBeInTheDocument();
  });

  it('does not show the limit note below 100', () => {
    render(<Harness min={2} max={6} initial="4" />);
    expect(screen.queryByText(/at most 100/)).toBeNull();
  });

  it('ties an inline error to the field', () => {
    render(<Harness min={2} max={100} initial="" error="Choose a number of players from 2 to 100." />);
    const input = screen.getByLabelText('Number of players');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input.getAttribute('aria-describedby')).toContain('create-count-error');
    expect(screen.getByText('Choose a number of players from 2 to 100.')).toHaveAttribute('id', 'create-count-error');
  });
});
