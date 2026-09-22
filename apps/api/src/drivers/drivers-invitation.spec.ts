import { BadRequestException, ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { DriversService } from './drivers.service';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeEventsService } from '../tracking/realtime-events.service';
import { SmtpEmailSender } from '../auth/senders/smtp-email.sender';

describe('DriversService invitations', () => {
  const driver = {
    id: 'driver-1',
    organizationId: 'org-1',
    firstName: 'Jean',
    lastName: 'Dupont',
    phone: '+243999000000',
    email: 'jean@example.com',
    status: 'ACTIVE',
    passwordHash: null,
    deletedAt: null,
  };
  const findFirst = jest.fn();
  const create = jest.fn();
  const sendDriverInvitation = jest.fn();
  const emitDriverChanged = jest.fn();
  const service = new DriversService(
    { driver: { findFirst, create } } as unknown as PrismaService,
    { emitDriverChanged } as unknown as RealtimeEventsService,
    { sendDriverInvitation } as unknown as SmtpEmailSender,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates the driver before sending the email invitation', async () => {
    findFirst.mockResolvedValue(null);
    create.mockResolvedValue(driver);
    sendDriverInvitation.mockResolvedValue(undefined);

    await service.create('org-1', {
      firstName: 'Jean', lastName: 'Dupont', phone: driver.phone, email: 'JEAN@example.com',
    });

    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({ email: driver.email, organizationId: 'org-1' }) });
    expect(sendDriverInvitation).toHaveBeenCalledWith(driver.email, 'Jean');
    expect(create.mock.invocationCallOrder[0]).toBeLessThan(sendDriverInvitation.mock.invocationCallOrder[0]);
  });

  it('explains how to retry when email delivery fails after creation', async () => {
    findFirst.mockResolvedValue(null);
    create.mockResolvedValue(driver);
    sendDriverInvitation.mockRejectedValue(new Error('SMTP unavailable'));

    await expect(service.create('org-1', {
      firstName: 'Jean', lastName: 'Dupont', phone: driver.phone, email: driver.email,
    })).rejects.toThrow(ServiceUnavailableException);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('resends only to a driver without an active mobile account', async () => {
    findFirst.mockResolvedValueOnce(driver).mockResolvedValueOnce({ ...driver, passwordHash: 'hash' });
    sendDriverInvitation.mockResolvedValue(undefined);

    await expect(service.resendInvitation('org-1', driver.id)).resolves.toEqual({ message: 'Invitation envoyée' });
    expect(sendDriverInvitation).toHaveBeenCalledWith(driver.email, driver.firstName);
    await expect(service.resendInvitation('org-1', driver.id)).rejects.toThrow(BadRequestException);
    expect(sendDriverInvitation).toHaveBeenCalledTimes(1);
  });

  it('rejects an existing phone with an actionable message and sends no email', async () => {
    findFirst.mockResolvedValueOnce(driver).mockResolvedValueOnce(null);

    await expect(service.create('org-1', {
      firstName: 'Marie', lastName: 'Curie', phone: driver.phone, email: 'marie@example.com',
    })).rejects.toThrow(new ConflictException('Ce numéro est déjà utilisé par Jean Dupont. Ouvrez sa fiche dans la liste des chauffeurs.'));
    expect(create).not.toHaveBeenCalled();
    expect(sendDriverInvitation).not.toHaveBeenCalled();
  });
});
