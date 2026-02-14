import Topbar from './Topbar';
import { SelectorPicker } from './SelectorPicker';

interface AppProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function App({ isOpen, onClose }: AppProps) {
  return (
    <>
      <Topbar isOpen={isOpen} onClose={onClose} />
      <SelectorPicker />
    </>
  );
}
