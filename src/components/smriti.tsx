import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { LogOut, Check, Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEMO_MUSIC_TRACKS, demoToneUrl } from "@/lib/demoTones";
import { clearRememberMe } from "@/lib/rememberMe";
import { LANGUAGES, languageEnglishName, type LangCode } from "@/lib/i18n";

export type PatientProfile = Doc<"patients">;
export type FamilyMember = Doc<"familyMembers">;
export type PhotoRow = Doc<"photos">;
export type ReminderRow = Doc<"reminders">;
export type HelperRow = Doc<"helperContacts">;
export type ActivityLogRow = Doc<"activityLogs">;

export const REMINDER_TYPES = {
  medicine: { emoji: "💊" },
  hydration: { emoji: "💧" },
  activity: { emoji: "🚶" },
  appointment: { emoji: "🩺" },
} as const;

export const HELPER_ROLES = {
  volunteer: { key: "role.volunteer", pro: false, color: "text-foreground border-foreground/40" },
  community_helper: { key: "role.community", pro: false, color: "text-foreground border-foreground/40" },
  local_language_speaker: { key: "role.language", pro: false, color: "text-foreground border-foreground/40" },
  healthcare_professional: { key: "role.professional", pro: true, color: "text-white bg-swiss-blue border-swiss-blue" },
} as const;

/**
 * Language switch shown in the header of every app screen. The patient and
 * the caregiver share one setting — whichever either of them picks becomes
 * the language of every screen for this household.
 */
