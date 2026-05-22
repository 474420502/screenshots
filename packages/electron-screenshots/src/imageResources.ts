import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

export interface ScreenshotsImageResource {
  token: string;
  filePath: string;
  mimeType: string;
  size: number;
  createdAt: number;
}

export interface CreateImageResourceOptions {
  directory?: string;
  fileNamePrefix?: string;
  mimeType?: string;
}

export type ImageResourceInput = Buffer | ArrayBuffer | Uint8Array | string;

const defaultDirectory = path.join(tmpdir(), '474420502-screenshots');
const defaultMimeType = 'image/png';
const dataUrlPattern = /^data:([^;]+);base64,(.+)$/;

const mimeTypeExtensions: Record<string, string> = {
  'image/bmp': 'bmp',
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
};

function sanitizeFileNamePrefix(prefix: string | undefined): string {
  const sanitized = (prefix ?? 'screenshot')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return sanitized || 'screenshot';
}

function getFileExtension(mimeType: string): string {
  return mimeTypeExtensions[mimeType.toLowerCase()] ?? 'png';
}

function parseImageResourceInput(
  input: ImageResourceInput,
  options: CreateImageResourceOptions | undefined,
): { buffer: Buffer; mimeType: string } {
  if (typeof input === 'string') {
    const match = input.match(dataUrlPattern);

    if (!match?.[1] || !match[2]) {
      throw new Error(
        'Image resource string inputs must be base64 data URLs.',
      );
    }

    return {
      buffer: Buffer.from(match[2], 'base64'),
      mimeType: match[1] || defaultMimeType,
    };
  }

  if (input instanceof ArrayBuffer) {
    return {
      buffer: Buffer.from(input),
      mimeType: options?.mimeType ?? defaultMimeType,
    };
  }

  return {
    buffer: Buffer.from(input),
    mimeType: options?.mimeType ?? defaultMimeType,
  };
}

export class ImageResourceStore {
  private resources = new Map<string, ScreenshotsImageResource>();

  public async create(
    input: ImageResourceInput,
    options?: CreateImageResourceOptions,
  ): Promise<ScreenshotsImageResource> {
    const { buffer, mimeType } = parseImageResourceInput(input, options);
    const token = randomUUID();
    const fileNamePrefix = sanitizeFileNamePrefix(options?.fileNamePrefix);
    const directory = options?.directory ?? defaultDirectory;
    const fileExtension = getFileExtension(mimeType);
    const filePath = path.join(
      directory,
      `${fileNamePrefix}-${token}.${fileExtension}`,
    );

    await mkdir(directory, { recursive: true });
    await writeFile(filePath, buffer);

    const resource = {
      token,
      filePath,
      mimeType,
      size: buffer.length,
      createdAt: Date.now(),
    };

    this.resources.set(token, resource);
    return resource;
  }

  public get(token: string): ScreenshotsImageResource | undefined {
    return this.resources.get(token);
  }

  public getPath(token: string): string | undefined {
    return this.resources.get(token)?.filePath;
  }

  public async revoke(token: string): Promise<boolean> {
    const resource = this.resources.get(token);

    if (!resource) {
      return false;
    }

    this.resources.delete(token);
    await rm(resource.filePath, { force: true });
    return true;
  }

  public async clear(): Promise<void> {
    await Promise.all(
      [...this.resources.keys()].map((token) => this.revoke(token)),
    );
  }
}