'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { StatusBadge } from '@/components/status-badge';
import { driverFormSchema, inviteDriverSchema, DRIVER_STATUSES, PHONE_REGEX, type DriverFormValues } from '@/features/drivers/schemas';
import type { DriverStatus } from '@/features/drivers/types';
import { driverStatusToLabel } from '@/features/drivers/driver-status';
import type { DriverDto, LinkableDriverDto, LinkDriverInput, InviteDriverInput, ProfileCompleteness } from '@/features/drivers/types';

interface DriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver?: DriverDto | null;
  linkable: LinkableDriverDto[];
  existingDrivers: DriverDto[];
  loadingLinkable?: boolean;
  onLink: (input: LinkDriverInput) => Promise<unknown>;
  onCreate: (input: InviteDriverInput) => Promise<unknown>;
  onUpdate?: (id: string, values: DriverFormValues) => Promise<unknown>;
  submitting?: boolean;
}

function formatMissing(missing: ProfileCompleteness['missing']): string {
  const labels: Record<string, string> = {
    phone: 'Téléphone',
    email: 'E-mail',
    licenseNumber: 'Numéro de permis',
    password: 'Mot de passe mobile',
  };
  return missing.map((m) => labels[m] || m).join(', ');
}

function DriverAccountRow({ driver, onSelect, selected }: { driver: LinkableDriverDto; onSelect: () => void; selected: boolean }) {
  const completenessLabel = driver.profile.complete ? 'Complet' : `Incomplet (${formatMissing(driver.profile.missing)})`;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left p-3 rounded-lg border transition-colors ${
        selected
          ? 'border-primary bg-primary/5'
          : 'border-transparent hover:border-border hover:bg-muted/50'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground truncate">
              {driver.firstName} {driver.lastName}
            </span>
            <StatusBadge tone={driver.status === 'ACTIVE' ? 'success' : 'warning'} dot>
              {driverStatusToLabel(driver.status)}
            </StatusBadge>
            {driver.hasMobileAccount && (
              <StatusBadge tone="info" dot className="text-xs">
                Compte mobile
              </StatusBadge>
            )}
          </div>
          <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
            {driver.phone && <div>📞 {driver.phone}</div>}
            {driver.email && <div>✉️ {driver.email}</div>}
            <div className="flex items-center gap-2 text-xs">
              <span>Profil: {completenessLabel}</span>
              {driver.currentVehicle && (
                <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  Véhicule: {driver.currentVehicle.plateNumber}
                </span>
              )}
            </div>
            {driver.lastSeenAt && (
              <div className="text-xs text-muted-foreground">
                Dernière activité: {new Date(driver.lastSeenAt).toLocaleString()}
              </div>
            )}
          </div>
        </div>
        <Button variant={selected ? 'default' : 'outline'} size="sm" disabled={selected}>
          {selected ? 'Sélectionné' : 'Lier'}
        </Button>
      </div>
    </button>
  );
}

function LinkForm({ driver, onSubmit, onBack, submitting }: { driver: LinkableDriverDto; onSubmit: (values: { licenseNumber: string; status: DriverStatus }) => void; onBack: () => void; submitting?: boolean }) {
  const form = useForm<{ licenseNumber: string; status: DriverStatus }>({
    defaultValues: { licenseNumber: driver.licenseNumber ?? '', status: driver.status },
  });

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="p-3 rounded-lg border border-border bg-muted/30">
        <h4 className="font-medium text-foreground mb-2">Compte sélectionné</h4>
        <div className="text-sm space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{driver.firstName} {driver.lastName}</span>
            <StatusBadge tone={driver.status === 'ACTIVE' ? 'success' : 'warning'} dot>
              {driverStatusToLabel(driver.status)}
            </StatusBadge>
          </div>
          <div className="text-muted-foreground">
            {driver.phone && <div>📞 {driver.phone}</div>}
            {driver.email && <div>✉️ {driver.email}</div>}
          </div>
          <div className="text-xs text-muted-foreground">
            Complétude: {driver.profile.complete ? 'Complet' : `Manquant: ${formatMissing(driver.profile.missing)}`}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="licenseNumber">Numéro de permis (opérationnel)</Label>
        <Input
          id="licenseNumber"
          placeholder="Ex: PERMIS-12345"
          {...form.register('licenseNumber')}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">Statut opérationnel</Label>
        <Select id="status" {...form.register('status')}>
          {DRIVER_STATUSES.map((status) => (
            <option key={status} value={status}>
              {driverStatusToLabel(status)}
            </option>
          ))}
        </Select>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onBack} disabled={submitting}>
          Retour
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Liaison…' : 'Confirmer le rattachement'}
        </Button>
      </DialogFooter>
    </form>
  );
}

