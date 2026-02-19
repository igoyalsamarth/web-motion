import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import styles from "./styles.css?raw";

function stopKeyEventPropagation(host: HTMLElement): void {
  const stopProp = (e: KeyboardEvent) => {
    if (host.contains(e.target as Node)) {
      e.stopPropagation();
    }
  };
  const events = ["keydown", "keyup", "keypress"] as const;
  for (const ev of events) {
    host.addEventListener(ev, stopProp as EventListener);
  }
}

function stopWheelPropagation(host: HTMLElement): void {
  host.addEventListener(
    "wheel",
    (e) => {
      if (host.contains(e.target as Node)) {
        e.stopPropagation();
      }
    },
    { passive: true },
  );
}

const createTopbarContainer = (): {
  host: HTMLDivElement;
  shadowRoot: ShadowRoot;
  mountPoint: HTMLDivElement;
} => {
  const existing = document.getElementById("browser-motion-topbar-root");
  if (existing && existing instanceof HTMLDivElement && existing.shadowRoot) {
    const mount = existing.shadowRoot.getElementById("browser-motion-mount");
    if (mount) {
      return {
        host: existing,
        shadowRoot: existing.shadowRoot,
        mountPoint: mount as HTMLDivElement,
      };
    }
  }

  const host = document.createElement("div");
  host.id = "browser-motion-topbar-root";

  stopKeyEventPropagation(host);
  stopWheelPropagation(host);

  const shadowRoot = host.attachShadow({ mode: "open" });

  const styleEl = document.createElement("style");
  styleEl.textContent = styles;
  shadowRoot.appendChild(styleEl);

  const mountPoint = document.createElement("div");
  mountPoint.id = "browser-motion-mount";
  mountPoint.style.cssText =
    "position:fixed;top:0;left:0;right:0;width:100%;z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:block;margin:0;padding:0;pointer-events:auto;";
  shadowRoot.appendChild(mountPoint);

  const body = document.body;
  if (!body) {
    throw new Error("Browser Motion: document.body not available");
  }
  if (body.firstChild) {
    body.insertBefore(host, body.firstChild);
  } else {
    body.appendChild(host);
  }

  return { host, shadowRoot, mountPoint };
};

export const initTopbar = () => {
  const { shadowRoot, mountPoint } = createTopbarContainer();
  const root = ReactDOM.createRoot(mountPoint);

  let isOpen = false;

  const toggleTopbar = () => {
    isOpen = !isOpen;
    updatePageLayout();
    renderTopbar();
  };

  const closeTopbar = () => {
    isOpen = false;
    updatePageLayout();
    renderTopbar();
  };

  const updatePageLayout = () => {
    const body = document.body;

    if (isOpen) {
      setTimeout(() => {
        const topbarElement = shadowRoot.querySelector(".wm-topbar");
        if (topbarElement instanceof HTMLElement && topbarElement.offsetHeight > 0) {
          body.style.paddingTop = `${topbarElement.offsetHeight}px`;
          body.style.transition = "padding-top 200ms ease-in-out";
        } else {
          body.style.paddingTop = "400px";
          body.style.transition = "padding-top 200ms ease-in-out";
        }
      }, 50);
    } else {
      body.style.paddingTop = "";
      body.style.transition = "padding-top 200ms ease-in-out";
    }
  };

  const renderTopbar = () => {
    root.render(
      <React.StrictMode>
        <App isOpen={isOpen} onClose={closeTopbar} />
      </React.StrictMode>,
    );
  };

  renderTopbar();

  document.addEventListener(
    "keydown",
    (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "i") {
        e.preventDefault();
        e.stopPropagation();
        toggleTopbar();
      }
    },
    true,
  );

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "TOGGLE_TOPBAR") {
      toggleTopbar();
    }
  });

  (
    window as Window & {
      __browserMotionToggleTopbar?: () => void;
    }
  ).__browserMotionToggleTopbar = toggleTopbar;
};
