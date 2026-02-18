import Topbar from "./Topbar";
import { SelectorPicker } from "./SelectorPicker";
import { ToastProvider } from "./Toast";

interface AppProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function App({ isOpen, onClose }: AppProps) {
  return (
    <ToastProvider>
      <Topbar isOpen={isOpen} onClose={onClose} />
      <SelectorPicker />
    </ToastProvider>
  );
}
