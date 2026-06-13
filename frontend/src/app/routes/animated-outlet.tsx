import { Suspense } from "react";
import { Outlet, useRouterState } from "@tanstack/react-router";
import { motion } from "motion/react";

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
    </div>
  );
}

export function AnimatedOutlet() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <Suspense fallback={<RouteFallback />}>
        <Outlet />
      </Suspense>
    </motion.div>
  );
}
