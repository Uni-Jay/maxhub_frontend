import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AppButton } from "../../components/ui/AppButton";
import { AppInput } from "../../components/ui/AppInput";
import { GlassCard } from "../../components/ui/GlassCard";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";

const schema = z.object({
  fullName: z.string().min(2),
  phoneNumber: z.string().min(7),
  address: z.string().min(2),
  bio: z.string().min(2),
});

type FormValues = z.infer<typeof schema>;

export function ProfilePage() {
  const { user, reloadProfile } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: user?.fullName,
      phoneNumber: "",
      address: "",
      bio: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await api.patch("/auth/profile", values);
      await reloadProfile();
    } catch (error: any) {
      setError("root", {
        message: error.response?.data?.message || "Unable to update profile",
      });
    }
  };

  return (
    <GlassCard className="max-w-2xl">
      <h1 className="font-serif text-3xl text-white">Profile management</h1>
      <p className="mt-2 text-sm text-slate-300">Manage personal details, social links, skills, and emergency contacts.</p>

      <form className="mt-5 space-y-3" onSubmit={handleSubmit(onSubmit)}>
        <AppInput label="Full name" error={errors.fullName?.message} {...register("fullName")} />
        <AppInput label="Phone number" error={errors.phoneNumber?.message} {...register("phoneNumber")} />
        <AppInput label="Address" error={errors.address?.message} {...register("address")} />
        <AppInput label="Bio" error={errors.bio?.message} {...register("bio")} />

        {errors.root?.message ? <p className="text-sm text-rose-200">{errors.root.message}</p> : null}

        <AppButton type="submit" loading={isSubmitting} className="max-w-56">
          Save profile
        </AppButton>
      </form>
    </GlassCard>
  );
}
