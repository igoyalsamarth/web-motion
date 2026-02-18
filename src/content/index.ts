// Polyfill for customElements - required in Chrome extension content scripts
// (customElements can be null in production builds without this)
import "@webcomponents/custom-elements";

import type { DomainKeybinds, KeybindAction } from "../types/keybinds";
import { initTopbar } from "../ui/index";

let keySequence = "";
let lastKeyTime = 0;
const KEY_TIMEOUT = 1000;
let siteKeybinds: DomainKeybinds | null = null;

function isDomainKeybinds(value: unknown): value is DomainKeybinds {
  if (!value || typeof value !== "object") return false;
  for (const [key, val] of Object.entries(value)) {
    if (typeof key !== "string") return false;
    if (!val || typeof val !== "object") return false;
    if (!("action" in val) || !("description" in val)) return false;
  }

  return true;
}

function getStorageKey(): string {
  const hostname = window.location.hostname;
  return `keybinds_${hostname}`;
}

async function loadKeybinds(): Promise<void> {
  const storageKey = getStorageKey();
  const hostname = window.location.hostname;

  const result = await chrome.storage.sync.get([storageKey]);

  if (result[storageKey] && isDomainKeybinds(result[storageKey])) {
    siteKeybinds = result[storageKey];
  } else {
    try {
      const response = await fetch(chrome.runtime.getURL("keybinds.json"));
      const config: unknown = await response.json();

      if (config && typeof config === "object") {
        for (const [site, bindings] of Object.entries(config)) {
          if (hostname.includes(site) && isDomainKeybinds(bindings)) {
            siteKeybinds = bindings;
            const saveData: Record<string, DomainKeybinds> = {};
            saveData[storageKey] = bindings;
            await chrome.storage.sync.set(saveData);
            break;
          }
        }
      }
    } catch (error) {
      console.error("Failed to load keybinds:", error);
    }
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "RELOAD_KEYBINDS") {
    void loadKeybinds();
  }
});

window.addEventListener("browser-motion-reload-keybinds", () => {
  void loadKeybinds();
});

void loadKeybinds();

function initWhenReady(): void {
  if (document.body) {
    try {
      initTopbar();
    } catch (err) {
      console.error("Browser Motion: Failed to init topbar", err);
    }
    return;
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWhenReady, { once: true });
  } else {
    requestAnimationFrame(initWhenReady);
  }
}
initWhenReady();

function executeAction(binding: KeybindAction): void {
  switch (binding.action) {
    case "navigate":
      window.location.href = binding.url;
      break;

    case "click": {
      const element = document.querySelector(binding.selector);
      if (element && element instanceof HTMLElement) {
        element.click();
      } else {
        console.warn("Element not found for selector:", binding.selector);
      }
      break;
    }

    case "conditional": {
      const currentPath = window.location.pathname;
      for (const condition of binding.conditions) {
        const pattern = new RegExp(condition.pathPattern);
        if (pattern.test(currentPath)) {
          let conditionAction: KeybindAction;

          if (condition.action === "navigate" && condition.url) {
            conditionAction = {
              description: binding.description,
              action: "navigate",
              url: condition.url,
            };
          } else if (condition.action === "click" && condition.selector) {
            conditionAction = {
              description: binding.description,
              action: "click",
              selector: condition.selector,
            };
          } else if (condition.action === "script" && condition.script) {
            conditionAction = {
              description: binding.description,
              action: "script",
              script: condition.script,
            };
          } else {
            console.warn("Invalid conditional action:", condition);
            continue;
          }

          executeAction(conditionAction);
          break;
        }
      }
      break;
    }

    case "script":
      try {
        const scriptFunction = new Function(binding.script);
        scriptFunction();
      } catch (error) {
        console.error("Script execution failed:", error);
      }
      break;

    default:
      console.warn("Unknown action:", binding);
  }
}

function checkKeybind(): boolean {
  if (!siteKeybinds) return false;

  const binding = siteKeybinds[keySequence];
  if (binding) {
    executeAction(binding);
    return true;
  }

  return false;
}

document.addEventListener(
  "keydown",
  (event: KeyboardEvent) => {
    const target = event.target;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      (target instanceof HTMLElement && target.isContentEditable)
    ) {
      return;
    }

    const currentTime = Date.now();

    if (currentTime - lastKeyTime > KEY_TIMEOUT) {
      keySequence = "";
    }

    if (
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      keySequence += event.key;
      lastKeyTime = currentTime;

      if (checkKeybind()) {
        keySequence = "";
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      } else {
        let hasPartialMatch = false;

        if (siteKeybinds) {
          for (const sequence of Object.keys(siteKeybinds)) {
            if (sequence.startsWith(keySequence)) {
              hasPartialMatch = true;
              break;
            }
          }
        }

        if (hasPartialMatch) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
        } else {
          keySequence = "";
        }
      }
    } else {
      keySequence = "";
    }
  },
  true,
);
