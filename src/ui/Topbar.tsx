import { useState, useEffect, useRef } from "react";
import { X, Plus, Trash2, Check, Target } from "lucide-react";
import { DEFAULT_KEYBINDS } from "../lib/defaultKeybinds";
import type { DomainKeybinds, KeybindAction } from "../types/keybinds";
import { useToast } from "./Toast";

interface TopbarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Topbar({ isOpen, onClose }: TopbarProps) {
  const toast = useToast();
  const [currentDomain, setCurrentDomain] = useState<string>("");
  const [keybinds, setKeybinds] = useState<DomainKeybinds>({});
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLDivElement>(null);
  const topbarRef = useRef<HTMLDivElement>(null);
  const [isPickingSelector, setIsPickingSelector] = useState(false);

  const [keySequence, setKeySequence] = useState("");
  const [description, setDescription] = useState("");
  const [actionType, setActionType] = useState<"navigate" | "click">(
    "navigate",
  );
  const [actionValue, setActionValue] = useState("");

  const showStatus = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    toast.toast(message, type);
  };

  const loadKeybinds = async (domain: string) => {
    const storageKey = `keybinds_${domain}`;
    const result = await chrome.storage.sync.get([storageKey]);

    if (result[storageKey]) {
      setKeybinds(result[storageKey] as DomainKeybinds);
    } else if (DEFAULT_KEYBINDS[domain]) {
      setKeybinds(DEFAULT_KEYBINDS[domain]);
    } else {
      setKeybinds({} as DomainKeybinds);
    }
  };

  useEffect(() => {
    const domain = window.location.hostname;
    setCurrentDomain(domain);
    void loadKeybinds(domain);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (searchRef.current && !searchRef.current.contains(target)) {
        setSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isOpen && topbarRef.current) {
      const updateBodyPadding = () => {
        const topbarHeight = topbarRef.current?.offsetHeight || 0;
        if (topbarHeight > 0) {
          document.body.style.paddingTop = `${topbarHeight}px`;
          document.body.style.transition = "padding-top 200ms ease-in-out";
        }
      };
      updateBodyPadding();
      const timer = setTimeout(updateBodyPadding, 100);
      const resizeObserver = new ResizeObserver(updateBodyPadding);
      resizeObserver.observe(topbarRef.current);

      return () => {
        clearTimeout(timer);
        resizeObserver.disconnect();
      };
    }
  }, [isOpen, selectedKey, isCreatingNew]);

  const selectKeybind = (key: string, binding: KeybindAction) => {
    setSelectedKey(key);
    setIsCreatingNew(false);
    setSearchOpen(false);
    setKeySequence(key);
    setDescription(binding.description);

    if (binding.action === "navigate" && "url" in binding) {
      setActionType("navigate");
      setActionValue(binding.url);
    } else if (binding.action === "click" && "selector" in binding) {
      setActionType("click");
      setActionValue(binding.selector);
    } else {
      setActionType("navigate");
      setActionValue("");
    }
  };

  const createNewKeybind = () => {
    setIsCreatingNew(true);
    setSelectedKey("");
    setKeySequence("");
    setDescription("");
    setActionType("navigate");
    setActionValue("");
  };

  const saveCurrentKeybind = async () => {
    if (!keySequence || !description || !actionValue) {
      showStatus("Please fill all fields", "error");
      return;
    }

    const newBinding: KeybindAction = {
      description,
      action: actionType,
      ...(actionType === "navigate" && { url: actionValue }),
      ...(actionType === "click" && { selector: actionValue }),
    } as KeybindAction;

    const updatedKeybinds = { ...keybinds, [keySequence]: newBinding };
    setKeybinds(updatedKeybinds);

    try {
      const storageKey = `keybinds_${currentDomain}`;
      const saveData: Record<string, DomainKeybinds> = {};
      saveData[storageKey] = updatedKeybinds;
      await chrome.storage.sync.set(saveData);
      window.dispatchEvent(new CustomEvent("browser-motion-reload-keybinds"));
      setIsCreatingNew(false);
      setSelectedKey("");
      showStatus(
        isCreatingNew ? "Keybind added!" : "Keybind updated!",
        "success",
      );
    } catch (e) {
      showStatus(`Failed to save: ${(e as Error).message}`, "error");
    }
  };

  const deleteKeybind = async () => {
    if (!selectedKey) return;

    const updated = { ...keybinds };
    delete updated[selectedKey];
    setKeybinds(updated);

    try {
      const storageKey = `keybinds_${currentDomain}`;
      const saveData: Record<string, DomainKeybinds> = {};
      saveData[storageKey] = updated;
      await chrome.storage.sync.set(saveData);
      window.dispatchEvent(new CustomEvent("browser-motion-reload-keybinds"));
      setSelectedKey("");
      setIsCreatingNew(false);
      showStatus("Keybind deleted!", "success");
    } catch (e) {
      showStatus(`Failed to delete: ${(e as Error).message}`, "error");
    }
  };

  const startSelectorPicker = () => {
    setIsPickingSelector(true);
    window.dispatchEvent(new CustomEvent("browser-motion-start-picker"));
  };

  const stopSelectorPicker = () => {
    setIsPickingSelector(false);
    window.dispatchEvent(new CustomEvent("browser-motion-stop-picker"));
  };

  useEffect(() => {
    const handleSelectorPicked = (event: Event) => {
      const customEvent = event as CustomEvent<{ selector: string }>;
      setActionValue(customEvent.detail.selector);
      setIsPickingSelector(false);
    };

    window.addEventListener(
      "browser-motion-selector-picked",
      handleSelectorPicked as EventListener,
    );
    return () => {
      window.removeEventListener(
        "browser-motion-selector-picked",
        handleSelectorPicked as EventListener,
      );
    };
  }, []);

  const filteredKeybinds = Object.entries(keybinds).filter(([key, binding]) => {
    const query = searchQuery.toLowerCase();
    return (
      key.toLowerCase().includes(query) ||
      binding.description.toLowerCase().includes(query)
    );
  });

  if (!isOpen) return null;

  return (
    <div
      ref={topbarRef}
      className="wm-topbar"
      style={{ background: "var(--background)" }}
    >
      <div
        className="wm-topbar-header"
        style={{
          background: "linear-gradient(to right, #2563eb, #9333ea)",
        }}
      >
        <div className="wm-topbar-header-row">
          <h2 className="wm-topbar-title">Browser Motion</h2>
          <span className="wm-topbar-arrow">→</span>
          <span
            className="badge secondary"
            style={{
              background: "rgb(255 255 255 / 0.2)",
              color: "white",
              fontFamily: "ui-monospace, monospace",
            }}
          >
            {currentDomain}
          </span>
          <span
            className="badge secondary"
            style={{ background: "rgb(255 255 255 / 0.2)", color: "white" }}
          >
            {Object.keys(keybinds).length} keybinds
          </span>
        </div>
        <div className="wm-topbar-badge-row">
          <button
            type="button"
            onClick={onClose}
            className="wm-topbar-btn wm-topbar-btn-ghost"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
      </div>
      <div className="wm-topbar-body">
        <div className="wm-topbar-sidebar">
          <button
            type="button"
            onClick={createNewKeybind}
            className="wm-topbar-btn wm-topbar-btn-full"
          >
            <Plus size={16} />
            New Keybind
          </button>
          <div className="wm-topbar-search-wrap" ref={searchRef}>
            <label data-field className="wm-topbar-search-field">
              <input
                type="text"
                placeholder="Search by description or key..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
              />
            </label>
            {searchOpen && filteredKeybinds.length > 0 && (
              <article className="card wm-topbar-dropdown">
                <ul className="unstyled">
                  {filteredKeybinds.map(([key, binding]) => (
                    <li key={key}>
                      <button
                        type="button"
                        role="menuitem"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          selectKeybind(key, binding);
                        }}
                        className="wm-topbar-dropdown-item"
                      >
                        <div className="wm-topbar-dropdown-item-content">
                          <span className="wm-topbar-dropdown-item-key">
                            {key}
                          </span>
                          <span className="wm-topbar-dropdown-item-desc">
                            {binding.description}
                          </span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </article>
            )}
            {searchOpen && searchQuery && filteredKeybinds.length === 0 && (
              <article className="card wm-topbar-dropdown wm-topbar-dropdown-empty">
                No keybinds found.
              </article>
            )}
          </div>
          <div className="wm-topbar-actions">
            <button
              type="button"
              onClick={saveCurrentKeybind}
              disabled={
                !keySequence ||
                !description ||
                !actionValue ||
                (!selectedKey && !isCreatingNew)
              }
              className="wm-topbar-btn wm-topbar-btn-full"
            >
              <Check size={16} />
              {isCreatingNew ? "Add Keybind" : "Update Keybind"}
            </button>

            {selectedKey && !isCreatingNew && (
              <button
                type="button"
                onClick={deleteKeybind}
                data-variant="danger"
                className="wm-topbar-btn wm-topbar-btn-icon wm-topbar-danger"
                aria-label="Delete keybind"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>
        <div className="wm-topbar-main">
          {isCreatingNew || selectedKey ? (
            <>
              <div className="wm-topbar-form-grid">
                <label data-field>
                  Key Sequence
                  <input
                    type="text"
                    id="keySequence"
                    value={keySequence}
                    onChange={(e) => setKeySequence(e.target.value)}
                    placeholder="e.g., gh, grp1"
                    style={{
                      fontFamily: "ui-monospace, monospace",
                      fontSize: "0.875rem",
                    }}
                  />
                </label>

                <label data-field>
                  Description
                  <input
                    type="text"
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g., Go to home"
                    style={{ fontFamily: "ui-monospace, monospace" }}
                  />
                </label>
              </div>

              <div className="wm-topbar-form-grid">
                <div data-field>
                  <label htmlFor="actionType">Action Type</label>
                  <select
                    id="actionType"
                    value={actionType}
                    onChange={(e) =>
                      setActionType(e.target.value as "navigate" | "click")
                    }
                    aria-label="Select action type"
                  >
                    <option value="navigate">Navigate to URL</option>
                    <option value="click">Click Element (CSS Selector)</option>
                  </select>
                </div>

                <div data-field>
                  <label htmlFor="actionValue">
                    {actionType === "navigate" && "URL"}
                    {actionType === "click" && "CSS Selector"}
                  </label>
                  <div className="wm-topbar-field-group">
                    <input
                      style={{
                        marginTop: -1,
                      }}
                      type="text"
                      id="actionValue"
                      value={actionValue}
                      onChange={(e) => setActionValue(e.target.value)}
                      placeholder={
                        actionType === "navigate"
                          ? "https://example.com"
                          : ".button-class or #button-id"
                      }
                      disabled={isPickingSelector}
                    />
                    {actionType === "click" && (
                      <button
                        type="button"
                        data-variant={isPickingSelector ? "danger" : undefined}
                        className={`wm-topbar-btn wm-topbar-btn-icon ${!isPickingSelector ? "outline" : ""}`}
                        onClick={
                          isPickingSelector
                            ? stopSelectorPicker
                            : startSelectorPicker
                        }
                        title={
                          isPickingSelector
                            ? "Cancel selector picker"
                            : "Pick element from page"
                        }
                        aria-label={
                          isPickingSelector
                            ? "Cancel selector picker"
                            : "Pick element from page"
                        }
                      >
                        <Target size={16} />
                      </button>
                    )}
                  </div>
                  {isPickingSelector && (
                    <p className="wm-topbar-hint">
                      Hover over elements on the page and click to select
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="wm-topbar-placeholder wm-topbar-text-muted">
              Select a keybind to edit or create a new one
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
