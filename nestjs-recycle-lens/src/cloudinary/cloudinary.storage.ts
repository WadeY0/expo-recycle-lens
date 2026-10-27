import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';



export const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'uploads',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    public_id: file.originalname.split('.')[0],
  }),
});

export async function saveBase64ToCloudinary(base64: string, folder = 'uploads'): Promise<string | undefined> {
  if (!base64?.startsWith('data:image')) return undefined;

  try {
    const match = base64.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
    if (!match) return undefined;

    const ext = match[1];
    const data = match[2];
    const buffer = Buffer.from(data, 'base64');

    const uploadResult = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          format: ext,
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      stream.end(buffer);
    });

    if (uploadResult?.url) {
      const relativePath = uploadResult.url.replace(/^.*\/image\/upload\//, '');
      return relativePath;
    }
    return undefined;
  } catch (err) {
    console.error('Cloudinary upload failed:', err);
    return undefined;
  }
}
