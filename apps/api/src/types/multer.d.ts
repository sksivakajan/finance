// @types/multer wasn't reachable from this registry at the time this was
// written; multer 2.x doesn't bundle its own types. This declares only the
// slice of its surface actually used in this codebase (diskStorage +
// Express.Multer.File). Safe to delete this file and
// `pnpm add -D @types/multer` once the registry is reachable again — same
// shape, no behavior difference either way.
declare global {
  namespace Express {
    namespace Multer {
      interface File {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        destination: string;
        filename: string;
        path: string;
        buffer: Buffer;
      }
    }
  }
}

declare module 'multer' {
  import type { Request } from 'express';

  type FileFilterCallback = (error: Error | null, acceptFile?: boolean) => void;
  type DiskStorageDestinationCallback = (
    error: Error | null,
    destination: string,
  ) => void;
  type DiskStorageFilenameCallback = (
    error: Error | null,
    filename: string,
  ) => void;

  interface StorageEngine {
    _handleFile: (...args: unknown[]) => void;
    _removeFile: (...args: unknown[]) => void;
  }

  interface DiskStorageOptions {
    destination?: (
      req: Request,
      file: Express.Multer.File,
      callback: DiskStorageDestinationCallback,
    ) => void;
    filename?: (
      req: Request,
      file: Express.Multer.File,
      callback: DiskStorageFilenameCallback,
    ) => void;
  }

  export function diskStorage(options: DiskStorageOptions): StorageEngine;

  export interface Options {
    storage?: StorageEngine;
    limits?: { fileSize?: number };
    fileFilter?: (
      req: Request,
      file: Express.Multer.File,
      callback: FileFilterCallback,
    ) => void;
  }
}

export {};
