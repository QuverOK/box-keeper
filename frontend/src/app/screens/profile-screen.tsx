import { useNavigate } from "@tanstack/react-router";
import { Profile } from "@/components/Profile";
import { useUserStore } from "@/entities/user/model/store";
export function ProfileScreen() {
  const navigate = useNavigate();
  const { user, clearAuth } = useUserStore();
  return (
    <Profile
      userEmail={user?.email ?? ""}
      onLogout={() => {
        clearAuth();
        navigate({ to: "/login" });
      }}
      onBack={() => navigate({ to: "/dashboard" })}
    />
  );
}
