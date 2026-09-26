import { AppShell, useWorkspace } from "@/components/smriti";
import { useLanguage } from "@/hooks/use-language";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { Link as LinkIcon, Music, Plus, Trash2, Upload } from "lucide-react";
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

export default function CareMusic() {
  const { ready } = useWorkspace();
  const { t } = useLanguage();
  const tracks = useQuery(api.smriti.getMusicTracks, ready ? {} : "skip");
  const generateUploadUrl = useMutation(api.smriti.generateUploadUrl);
  const finalizeUpload = useMutation(api.smriti.finalizeTrackUpload);
  const saveSpotify = useMutation(api.smriti.saveSpotifyTrack);
  const removeTrack = useMutation(api.smriti.deleteMusicTrack);

  const [spotifyTitle, setSpotifyTitle] = useState("");
  const [spotifyUrl, setSpotifyUrl] = useState("");
  const [spotifyError, setSpotifyError] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<"idle" | "working" | "error">("idle");
  const fileRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);

  // Stop any preview when leaving the page.
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const togglePreview = (t: TrackRow) => {
    if (previewId === t._id) {
      audioRef.current?.pause();
      setPreviewId(null);
      return;
    }
    const src = playableSrc(t);
    if (!src) return;
    audioRef.current?.pause();
    const el = new Audio(src);
    audioRef.current = el;
    setPreviewId(t._id);
    el.play().catch(() => setPreviewId(null));
    el.onended = () => setPreviewId(null);
  };

  const submitSpotify = async () => {
    setSpotifyError(null);
    const url = spotifyUrl.trim();
    if (!spotifyTitle.trim() || !url) return;
    if (!/^https:\/\/(open\.)?spotify\.com\//i.test(url) && !url.startsWith("spotify:")) {
      setSpotifyError(t("cm.spotifyErr"));
      return;
    }
    try {
      await saveSpotify({ title: spotifyTitle.trim(), spotifyUrl: url });
      setSpotifyTitle("");
      setSpotifyUrl("");
    } catch (e) {
      setSpotifyError(e instanceof Error ? e.message : "Could not save that link.");
    }
  };

  const onPickFile = (file: File | undefined) => {
    if (!file) return;
    setUploadState("working");
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const buffer = reader.result as ArrayBuffer;
        const postUrl = await generateUploadUrl({});
        const res = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": file.type || "audio/mpeg" },
          body: buffer,
        });
        const { storageId } = (await res.json()) as { storageId: string };
        const title = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Uploaded song";
        await finalizeUpload({ title, storageId: storageId as never, fileName: file.name });
        setUploadState("idle");
      } catch (e) {
        setUploadState("error");
      }
    };
    reader.onerror = () => setUploadState("error");
    reader.readAsArrayBuffer(file);
  };

  return (
    <AppShell role="caregiver" subtitle="Music">
      <div className="swiss-container max-w-5xl py-10">
        <div>
          <p className="label-caps text-swiss-red">{t("cm.caps")}</p>
          <h1 className="type-display mt-2 text-4xl md:text-5xl">{t("cm.title")}</h1>
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
            {t("cm.sub")}
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          {/* Spotify link */}
          <div className="border-2 border-foreground bg-card p-6">
            <div className="flex items-center gap-3">
              <LinkIcon className="size-6 text-swiss-blue" />
              <h2 className="text-2xl font-bold">{t("cm.spotifyT")}</h2>
            </div>
            <p className="mt-2 text-base text-muted-foreground">
              {t("cm.spotifyHint")}
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="label-caps text-muted-foreground">{t("cm.titleL")}</label>
                <Input
                  className="mt-1 h-12 text-lg"
                  value={spotifyTitle}
                  onChange={(e) => setSpotifyTitle(e.target.value)}
                  placeholder={t("cm.titlePh")}
                />
              </div>
              <div>
                <label className="label-caps text-muted-foreground">{t("cm.linkL")}</label>
                <Input
                  className="mt-1 h-12 text-lg"
                  value={spotifyUrl}
                  onChange={(e) => setSpotifyUrl(e.target.value)}
                  placeholder={t("cm.linkPh")}
                />
              </div>
              {spotifyError ? <p className="text-base text-destructive">{spotifyError}</p> : null}
              <Button
                className="h-12 w-full px-5 text-base"
                disabled={!spotifyTitle.trim() || !spotifyUrl.trim()}
                onClick={submitSpotify}
              >
                <Plus className="size-5" /> {t("cm.saveSpotify")}
              </Button>
            </div>
          </div>

          {/* File upload */}
          <div className="border-2 border-foreground bg-card p-6">
            <div className="flex items-center gap-3">
              <Upload className="size-6 text-swiss-red" />
              <h2 className="text-2xl font-bold">{t("cm.uploadT")}</h2>
            </div>
            <p className="mt-2 text-base text-muted-foreground">
              {t("cm.uploadHint")}
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => {
                void onPickFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <Button
              variant="outline"
              className="mt-4 h-14 w-full border-2 text-base"
              disabled={uploadState === "working"}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="size-5" />
              {uploadState === "working" ? t("cm.uploading") : t("cm.chooseFile")}
            </Button>
            {uploadState === "error" ? (
              <p className="mt-3 text-base text-destructive">
                {t("cm.uploadErr")}
              </p>
            ) : null}
          </div>
        </div>

        {/* Track list */}
        <section className="mt-12">
          <div className="flex items-center gap-3">
            <Music className="size-6 text-swiss-blue" />
            <h2 className="text-2xl font-bold">
              {t("cm.listT")} ({tracks?.length ?? 0})
            </h2>
          </div>
          {tracks === undefined ? (
            <p className="mt-4 text-lg text-muted-foreground">Loading…</p>
          ) : tracks.length === 0 ? (
            <p className="mt-4 border-2 border-dashed border-foreground/30 p-6 text-lg text-muted-foreground">
              {t("cm.noSongs")}
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {tracks.map((track) => {
                const src = playableSrc(track);
                return (
                  <div
                    key={track._id}
                    className={cn(
                      "flex flex-wrap items-center justify-between gap-3 border-2 px-4 py-3",
                      previewId === track._id ? "border-swiss-red bg-muted" : "border-foreground/30",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg font-bold">{track.title}</p>
                      <p className="label-caps text-muted-foreground">
                        {track.source === "spotify"
                          ? t("pm.spotify")
                          : track.demo
                            ? t("cm.builtIn")
                            : `${t("cm.uploaded")}${track.fileName ? ` · ${track.fileName}` : ""}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {track.source === "spotify" && track.spotifyUrl ? (
                        <a
                          href={track.spotifyUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="label-caps border-2 border-foreground/30 px-3 py-1.5 text-xs text-muted-foreground hover:border-foreground"
                        >
                          {t("cm.openSpotify")}
                        </a>
                      ) : src ? (
                        <button
                          type="button"
                          className="label-caps border-2 border-foreground/30 px-3 py-1.5 text-xs text-muted-foreground hover:border-foreground"
                          onClick={() => togglePreview(track)}
                        >
                          {previewId === track._id ? t("cm.stop") : t("cm.tryIt")}
                        </button>
                      ) : null}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 border-2 text-destructive"
                        onClick={() => {
                          if (confirm(t("cm.deleteQ", { t: track.title }))) {
                            if (previewId === track._id) togglePreview(track);
                            void removeTrack({ id: track._id });
                          }
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className="mt-12 flex items-center gap-3 border-t-2 border-foreground pt-6">
          <Music className="size-6 text-swiss-blue" />
          <p className="text-lg text-muted-foreground">
            {t("cm.footer")}
          </p>
        </div>
      </div>
    </AppShell>
  );
}
