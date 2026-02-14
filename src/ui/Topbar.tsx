import { useState, useEffect, useRef } from "react";
import { X, Plus, Trash2, Check, AlertCircle, Target } from "lucide-react";
import { DEFAULT_KEYBINDS } from "../lib/defaultKeybinds";
import type { DomainKeybinds, KeybindAction } from "../types/keybinds";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface TopbarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Topbar({ isOpen, onClose }: TopbarProps) {
  const [currentDomain, setCurrentDomain] = useState<string>("");
  const [keybinds, setKeybinds] = useState<DomainKeybinds>({});
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [status, setStatus] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
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
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
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
  }, [isOpen, selectedKey, isCreatingNew, status]);

  const showStatus = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    setStatus({ message, type });
    setTimeout(() => setStatus(null), 3000);
  };

  const selectKeybind = (key: string) => {
    setSelectedKey(key);
    setIsCreatingNew(false);
    setSearchOpen(false);
    const binding = keybinds[key];

    setKeySequence(key);
    setDescription(binding.description);

    if (binding.action === "navigate") {
      setActionType("navigate");
      setActionValue(binding.url);
    } else if (binding.action === "click") {
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
      className="fixed top-0 left-0 right-0 w-full m-0 bg-background border-b shadow-lg z-2147483647"
    >
      <div className="flex items-center justify-between px-6 py-3 bg-linear-to-r from-blue-600 to-purple-600">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-white">Browser Motion</h2>
          <span className="text-sm text-blue-100">→</span>
          <Badge
            variant="secondary"
            className="font-mono bg-white/20 text-white hover:bg-white/30"
          >
            {currentDomain}
          </Badge>
          <Badge
            variant="secondary"
            className="bg-white/20 text-white hover:bg-white/30"
          >
            {Object.keys(keybinds).length} keybinds
          </Badge>
        </div>
        <div className="flex gap-2 items-center justify-center">
          {status && (
            <div
              className={cn(
                "px-4 h-9 rounded-lg flex items-center gap-2 text-sm",
                status.type === "success"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200",
              )}
            >
              {status.type === "success" ? (
                <Check className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <span className="text-sm">{status.message}</span>
            </div>
          )}
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>
      <div className="flex gap-6 p-4">
        <div className="w-64 flex flex-col gap-2">
          <Button onClick={createNewKeybind} className="w-full">
            <Plus className="w-4 h-4" />
            New Keybind
          </Button>
          <div className="relative" ref={searchRef}>
            <Input
              className="text-muted-foreground text-sm font-mono"
              placeholder="Search by description or key..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
            />
            {searchOpen && filteredKeybinds.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 z-50">
                <Command className="rounded-lg border shadow-md bg-popover">
                  <CommandList>
                    <CommandEmpty>No keybinds found.</CommandEmpty>
                    <CommandGroup>
                      {filteredKeybinds.map(([key, binding]) => (
                        <CommandItem
                          key={key}
                          onSelect={() => selectKeybind(key)}
                          className="cursor-pointer"
                        >
                          <div className="flex flex-col gap-1 flex-1">
                            <div className="font-mono text-sm font-medium">
                              {key}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {binding.description}
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </div>
            )}
          </div>
          <div className="flex gap-2 w-full">
            <Button
              className="w-full"
              onClick={saveCurrentKeybind}
              disabled={
                !keySequence ||
                !description ||
                !actionValue ||
                (!selectedKey && !isCreatingNew)
              }
            >
              <Check className="w-4 h-4" />
              {isCreatingNew ? "Add Keybind" : "Update Keybind"}
            </Button>

            {selectedKey && !isCreatingNew && (
              <Button onClick={deleteKeybind} variant="destructive" size="icon">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-1 -mt-0.5">
          {isCreatingNew || selectedKey ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-primary" htmlFor="keySequence">
                    Key Sequence
                  </Label>
                  <Input
                    className="font-mono text-sm text-muted-foreground mt-1"
                    id="keySequence"
                    type="text"
                    value={keySequence}
                    onChange={(e) => setKeySequence(e.target.value)}
                    placeholder="e.g., gh, grp1"
                  />
                </div>

                <div>
                  <Label className="text-primary" htmlFor="description">
                    Description
                  </Label>
                  <Input
                    id="description"
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g., Go to home"
                    className="mt-1 text-muted-foreground font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-primary" htmlFor="actionType">
                    Action Type
                  </Label>
                  <Select
                    value={actionType}
                    onValueChange={(value) =>
                      setActionType(value as "navigate" | "click")
                    }
                  >
                    <SelectTrigger className="mt-1 text-muted-foreground text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="text-muted-foreground text-sm">
                      <SelectItem value="navigate">Navigate to URL</SelectItem>
                      <SelectItem value="click">
                        Click Element (CSS Selector)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-primary" htmlFor="actionValue">
                    {actionType === "navigate" && "URL"}
                    {actionType === "click" && "CSS Selector"}
                  </Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="actionValue"
                      type="text"
                      value={actionValue}
                      onChange={(e) => setActionValue(e.target.value)}
                      placeholder={
                        actionType === "navigate"
                          ? "https://example.com"
                          : ".button-class or #button-id"
                      }
                      className="font-mono text-sm flex-1 text-muted-foreground"
                      disabled={isPickingSelector}
                    />
                    {actionType === "click" && (
                      <Button
                        type="button"
                        className="text-primary"
                        variant={isPickingSelector ? "destructive" : "outline"}
                        size="icon"
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
                      >
                        <Target className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  {isPickingSelector && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Hover over elements on the page and click to select
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Select a keybind to edit or create a new one
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
