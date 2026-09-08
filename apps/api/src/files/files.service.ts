import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export interface UploadFileInput {
  buffer: Buffer;
  mimeType: string;
  relatedTo: string;
  relatedId: string;
  uploadedById?: string;
}

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
};

const MIN_SIGNED_URL_TTL_SECONDS = 300; // 5 min
const MAX_SIGNED_URL_TTL_SECONDS = 900; // 15 min

/**
 * Stockage binaire (photos de validation d'étape, reçus carburant…) sur un endpoint compatible S3
 * (MinIO en dev/local, voir docker-compose.yml). Seuls la clé du bucket, le hash SHA-256, le type
 * MIME, la taille et le polymorphisme (relatedTo/relatedId) sont persistés en Postgres (table
 * `File`) — jamais le binaire lui-même, jamais d'URL publique permanente.
 */
@Injectable()
export class FilesService implements OnModuleInit {
  private readonly logger = new Logger(FilesService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {
    this.bucket = this.config.get<string>('S3_BUCKET') || 'tracking-vehicles';
    this.s3 = new S3Client({
      endpoint: this.config.get<string>('S3_ENDPOINT') || 'http://localhost:9000',
      region: this.config.get<string>('S3_REGION') || 'us-east-1',
      forcePathStyle: (this.config.get<string>('S3_FORCE_PATH_STYLE') ?? 'true') !== 'false',
      credentials: {
        accessKeyId: this.config.get<string>('S3_ACCESS_KEY') || 'minioadmin',
        secretAccessKey: this.config.get<string>('S3_SECRET_KEY') || 'minioadmin123',
      },
    });
  }

  async onModuleInit() {
    // Crée le bucket s'il n'existe pas encore (idempotent) — pratique en dev/CI contre MinIO frais.
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
      } catch (err) {
        this.logger.warn(`Impossible de créer/vérifier le bucket S3 "${this.bucket}" : ${(err as Error).message}`);
      }
    }
  }

  private extensionFor(mimeType: string): string {
    return MIME_EXTENSIONS[mimeType] || '';
  }

  /**
   * Upload un binaire et persiste la ligne `File`. Déduplication par hash SHA-256 : si un fichier
   * identique existe déjà (même contenu), on réutilise sa clé de bucket (pas de ré-upload S3) et on
   * crée seulement une nouvelle ligne `File` pointant vers cette clé pour la nouvelle relation.
   */
  async uploadFile(input: UploadFileInput) {
    const hash = createHash('sha256').update(input.buffer).digest('hex');
    const existing = await this.prisma.file.findFirst({ where: { hash } });

    const bucketKey = existing ? existing.bucketKey : `${input.relatedTo}/${randomUUID()}${this.extensionFor(input.mimeType)}`;

    if (!existing) {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: bucketKey,
          Body: input.buffer,
          ContentType: input.mimeType,
        }),
      );
    }

    return this.prisma.file.create({
      data: {
        bucketKey,
        hash,
        mimeType: input.mimeType,
        sizeBytes: input.buffer.length,
        relatedTo: input.relatedTo,
        relatedId: input.relatedId,
        uploadedById: input.uploadedById,
      },
    });
  }

  async findOne(id: string) {
    const file = await this.prisma.file.findUnique({ where: { id } });
    if (!file) throw new NotFoundException('Fichier introuvable');
    return file;
  }

  /** URL de téléchargement (GET) signée et à courte durée de vie — jamais d'accès public permanent. */
  async signedGetUrl(fileId: string): Promise<{ url: string; expiresInSeconds: number }> {
    const file = await this.findOne(fileId);
    const configured = Number(this.config.get<string>('FILE_SIGNED_URL_TTL_SECONDS')) || 600;
    const expiresInSeconds = Math.min(MAX_SIGNED_URL_TTL_SECONDS, Math.max(MIN_SIGNED_URL_TTL_SECONDS, configured));

    const url = await getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: this.bucket, Key: file.bucketKey }),
      { expiresIn: expiresInSeconds },
    );
    return { url, expiresInSeconds };
  }
}