const DIAL_CODES = [
  { code: '+243', label: 'RD Congo (+243)' },
  { code: '+242', label: 'Congo (+242)' },
  { code: '+244', label: 'Angola (+244)' },
  { code: '+250', label: 'Rwanda (+250)' },
  { code: '+256', label: 'Ouganda (+256)' },
  { code: '+255', label: 'Tanzanie (+255)' },
  { code: '+260', label: 'Zambie (+260)' },
  { code: '+234', label: 'Nigeria (+234)' },
  { code: '+33', label: 'France (+33)' },
  { code: '+32', label: 'Belgique (+32)' },
  { code: '+44', label: 'Royaume-Uni (+44)' },
  { code: '+1', label: 'États-Unis / Canada (+1)' },
];

function InviteForm({ onSubmit, onBack, submitting, existingDrivers }: { onSubmit: (values: InviteDriverInput) => void; onBack: () => void; submitting?: boolean; existingDrivers: DriverDto[] }) {
  const [dialCodeChoice, setDialCodeChoice] = useState('+243');
  const [otherDialCode, setOtherDialCode] = useState('');
  const [localNumber, setLocalNumber] = useState('');
  const form = useForm<InviteDriverInput>({
    resolver: zodResolver(inviteDriverSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      licenseNumber: '',
      status: 'ACTIVE',
    },
  });

  const dialCode = dialCodeChoice === 'other' ? `+${otherDialCode.replace(/\D/g, '')}` : dialCodeChoice;
  const phone = localNumber ? `${dialCode}${localNumber}` : '';
  const duplicate = PHONE_REGEX.test(phone) ? existingDrivers.find((driver) => driver.phone === phone) : undefined;

  function updatePhone(rawNumber: string, code: string) {
    let digits = rawNumber.replace(/\D/g, '');
    if (rawNumber.trim().startsWith('+') && digits.startsWith(code.slice(1))) {
      digits = digits.slice(code.length - 1);
    }
    // Le zéro national n'appartient pas au numéro international (ex. 0999… devient +243999…).
    digits = digits.replace(/^0+/, '');
    setLocalNumber(digits);
    form.setValue('phone', digits ? `${code}${digits}` : '', {
      shouldValidate: form.formState.isSubmitted || Boolean(form.formState.errors.phone),
    });
  }

  function submit(values: InviteDriverInput) {
    if (duplicate) {
      form.setError('phone', { message: 'Ce numéro appartient déjà à un chauffeur.' });
      return;
    }
    onSubmit(values);
  }

  return (
    <form className="space-y-3" onSubmit={form.handleSubmit(submit)}>
      <div className="p-3 rounded-lg border border-border bg-muted/30">
        <h4 className="font-medium text-foreground mb-2">Invitation (nouveau compte mobile)</h4>
        <p className="text-sm text-muted-foreground">
          Le chauffeur reçoit par e-mail un lien « Activer mon compte ». En l'ouvrant sur son téléphone, l'application mobile s'ouvre et il choisit son mot de passe. Le lien est valable 7 jours.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="firstName">Prénom</Label>
          <Input id="firstName" {...form.register('firstName')} />
          {form.formState.errors.firstName && (
            <p className="text-sm text-destructive">{form.formState.errors.firstName.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Nom</Label>
          <Input id="lastName" {...form.register('lastName')} />
          {form.formState.errors.lastName && (
            <p className="text-sm text-destructive">{form.formState.errors.lastName.message}</p>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="localNumber">Téléphone</Label>
        <div className="flex gap-2">
          <Select
            aria-label="Indicatif téléphonique"
            value={dialCodeChoice}
            onChange={(event) => {
              const choice = event.target.value;
              setDialCodeChoice(choice);
              updatePhone(localNumber, choice === 'other' ? `+${otherDialCode.replace(/\D/g, '')}` : choice);
            }}
            className="w-36 shrink-0 sm:w-44"
          >
            {DIAL_CODES.map(({ code, label }) => <option key={code} value={code}>{label}</option>)}
            <option value="other">Autre indicatif</option>
          </Select>
          <Input
            id="localNumber"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            className="min-w-0 flex-1"
            placeholder="999 000 000"
            value={localNumber}
            onChange={(event) => updatePhone(event.target.value, dialCode)}
            onBlur={() => form.trigger('phone')}
            aria-invalid={Boolean(form.formState.errors.phone || duplicate)}
          />
          <input type="hidden" {...form.register('phone')} />
        </div>
        {dialCodeChoice === 'other' && (
          <Input
            aria-label="Autre indicatif"
            inputMode="numeric"
            placeholder="Indicatif, ex. 49"
            value={otherDialCode}
            onChange={(event) => {
              const code = event.target.value.replace(/\D/g, '').slice(0, 3);
              setOtherDialCode(code);
              updatePhone(localNumber, `+${code}`);
            }}
          />
        )}
        {duplicate ? (
          <p className="text-sm text-destructive" role="alert">
            Ce numéro est déjà utilisé par {duplicate.firstName} {duplicate.lastName}. Ouvrez sa fiche dans la liste au lieu de créer un doublon.
          </p>
        ) : form.formState.errors.phone ? (
          <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
        ) : <p className="text-xs text-muted-foreground">Saisissez le numéro sans indicatif. Le zéro initial est facultatif.</p>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            placeholder="chauffeur@exemple.com"
            aria-invalid={Boolean(form.formState.errors.email)}
            {...form.register('email')}
          />
          {form.formState.errors.email ? (
            <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
          ) : <p className="text-xs text-muted-foreground">Reçoit le lien d'activation.</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="licenseNumber">Numéro de permis</Label>
          <Input id="licenseNumber" {...form.register('licenseNumber')} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">Statut</Label>
        <Select id="status" {...form.register('status')}>
          {DRIVER_STATUSES.map((status) => (
            <option key={status} value={status}>
              {driverStatusToLabel(status)}
            </option>
          ))}
        </Select>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onBack} disabled={submitting}>
          Retour
        </Button>
        <Button type="submit" disabled={submitting || Boolean(duplicate)}>
          {submitting ? 'Envoi…' : 'Ajouter et inviter'}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function DriverDialog({
  open,
  onOpenChange,
  driver,
  linkable,
  existingDrivers,
  loadingLinkable,
  onLink,
  onCreate,
  onUpdate,
  submitting,
}: DriverDialogProps) {
  const isEditing = Boolean(driver);

  const [mode, setMode] = useState<'select' | 'link' | 'invite'>('select');
  const [selectedDriver, setSelectedDriver] = useState<LinkableDriverDto | null>(null);
  const [search, setSearch] = useState('');

  const editForm = useForm<DriverFormValues>({
    resolver: zodResolver(driverFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      licenseNumber: '',
      status: 'ACTIVE',
    },
  });

  useEffect(() => {
    if (!open) return;
    if (isEditing && driver) {
      editForm.reset({
        firstName: driver.firstName ?? '',
        lastName: driver.lastName ?? '',
        phone: driver.phone ?? '',
        email: driver.email ?? '',
        licenseNumber: driver.licenseNumber ?? '',
        status: driver.status ?? 'ACTIVE',
      });
    } else {
      setMode('select');
      setSelectedDriver(null);
      setSearch('');
    }
  }, [open, isEditing, driver, editForm]);

  async function handleEditSubmit(values: DriverFormValues) {
    if (!driver || !onUpdate) return;
    const payload = { ...values, licenseNumber: values.licenseNumber || undefined, email: values.email || undefined };
    await onUpdate(driver.id, payload);
  }

  async function handleLinkSubmit(values: { licenseNumber: string; status: DriverStatus }) {
    if (!selectedDriver) return;
    await onLink({ driverId: selectedDriver.id, licenseNumber: values.licenseNumber || undefined, status: values.status });
    setMode('select');
    setSelectedDriver(null);
  }

  async function handleInviteSubmit(values: InviteDriverInput) {
    await onCreate({ ...values, email: values.email?.trim(), licenseNumber: values.licenseNumber || undefined });
    setMode('select');
  }

  function selectDriver(d: LinkableDriverDto) {
    setSelectedDriver(d);
    setMode('link');
  }

  function startInvite() {
    setMode('invite');
  }

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{isEditing ? 'Modifier le chauffeur' : 'Ajouter un chauffeur'}</DialogTitle>
        {!isEditing && (
          <DialogDescription>
            Rattachez un compte chauffeur existant ou invitez un nouveau chauffeur.
          </DialogDescription>
        )}
      </DialogHeader>

      {isEditing ? (
        <form className="space-y-4" onSubmit={editForm.handleSubmit(handleEditSubmit)}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Prénom</Label>
              <Input id="firstName" {...editForm.register('firstName')} />
              {editForm.formState.errors.firstName && (
                <p className="text-sm text-destructive">{editForm.formState.errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nom</Label>
              <Input id="lastName" {...editForm.register('lastName')} />
              {editForm.formState.errors.lastName && (
                <p className="text-sm text-destructive">{editForm.formState.errors.lastName.message}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input id="phone" placeholder="+243999000000" {...editForm.register('phone')} />
            {editForm.formState.errors.phone && (
              <p className="text-sm text-destructive">{editForm.formState.errors.phone.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" placeholder="chauffeur@exemple.com" {...editForm.register('email')} />
            {editForm.formState.errors.email && (
              <p className="text-sm text-destructive">{editForm.formState.errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="licenseNumber">Numéro de permis</Label>
            <Input id="licenseNumber" {...editForm.register('licenseNumber')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Statut</Label>
            <Select id="status" {...editForm.register('status')}>
              {DRIVER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {driverStatusToLabel(status)}
                </option>
              ))}
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      ) : mode === 'select' ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Compte chauffeur</Label>
            <Input
              type="search"
              placeholder="Rechercher par nom, téléphone, e-mail…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          {loadingLinkable ? (
            <div className="space-y-2" role="status">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-lg border border-border bg-muted/50" />
              ))}
            </div>
          ) : (() => {
            const needle = search.trim().toLowerCase();
            const filtered = needle
              ? linkable.filter((d) => {
                  const hay = `${d.firstName} ${d.lastName} ${d.phone ?? ''} ${d.email ?? ''}`.toLowerCase();
                  return hay.includes(needle);
                })
              : linkable;

            const withAccount = filtered.filter((d) => d.hasMobileAccount);
            const withoutAccount = filtered.filter((d) => !d.hasMobileAccount);

            if (filtered.length === 0) {
              return (
                <div className="text-center py-8 text-muted-foreground">
                  {needle ? (
                    <p>Aucun résultat pour « {search} ».</p>
                  ) : (
                    <>
                      <p>Aucun compte chauffeur éligible dans cette organisation.</p>
                      <p className="text-sm mt-1">Les comptes doivent être ACTIVE et non supprimés.</p>
                    </>
                  )}
                </div>
              );
            }

            return (
              <div className="max-h-96 overflow-y-auto space-y-3 border rounded-lg p-2">
                {withAccount.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1 pt-1">
                      Compte mobile actif ({withAccount.length})
                    </p>
                    {withAccount.map((d) => (
                      <DriverAccountRow
                        key={d.id}
                        driver={d}
                        selected={selectedDriver?.id === d.id}
                        onSelect={() => selectDriver(d)}
                      />
                    ))}
                  </div>
                )}
                {withoutAccount.length > 0 && (
                  <div className="space-y-1">
                    {withAccount.length > 0 && <div className="border-t my-1" />}
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">
                      Sans compte mobile ({withoutAccount.length})
                    </p>
                    {withoutAccount.map((d) => (
                      <DriverAccountRow
                        key={d.id}
                        driver={d}
                        selected={selectedDriver?.id === d.id}
                        onSelect={() => selectDriver(d)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          <div className="border-t pt-4">
            <Button variant="outline" onClick={startInvite} className="w-full">
              Inviter un nouveau chauffeur (sans compte mobile)
            </Button>
          </div>
        </div>
      ) : mode === 'link' ? (
        <LinkForm
          driver={selectedDriver!}
          onSubmit={handleLinkSubmit}
          onBack={() => setMode('select')}
          submitting={submitting}
        />
      ) : (
        <InviteForm
          onSubmit={handleInviteSubmit}
          onBack={() => setMode('select')}
          submitting={submitting}
          existingDrivers={existingDrivers}
        />
      )}
    </Dialog>
  );
}
