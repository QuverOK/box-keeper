import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            staleTime: 30000,
        },
    },
});
interface Props {
    children: ReactNode;
}
export function QueryProvider({ children }: Props) {
    return (<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>);
}