export function LanguagePicker({ compact = false }: { compact?: boolean }) {
  const { lang, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const active = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        title="Change language"
        className="flex h-11 items-center gap-2 border-2 border-foreground/40 px-3 text-base font-semibold transition-colors hover:border-foreground"
      >
        <Languages className="size-5" />
        {compact ? active.native : <span className="hidden sm:inline">{active.native}</span>}
      </button>
      {open ? (
        <div
          role="listbox"
          aria-label="Language"
          className="absolute right-0 top-full z-50 mt-1 w-56 border-2 border-foreground bg-card shadow-[6px_6px_0_0_rgba(0,0,0,0.12)]"
        >
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              role="option"
              aria-selected={l.code === lang}
              onClick={() => {
                setLanguage(l.code as LangCode);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-lg transition-colors",
                l.code === lang ? "bg-muted font-bold" : "hover:bg-muted/60",
              )}
            >
              <span>
                {l.native}
                <span className="ml-2 text-sm text-muted-foreground">{l.english}</span>
              </span>
              {l.code === lang ? <Check className="size-5 text-swiss-red" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function useWorkspace() {
  const auth = useAuth();
  const summary = useQuery(api.smriti.getWorkspaceSummary, auth.isAuthenticated ? {} : "skip");

  // Note: the workspace (patient profile) is created by RequirePatientName —
  // the welcome screen that asks for the patient's name right after sign-up —
  // NOT automatically here, so the entered name is what gets seeded.
  const ready = auth.isAuthenticated && summary?.patient != null;
  return { auth, summary, ready };
}

/**
 * Right after signing up (before anything else): ask for the name of the
 * person being cared for. The answer names the patient profile the demo
 * family, photos, reminders and games are built around. Existing profiles
 * are left untouched — this only ever runs for a brand-new workspace.
 */
export function RequirePatientName({ children }: { children: React.ReactNode }) {
  const { auth, summary } = useWorkspace();
  const { t, lang, setLanguage } = useLanguage();
  const ensureSeed = useMutation(api.seed.ensureSeed);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  // Loading gate: shown only while auth or the workspace summary is still
  // resolving. It must NOT wait for `ready` (an existing patient profile):
  // the name form below is exactly what creates that profile, so a brand-new
  // sign-up would otherwise sit on "Getting things ready…" forever.
  if (!auth.isAuthenticated || summary === undefined || summary === null) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-center">
          <div className="mx-auto h-1.5 w-24 bg-swiss-red" />
          <p className="mt-6 text-lg text-muted-foreground">{t("common.gettingReady")}</p>
        </div>
      </div>
    );
  }

  // The summary is loaded but this workspace has no patient profile yet →
  // show the welcome form (while saving it stays up as "Setting up…" and the
  // app renders as soon as the reactive summary reports the new patient).
  const awaitingName = summary.patient === null;

  if (!awaitingName) return <>{children}</>;

  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await ensureSeed({
        patientName: name.trim(),
        preferredLanguage: languageEnglishName(lang),
      });
    } catch {
      // seeding retried automatically on next load if this failed
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="h-1.5 w-full bg-swiss-red" />
      <div className="h-1.5 w-full bg-swiss-blue" />
      <div className="flex-1 grid place-items-center px-4 py-16">
        <div className="w-full max-w-xl border-2 border-foreground bg-card">
          <div className="h-2 bg-swiss-red" />
          <div className="p-6 md:p-10">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center bg-swiss-red text-white font-extrabold text-lg">M</span>
              <span className="type-display text-2xl">Memento</span>
            </div>
            <p className="label-caps mt-8 text-swiss-red">{t("welcome.caps")}</p>
            <h1 className="type-display mt-3 text-4xl md:text-5xl">
              {t("welcome.title")}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">{t("welcome.body")}</p>
            <div className="mt-8 space-y-5">
              <div>
                <label className="label-caps text-muted-foreground" htmlFor="patient-name">
                  {t("welcome.nameLabel")}
                </label>
                <Input
                  id="patient-name"
                  className="mt-2 h-14 text-xl"
                  placeholder={t("welcome.namePh")}
                  value={name}
                  autoFocus
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void submit();
                  }}
                />
              </div>
              <div>
                <label className="label-caps text-muted-foreground" htmlFor="patient-language">
                  {t("welcome.langLabel")}
                </label>
                <div
                  role="group"
                  aria-label={t("welcome.langLabel")}
                  className="mt-2 grid grid-cols-2 gap-2"
                >
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      aria-pressed={lang === l.code}
                      onClick={() => setLanguage(l.code as LangCode)}
                      className={cn(
                        "flex h-14 items-center justify-center gap-2 border-2 text-xl font-semibold transition-colors",
                        lang === l.code
                          ? "border-swiss-red bg-muted"
                          : "border-foreground/40 hover:border-foreground",
                      )}
                    >
                      {l.native}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{t("welcome.langHint")}</p>
              </div>
              <Button
                className="h-16 w-full text-xl font-bold"
                disabled={!name.trim() || saving}
                onClick={() => void submit()}
              >
                {saving ? t("welcome.settingUp") : t("welcome.continue")}
              </Button>
              <p className="text-sm text-muted-foreground">{t("welcome.demoNote")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppShell({
  role,
  children,
  subtitle,
}: {
  role: "patient" | "caregiver";
  children: React.ReactNode;
  subtitle?: string;
}) {
  const { auth, summary } = useWorkspace();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const patientName = summary?.patient?.name;

  const handleSignOut = async () => {
    await auth.signOut();
    // End the "remembered for a month" state, so the next visit asks for the
    // email and password again (unless they choose to be remembered anew).
    clearRememberMe();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 border-b-2 border-foreground bg-background/95 backdrop-blur">
        <div className="swiss-container flex h-16 items-center justify-between gap-4">
          <Link to={role === "caregiver" ? "/care" : "/app"} className="flex items-center gap-3 shrink-0">
            <span className="grid size-9 place-items-center bg-swiss-red text-white font-extrabold text-lg">M</span>
            <span className="type-display text-2xl">Memento</span>
            <span className="label-caps hidden sm:inline text-muted-foreground border-l-2 border-foreground/20 pl-3">
              {role === "caregiver"
                ? t("shell.caregiverView")
                : t("shell.for", { name: patientName ?? "…" })}
            </span>
            {subtitle ? <span className="hidden lg:inline label-caps text-muted-foreground">· {subtitle}</span> : null}
          </Link>
          <nav className="flex items-center gap-1">
            {role === "patient" ? (
              <>
                <Button asChild variant="ghost" className="h-11 px-4 text-base">
                  <Link to="/app">{t("nav.games")}</Link>
                </Button>
                <Button asChild variant="ghost" className="h-11 px-4 text-base">
                  <Link to="/app/reminders">{t("nav.reminders")}</Link>
                </Button>
                <Button asChild variant="ghost" className="h-11 px-4 text-base">
                  <Link to="/app/helpers">{t("nav.helpers")}</Link>
                </Button>
                <Button asChild variant="ghost" className="h-11 px-4 text-base">
                  <Link to="/app/music">{t("nav.music")}</Link>
                </Button>
                <Button asChild variant="ghost" className="h-11 px-4 text-base">
                  <Link to="/app/library">{t("nav.library")}</Link>
                </Button>
                <span className="mx-2 hidden h-8 border-l-2 border-foreground/20 md:block" />
                <Button asChild variant="outline" className="h-11 px-4 text-base hidden sm:inline-flex">
                  <Link to="/care">{t("shell.caregiverView")}</Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" className="h-11 px-4 text-base">
                  <Link to="/care">{t("careNav.overview")}</Link>
                </Button>
                <Button asChild variant="ghost" className="h-11 px-4 text-base">
                  <Link to="/care/family">{t("careNav.family")}</Link>
                </Button>
                <Button asChild variant="ghost" className="h-11 text-base">
                  <Link to="/care/reminders">{t("nav.reminders")}</Link>
                </Button>
                <Button asChild variant="ghost" className="h-11 text-base">
                  <Link to="/care/helpers">{t("nav.helpers")}</Link>
                </Button>
                <Button asChild variant="ghost" className="h-11 text-base">
                  <Link to="/care/music">{t("nav.music")}</Link>
                </Button>
                <Button asChild variant="ghost" className="h-11 text-base">
                  <Link to="/care/library">{t("nav.library")}</Link>
                </Button>
                <Button asChild variant="ghost" className="h-11 px-4 text-base hidden lg:inline-flex">
                  <Link to="/care/profile">{t("careNav.profile")}</Link>
                </Button>
                <span className="mx-2 hidden h-8 border-l-2 border-foreground/20 md:block" />
                <Button asChild variant="outline" className="h-11 px-4 text-base">
                  <Link to="/app">{t("careNav.patientView")}</Link>
                </Button>
              </>
            )}
            <LanguagePicker compact />
            <Button variant="ghost" size="icon" className="size-11" onClick={handleSignOut} title="Sign out">
              <LogOut className="size-5" />
            </Button>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t-2 border-foreground">
        <div className="swiss-container flex h-12 items-center justify-between">
          <span className="label-caps text-muted-foreground">{t("footer.tag")}</span>
          <span className="label-caps text-muted-foreground">{t("footer.principle")}</span>
        </div>
        <div className="h-1.5 w-full bg-swiss-red" />
        <div className="h-1.5 w-full bg-swiss-blue" />
      </footer>
    </div>
  );
}

/* ═══════════════════ music during activities ═══════════════════ */

export type MusicTrackRow = {
  _id: string;
  title: string;
  source: "spotify" | "upload";
  spotifyUrl?: string;
  dataUrl?: string;
  audioUrl?: string;
  demo?: boolean;
};

/** Resolve a track row to something an <audio> element can play. */
function playableSrc(t: MusicTrackRow): string | undefined {
  if (t.source === "spotify") return undefined;
  if (t.dataUrl?.startsWith("demo:")) return demoToneUrl(t.dataUrl.slice(5));
  return t.audioUrl ?? t.dataUrl ?? undefined;
}

/* ── Spotify IFrame API — lets US start the music, not just the widget ──
 * A plain embed can only be started by tapping inside Spotify's own player,
 * which is easy to miss — the family pressed Start and the game went on in
 * silence. Spotify's official IFrame API hands us a controller with
 * play/pause/resume, so the chosen song begins by itself the moment the
 * activity starts (the Start-button tap is the browser gesture it needs). */
type SpotifyPlaybackUpdate = { data?: { isPaused?: boolean } };
type SpotifyIframeController = {
  loadUri: (uri: string) => void;
  play: () => void;
  pause: () => void;
  resume: () => void;
  seek: (seconds: number) => void;
  addListener: (event: string, cb: (e: SpotifyPlaybackUpdate) => void) => void;
  destroy?: () => void;
};
type SpotifyIframeApi = {
  CreateController: (
    element: HTMLElement,
    options: Record<string, unknown>,
    onReady: (controller: SpotifyIframeController) => void,
  ) => void;
};
const SPOTIFY_IFRAME_API_SRC = "https://open.spotify.com/embed/iframe-api/v1";

/** Turn any Spotify link into the spotify:type:id URI the controller wants. */
function spotifyUriForEmbed(url: string): string {
  const m = url.match(/spotify\.com\/(?:intl-[a-z-]+\/)?(track|album|playlist)\/([A-Za-z0-9]+)/i);
  if (m) return `spotify:${m[1].toLowerCase()}:${m[2]}`;
  return url;
}

/** Load Spotify's IFrame API script once; resolves null if it can't load. */
function loadSpotifyIframeApi(): Promise<SpotifyIframeApi | null> {
  const w = window as unknown as {
    __spotifyIframeApi?: SpotifyIframeApi;
    __spotifyApiWaiters?: Array<(api: SpotifyIframeApi | null) => void>;
    onSpotifyIframeApiReady?: (api: SpotifyIframeApi) => void;
  };
  if (w.__spotifyIframeApi) return Promise.resolve(w.__spotifyIframeApi);
  if (!w.__spotifyApiWaiters) {
    w.__spotifyApiWaiters = [];
    w.onSpotifyIframeApiReady = (api: SpotifyIframeApi) => {
      w.__spotifyIframeApi = api;
      for (const resolve of w.__spotifyApiWaiters ?? []) resolve(api);
      w.__spotifyApiWaiters = [];
    };
    const script = document.createElement("script");
    script.src = SPOTIFY_IFRAME_API_SRC;
    script.async = true;
    script.onerror = () => {
      for (const resolve of w.__spotifyApiWaiters ?? []) resolve(null);
      w.__spotifyApiWaiters = [];
    };
    document.head.appendChild(script);
  }
  return new Promise((resolve) => {
    w.__spotifyApiWaiters!.push(resolve);
  });
}

const CHOICE_KEY = "memento-music-choice";
const ON_KEY = "memento-music-on";
type Silence = "__silence__";

/** Does this track play inside our own <audio> element? */
function isDirectAudio(t: MusicTrackRow): boolean {
  return t.source !== "spotify";
}

function readStoredChoice(): string | null {
  try {
    return sessionStorage.getItem(CHOICE_KEY);
  } catch {
    return null;
  }
}

function readStoredOn(): boolean {
  try {
    return sessionStorage.getItem(ON_KEY) !== "0";
  } catch {
    return true;
  }
}

function storeChoice(v: string) {
  try {
    sessionStorage.setItem(CHOICE_KEY, v);
  } catch {
    // private mode; choice just won't persist
  }
}

function storeOn(v: boolean) {
  try {
    sessionStorage.setItem(ON_KEY, v ? "1" : "0");
  } catch {
    // ignore
  }
}

/**
 * Music for an activity.
 *
 * Render this component ONCE for the whole activity (start screen, play and
 * summary) so the chosen song keeps playing across screen changes. Before the
 * game starts (playing=false, showPicker) it shows the song picker; while
 * playing it hides the picker and keeps the music going; it stops everything
 * when it unmounts.
 */
export function GameMusic({
  results,
  playing,
  showPicker = true,
  onChoiceChange,
}: {
  results: readonly string[];
  playing: boolean;
  /** false → render nothing while not playing (no picker panel). */
  showPicker?: boolean;
  onChoiceChange?: (id: string | null) => void;
}) {
  const { ready } = useWorkspace();
  const { t } = useLanguage();
  const tracks = useQuery(api.smriti.getMusicTracks, ready ? {} : "skip");
  const addDemo = useMutation(api.seed.addDemoMusic);
  const demoTried = useRef(false);

  // null = not chosen yet this session; "__silence__" = explicit silence;
  // otherwise the track id. Persisted so the pick survives the start screen.
  const [trackId, setTrackId] = useState<string | null>(readStoredChoice);
  const [on, setOn] = useState<boolean>(readStoredOn);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (trackId) storeChoice(trackId);
  }, [trackId]);
  useEffect(() => {
    storeOn(on);
  }, [on]);

  // Add the built-in demo songs once, out of the box.
  useEffect(() => {
    if (!tracks || demoTried.current || tracks.length > 0) return;
    demoTried.current = true;
    addDemo({ tracks: DEMO_MUSIC_TRACKS }).catch(() => {
      demoTried.current = false;
    });
  }, [tracks, addDemo]);

  // Default choice: the family's own music first, then a built-in melody —
  // so starting an activity always has sound unless silence was chosen.
  useEffect(() => {
    if (!tracks || tracks.length === 0) return;
    if (trackId === "__silence__") return;
    if (trackId && tracks.some((t) => t._id === trackId)) return;
    const preferred = tracks.find((t) => t.source !== "spotify") ?? tracks[0];
    setTrackId(preferred._id);
  }, [tracks, trackId]);

  const chosen = tracks?.find((t) => t._id === trackId) ?? null;

  // ── One audio source for the whole activity ──
  // audioRef and the Spotify iframe live on this component instance. The
  // games render this component on the start screen AND during play, so the
  // same instance persists across the transition — the chosen song keeps
  // playing seamlessly instead of restarting or going silent.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wantAudio = !!(playing && on && chosen && isDirectAudio(chosen));
  // The Spotify embed is mounted the moment a Spotify song is chosen on the
  // start screen and stays mounted for the whole activity — the SAME iframe
  // (and its IFrame-API controller) keeps playing throughout. When the
  // session ends (picker gone, game over) the embed unmounts and music stops.
  const pickerVisible = !playing && showPicker;
  const showSpotifyEmbed = !!(
    on &&
    chosen?.source === "spotify" &&
    chosen.spotifyUrl &&
    (playing || pickerVisible)
  );

  useEffect(() => {
    const src = wantAudio ? playableSrc(chosen!) : undefined;
    const audio = audioRef.current;
    if (!src) {
      if (audio && !audio.paused) audio.pause();
      return;
    }
    if (!audio || audio.src !== new URL(src, window.location.href).href) {
      audio?.pause();
      const el = new Audio(src);
      el.loop = true;
      el.volume = 0.85;
      el.preload = "auto";
      audioRef.current = el;
      el.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
    } else if (audio.paused) {
      audio.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
    }
  }, [wantAudio, chosen]);

  // ── Spotify via the IFrame API: one controller for the whole activity ──
  // The hidden 1px embed is the one that plays; the visible widget is just
  // Spotify's controls pointing at the same song. When the activity starts,
  // the controller is told to play — using the browser gesture from the
  // Start tap (Spotify accepts programmatic play for ~30s after a gesture) —
  // so music actually begins instead of waiting for a tap inside the widget.
  const spotifyHostRef = useRef<HTMLDivElement | null>(null);
  const spotifyControllerRef = useRef<SpotifyIframeController | null>(null);
  const spotifyPendingRef = useRef(false);
  const spotifyWasPlayingRef = useRef(false);
  const spotifyShouldPlayRef = useRef(false);

  // (Re)create the hidden controller embed whenever the chosen song or mount
  // state changes. Kept separate from playback so re-creating never restarts
  // music that is already going.
  useEffect(() => {
    const host = spotifyHostRef.current;
    if (!showSpotifyEmbed || !chosen?.spotifyUrl || !host) {
      spotifyControllerRef.current = null;
      return;
    }
    let cancelled = false;
    const uri = spotifyUriForEmbed(chosen.spotifyUrl);
    void loadSpotifyIframeApi().then((api) => {
      if (cancelled || !api || !spotifyHostRef.current) return;
      if (spotifyControllerRef.current) {
        // Already have a controller for this exact song — leave playback alone.
        return;
      }
      spotifyHostRef.current.innerHTML = "";
      const el = document.createElement("div");
      spotifyHostRef.current.appendChild(el);
      api.CreateController(
        el,
        { uri, width: "100%", height: 152 },
        (controller) => {
          if (cancelled) return;
          spotifyControllerRef.current = controller;
          controller.addListener("playback_update", (e) => {
            const paused = e.data?.isPaused !== false;
            spotifyWasPlayingRef.current = !paused;
          });
          if (spotifyPendingRef.current) {
            spotifyPendingRef.current = false;
            controller.play();
          }
        },
      );
    });
    return () => {
      cancelled = true;
    };
  }, [showSpotifyEmbed, chosen?._id, chosen?.spotifyUrl]);

  // Start/pause the Spotify controller as the activity starts and stops.
  useEffect(() => {
    if (!on || chosen?.source !== "spotify") {
      spotifyShouldPlayRef.current = false;
      return;
    }
    if (playing) {
      spotifyShouldPlayRef.current = true;
      const controller = spotifyControllerRef.current;
      if (controller) {
        // resume() when it was already rolling, play() for a fresh embed.
        if (spotifyWasPlayingRef.current) controller.resume();
        else controller.play();
        setBlocked(false);
      } else {
        // Controller still connecting: start as soon as it is ready.
        spotifyPendingRef.current = true;
      }
    } else {
      spotifyShouldPlayRef.current = false;
      const controller = spotifyControllerRef.current;
      if (controller && spotifyWasPlayingRef.current) controller.pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, on, chosen?.source, showSpotifyEmbed]);

  // Direct-audio previews before the game starts: reuse the same audio
  // element so the preview also survives re-renders, and always stop cleanly.
  useEffect(() => {
    const audio = audioRef.current;
    if (playing && previewId !== null) setPreviewId(null);
    if (!playing && previewId === null && audio && !audio.paused) audio.pause();
  }, [playing, previewId]);

  const startPreview = (t: MusicTrackRow) => {
    if (playing) return;
    if (t.source === "spotify") {
      // Selecting a Spotify song mounts its player right away; with the
      // IFrame API the music then starts by itself once the activity begins —
      // no tap inside the widget needed.
      choose(t._id);
      return;
    }
    const src = playableSrc(t);
    if (!src) return;
    audioRef.current?.pause();
    const el = new Audio(src);
    el.volume = 0.85;
    audioRef.current = el;
    setPreviewId(t._id);
    el.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
    window.setTimeout(() => {
      el.pause();
      setPreviewId((cur) => (cur === t._id ? null : cur));
    }, 6000);
  };

  // Browsers can refuse the first automatic play (commonly inside embedded
  // previews). The moment the player touches anything, start the music.
  useEffect(() => {
    if (!playing || !on) return;
    const unlock = () => {
      const audio = audioRef.current;
      if (audio && audio.src && audio.paused) {
        audio
          .play()
          .then(() => setBlocked(false))
          .catch(() => setBlocked(true));
      } else if (!wantAudio && !showSpotifyEmbed) {
        setBlocked(false);
      }
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [playing, on, wantAudio, showSpotifyEmbed]);

  // Hard stop on unmount: music never plays outside the activity. Both the
  // <audio> element and the Spotify embed live or die with this instance.
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const choose = (id: string | Silence) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null; // discard so a stray tap can't replay an old preview
    }
    // Switching songs also stops the previous Spotify playback immediately.
    const prevController = spotifyControllerRef.current;
    if (prevController && spotifyWasPlayingRef.current) prevController.pause();
    spotifyControllerRef.current = null;
    spotifyPendingRef.current = false;
    setPreviewId(null);
    setTrackId(id);
    onChoiceChange?.(id === "__silence__" ? null : id);
  };

  const toggleOn = () => {
    setOn((v) => {
      if (v && audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      return !v;
    });
  };

  // ── The Spotify embed: one node, mounted as soon as a Spotify song is
  // chosen (even before the game starts) and kept alive until the activity
  // unmounts. Spotify's IFrame API renders its player into the host div; our
  // controller starts playback when the activity begins — the family does not
  // have to tap inside the widget — and the same player carries the music
  // through the whole game because it never remounts.
  const spotifyEmbedNode = showSpotifyEmbed && chosen?.spotifyUrl ? (
    <div className="swiss-container mb-3 border-2 border-foreground bg-card p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="label-caps text-muted-foreground">Spotify · {chosen.title}</p>
          <p className="truncate text-base font-semibold">
            {playing
              ? t("gm.playingFrom")
              : t("gm.spotifyWillPlay")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{t("gm.keeps")}</p>
        </div>
        <a
          href={chosen.spotifyUrl}
          target="_blank"
          rel="noreferrer"
          className="label-caps shrink-0 border-2 border-foreground/30 px-3 py-1.5 text-xs text-muted-foreground hover:border-foreground"
        >
          {t("gm.open")}
        </a>
      </div>
      <div className="mt-3">
        <div ref={spotifyHostRef} className="w-full" />
      </div>
    </div>
  ) : null;

  // ── Pre-game panel: pick a song or play in silence ──
  let panel: React.ReactNode = null;
  if (!playing && showPicker) {
    const list = tracks ?? [];
    panel = (
      <div className="mb-5 border-2 border-foreground bg-card">
        <div className="flex items-center justify-between border-b-2 border-foreground px-5 py-3">
          <span className="label-caps text-muted-foreground">{t("gm.caps")}</span>
          <button
            type="button"
            onClick={toggleOn}
            aria-pressed={on}
            className={cn(
              "label-caps border-2 px-4 py-2 text-sm font-bold tracking-widest transition-colors",
              on ? "border-swiss-blue bg-swiss-blue text-white" : "border-foreground/40 text-muted-foreground hover:border-foreground",
            )}
          >
            {on ? t("common.musicOn") : t("common.musicOff")}
          </button>
        </div>
        <div className="p-5">
          <p className="text-lg text-muted-foreground">{t("gm.lead")}</p>
          <div className="mt-4 grid gap-2">
            <button
              type="button"
              onClick={() => choose("__silence__")}
              className={cn(
                "flex items-center justify-between border-2 px-4 py-4 text-left text-lg font-semibold transition-colors",
                trackId === "__silence__" ? "border-swiss-red bg-muted" : "border-foreground/30 hover:border-foreground",
              )}
            >
              <span>{t("gm.silence")}</span>
              {trackId === "__silence__" ? <Check className="size-5 text-swiss-red" /> : null}
            </button>
            {list.map((track) => {
              const isPreview = previewId === track._id;
              return (
                <div
                  key={track._id}
                  className={cn(
                    "flex items-center justify-between gap-3 border-2 px-4 py-4 transition-colors",
                    trackId === track._id ? "border-swiss-red bg-muted" : "border-foreground/30 hover:border-foreground",
                  )}
                >
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => choose(track._id)}>
                    <span className="block truncate text-lg font-semibold">{track.title}</span>
                    <span className="label-caps text-muted-foreground">
                      {track.source === "spotify"
                        ? t("pm.spotify")
                        : track.demo
                          ? t("pm.builtIn")
                          : t("pm.uploaded")}
                    </span>
                  </button>
                  {track.source === "spotify" && track.spotifyUrl ? (
                    <button
                      type="button"
                      className="label-caps shrink-0 border-2 border-foreground/30 px-3 py-1.5 text-xs text-muted-foreground hover:border-foreground"
                      onClick={() => startPreview(track)}
                    >
                      {t("gm.preview")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="label-caps shrink-0 border-2 border-foreground/30 px-3 py-1.5 text-xs text-muted-foreground hover:border-foreground"
                      onClick={() => (isPreview ? setPreviewId(null) : startPreview(track))}
                    >
                      {isPreview ? t("gm.stopSmall") : t("gm.listenSmall")}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t-2 border-foreground/20 pt-4">
            <p className="max-w-md text-base text-muted-foreground">{t("gm.missing")}</p>
            <Button asChild variant="outline" className="h-11 shrink-0 border-2 px-4 text-base">
              <Link to="/care/music">{t("gm.addOwn")}</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── While playing: quiet player bar (the Spotify embed is rendered above) ──
  if (playing) {
    panel = (
      <div>
        {blocked ? (
          <div className="swiss-container mb-3 border-2 border-swiss-blue bg-card p-3 text-base">
            {t("gm.tapToBegin")}
          </div>
        ) : null}
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t-2 border-foreground bg-background/95 backdrop-blur">
          <div className="swiss-container flex h-14 items-center justify-between gap-3">
            <span className="label-caps truncate text-muted-foreground">
              {chosen && on ? t("common.playingWith", { title: chosen.title }) : t("common.musicOff")}
            </span>
            <button
              type="button"
              onClick={toggleOn}
              aria-pressed={on}
              className={cn(
                "label-caps shrink-0 border-2 px-4 py-1.5 text-xs font-bold tracking-widest transition-colors",
                on ? "border-swiss-blue bg-swiss-blue text-white" : "border-foreground/40 text-muted-foreground hover:border-foreground",
              )}
            >
              {on ? t("common.musicOn") : t("common.musicOff")}
            </button>
          </div>
        </div>
        <div className="h-14" />
      </div>
    );
  }

  // A single, stable tree shape for the pre-game and in-game views alike, so
  // React keeps the same <audio> state and the same Spotify iframe across the
  // picker → game transition. Only the "panel" slot swaps; the embed does not.
  return (
    <div>
      {spotifyEmbedNode}
      <div>{panel}</div>
    </div>
  );
}

/**
 * Keeps GameMusic mounted across the pre-game screen, the game itself and the
 * closing screen. Without this, starting a game remounts the music component
 * and Spotify (and any playing song) silently stops — the bug this fixes.
 */
export function GameFrame({ children }: { children: React.ReactNode }) {
  return <AppShell role="patient"><div className="min-h-[calc(100vh-4rem)]">{children}</div></AppShell>;
}
