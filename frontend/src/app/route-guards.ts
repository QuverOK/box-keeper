import { redirect } from "@tanstack/react-router";
export function getToken(): string | null {
    return localStorage.getItem("access_token");
}
export function requireAuth(redirectPath: string) {
    if (!getToken()) {
        throw redirect({
            to: "/login",
            search: { redirect: redirectPath },
        });
    }
}
export function requireAuthOrGuest(isGuest: boolean, redirectPath: string) {
    if (isGuest)
        return;
    requireAuth(redirectPath);
}
