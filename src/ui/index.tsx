import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

const createTopbarContainer = () => {
  const existing = document.getElementById("browser-motion-topbar-root");
  if (existing) {
    return existing;
  }

  const container = document.createElement("div");
  container.id = "browser-motion-topbar-root";

  if (document.body.firstChild) {
    document.body.insertBefore(container, document.body.firstChild);
  } else {
    document.body.appendChild(container);
  }

  return container;
};

export const initTopbar = () => {
  const container = createTopbarContainer();
  const root = ReactDOM.createRoot(container);

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
        const topbarElement = container.querySelector(
          'div[class*="fixed"]',
        ) as HTMLElement;
        if (topbarElement) {
          const topbarHeight = topbarElement.offsetHeight;
          body.style.paddingTop = `${topbarHeight}px`;
          body.style.transition = "padding-top 200ms ease-in-out";
        } else {
          body.style.paddingTop = "400px";
          body.style.transition = "padding-top 200ms ease-in-out";
        }
      }, 10);
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

  (window as any).__browserMotionToggleTopbar = toggleTopbar;
};
