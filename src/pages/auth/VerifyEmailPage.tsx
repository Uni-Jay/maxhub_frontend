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

const schema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

type FormValues = z.infer<typeof schema>;

export function VerifyEmailPage() {
  const { verifyEmailOtp } = useAuth();
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
      await verifyEmailOtp(values);
      navigate("/auth/login", { replace: true });
    } catch (error: any) {
      setError("root", {
        message: error.response?.data?.message || "OTP verification failed",
      });
    }
  };

  return (
    <AuthShell
      title="Email verification"
      subtitle="Confirm OTP to activate secure workspace access."
    >
      <GlassCard className="w-full">
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <h2 className="font-serif text-3xl text-white">Verify OTP</h2>
          <AppInput label="Email" type="email" error={errors.email?.message} {...register("email")} />
          <AppInput label="6-digit OTP" error={errors.otp?.message} {...register("otp")} />

          {errors.root?.message ? <p className="text-sm text-rose-200">{errors.root.message}</p> : null}

          <AppButton type="submit" loading={isSubmitting}>
            Verify email
          </AppButton>

          <p className="text-sm text-slate-200/80">
            Return to <Link className="underline" to="/auth/login">login</Link>
          </p>
        </form>
      </GlassCard>
    </AuthShell>
  );
}
