import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
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
  password: z.string().min(8),
  otp: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    try {
      await login(values);
      navigate("/app/dashboard", { replace: true });
    } catch (error: any) {
      setError("root", {
        message: error.response?.data?.message || "Unable to login",
      });
    }
  };

  return (
    <AuthShell
      title="Secure access across Kurios Sat, Visa Max, and Bead Max"
      subtitle="Professional workspace for operations, HR, finance, CRM, LMS, inventory, and analytics."
    >
      <GlassCard className="w-full">
        <motion.form
          className="space-y-4"
          onSubmit={handleSubmit(onSubmit)}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="font-serif text-3xl text-white">Welcome back</h2>
          <p className="text-sm text-slate-200/80">Login with email, password, and 2FA token if enabled.</p>

          <AppInput label="Email" type="email" placeholder="you@maxhub.com" error={errors.email?.message} {...register("email")} />
          <AppInput label="Password" type="password" placeholder="********" error={errors.password?.message} {...register("password")} />
          <AppInput label="2FA code (optional)" placeholder="123456" error={errors.otp?.message} {...register("otp")} />

          {errors.root?.message ? <p className="text-sm text-rose-200">{errors.root.message}</p> : null}

          <AppButton type="submit" loading={isSubmitting}>
            Login
          </AppButton>

          <div className="flex justify-between text-sm text-slate-200/80">
            <Link to="/auth/register" className="underline hover:text-white">
              Create account
            </Link>
            <Link to="/auth/forgot-password" className="underline hover:text-white">
              Forgot password?
            </Link>
          </div>
        </motion.form>
      </GlassCard>
    </AuthShell>
  );
}
