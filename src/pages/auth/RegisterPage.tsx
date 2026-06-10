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
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.string().min(2),
  department: z.string().min(2),
  position: z.string().min(2),
  phoneNumber: z.string().min(7),
});

type FormValues = z.infer<typeof schema>;

export function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      role: "Staff",
      department: "Kurios Sat",
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const { otpPreview } = await registerUser(values);
      navigate(`/auth/verify-email?email=${encodeURIComponent(values.email)}&otp=${otpPreview}`);
    } catch (error: any) {
      setError("root", {
        message: error.response?.data?.message || "Registration failed",
      });
    }
  };

  return (
    <AuthShell
      title="Register a professional Max Hub account"
      subtitle="Create role-based access for HR, HODs, instructors, accountants, and full enterprise teams."
    >
      <GlassCard className="w-full">
        <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
          <h2 className="font-serif text-3xl text-white">Create account</h2>
          <AppInput label="Full name" error={errors.fullName?.message} {...register("fullName")} />
          <AppInput label="Email" type="email" error={errors.email?.message} {...register("email")} />
          <AppInput label="Password" type="password" error={errors.password?.message} {...register("password")} />
          <AppInput label="Role" error={errors.role?.message} {...register("role")} />
          <AppInput label="Department" error={errors.department?.message} {...register("department")} />
          <AppInput label="Position" error={errors.position?.message} {...register("position")} />
          <AppInput label="Phone number" error={errors.phoneNumber?.message} {...register("phoneNumber")} />

          {errors.root?.message ? <p className="text-sm text-rose-200">{errors.root.message}</p> : null}

          <AppButton type="submit" loading={isSubmitting}>
            Register
          </AppButton>

          <p className="text-sm text-slate-200/80">
            Already registered? <Link className="underline" to="/auth/login">Login</Link>
          </p>
        </form>
      </GlassCard>
    </AuthShell>
  );
}
