import { useEffect, useState } from "react";
import { NARROW_BREAKPOINT } from "@/shared/lib/responsive";
export function useIsNarrowViewport(): boolean {
    const [isNarrow, setIsNarrow] = useState<boolean | undefined>(undefined);
    useEffect(() => {
        const mql = window.matchMedia(`(max-width: ${NARROW_BREAKPOINT - 1}px)`);
        const onChange = () => setIsNarrow(window.innerWidth < NARROW_BREAKPOINT);
        mql.addEventListener("change", onChange);
        setIsNarrow(window.innerWidth < NARROW_BREAKPOINT);
        return () => mql.removeEventListener("change", onChange);
    }, []);
    return !!isNarrow;
}
