import { createRouter, createRoute, redirect } from "@tanstack/react-router";
import { Route as rootRoute } from "./routes/__root";
import { getToken, requireAuth, requireAuthOrGuest } from "./route-guards";
import {
  LoginScreen,
  DashboardScreen,
  ProfileScreen,
  QrScreen,
  StorageScreen,
  BoxScreen,
  ItemScreen,
} from "./lazy-screens";
const guestSearchSchema = (search: Record<string, unknown>) => ({
  guest:
    search.guest === "1" || search.guest === 1 ? ("1" as const) : undefined,
  highlight:
    typeof search.highlight === "string" ? search.highlight : undefined,
});
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: getToken() ? "/dashboard" : "/login" });
  },
});
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  component: LoginScreen,
});
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  beforeLoad: ({ location }) => {
    requireAuth(location.href);
  },
  component: DashboardScreen,
});
const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  beforeLoad: ({ location }) => {
    requireAuth(location.href);
  },
  component: ProfileScreen,
});
const qrRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/qr",
  component: QrScreen,
});
const qrBoxRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/qr/$boxId",
  beforeLoad: ({ location }) => {
    requireAuth(location.href);
  },
  component: QrScreen,
});
const storageRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/storage/$storageId",
  validateSearch: guestSearchSchema,
  beforeLoad: ({ search, location }) => {
    requireAuthOrGuest(search.guest === "1", location.href);
  },
  component: StorageScreen,
});
const boxRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/storage/$storageId/box/$boxId",
  validateSearch: (search: Record<string, unknown>) => ({
    guest:
      search.guest === "1" || search.guest === 1 ? ("1" as const) : undefined,
  }),
  beforeLoad: ({ search, location }) => {
    requireAuthOrGuest(search.guest === "1", location.href);
  },
  component: BoxScreen,
});
const itemRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/storage/$storageId/box/$boxId/item/$itemId",
  validateSearch: (search: Record<string, unknown>) => ({
    guest:
      search.guest === "1" || search.guest === 1 ? ("1" as const) : undefined,
  }),
  beforeLoad: ({ search, location }) => {
    requireAuthOrGuest(search.guest === "1", location.href);
  },
  component: ItemScreen,
});
const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  dashboardRoute,
  profileRoute,
  qrRoute,
  qrBoxRoute,
  storageRoute,
  boxRoute,
  itemRoute,
]);
export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
});
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
