import {
  Injectable,
  PayloadTooLargeException,
  UnprocessableEntityException,
} from '@nestjs/common';
import * as sharp from 'sharp';
export const MAX_SCAN_BYTES = 8 * 1024 * 1024;
const MAX_PIXELS = 24_000_000;
@Injectable()
export class ScanImageService {
  async normalize(file: Express.Multer.File | undefined): Promise<Buffer> {
    if (!file?.buffer?.length)
      throw new UnprocessableEntityException('Vui lòng gửi một ảnh.');
    if (file.buffer.length > MAX_SCAN_BYTES)
      throw new PayloadTooLargeException('Ảnh tối đa 8 MB.');
    const declaredMime =
      file.mimetype === 'image/jpg' ? 'image/jpeg' : file.mimetype;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(declaredMime))
      throw new UnprocessableEntityException(
        'Chỉ nhận ảnh JPEG, PNG hoặc WebP.',
      );
    try {
      const image = sharp(file.buffer, {
        limitInputPixels: MAX_PIXELS,
        failOn: 'error',
        animated: false,
      });
      const meta = await image.metadata();
      const mime: Record<string, string> = {
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
      };
      if (
        !meta.width ||
        !meta.height ||
        meta.width < 32 ||
        meta.height < 32 ||
        (meta.pages ?? 1) > 1 ||
        mime[meta.format ?? ''] !== declaredMime
      )
        throw new Error('Invalid image');
      return await image
        .rotate()
        .resize({
          width: 1600,
          height: 1600,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .flatten({ background: '#ffffff' })
        .jpeg({ quality: 85 })
        .toBuffer();
    } catch {
      throw new UnprocessableEntityException(
        'Ảnh hỏng, quá lớn hoặc định dạng không hợp lệ. Hãy chọn ảnh khác.',
      );
    }
  }
}
