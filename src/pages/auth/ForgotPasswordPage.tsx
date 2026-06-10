import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { AuthShell } from "../../components/layout/AuthShell";
import { AppButton } from "../../components/ui/AppButton";
import { AppInput } from "../../components/ui/AppInput";
import { GlassCard } from "../../components/ui/GlassCard";
import { useAuth } from "../../context/AuthContext";

const schema = z.object({
  email: z.string().email(),
});

type FormValues = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    try {
      const { otpPreview } = await forgotPassword(values.email);
      navigate(
        `/auth/reset-password?email=${encodeURIComponent(values.email)}${
          otpPreview ? `&otp=${encodeURIComponent(otpPreview)}` : ""
        }`
      );
    } catch (error: any) {
      setError("root", {
        message: error.response?.data?.message || "Unable to request reset",
      });
    }
  };

  return (
    <AuthShell
      title="Forgot password"
      subtitle="Request secure OTP reset and regain account access in seconds."
    >
      <GlassCard className="w-full">
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <h2 className="font-serif text-3xl text-white">Reset request</h2>
          <AppInput label="Account email" type="email" error={errors.email?.message} {...register("email")} />

          {errors.root?.message ? <p className="text-sm text-rose-200">{errors.root.message}</p> : null}

          <AppButton type="submit" loading={isSubmitting}>
            Send OTP
          </AppButton>

          <p className="text-sm text-slate-200/80">
            Remembered password? <Link to="/auth/login" className="underline">Login</Link>
          </p>
        </form>
      </GlassCard>
    </AuthShell>
  );
}
