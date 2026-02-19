import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";

export function SelectorPicker() {
  const [isActive, setIsActive] = useState(false);
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(
    null,
  );
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [portalContainer] = useState(() => document.createElement("div"));

  useEffect(() => {
    document.body.appendChild(portalContainer);
    return () => {
      document.body.removeChild(portalContainer);
    };
  }, [portalContainer]);

  const generateSelector = (element: HTMLElement): string => {
    const isValidSelector = (selector: string): boolean => {
      try {
        document.querySelector(selector);
        return true;
      } catch {
        return false;
      }
    };

    const path: string[] = [];
    let current: HTMLElement | null = element;
    let depth = 0;
    const maxDepth = 15;

    while (current && current !== document.body && depth < maxDepth) {
      let selector = current.tagName.toLowerCase();

      if (current.parentElement) {
        const siblings = Array.from(current.parentElement.children).filter(
          (el) => el.tagName === current!.tagName,
        );
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          selector += `:nth-of-type(${index})`;
        }
      }

      path.unshift(selector);
      current = current.parentElement;
      depth++;
    }

    const finalSelector = path.join(" > ");

    if (isValidSelector(finalSelector)) {
      return finalSelector;
    }

    return `${element.tagName.toLowerCase()}:nth-of-type(1)`;
  };

  const getTopbarRoot = (): HTMLElement | null => {
    return (
      Array.from(document.body.children).find(
        (el): el is HTMLElement =>
          el instanceof HTMLElement && el.shadowRoot != null,
      ) ?? null
    );
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;

    const topbarRoot = getTopbarRoot();
    if (topbarRoot?.contains(target)) {
      setHoveredElement(null);
      return;
    }

    if (portalContainer.contains(target)) {
      return;
    }

    setHoveredElement(target);
  }, [portalContainer]);

  const handleClick = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;

    const topbarRoot = getTopbarRoot();
    if (topbarRoot?.contains(target)) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const selector = generateSelector(target);

    window.dispatchEvent(
      new CustomEvent("browser-motion-selector-picked", {
        detail: { selector },
      }),
    );

    setIsActive(false);
    setHoveredElement(null);
  }, []);

  useEffect(() => {
    const handleStart = () => {
      setIsActive(true);
    };
    const handleStop = () => {
      setIsActive(false);
      setHoveredElement(null);
    };

    window.addEventListener("browser-motion-start-picker", handleStart);
    window.addEventListener("browser-motion-stop-picker", handleStop);

    return () => {
      window.removeEventListener("browser-motion-start-picker", handleStart);
      window.removeEventListener("browser-motion-stop-picker", handleStop);
    };
  }, []);

  useEffect(() => {
    if (!isActive) return;

    document.addEventListener("mousemove", handleMouseMove, true);
    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove, true);
      document.removeEventListener("click", handleClick, true);
    };
  }, [isActive, handleMouseMove, handleClick]);

  useEffect(() => {
    if (hoveredElement && overlayRef.current) {
      const rect = hoveredElement.getBoundingClientRect();
      const overlay = overlayRef.current;

      overlay.style.top = `${rect.top + window.scrollY}px`;
      overlay.style.left = `${rect.left + window.scrollX}px`;
      overlay.style.width = `${rect.width}px`;
      overlay.style.height = `${rect.height}px`;
      overlay.style.display = "block";
    } else if (overlayRef.current) {
      overlayRef.current.style.display = "none";
    }
  }, [hoveredElement]);

  if (!isActive) {
    return null;
  }

  const content = (
    <>
      <div
        style={{
          position: "fixed",
          top: "10px",
          right: "10px",
          backgroundColor: "#3b82f6",
          color: "white",
          padding: "8px 16px",
          borderRadius: "6px",
          fontSize: "14px",
          fontWeight: "600",
          zIndex: 2147483648,
          pointerEvents: "none",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        }}
      >
        🎯 Selector Picker Active - Hover to highlight, Click to select
      </div>

      <div
        ref={overlayRef}
        style={{
          position: "absolute",
          pointerEvents: "none",
          border: "3px solid #3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.2)",
          zIndex: 2147483646,
          display: "none",
          transition: "all 0.05s ease",
          boxShadow: "0 0 0 2px rgba(59, 130, 246, 0.3)",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          cursor: "crosshair",
          zIndex: 2147483645,
          pointerEvents: "none",
        }}
      />
      {hoveredElement && (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#1f2937",
            color: "white",
            padding: "12px 20px",
            borderRadius: "8px",
            fontSize: "14px",
            fontFamily: "monospace",
            zIndex: 2147483647,
            maxWidth: "80%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            boxShadow:
              "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            pointerEvents: "none",
          }}
        >
          Click to select: {generateSelector(hoveredElement)}
        </div>
      )}
    </>
  );

  return createPortal(content, portalContainer);
}
