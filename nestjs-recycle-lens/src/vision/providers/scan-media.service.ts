import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { randomUUID } from 'node:crypto';
export interface ScanMedia {
  url: string;
  publicId: string;
}
@Injectable()
export class ScanMediaService {
  private readonly logger = new Logger(ScanMediaService.name);
  upload(
    buffer: Buffer,
    folder: 'vision' | 'avatars' = 'vision',
  ): Promise<ScanMedia> {
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    )
      throw new ServiceUnavailableException(
        'Scan image storage is not configured',
      );
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: randomUUID(),
          resource_type: 'image',
          timeout: 20000,
        },
        (error, result) => {
          if (error || !result?.secure_url || !result.public_id)
            return reject(
              new ServiceUnavailableException(
                'Không thể tải ảnh lên. Vui lòng thử lại.',
              ),
            );
          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      );
      stream.on('error', () =>
        reject(new ServiceUnavailableException('Không thể tải ảnh lên')),
      );
      stream.end(buffer);
    });
  }
  async remove(publicId: string) {
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    } catch {
      this.logger.warn(
        'Failed to clean up abandoned scan image; reconcile media storage',
      );
    }
  }
}
