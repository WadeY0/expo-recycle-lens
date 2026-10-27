import { z } from "zod";
export const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập họ tên")
    .max(100, "Tên tối đa 100 ký tự"),
  age: z
    .number()
    .int("Tuổi phải là số nguyên")
    .min(1, "Tuổi từ 1 đến 120")
    .max(120, "Tuổi từ 1 đến 120")
    .nullable(),
});
export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
    newPassword: z
      .string()
      .min(8, "Mật khẩu mới cần ít nhất 8 ký tự")
      .max(72, "Mật khẩu tối đa 72 ký tự"),
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });
