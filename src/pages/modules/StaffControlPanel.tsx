import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { AppButton } from "../../components/ui/AppButton";
import { GlassCard } from "../../components/ui/GlassCard";

type StaffRow = {
  id: string;
  fullName: string;
  role: string;
  department: string;
  email: string;
  isActive?: boolean;
};

export function StaffControlPanel() {
  const queryClient = useQueryClient();

  const staffQuery = useQuery({
    queryKey: ["staff-list"],
    queryFn: async () => {
      const response = await api.get("/users/staff");
      return response.data.data as StaffRow[];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (input: { staffId: string; isActive: boolean }) => {
      await api.patch(`/users/staff/${input.staffId}/status`, {
        isActive: input.isActive,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-list"] });
    },
  });

  return (
    <GlassCard>
      <h3 className="font-serif text-2xl text-white">Staff Activation Control</h3>
      <p className="mt-1 text-sm text-slate-300">Super Admin can deactivate exited/fired staff and reactivate when needed.</p>

      <div className="mt-4 space-y-3">
        {(staffQuery.data || []).map((staff) => {
          const isActive = staff.isActive !== false;
          return (
            <div key={staff.id} className="rounded-xl border border-white/20 bg-white/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{staff.fullName}</p>
                  <p className="text-xs text-slate-300">{staff.role} • {staff.department} • {staff.email}</p>
                  <p className={`mt-1 text-xs ${isActive ? "text-emerald-300" : "text-rose-300"}`}>
                    {isActive ? "Active" : "Deactivated"}
                  </p>
                </div>
                <div className="w-36">
                  <AppButton
                    type="button"
                    loading={toggleMutation.isPending}
                    onClick={() =>
                      toggleMutation.mutate({
                        staffId: staff.id,
                        isActive: !isActive,
                      })
                    }
                    className={isActive ? "bg-gradient-to-r from-rose-700 via-rose-600 to-rose-500" : "bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500"}
                  >
                    {isActive ? "Deactivate" : "Activate"}
                  </AppButton>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
