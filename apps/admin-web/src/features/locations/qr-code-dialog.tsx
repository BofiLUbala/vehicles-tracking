'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LocationQrCodeDto } from '@/features/locations/types';

export interface QrCodeDialogProps {
  locationName: string;
  qrCode: LocationQrCodeDto;
  onClose: () => void;
}

/** Affiche le jeton signé renvoyé par `POST /locations/:id/generate-qr` sous forme d'image QR,
 * générée côté client (aucune image renvoyée par le backend — seulement le jeton opaque). */
export function QrCodeDialog({ locationName, qrCode, onClose }: QrCodeDialogProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDataUrl(null);
    setError(null);
    QRCode.toDataURL(qrCode.token, { width: 256, margin: 1 })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setError('Impossible de générer le QR code.');
      });
    return () => {
      cancelled = true;
    };
  }, [qrCode.token]);

  return (
    <Card className="w-full max-w-sm" role="dialog" aria-label={`QR code pour ${locationName}`}>
      <CardHeader>
        <CardTitle className="text-sm font-medium">QR code — {locationName}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!error && !dataUrl && <p className="text-sm text-muted-foreground">Génération…</p>}
        {dataUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- data URL générée côté client, pas d'optimisation Next utile
          <img src={dataUrl} alt={`QR code du point ${locationName}`} width={256} height={256} />
        )}
        <div className="flex w-full justify-between gap-2">
          <a
            href={dataUrl ?? undefined}
            download={`qr-${locationName.replace(/\s+/g, '-').toLowerCase()}.png`}
            aria-disabled={!dataUrl}
            className={
              'inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm font-medium ' +
              (dataUrl ? 'hover:bg-muted' : 'pointer-events-none opacity-50')
            }
          >
            Télécharger
          </a>
          <Button type="button" variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
