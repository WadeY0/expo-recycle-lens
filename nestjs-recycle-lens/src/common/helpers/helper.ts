import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { v2 as cloudinary } from 'cloudinary';

export function getFullUrl(path: string | null): string | null {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5005';
  if (!path) return null;
  // Nếu path đã là url tuyệt đối thì giữ nguyên
  if (/^https?:\/\//.test(path)) return path;
  return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\/+/, '')}`;
}

export function isBase64Image(str: string): boolean {
  // Kiểm tra xem string có phải là base64 image không
  const regex = /^data:image\/(jpeg|jpg|png|gif|webp);base64,/;
  // Hoặc chỉ là base64 thuần (bắt đầu bằng /9j/ cho JPEG hoặc iVBOR cho PNG)
  const base64Regex = /^[A-Za-z0-9+/]{20,}={0,2}$/;
  return regex.test(str) || (base64Regex.test(str) && (str.startsWith('/9j/') || str.startsWith('iVBOR') || str.startsWith('UklGR')));
}

export async function saveBase64ImageToCloudinary(base64String: string, folder: string = 'challenges'): Promise<string> {
  try {
    let uploadData = base64String;
    
    // Nếu chưa có prefix data:image thì thêm vào
    if (!base64String.startsWith('data:image/')) {
      // Xác định loại ảnh dựa trên base64 header
      let mimeType = 'jpeg'; // default
      if (base64String.startsWith('/9j/')) {
        mimeType = 'jpeg';
      } else if (base64String.startsWith('iVBOR')) {
        mimeType = 'png';
      } else if (base64String.startsWith('UklGR')) {
        mimeType = 'webp';
      } else if (base64String.startsWith('R0lGOD')) {
        mimeType = 'gif';
      }
      
      uploadData = `data:image/${mimeType};base64,${base64String}`;
    }

    // Upload lên Cloudinary
    const result = await cloudinary.uploader.upload(uploadData, {
      folder: folder,
      resource_type: 'image',
      transformation: [
        { width: 1200, height: 800, crop: 'limit' }, // Giới hạn kích thước
        { quality: 'auto:good' }, // Tối ưu chất lượng
        { format: 'auto' } // Tự động chọn format tốt nhất
      ]
    });

    // Trả về URL của ảnh đã upload
    return result.secure_url;
  } catch (error) {
    console.error('Error uploading base64 image to Cloudinary:', error);
    throw new Error('Failed to upload image to Cloudinary');
  }
}

export async function saveBase64Image(base64String: string, uploadDir: string = 'uploads/challenges'): Promise<string> {
  try {
    // Parse base64 string
    const matches = base64String.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
    if (!matches) {
      throw new Error('Invalid base64 format');
    }

    const imageType = matches[1]; // jpeg, png, etc.
    const imageData = matches[2];

    // Tạo tên file unique
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${imageType}`;
    
    // Đảm bảo thư mục tồn tại
    const fullUploadDir = path.join(process.cwd(), uploadDir);
    if (!fs.existsSync(fullUploadDir)) {
      fs.mkdirSync(fullUploadDir, { recursive: true });
    }

    // Lưu file
    const filePath = path.join(fullUploadDir, fileName);
    const buffer = Buffer.from(imageData, 'base64');
    
    // Sử dụng promises để write file
    await fs.promises.writeFile(filePath, buffer);

    // Trả về đường dẫn relative để lưu vào DB
    return `${uploadDir}/${fileName}`;
  } catch (error) {
    console.error('Error saving base64 image:', error);
    throw new Error('Failed to save image');
  }
}
