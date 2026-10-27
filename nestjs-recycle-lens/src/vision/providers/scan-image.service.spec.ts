import * as sharp from 'sharp';
import { ScanImageService, MAX_SCAN_BYTES } from './scan-image.service';
const service = new ScanImageService();
function file(buffer: Buffer, mimetype = 'image/png') {
  return { buffer, mimetype } as Express.Multer.File;
}
describe('image validation', () => {
  it('decodes and normalizes a valid image to JPEG without metadata', async () => {
    const buffer = await sharp({
      create: { width: 64, height: 64, channels: 3, background: 'white' },
    })
      .png()
      .toBuffer();
    const result = await service.normalize(file(buffer));
    expect((await sharp(result).metadata()).format).toBe('jpeg');
  });
  it('keeps legacy image/jpg uploads working only when bytes decode as JPEG', async () => {
    const jpg = await sharp({
      create: { width: 64, height: 64, channels: 3, background: 'white' },
    })
      .jpeg()
      .toBuffer();
    expect(
      (await sharp(await service.normalize(file(jpg, 'image/jpg'))).metadata())
        .format,
    ).toBe('jpeg');
  });
  it('rejects a missing image', async () => {
    await expect(service.normalize(undefined)).rejects.toThrow();
  });
  it('rejects over-size uploads before decoding', async () => {
    await expect(
      service.normalize(file(Buffer.alloc(MAX_SCAN_BYTES + 1))),
    ).rejects.toThrow('8 MB');
  });
  it('rejects an executable disguised as JPEG', async () => {
    await expect(
      service.normalize(
        file(Buffer.from('<script>bad</script>'), 'image/jpeg'),
      ),
    ).rejects.toThrow();
  });
  it('rejects MIME/byte mismatch', async () => {
    const png = await sharp({
      create: { width: 64, height: 64, channels: 3, background: 'white' },
    })
      .png()
      .toBuffer();
    await expect(service.normalize(file(png, 'image/jpeg'))).rejects.toThrow();
  });
  it('rejects unsupported MIME', async () => {
    await expect(
      service.normalize(file(Buffer.from('gif'), 'image/gif')),
    ).rejects.toThrow();
  });
  it('rejects oversized pixel dimensions even when file bytes are small', async () => {
    const image = await sharp({
      create: { width: 5000, height: 5000, channels: 3, background: 'white' },
    })
      .png()
      .toBuffer();
    await expect(service.normalize(file(image))).rejects.toThrow();
  });
});
