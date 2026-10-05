"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { X } from "lucide-react";
import { brand } from "@/config/brand";

const STORAGE_KEY = "qadam:announcement-dismissed";
const ROTATE_MS = 5000;

/* ---------------------------------------------------------------------------
   A tiny store around localStorage.

   localStorage is an "external system" as far as React is concerned, so the
   correct way to read it is useSyncExternalStore rather than useState plus an
   effect. That avoids a synchronous setState on mount (which React flags,
   because it forces an immediate second render) while still keeping the
   server and the browser in step: the server has no localStorage, so it always
   renders the bar, and the browser corrects it on hydration.

   The `storage` event only fires in OTHER tabs, so dismissing here also
   notifies local subscribers directly.
--------------------------------------------------------------------------- */

let cachedDismissed: boolean | null = null;
const listeners = new Set<() => void>();

function readDismissed(): boolean {
  if (cachedDismissed === null) {
    try {
      cachedDismissed = window.localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      // Private browsing or blocked storage — just show the bar.
      cachedDismissed = false;
    }
  }
  return cachedDismissed;
}

function subscribeToDismissed(onChange: () => void) {
  listeners.add(onChange);
  const onStorage = () => {
    cachedDismissed = null;
    onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** Never dismissed on the server — it cannot know. */
const dismissedOnServer = () => false;

function dismissAnnouncement() {
  cachedDismissed = true;
  try {
    window.localStorage.setItem(STORAGE_KEY, "true");
  } catch {
    // Not remembering the dismissal is not worth an error.
  }
  listeners.forEach((listener) => listener());
}

/* ------------------------------------------------------------------------ */

/**
 * Announcement bar — rotating messages from brand.announcements, dismissible.
 *
 * A client component because it has state, a timer and reads browser storage.
 * Server Components can do none of those.
 */
export function AnnouncementBar() {
  const dismissed = useSyncExternalStore(subscribeToDismissed, readDismissed, dismissedOnServer);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (dismissed || brand.announcements.length < 2) return;
    // setState inside a timer callback is fine — it is not synchronous with
    // the effect body, so it does not cause a cascading render on mount.
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % brand.announcements.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [dismissed]);

  if (dismissed) return null;

  return (
    <div className="bg-announcement-bg text-announcement-foreground h-announcement relative flex items-center justify-center">
      {/* aria-live tells screen readers to announce the text when it rotates. */}
      <p className="text-body-xs sm:text-body-sm px-10 text-center" aria-live="polite">
        {brand.announcements[index]}
      </p>
      <button
        type="button"
        onClick={dismissAnnouncement}
        aria-label="Dismiss announcement"
        className="hover:bg-announcement-foreground/10 focus-visible:ring-announcement-foreground absolute right-2 inline-flex size-7 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
