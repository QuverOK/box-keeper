import { useNavigate, useSearch } from "@tanstack/react-router";
import { LoginRegister } from "@/features/auth/ui/LoginRegister";

export function LoginScreen() {
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/login" });

  return (
    <LoginRegister
      onLogin={() => {
        if (redirect?.startsWith("/")) {
          navigate({ href: redirect });
          return;
        }
        navigate({ to: "/dashboard" });
      }}
      onScanQr={() => navigate({ to: "/qr" })}
    />
  );
}
