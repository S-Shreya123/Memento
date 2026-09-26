/**
 * "Remember me for a month" support.
 *
 * When a household answers "yes" at sign-up, their sign-in tokens are kept in
 * localStorage — they survive closing the browser, and the server session
 * lasts 30 days, so opening Memento goes straight to that family's space.
 *
 * When they answer "no", tokens live in sessionStorage instead, so every
 * fresh visit asks for the email and password again, exactly as promised.
 *
 * `authStorage` is handed to ConvexAuthProvider. It picks the backing store
 * dynamically by reading the preference at every access, so the choice made
 * mid-session (during sign-up) applies to the tokens written right after it.
 * The preference itself is a tiny non-sensitive flag in localStorage.
 */

const REMEMBER_FLAG = "memento-remember-me";

export function isRemembered(): boolean {
  try {
    return window.localStorage.getItem(REMEMBER_FLAG) === "1";
  } catch {
    return false;
  }
}

export function setRememberMe(on: boolean): void {
  try {
    if (on) window.localStorage.setItem(REMEMBER_FLAG, "1");
    else window.localStorage.removeItem(REMEMBER_FLAG);
  } catch {
    // Storage unavailable (private browsing) — the session just won't be remembered.
  }
}

export function clearRememberMe(): void {
  setRememberMe(false);
}

function backingStore(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return isRemembered() ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Token storage for ConvexAuthProvider — localStorage when the household
 * chose to be remembered, sessionStorage when they didn't.
 */
export const authStorage = {
  getItem(key: string): string | null {
    const store = backingStore();
    return store ? store.getItem(key) : null;
  },
  setItem(key: string, value: string): void {
    const store = backingStore();
    if (!store) return;
    try {
      store.setItem(key, value);
    } catch {
      // Quota or private-mode failure — auth still works for this tab only.
    }
  },
  removeItem(key: string): void {
    // Clear from BOTH stores so changing the choice never leaves stale tokens.
    if (typeof window === "undefined") return;
    for (const store of [window.localStorage, window.sessionStorage]) {
      try {
        store.removeItem(key);
      } catch {
        // ignore
      }
    }
  },
};
