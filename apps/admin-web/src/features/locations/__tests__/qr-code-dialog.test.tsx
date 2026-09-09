import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const toDataURLMock = vi.fn();

vi.mock('qrcode', () => ({
  default: { toDataURL: (...args: unknown[]) => toDataURLMock(...args) },
}));

import { QrCodeDialog } from '@/features/locations/qr-code-dialog';
import type { LocationQrCodeDto } from '@/features/locations/types';

const qrCode: LocationQrCodeDto = {
  id: 'qr-1',
  locationId: 'loc-1',
  token: 'signed-token-abc',
  revokedAt: null,
  createdAt: '2026-09-01T10:00:00.000Z',
};

describe('QrCodeDialog', () => {
  it('renders the QR image from the generated data URL, encoding the signed token', async () => {
    toDataURLMock.mockResolvedValue('data:image/png;base64,FAKE');

    render(<QrCodeDialog locationName="Dépôt Nord" qrCode={qrCode} onClose={vi.fn()} />);

    expect(await screen.findByAltText('QR code du point Dépôt Nord')).toHaveAttribute(
      'src',
      'data:image/png;base64,FAKE',
    );
    expect(toDataURLMock).toHaveBeenCalledWith('signed-token-abc', expect.objectContaining({ width: 256 }));
  });

  it('enables the download link once the QR image is generated, with a sensible filename', async () => {
    toDataURLMock.mockResolvedValue('data:image/png;base64,FAKE');

    render(<QrCodeDialog locationName="Dépôt Nord" qrCode={qrCode} onClose={vi.fn()} />);

    const link = await screen.findByRole('link', { name: 'Télécharger' });
    expect(link).toHaveAttribute('href', 'data:image/png;base64,FAKE');
    expect(link).toHaveAttribute('download', 'qr-dépôt-nord.png');
  });

  it('shows an error message when QR generation fails', async () => {
    toDataURLMock.mockRejectedValue(new Error('boom'));

    render(<QrCodeDialog locationName="Dépôt Nord" qrCode={qrCode} onClose={vi.fn()} />);

    expect(await screen.findByText('Impossible de générer le QR code.')).toBeInTheDocument();
  });
});
