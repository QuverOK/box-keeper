import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./app/router";

createRoot(document.getElementById("root")!).render(
  <RouterProvider router={router} />,
);
