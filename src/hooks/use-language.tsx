import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  isLangCode,
  langFromStored,
  languageEnglishName,
  translate,
  translateRelationship,
  type LangCode,
} from "@/lib/i18n";

const STORAGE_KEY = "memento-language";

function readStoredLang(): LangCode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (isLangCode(v)) return v;
  } catch {
    // private mode
  }
  return "en";
}

function storeLang(lang: LangCode) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // ignore
  }
}

type LanguageContextValue = {
  lang: LangCode;
  /** Full UI translate helper for the active language. */
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** Show a caregiver-entered relationship (Wife, Best friend…) in-language. */
  trRel: (rel: string) => string;
  setLanguage: (lang: LangCode) => void;
  ready: boolean;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

/**
 * One language for the whole household: the patient and the caregiver share
 * the same switch. The choice is stored locally (so it survives reloads
 * instantly) and mirrored onto the patient profile (so every signed-in
 * device — and both views — agrees). When no profile exists yet (fresh
 * sign-up), the local choice still applies and is saved with the profile.
 */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<LangCode>(readStoredLang);
  const [syncedFromServer, setSyncedFromServer] = useState(false);

  const summary = useQuery(api.smriti.getWorkspaceSummary, {});
  const saveLang = useMutation(api.smriti.setPatientLanguage);

  const profileLang = langFromStored(summary?.patient?.preferredLanguage);
  const hasProfile = summary?.patient != null;

  // First profile load: adopt the language saved on the profile.
  useEffect(() => {
    if (!hasProfile || syncedFromServer) return;
    setSyncedFromServer(true);
    if (profileLang && profileLang !== lang) {
      setLang(profileLang);
      storeLang(profileLang);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasProfile, profileLang]);

  const setLanguage = useCallback(
    (next: LangCode) => {
      setLang(next);
      storeLang(next);
      // Mirror onto the patient profile so every device and both views agree.
      saveLang({ language: languageEnglishName(next) }).catch(() => {});
    },
    [saveLang],
  );

  // Keep <html lang> in sync so screen readers pronounce correctly.
  useEffect(() => {
    const htmlLang =
      lang === "as" ? "as" : lang === "hi" ? "hi" : lang === "bn" ? "bn" : "en";
    document.documentElement.lang = htmlLang;
  }, [lang]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      t: (key, vars) => translate(lang, key, vars),
      trRel: (rel) => translateRelationship(rel, lang),
      setLanguage,
      ready: true,
    }),
    [lang, setLanguage],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside <LanguageProvider>");
  return ctx;
}
