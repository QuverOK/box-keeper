import { lazy, type ComponentType } from "react";

function lazyScreen(
  loader: () => Promise<Record<string, ComponentType>>,
  exportName: string,
) {
  return lazy(() =>
    loader().then((module) => ({ default: module[exportName] })),
  );
}

export const LoginScreen = lazyScreen(
  () => import("./screens/login-screen"),
  "LoginScreen",
);
export const DashboardScreen = lazyScreen(
  () => import("./screens/dashboard-screen"),
  "DashboardScreen",
);
export const ProfileScreen = lazyScreen(
  () => import("./screens/profile-screen"),
  "ProfileScreen",
);
export const QrScreen = lazyScreen(() => import("./screens/qr-screen"), "QrScreen");
export const StorageScreen = lazyScreen(
  () => import("./screens/storage-screen"),
  "StorageScreen",
);
export const BoxScreen = lazyScreen(
  () => import("./screens/box-screen"),
  "BoxScreen",
);
export const ItemScreen = lazyScreen(
  () => import("./screens/item-screen"),
  "ItemScreen",
);
