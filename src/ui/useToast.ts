import { useContext } from "react";
import { ToastContext } from "./ToastContext";

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      toast: (msg: string) => console.log("[Browser Motion]", msg),
    };
  }
  return ctx;
}
