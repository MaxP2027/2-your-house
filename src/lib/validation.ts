import { z } from "zod";

const email = z
  .string()
  .trim()
  .email("Enter a valid email address.")
  .max(254)
  .toLowerCase();
export const signupSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, "Enter your full name.")
      .max(100, "Use 100 characters or fewer."),
    email,
    password: z.string().min(12, "Use at least 12 characters.").max(128),
    confirmPassword: z.string().min(1, "Confirm your password.").max(128),
    role: z.enum(["customer", "technician"]),
  })
  .strict()
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords must match.",
    path: ["confirmPassword"],
  });
export const loginSchema = z
  .object({ email, password: z.string().min(1).max(128) })
  .strict();
export const resendSchema = z.object({ email }).strict();
export type SignupInput = z.infer<typeof signupSchema>;
