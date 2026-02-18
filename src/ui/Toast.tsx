import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { CheckCircle2, XCircle } from "lucide-react";

interface Toast {
  id: number;
  message: string;
  variant: "success" | "error";
}

interface ToastContextValue {
  toast: (message: string, type?: "success" | "error") => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      toast: (msg) => console.log("[Browser Motion]", msg),
    };
  }
  return ctx;
}

const TOAST_DURATION = 4000;

function ToastItem({
  id,
  message,
  variant,
  onDismiss,
}: {
  id: number;
  message: string;
  variant: "success" | "error";
  onDismiss: (id: number) => void;
}) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onDismiss(id), 200);
    }, TOAST_DURATION);
    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  const Icon = variant === "success" ? CheckCircle2 : XCircle;

  return (
    <div
      className={`wm-toast wm-toast-${variant} ${isExiting ? "wm-toast-exit" : ""}`}
      role="status"
      aria-live="polite"
    >
      <span className="wm-toast-icon">
        <Icon size={20} strokeWidth={2} />
      </span>
      <span className="wm-toast-message">{message}</span>
    </div>
  );
}

export function ToastProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: "success" | "error" = "success") => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, message, variant: type }]);
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="wm-toast-container" aria-live="polite">
        {toasts.map((t) => (
          <ToastItem
            key={t.id}
            id={t.id}
            message={t.message}
            variant={t.variant}
            onDismiss={dismissToast}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
