import { GameFrame, GameMusic, useWorkspace } from "@/components/smriti";
import { useLanguage } from "@/hooks/use-language";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, Eye, PartyPopper, Play, Shuffle } from "lucide-react";
import { cn } from "@/lib/utils";

// Three fixed levels of difficulty, always on the same picture.
type Level = "easy" | "medium" | "hard";
const LEVELS: Record<Level, { pieces: number; cols: number; rows: number }> = {
  easy: { pieces: 9, cols: 3, rows: 3 },
  medium: { pieces: 16, cols: 4, rows: 4 },
  hard: { pieces: 25, cols: 5, rows: 5 },
};
const LEVEL_KEYS: Record<Level, string> = {
  easy: "common.easy",
  medium: "common.medium",
  hard: "common.hard",
};

function makeShuffle(n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  do {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  } while (arr.every((v, i) => v === i));
  return arr;
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function Jigsaw() {
  const navigate = useNavigate();
  const { ready } = useWorkspace();
  const { t } = useLanguage();
  const photos = useQuery(api.smriti.getPhotos, ready ? {} : "skip");
  const logSession = useMutation(api.smriti.logJigsawSession);

  const [photoIx, setPhotoIx] = useState(0);
  const [level, setLevel] = useState<Level>("easy");
  const [tiles, setTiles] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [peek, setPeek] = useState(false);
  const [peekCount, setPeekCount] = useState(0);
  const [done, setDone] = useState(false);
  const [started, setStarted] = useState(false);
  const loggedRef = useRef(false);

  const photo = !photos ? null : photos[Math.min(photoIx, photos.length - 1)] ?? null;
  const { cols, rows, pieces } = LEVELS[level];

  function reshuffle() {
    setTiles(makeShuffle(pieces));
    setSelected(null);
    setStartedAt(null);
    setElapsed(0);
    setMistakes(0);
    setPeek(false);
    setPeekCount(0);
    setDone(false);
    loggedRef.current = false;
  }

  useEffect(() => {
    if (photo) reshuffle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo?._id, pieces]);

  useEffect(() => {
    if (!startedAt || done) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 500);
    return () => clearInterval(t);
  }, [startedAt, done]);

  const solved = tiles.length === pieces && tiles.every((v, i) => v === i);

  useEffect(() => {
    if (solved && !done && !loggedRef.current && photo) {
      loggedRef.current = true;
      setDone(true);
      void logSession({
        pieceCount: pieces,
        timeSeconds: elapsed,
        mistakes,
        hints: peekCount,
        completed: true,
      }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solved, done]);

  function tap(ix: number) {
    if (done) return;
    if (startedAt === null) setStartedAt(Date.now());
    if (selected === null) {
      setSelected(ix);
      return;
    }
    if (selected === ix) {
      setSelected(null);
      return;
    }
    const t = [...tiles];
    const beforeOkA = t[selected] === selected;
    const beforeOkB = t[ix] === ix;
    const tmp = t[selected];
    t[selected] = t[ix];
    t[ix] = tmp;
    setTiles(t);
    const afterOkA = t[selected] === selected;
    const afterOkB = t[ix] === ix;
    if (!(afterOkA || afterOkB) && (beforeOkA || beforeOkB)) setMistakes((m) => m + 1);
    setSelected(null);
  }

  const startPuzzle = () => {
    setStarted(true);
    setDone(false);
  };

  const showBoard = started && !!photo && !done;
  const showDone = started && !!photo && done;

  return (
    <GameFrame>
      {/* ONE instance for the whole activity — mounted on the start screen,
          during play and on the summary, so the chosen song never stops. */}
      <GameMusic key="gm" results={[]} playing={showBoard} showPicker={!started} />

      {!started || !photo ? (
        // ── Start screen: difficulty preview, music, begin ──
        <div className="swiss-container max-w-3xl mx-auto py-10">
          <div>
            <Button variant="ghost" className="h-12 px-4 text-lg" onClick={() => navigate("/app")}>
              <ArrowLeft className="size-5" /> {t("nav.games")}
            </Button>
          </div>
          <div className="mt-4 border-2 border-foreground bg-card">
            <div className="h-2 bg-swiss-red" />
            <div className="p-5 md:p-8">
              {photos && photo ? (
                <>
                  <p className="label-caps text-swiss-red">{t("jg.caps")}</p>
                  <h1 className="type-display mt-2 text-4xl md:text-5xl">{t("jg.ready")}</h1>
                  <p className="mt-3 text-lg text-muted-foreground">
                    {t("jg.choose", { n: photos.length })}
                  </p>
                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    {(Object.keys(LEVELS) as Level[]).map((lv) => (
                      <button
                        key={lv}
                        type="button"
                        onClick={() => setLevel(lv)}
                        className={cn(
                          "border-2 px-4 py-5 text-left transition-colors",
                          level === lv
                            ? "border-swiss-red bg-muted"
                            : "border-foreground/30 hover:border-foreground",
                        )}
                      >
                        <span className="block text-2xl font-bold">{t(LEVEL_KEYS[lv])}</span>
                        <span className="label-caps text-muted-foreground">
                          {t("jg.piecesInfo", { c: LEVELS[lv].cols, r: LEVELS[lv].rows, n: LEVELS[lv].pieces })}
                        </span>
                      </button>
                    ))}
                  </div>
                  <Button className="mt-8 h-16 w-full text-xl font-bold" onClick={startPuzzle}>
                    <Play className="size-6" /> {t("jg.start")}
                  </Button>
                </>
              ) : photos ? (
                <>
                  <p className="label-caps text-swiss-red">{t("pg.notReadyCaps")}</p>
                  <h1 className="type-display mt-3 text-3xl md:text-4xl">{t("jg.needPhoto")}</h1>
                  <p className="mt-4 text-lg text-muted-foreground">{t("jg.needPhotoBody")}</p>
                  <Button asChild className="mt-8 h-14 px-8 text-lg">
                    <Link to="/care/family">{t("pg.goFamily")}</Link>
                  </Button>
                </>
              ) : (                  <p className="py-10 text-center text-2xl text-muted-foreground">
                  {t("common.gettingReady")}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : showDone ? (
        // ── Puzzle complete ──
        <div className="swiss-container py-16">
          <div className="mx-auto max-w-2xl border-2 border-foreground bg-card">
            <div className="h-2 bg-swiss-blue" />
            <div className="p-8 md:p-10 text-center">
              <PartyPopper className="mx-auto size-14 text-swiss-blue" />
              <p className="label-caps mt-4 text-swiss-blue">{t("jg.completeCaps")}</p>
              <h1 className="type-display mt-3 text-4xl md:text-5xl">{t("jg.complete")}</h1>
              <div className="mt-8 grid grid-cols-3 border-2 border-foreground">
                <div className="border-r-2 border-foreground p-4">
                  <p className="type-display num-mono text-4xl">{fmt(elapsed)}</p>
                  <p className="label-caps mt-2 text-muted-foreground">{t("jg.time")}</p>
                </div>
                <div className="border-r-2 border-foreground p-4">
                  <p className="type-display num-mono text-4xl">{mistakes}</p>
                  <p className="label-caps mt-2 text-muted-foreground">{t("jg.misplacements")}</p>
                </div>
                <div className="p-4">
                  <p className="type-display num-mono text-4xl">{peekCount}</p>
                  <p className="label-caps mt-2 text-muted-foreground">{t("jg.peeks")}</p>
                </div>
              </div>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button className="h-14 flex-1 text-lg" onClick={reshuffle}>
                  <Shuffle className="size-5" /> {t("jg.again")}
                </Button>
                {photos && photos.length > 1 ? (
                  <Button
                    variant="outline"
                    className="h-14 flex-1 border-2 text-lg"
                    onClick={() => {
                      setPhotoIx((i) => ((i + 1) % (photos?.length ?? 1)));
                      setDone(false);
                      setStarted(false);
                      loggedRef.current = false;
                    }}
                  >
                    {t("jg.another")}
                  </Button>
                ) : null}
                <Button asChild variant="outline" className="h-14 flex-1 border-2 text-lg">
                  <Link to="/app">Back to games</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // ── Playing ──
        <div className="swiss-container py-10">
          <div>
            <Button variant="ghost" className="h-12 px-4 text-lg" onClick={() => navigate("/app")}>
              <ArrowLeft className="size-5" /> {t("nav.games")}
            </Button>
          </div>

          <div className="mt-4 grid gap-6 lg:grid-cols-[320px_1fr]">
            <aside className="flex flex-col gap-4">
              <div className="border-2 border-foreground bg-card p-5">
                <p className="label-caps text-muted-foreground">{t("jg.photo")}</p>
                <div className="mt-3 space-y-2">
                  {(photos ?? []).map((p, i) => (
                    <button
                      key={p._id}
                      onClick={() => setPhotoIx(i)}
                      className={cn(
                        "flex w-full items-center gap-3 border-2 p-2 text-left transition-colors",
                        i === photoIx
                          ? "border-swiss-red bg-muted"
                          : "border-foreground/30 hover:border-foreground",
                      )}
                    >
                      <img src={p.dataUrl} alt={p.caption ?? "Photo"} className="size-12 object-cover" />
                      <span className="text-base font-semibold">{p.caption ?? t("jg.photoPh")}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-2 border-foreground bg-card p-5">
                <p className="label-caps text-muted-foreground">{t("jg.level")}</p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {(Object.keys(LEVELS) as Level[]).map((lv) => (
                    <button
                      key={lv}
                      onClick={() => setLevel(lv)}
                      className={cn(
                        "border-2 py-2 text-lg font-semibold",
                        level === lv
                          ? "border-swiss-red bg-swiss-red text-white"
                          : "border-foreground/30 hover:border-foreground",
                      )}
                    >
                      {t(LEVEL_KEYS[lv])}
                    </button>
                  ))}
                </div>
                <p className="label-caps mt-2 text-muted-foreground">
                  {t("jg.piecesInfo", { c: cols, r: rows, n: pieces })}
                </p>
                <p className="label-caps mt-5 text-muted-foreground">{t("jg.time")}</p>
                <p className="num-mono mt-1 text-3xl font-semibold">{fmt(elapsed)}</p>
                <p className="label-caps mt-4 text-muted-foreground">{t("jg.misplacements")}</p>
                <p className="num-mono text-3xl font-semibold">{mistakes}</p>
              </div>

              <div className="border-2 border-foreground bg-card p-5">
                <p className="label-caps text-muted-foreground">{t("jg.stuck")}</p>
                <Button
                  variant={peek ? "default" : "outline"}
                  className="mt-2 h-14 w-full border-2 text-lg"
                  onClick={() => {
                    if (!peek) setPeekCount((c) => c + 1);
                    setPeek((v) => !v);
                  }}
                >
                  <Eye className="size-5" /> {peek ? t("jg.back") : t("jg.peek")}
                </Button>
                <p className="mt-2 text-sm text-muted-foreground">{t("jg.peekAllowed")}</p>
              </div>
            </aside>

            <div className="border-2 border-foreground bg-card p-4 md:p-6">
              {peek ? (
                <div className="mx-auto" style={{ maxWidth: 560 }}>
                  <img
                    src={photo!.dataUrl}
                    alt="Reference"
                    className="aspect-square w-full border-2 border-foreground object-cover"
                  />
                  <p className="mt-3 text-center text-lg text-muted-foreground">
                    {t("jg.peekAllowed")}
                  </p>
                </div>
              ) : (
                <div className="mx-auto" style={{ maxWidth: 560 }}>
                  <div
                    className="grid aspect-square w-full border-2 border-foreground bg-muted"
                    style={{
                      gridTemplateColumns: `repeat(${cols}, 1fr)`,
                      gridTemplateRows: `repeat(${rows}, 1fr)`,
                    }}
                  >
                    {tiles.map((pieceIndex, ix) => {
                      const pc = pieceIndex % cols;
                      const pr = Math.floor(pieceIndex / cols);
                      return (
                        <button
                          key={ix}
                          onClick={() => tap(ix)}
                          aria-label={`Puzzle piece ${ix + 1}`}
                          className={cn(
                            "relative overflow-hidden border-0 p-0 transition-all",
                            selected === ix && "z-10 outline outline-4 -outline-offset-4 outline-swiss-red",
                          )}
                        >
                          {/* The inner div does the exact slicing. Percent-based
                              background-position on the button itself drifts the
                              crop off the slice (rounding plus edge slivers from
                              the border-box), which is why pieces used to look
                              misaligned and "not add up". overflow-hidden plus a
                              sized, edge-anchored background is pixel-exact. */}
                          <div
                            aria-hidden
                            className="absolute inset-0"
                            style={{
                              backgroundImage: `url(${photo!.dataUrl})`,
                              backgroundSize: `${cols * 100}% ${rows * 100}%`,
                              backgroundPosition: `${pc === 0 ? "0%" : pc === cols - 1 ? "100%" : `${(pc * 100) / (cols - 1)}%`} ${pr === 0 ? "0%" : pr === rows - 1 ? "100%" : `${(pr * 100) / (rows - 1)}%`}`,
                              backgroundRepeat: "no-repeat",
                            }}
                          />
                          <span className="num-mono absolute bottom-0.5 right-1 rounded-none bg-background/80 px-1 text-[10px] font-semibold">
                            {pieceIndex + 1}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-center text-lg text-muted-foreground">
                    {t("jg.guide")}
                    {selected !== null ? ` ${t("jg.selected")}` : ""}
                  </p>
                </div>
              )}
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Button variant="outline" className="h-14 flex-1 border-2 text-lg" onClick={reshuffle}>
                  <Shuffle className="size-5" /> {t("jg.shuffle")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </GameFrame>
  );
}
