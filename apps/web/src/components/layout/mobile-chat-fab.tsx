"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { ChatBubbleIcon } from "./icons";

const STORAGE_KEY = "chat-fab-corner";
const SIZE = 48;
const MARGIN = 16;
// Roughly clears the fixed mobile header / bottom nav bars so the button
// never drags underneath them -- matches the top-4.5rem/bottom-4.5rem rest
// positions below, just as plain pixels for live-drag math.
const TOP_CLEARANCE = 72;
const BOTTOM_CLEARANCE = 72;
const DRAG_THRESHOLD = 6;

type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";
const CORNERS: readonly Corner[] = ["top-left", "top-right", "bottom-left", "bottom-right"];

const CORNER_CLASSES: Record<Corner, string> = {
  "top-left": "left-4 right-auto top-[calc(4.5rem+env(safe-area-inset-top))] bottom-auto",
  "top-right": "right-4 left-auto top-[calc(4.5rem+env(safe-area-inset-top))] bottom-auto",
  "bottom-left": "left-4 right-auto bottom-[calc(4.5rem+env(safe-area-inset-bottom))] top-auto",
  "bottom-right": "right-4 left-auto bottom-[calc(4.5rem+env(safe-area-inset-bottom))] top-auto",
};

export function MobileChatFab() {
  const pathname = usePathname();
  const router = useRouter();
  const [corner, setCorner] = useState<Corner>("bottom-right");
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [ready, setReady] = useState(false);
  const dragState = useRef<{ startX: number; startY: number; dragging: boolean } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // localStorage isn't available during SSR, so the saved corner can only
    // be read after mount -- a lazy useState initializer would still run on
    // the server and desync from the client on hydration.
    const saved = window.localStorage.getItem(STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved && (CORNERS as string[]).includes(saved)) setCorner(saved as Corner);
    setReady(true);
  }, []);

  if (pathname.startsWith("/chat") || !ready) return null;

  function releaseCapture(e: React.PointerEvent<HTMLButtonElement>) {
    // The pointer sequence can end (browser-cancelled gesture, capture lost
    // to another element, etc.) before this runs, in which case the
    // pointerId is no longer valid and release throws a NotFoundError --
    // only release when we actually still hold it.
    if (buttonRef.current?.hasPointerCapture(e.pointerId)) {
      buttonRef.current.releasePointerCapture(e.pointerId);
    }
  }

  function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    try {
      buttonRef.current?.setPointerCapture(e.pointerId);
    } catch {
      // Ignore -- dragging still works via document-level pointer events
      // firing on this element as long as the pointer stays over it.
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    dragState.current = {
      startX: e.clientX - (rect?.left ?? 0),
      startY: e.clientY - (rect?.top ?? 0),
      dragging: false,
    };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragState.current;
    if (!drag) return;
    const rect = buttonRef.current?.getBoundingClientRect();
    const offsetX = rect ? e.clientX - rect.left - drag.startX : 0;
    const offsetY = rect ? e.clientY - rect.top - drag.startY : 0;
    if (!drag.dragging && Math.abs(offsetX) < DRAG_THRESHOLD && Math.abs(offsetY) < DRAG_THRESHOLD) return;
    drag.dragging = true;
    const x = Math.min(Math.max(e.clientX - drag.startX, MARGIN), window.innerWidth - SIZE - MARGIN);
    const y = Math.min(Math.max(e.clientY - drag.startY, TOP_CLEARANCE), window.innerHeight - SIZE - BOTTOM_CLEARANCE);
    setDragPos({ x, y });
  }

  function finishDrag(e: React.PointerEvent<HTMLButtonElement>, { navigate }: { navigate: boolean }) {
    const drag = dragState.current;
    dragState.current = null;
    releaseCapture(e);
    if (drag?.dragging && dragPos) {
      const centerX = dragPos.x + SIZE / 2;
      const centerY = dragPos.y + SIZE / 2;
      const horizontal = centerX < window.innerWidth / 2 ? "left" : "right";
      const vertical = centerY < window.innerHeight / 2 ? "top" : "bottom";
      const nextCorner: Corner = `${vertical}-${horizontal}`;
      setCorner(nextCorner);
      setDragPos(null);
      window.localStorage.setItem(STORAGE_KEY, nextCorner);
      return;
    }
    setDragPos(null);
    if (navigate) router.push("/chat");
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label="Open chat"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(e) => finishDrag(e, { navigate: true })}
      onPointerCancel={(e) => finishDrag(e, { navigate: false })}
      style={dragPos ? { left: dragPos.x, top: dragPos.y, right: "auto", bottom: "auto" } : undefined}
      className={cn(
        "fixed z-20 flex h-12 w-12 touch-none items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg active:scale-95 active:bg-indigo-700 md:hidden",
        dragPos === null && "transition-[left,right,top,bottom] duration-300 ease-out",
        dragPos === null && CORNER_CLASSES[corner],
      )}
    >
      <ChatBubbleIcon className="h-6 w-6" />
    </button>
  );
}
