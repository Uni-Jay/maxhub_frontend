import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { AuthShell } from "../../components/layout/AuthShell";
import { AppButton } from "../../components/ui/AppButton";
import { AppInput } from "../../components/ui/AppInput";
import { GlassCard } from "../../components/ui/GlassCard";
import { useAuth } from "../../context/AuthContext";

const schema = z
  .object({
    email: z.string().email(),
    otp: z.string().length(6),
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const {
    register,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    const email = params.get("email");
    const otp = params.get("otp");
    if (email) setValue("email", email);
    if (otp) setValue("otp", otp);
  }, [params, setValue]);

  const onSubmit = async (values: FormValues) => {
    try {
      await resetPassword({ email: values.email, otp: values.otp, newPassword: values.newPassword });
      navigate("/auth/login", { replace: true });
    } catch (error: any) {
      setError("root", {
        message: error.response?.data?.message || "Password reset failed",
      });
    }
  };

  return (
    <AuthShell
      title="Create a new secure password"
      subtitle="Complete reset with OTP verification and return to dashboard access."
    >
      <GlassCard className="w-full">
        <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
          <h2 className="font-serif text-3xl text-white">Reset password</h2>
          <AppInput label="Email" type="email" error={errors.email?.message} {...register("email")} />
          <AppInput label="OTP" error={errors.otp?.message} {...register("otp")} />
          <AppInput label="New password" type="password" error={errors.newPassword?.message} {...register("newPassword")} />
          <AppInput label="Confirm password" type="password" error={errors.confirmPassword?.message} {...register("confirmPassword")} />

          {errors.root?.message ? <p className="text-sm text-rose-200">{errors.root.message}</p> : null}

          <AppButton type="submit" loading={isSubmitting}>
            Reset now
          </AppButton>

          <p className="text-sm text-slate-200/80">
            Back to <Link to="/auth/login" className="underline">login</Link>
          </p>
        </form>
      </GlassCard>
    </AuthShell>
  );
}
