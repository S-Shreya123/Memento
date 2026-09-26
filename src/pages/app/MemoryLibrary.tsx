import { AppShell, useWorkspace } from "@/components/smriti";
import { useLanguage } from "@/hooks/use-language";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import {
  Search,
  X,
  Image as ImageIcon,
  Users,
  Footprints,
  Music,
  Play,
  Square,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { demoToneUrl } from "@/lib/demoTones";

type Card = {
  id: string;
  kind: "photos" | "people" | "activities" | "music";
  title: string;
  subtitle: string;
  body?: string;
  image?: string;
  videoUrl?: string;
  audioSrc?: string;
  spotifyUrl?: string;
};

type Filter = "all" | "photos" | "people" | "activities" | "music";

const FILTERS: Array<[Filter, string]> = [
  ["all", "lib.fAll"],
  ["photos", "lib.fPhotos"],
  ["people", "lib.fPeople"],
  ["activities", "lib.fInterests"],
  ["music", "lib.fMusic"],
];

export default function MemoryLibrary() {
  const { ready } = useWorkspace();
  const { t } = useLanguage();
  const photos = useQuery(api.smriti.getPhotos, ready ? {} : "skip");
  const members = useQuery(api.smriti.getFamilyMembers, ready ? {} : "skip");
  const summary = useQuery(api.smriti.getWorkspaceSummary, ready ? {} : "skip");
  const tracks = useQuery(api.smriti.getMusicTracks, ready ? {} : "skip");
  const patient = summary?.patient;

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Stop any song when leaving the library.
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const toggleSong = (card: Card) => {
    if (playingId === card.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (!card.audioSrc) return;
    audioRef.current?.pause();
    const el = new Audio(card.audioSrc);
    el.volume = 0.85;
    audioRef.current = el;
    setPlayingId(card.id);
    el.play().catch(() => setPlayingId(null));
    el.onended = () => setPlayingId(null);
  };

  const peopleCards: Card[] = (members ?? []).map((m) => ({
    id: m._id,
    kind: "people",
    title: m.name,
    subtitle: m.relationship,
    body: m.notes ?? undefined,
    image: photos?.find((p) => p._id === m.photoId)?.dataUrl,
    videoUrl: (m as { videoUrl?: string }).videoUrl,
  }));

  const photoCards: Card[] = (photos ?? []).map((p) => {
    const linkedNames = (p.memberIds ?? [])
      .map((id) => members?.find((m) => m._id === id)?.name)
      .filter(Boolean)
      .join(", ");
    return {
      id: p._id,
      kind: "photos",
      title: p.caption ?? t("lib.photo"),
      subtitle: linkedNames ? t("lib.with", { names: linkedNames }) : t("lib.photo"),
      image: p.dataUrl,
    };
  });

  const activityCards: Card[] = [
    ...(patient?.hobbies ?? []).map((h: string, i: number): Card => ({
      id: `hobby-${i}`,
      kind: "activities",
      title: h,
      subtitle: t("lib.hobby"),
    })),
    ...(patient?.favouriteMusic ?? []).map((mu: string, i: number): Card => ({
      id: `music-${i}`,
      kind: "activities",
      title: mu,
      subtitle: t("lib.favMusic"),
    })),
    ...(patient?.importantPlaces ?? []).map((pl: string, i: number): Card => ({
      id: `place-${i}`,
      kind: "activities",
      title: pl,
      subtitle: t("lib.place"),
    })),
    ...(patient?.importantEvents ?? []).map((ev: { label: string; detail?: string }, i: number): Card => ({
      id: `event-${i}`,
      kind: "activities",
      title: ev.label,
      subtitle: t("lib.event"),
      body: ev.detail,
    })),
  ];

  const musicCards: Card[] = (tracks ?? []).map((tr) => ({
    id: tr._id,
    kind: "music",
    title: tr.title,
    subtitle:
      tr.source === "spotify" ? t("pm.spotify") : tr.demo ? t("pm.builtIn") : t("pm.uploaded"),
    audioSrc:
      tr.source === "spotify"
        ? undefined
        : tr.dataUrl?.startsWith("demo:")
          ? demoToneUrl(tr.dataUrl.slice(5))
          : (tr.audioUrl ?? tr.dataUrl ?? undefined),
    spotifyUrl: tr.spotifyUrl,
  }));

  const all = [...peopleCards, ...photoCards, ...activityCards, ...musicCards];
  const q = query.trim().toLowerCase();
  const filtered = all.filter((c) => {
    if (filter !== "all" && c.kind !== filter) return false;
    if (!q) return true;
    return (
      c.title.toLowerCase().includes(q) ||
      c.subtitle.toLowerCase().includes(q) ||
      (c.body ?? "").toLowerCase().includes(q)
    );
  });

  const loading = photos === undefined || members === undefined || summary === undefined || tracks === undefined;

  return (
    <AppShell role="patient">
      <div className="swiss-container py-10">
        <p className="label-caps text-swiss-red">{t("lib.caps")}</p>
        <h1 className="type-display mt-2 text-4xl md:text-5xl">{t("lib.title")}</h1>
        <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{t("lib.sub")}</p>

        {/* Search & filter */}
        <div className="mt-8 border-2 border-foreground bg-card p-5">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 size-6 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("lib.searchPh")}
              className="h-16 w-full border-2 border-foreground bg-background pl-14 pr-14 text-xl font-medium outline-none placeholder:text-muted-foreground/70 focus:outline-4 focus:outline-swiss-red/60"
            />
            {query ? (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-4 top-1/2 -translate-y-1/2"
              >
                <X className="size-6 text-muted-foreground hover:text-foreground" />
              </button>
            ) : null}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {FILTERS.map(([value, labelKey]) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={cn(
                  "border-2 px-4 py-2.5 text-lg font-semibold transition-colors",
                  filter === value
                    ? "border-swiss-red bg-swiss-red text-white"
                    : "border-foreground/40 hover:border-foreground",
                )}
              >
                {t(labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <p className="mt-10 text-xl text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="mt-8 border-2 border-foreground bg-card p-10 text-center">
            <p className="type-display text-3xl">{t("lib.nothing")}</p>
            <p className="mt-2 text-lg text-muted-foreground">{t("lib.tryAgain")}</p>
            <button
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
              className="mt-6 h-12 border-2 border-foreground px-6 text-lg font-semibold hover:bg-muted"
            >
              {t("lib.clear")}
            </button>
          </div>
        ) : (
          <>
            <p className="label-caps mt-8 text-muted-foreground">
              {filtered.length === 1 ? t("lib.memory", { n: filtered.length }) : t("lib.memories", { n: filtered.length })}
            </p>
            <div className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((c) => (
                <div key={c.id} className="border-2 border-foreground bg-card">
                  {c.image ? (
                    <img src={c.image} alt={c.title} className="aspect-[4/3] w-full object-cover" />
                  ) : (
                    <div className="grid aspect-[4/3] place-items-center bg-muted">
                      {c.kind === "people" ? (
                        <span className="type-display text-6xl text-foreground/25">
                          {c.title.charAt(0)}
                        </span>
                      ) : c.kind === "music" ? (
                        <Music className="size-10 text-foreground/30" />
                      ) : c.subtitle === "Favourite music" ? (
                        <Music className="size-10 text-foreground/30" />
                      ) : c.kind === "activities" ? (
                        <Footprints className="size-10 text-foreground/30" />
                      ) : (
                        <ImageIcon className="size-10 text-foreground/30" />
                      )}
                    </div>
                  )}
                  {c.kind === "people" && c.videoUrl ? (
                    <div className="border-t-2 border-foreground">
                      <p className="label-caps flex items-center gap-2 px-4 pt-3 text-swiss-blue">
                        <Video className="size-4" /> {t("lib.videoOf", { name: c.title.split(" ")[0] })}
                      </p>
                      <video
                        src={c.videoUrl}
                        controls
                        preload="metadata"
                        playsInline
                        className="mt-2 aspect-video w-full bg-black"
                      />
                    </div>
                  ) : null}
                  <div className="p-4">
                    <p className="text-xl font-bold">{c.title}</p>
                    <p className="mt-0.5 text-base text-muted-foreground">{c.subtitle}</p>
                    {c.body ? <p className="mt-2 text-base text-muted-foreground">{c.body}</p> : null}
                    {c.kind === "music" && c.audioSrc ? (
                      <button
                        type="button"
                        onClick={() => toggleSong(c)}
                        className={cn(
                          "label-caps mt-3 flex w-full items-center justify-center gap-2 border-2 px-4 py-3 text-sm font-bold tracking-widest transition-colors",
                          playingId === c.id
                            ? "border-swiss-red bg-swiss-red text-white"
                            : "border-foreground hover:bg-muted",
                        )}
                      >
                        {playingId === c.id ? (
                          <>
                            <Square className="size-4" /> Stop
                          </>
                        ) : (
                          <>
                            <Play className="size-4" /> Listen
                          </>
                        )}
                      </button>
                    ) : null}
                    {c.kind === "music" && c.spotifyUrl ? (
                      <a
                        href={c.spotifyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="label-caps mt-3 flex w-full items-center justify-center gap-2 border-2 border-foreground px-4 py-3 text-sm font-bold tracking-widest hover:bg-muted"
                      >
                        <Play className="size-4" /> {t("pm.openSpotify")}
                      </a>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="mt-12 flex items-center gap-3 border-t-2 border-foreground pt-6">
          <Users className="size-6 text-swiss-blue" />
          <p className="text-lg text-muted-foreground">
            {t("lib.talk")}{" "}
            <a href="/app/helpers" className="font-semibold text-swiss-blue underline underline-offset-4">
              {t("home.helpersLink")}
            </a>{" "}
            {t("lib.talkSuffix")}
          </p>
        </div>
      </div>
    </AppShell>
  );
}
