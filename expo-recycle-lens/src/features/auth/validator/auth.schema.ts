import { z } from "zod";
export const emailSchema = z.string().trim().email("Email không hợp lệ");
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});
export type SignInFormValues = z.infer<typeof signInSchema>;
export const signUpSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập họ tên")
      .max(100, "Tên tối đa 100 ký tự"),
    email: emailSchema,
    age: z
      .number()
      .int("Tuổi phải là số nguyên")
      .min(1, "Tuổi từ 1 đến 120")
      .max(120, "Tuổi từ 1 đến 120")
      .optional(),
    password: z
      .string()
      .min(8, "Mật khẩu cần ít nhất 8 ký tự")
      .max(72, "Mật khẩu tối đa 72 ký tự"),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });
export type SignUpFormValues = z.infer<typeof signUpSchema>;
export const resetPasswordSchema = z
  .object({
    userId: z.string().uuid("Liên kết đặt lại mật khẩu không hợp lệ"),
    otpCode: z.string().regex(/^\d{6}$/, "Mã xác nhận gồm 6 chữ số"),
    password: z
      .string()
      .min(8, "Mật khẩu cần ít nhất 8 ký tự")
      .max(72, "Mật khẩu tối đa 72 ký tự"),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });
