import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { FilesModule } from './files.module';
import { FilesService } from './files.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';

describe('FilesService (intégration MinIO réel)', () => {
  let files: FilesService;
  let prisma: PrismaService;
  let moduleRef: any;
  const fileIds: string[] = [];

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, FilesModule],
    }).compile();
    files = moduleRef.get(FilesService);
    prisma = moduleRef.get(PrismaService);
  });

  afterAll(async () => {
    for (const id of fileIds) {
      await prisma.file.delete({ where: { id } }).catch(() => undefined);
    }
    await moduleRef.close();
  });

  it('upload un fichier vers MinIO et persiste la ligne File (hash SHA-256, taille, mimeType)', async () => {
    const buffer = Buffer.from('contenu-de-test-phase2');
    const file = await files.uploadFile({
      buffer,
      mimeType: 'image/jpeg',
      relatedTo: 'test_fixture',
      relatedId: 'fixture-1',
    });
    fileIds.push(file.id);

    expect(file.id).toBeDefined();
    expect(file.sizeBytes).toBe(buffer.length);
    expect(file.mimeType).toBe('image/jpeg');
    expect(file.hash).toHaveLength(64); // sha256 hex
  });

  it('génère une URL signée de téléchargement pour un fichier existant', async () => {
    const buffer = Buffer.from('autre-contenu-de-test');
    const file = await files.uploadFile({ buffer, mimeType: 'image/png', relatedTo: 'test_fixture', relatedId: 'fixture-2' });
    fileIds.push(file.id);

    const { url, expiresInSeconds } = await files.signedGetUrl(file.id);
    expect(url).toMatch(/^https?:\/\//);
    expect(expiresInSeconds).toBeGreaterThan(0);
  });

  it('déduplique par hash : deux uploads du même contenu réutilisent la même clé de bucket', async () => {
    const buffer = Buffer.from('contenu-identique');
    const first = await files.uploadFile({ buffer, mimeType: 'image/jpeg', relatedTo: 'test_fixture', relatedId: 'fixture-3a' });
    const second = await files.uploadFile({ buffer, mimeType: 'image/jpeg', relatedTo: 'test_fixture', relatedId: 'fixture-3b' });
    fileIds.push(first.id, second.id);

    expect(second.bucketKey).toBe(first.bucketKey);
    expect(second.hash).toBe(first.hash);
    expect(second.id).not.toBe(first.id); // deux lignes File distinctes (relations différentes)
  });
});
