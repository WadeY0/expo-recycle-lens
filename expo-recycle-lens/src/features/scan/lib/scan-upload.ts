export const MAX_SCAN_BYTES = 8 * 1024 * 1024;
export interface ScanImageInput {
  uri: string;
  mimeType?: string;
  fileSize?: number;
  file?: File;
}
export function validateScanImage(input: ScanImageInput): string {
  if (!input.uri) throw new Error("Vui lòng chọn ảnh.");
  if (input.fileSize !== undefined && input.fileSize > MAX_SCAN_BYTES)
    throw new Error("Ảnh tối đa 8 MB.");
  const extension = input.uri.split(/[?#]/)[0].split(".").pop()?.toLowerCase();
  const mime =
    input.mimeType ??
    (extension === "png"
      ? "image/png"
      : extension === "webp"
        ? "image/webp"
        : "image/jpeg");
  if (!["image/jpeg", "image/png", "image/webp"].includes(mime))
    throw new Error(
      "Chọn ảnh JPEG, PNG hoặc WebP; chuyển ảnh HEIC trước khi quét.",
    );
  return mime;
}
export async function buildScanForm(
  input: ScanImageInput,
  platform: string,
  field: "image" | "file" = "image",
): Promise<FormData> {
  const mime = validateScanImage(input);
  const form = new FormData();
  if (platform === "web") {
    const blob = input.file ?? (await (await fetch(input.uri)).blob());
    if (!blob.size || blob.size > MAX_SCAN_BYTES)
      throw new Error("Ảnh phải có dung lượng từ 1 byte đến 8 MB.");
    if (!["image/jpeg", "image/png", "image/webp"].includes(blob.type))
      throw new Error("Chọn ảnh JPEG, PNG hoặc WebP.");
    form.append(
      field,
      blob,
      `scan.${blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg"}`,
    );
  } else {
    // React Native's FormData recognizes local URI parts; server decodes actual bytes.
    form.append(field, {
      uri: input.uri,
      name: `scan.${mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg"}`,
      type: mime,
    } as unknown as Blob);
  }
  return form;
}
