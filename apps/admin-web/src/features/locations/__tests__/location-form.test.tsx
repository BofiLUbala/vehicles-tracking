import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/features/locations/location-map-picker-client', () => ({
  LocationMapPickerClient: () => null,
}));

import { LocationForm } from '@/features/locations/location-form';

describe('LocationForm validation', () => {
  it('shows required-field errors and does not submit when the form is empty', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(<LocationForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Créer le point' }));

    expect(await screen.findByText('Le nom est requis')).toBeInTheDocument();
    expect(screen.getByText('La latitude est requise')).toBeInTheDocument();
    expect(screen.getByText('La longitude est requise')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects a latitude outside [-90, 90]', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(<LocationForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Nom'), 'Décharge Sud');
    await user.type(screen.getByLabelText('Latitude'), '120');
    await user.type(screen.getByLabelText('Longitude'), '2.35');
    await user.click(screen.getByRole('button', { name: 'Créer le point' }));

    expect(await screen.findByText('La latitude doit être comprise entre -90 et 90')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects a longitude outside [-180, 180]', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(<LocationForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Nom'), 'Décharge Sud');
    await user.type(screen.getByLabelText('Latitude'), '45');
    await user.type(screen.getByLabelText('Longitude'), '200');
    await user.click(screen.getByRole('button', { name: 'Créer le point' }));

    expect(await screen.findByText('La longitude doit être comprise entre -180 et 180')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits with valid values', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(<LocationForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Nom'), 'Décharge Sud');
    await user.type(screen.getByLabelText('Latitude'), '45.5');
    await user.type(screen.getByLabelText('Longitude'), '2.5');
    await user.click(screen.getByRole('button', { name: 'Créer le point' }));

    await screen.findByRole('button', { name: 'Créer le point' });
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Décharge Sud', latitude: 45.5, longitude: 2.5, type: 'COLLECTION' }),
    );
  });
});
