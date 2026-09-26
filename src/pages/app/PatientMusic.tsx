import { AppShell, useWorkspace } from "@/components/smriti";
import { useLanguage } from "@/hooks/use-language";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Activity, Music, Play, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { demoToneUrl } from "@/lib/demoTones";

type TrackRow = {
  _id: string;
  title: string;
  source: "spotify" | "upload";
  spotifyUrl?: string;
  dataUrl?: string;
  audioUrl?: string;
  demo?: boolean;
};

function playableSrc(t: TrackRow): string | undefined {
  if (t.source === "spotify") return undefined;
  if (t.dataUrl?.startsWith("demo:")) return demoToneUrl(t.dataUrl.slice(5));
  return t.audioUrl ?? t.dataUrl ?? undefined;
}

export default function PatientMusic() {
  const { ready } = useWorkspace();
  const { t } = useLanguage();
  const tracks = useQuery(api.smriti.getMusicTracks, ready ? {} : "skip");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  // Songs never keep playing after this page is left.
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const toggle = (t: TrackRow) => {
    if (playingId === t._id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    const src = playableSrc(t);
    if (!src) return;
    audioRef.current?.pause();
    const el = new Audio(src);
    el.volume = 0.85;
    audioRef.current = el;
    setPlayingId(t._id);
    el.play().catch(() => setPlayingId(null));
    el.onended = () => setPlayingId(null);
  };

  return (
    <AppShell role="patient" subtitle="Music">
      <div className="swiss-container max-w-4xl py-10">
        <p className="label-caps text-swiss-red">{t("pm.caps")}</p>
        <h1 className="type-display mt-2 text-4xl md:text-5xl">{t("pm.title")}</h1>
        <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{t("pm.sub")}</p>

        <div className="mt-6 flex items-center gap-3 border-2 border-swiss-blue bg-card p-5">
          <Activity className="size-8 shrink-0 text-swiss-blue" />
          <p className="text-lg">{t("pm.note")}</p>
        </div>

        {tracks === undefined ? (
          <p className="mt-10 text-xl text-muted-foreground">Loading…</p>
        ) : tracks.length === 0 ? (
          <p className="mt-8 border-2 border-dashed border-foreground/30 p-6 text-lg text-muted-foreground">
            {t("pm.preparing")}
          </p>
        ) : (
          <div className="mt-8 space-y-3">
            {tracks.map((track) => (
              <div
                key={track._id}
                className={cn(
                  "flex flex-wrap items-center justify-between gap-3 border-2 px-5 py-4",
                  playingId === track._id ? "border-swiss-red bg-muted" : "border-foreground",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xl font-bold">{track.title}</p>
                  <p className="label-caps text-muted-foreground">
                    {track.source === "spotify"
                      ? t("pm.spotify")
                      : track.demo
                        ? t("pm.builtIn")
                        : t("pm.familyUpload")}
                  </p>
                </div>
                {track.source === "spotify" && track.spotifyUrl ? (
                  <a
                    href={track.spotifyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="label-caps shrink-0 border-2 border-foreground px-4 py-2.5 text-sm font-bold tracking-widest hover:bg-muted"
                  >
                    {t("pm.openSpotify")}
                  </a>
                ) : (
                  <Button
                    variant={playingId === track._id ? "default" : "outline"}
                    className={cn("h-12 shrink-0 border-2 px-6 text-base")}
                    onClick={() => toggle(track)}
                  >
                    {playingId === track._id ? (
                      <>
                        <Square className="size-5" /> {t("pm.stop")}
                      </>
                    ) : (
                      <>
                        <Play className="size-5" /> {t("pm.listen")}
                      </>
                    )}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-10 flex items-center gap-3 border-t-2 border-foreground pt-6">
          <Music className="size-6 text-swiss-blue" />
          <p className="text-lg text-muted-foreground">
            {t("pm.ready")}{" "}
            <Link to="/app" className="font-semibold text-swiss-blue underline underline-offset-4">
              {t("pm.choose")}
            </Link>{" "}
            {t("pm.andPick")}
          </p>
        </div>
      </div>
    </AppShell>
  );
}
