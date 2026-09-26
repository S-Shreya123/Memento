import { AppShell, GameFrame, GameMusic } from "@/components/smriti";
import { useLanguage } from "@/hooks/use-language";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, Check, Lightbulb, RotateCcw, HeartHandshake, Play } from "lucide-react";
import { cn } from "@/lib/utils";

type Question = {
  key: string;
  kind: "askRelationship" | "askPerson";
  personName?: string;
  photoId?: string;
  prompt: string;
  options: string[];
  correctIx: number;
  correctAnswer: string;
  notes?: string;
};

type Round = {
  options: number;
  questions: Question[];
  needSetup?: boolean;
} | null;

/** "Who is your wife?" → "wife" (prompt ships with the question in English). */
function relFromPrompt(prompt: string): string {
  return prompt.replace(/^Who is your /, "").replace(/\?$/, "");
}

export default function TreeGame() {
  const navigate = useNavigate();
  const { t, trRel } = useLanguage();
  const [seed, setSeed] = useState(0);
  const round = useQuery(api.smriti.getGameRound, {
    activityType: "family_tree",
    count: 5,
    seed,
  }) as Round;
  const logAnswer = useMutation(api.smriti.logGameAnswer);
  const [qi, setQi] = useState(0);
  const [results, setResults] = useState<string[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [finished, setFinished] = useState(false);
  const [started, setStarted] = useState(false);

  // Snapshot the round ONCE, the first time it arrives — see PhotoGame. The
  // live query re-runs after every answer (adaptive difficulty), which would
  // otherwise swap the questions mid-session and mis-highlight options.
  const [session, setSession] = useState<Round>(null);
  const snapshottedRef = useRef(false);
  useEffect(() => {
    if (round === undefined || snapshottedRef.current) return;
    snapshottedRef.current = true;
    setSession(round);
  }, [round]);

  const questions = session?.questions ?? [];
  const q = questions[qi];

  useEffect(() => {
    setPicked(null);
    setLocked(false);
  }, [qi]);

  const commit = (outcome: string, optionIx: number | null) => {
    if (locked || !q) return;
    setLocked(true);
    setPicked(optionIx);
    setResults((r) => [...r, outcome]);
    void logAnswer({
      activityType: "family_tree",
      outcome: outcome as "correct" | "incorrect" | "hint_used" | "dont_remember",
      difficultyLevel: session?.options ?? 3,
      personName: q.correctAnswer,
    }).catch(() => {});
    window.setTimeout(() => {
      if (qi + 1 >= questions.length) setFinished(true);
      else setQi((x) => x + 1);
    }, outcome === "correct" ? 900 : 1700);
  };

  const restart = () => {
    setResults([]);
    setQi(0);
    setFinished(false);
    setStarted(false);
    setSeed((s) => s + 1);
    // Drop the snapshot so the fresh round is taken as-is.
    setSession(null);
    snapshottedRef.current = false;
  };

  if (round === undefined && session === null) {
    return (
      <AppShell role="patient">
        <div className="swiss-container py-24 text-center text-2xl text-muted-foreground">
          {t("common.gettingReady")}
        </div>
      </AppShell>
    );
  }

  const activeRound: Round = session ?? round;
  if (activeRound === null || activeRound.needSetup || activeRound.questions.length === 0) {
    return (
      <AppShell role="patient">
        <div className="swiss-container py-16">
          <div className="mx-auto max-w-2xl border-2 border-foreground bg-card p-8 text-center">
            <p className="label-caps text-swiss-blue">{t("pg.notReadyCaps")}</p>
            <h1 className="type-display mt-3 text-3xl md:text-4xl">
              {t("tg.needMore")}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">{t("tg.needMoreBody")}</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild className="h-14 px-8 text-lg bg-swiss-blue hover:bg-swiss-blue/90">
                <Link to="/care/family">{t("pg.goFamily")}</Link>
              </Button>
              <Button onClick={restart} variant="outline" className="h-14 px-8 text-lg border-2">
                <RotateCcw className="size-5" /> {t("common.retry")}
              </Button>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const showBoard = started && !finished && questions.length > 0;
  const n = results.length || 1;
  const correct = results.filter((r) => r === "correct").length;
  const gentle = results.filter((r) => r === "hint_used" || r === "dont_remember").length;

  return (
    <GameFrame>
      {/* ONE instance for the whole activity — mounted on the start screen,
          during play and on the summary, so the chosen song never stops. */}
      <GameMusic key="gm" results={results} playing={showBoard} showPicker={!started} />
      {!started ? (
        <div className="swiss-container max-w-3xl mx-auto py-10">
          <div>
            <Button variant="ghost" className="h-12 px-4 text-lg" onClick={() => navigate("/app")}>
              <ArrowLeft className="size-5" /> {t("nav.games")}
            </Button>
          </div>
          <div className="mt-4 border-2 border-foreground bg-card">
            <div className="h-2 bg-swiss-blue" />
            <div className="p-5 md:p-8">
              <p className="label-caps text-swiss-blue">{t("tg.caps")}</p>
              <h1 className="type-display mt-2 text-4xl md:text-5xl">{t("tg.ready")}</h1>
              <p className="mt-3 text-lg text-muted-foreground">
                {t("tg.waiting", { n: questions.length })}
              </p>
              <Button
                className="mt-8 h-16 w-full text-xl font-bold bg-swiss-blue hover:bg-swiss-blue/90"
                onClick={() => setStarted(true)}
              >
                <Play className="size-6" /> {t("pg.start")}
              </Button>
            </div>
          </div>
        </div>
      ) : finished ? (
        <div className="swiss-container py-16">
          <div className="mx-auto max-w-2xl border-2 border-foreground bg-card">
            <div className="h-2 bg-swiss-blue" />
            <div className="p-8 md:p-10">
              <p className="label-caps text-swiss-blue">{t("tg.done")}</p>
              <h1 className="type-display mt-3 text-4xl md:text-5xl">
                {t("tg.doneTitle")}
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">{t("tg.went", { n })}</p>
              <div className="mt-8 grid grid-cols-2 border-2 border-foreground">
                <div className="border-r-2 border-foreground p-5 text-center">
                  <p className="type-display num-mono text-5xl">{correct}</p>
                  <p className="label-caps mt-2 text-muted-foreground">{t("pg.confident")}</p>
                </div>
                <div className="p-5 text-center">
                  <p className="type-display num-mono text-5xl">{correct + gentle}</p>
                  <p className="label-caps mt-2 text-muted-foreground">{t("pg.moments")}</p>
                </div>
              </div>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button className="h-14 flex-1 text-lg bg-swiss-blue hover:bg-swiss-blue/90" onClick={restart}>
                  <RotateCcw className="size-5" /> {t("common.playAgain")}
                </Button>
                <Button asChild variant="outline" className="h-14 flex-1 text-lg border-2">
                  <Link to="/app">Back to games</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="swiss-container max-w-3xl mx-auto py-10">
          <div>
            <Button variant="ghost" className="h-12 px-4 text-lg" onClick={() => navigate("/app")}>
              <ArrowLeft className="size-5" /> {t("nav.games")}
            </Button>
          </div>
          <div className="mt-4 border-2 border-foreground bg-card">
          <div className="flex items-center justify-between border-b-2 border-foreground px-5 py-3">
            <span className="label-caps text-muted-foreground">
              {t("common.questionOf", { a: qi + 1, b: questions.length })}
            </span>
            <div className="flex gap-1">
              {questions.map((_, i) => (
                <span key={i} className={cn("h-2 w-8", i < qi ? "bg-swiss-blue" : i === qi ? "bg-swiss-red" : "bg-muted")} />
              ))}
            </div>
          </div>

          <div className="p-5 md:p-8">
            <p className="text-2xl md:text-3xl font-bold leading-snug">
              {q?.kind === "askPerson"
                ? t("tg.askWho", { rel: trRel(relFromPrompt(q.prompt)) })
                : t("tg.askRel", { name: q?.personName ?? "" })}
            </p>
            <p className="mt-2 text-lg text-muted-foreground">
              {q?.kind === "askPerson" ? t("tg.pickPerson") : t("tg.pickRel")}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {q?.options.map((name, ix) => {
                const isCorrect = ix === q.correctIx;
                const isPicked = picked === ix;
                return (
                  <button
                    key={`${ix}-${name}`}
                    disabled={locked}
                    onClick={() => commit(isCorrect ? "correct" : "incorrect", ix)}
                    className={cn(
                      "border-2 border-foreground bg-background px-5 py-6 text-left text-2xl font-semibold transition-all",
                      "hover:-translate-y-0.5 hover:bg-muted disabled:hover:translate-y-0",
                      locked && isCorrect && "bg-swiss-blue text-white",
                      locked && isPicked && !isCorrect && "bg-destructive text-white",
                    )}
                  >
                    {locked && isCorrect ? <Check className="mr-2 inline size-6" /> : null}
                    {q.kind === "askRelationship" ? trRel(name) : name}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button
                variant="outline"
                className="h-14 flex-1 text-lg border-2"
                disabled={locked}
                onClick={() => commit("hint_used", null)}
              >
                <Lightbulb className="size-5" /> {t("common.hint")}
              </Button>
              <Button
                variant="outline"
                className="h-14 flex-1 text-lg border-2"
                disabled={locked}
                onClick={() => commit("dont_remember", null)}
              >
                <HeartHandshake className="size-5" /> {t("common.dontRemember")}
              </Button>
            </div>
            {locked && picked === null ? (
              <div className="mt-4 border-2 border-swiss-blue p-4 text-xl">
                <span className="label-caps text-swiss-blue">
                  {results[results.length - 1] === "hint_used" ? t("common.hintCaps") : t("common.thatsOkay")}
                </span>
                <p className="mt-1">
                  {q?.kind === "askPerson"
                    ? t("tg.revealPerson", { name: q.correctAnswer, rel: trRel(relFromPrompt(q.prompt)) })
                    : t("tg.revealPerson", { name: q?.personName ?? "", rel: trRel(q?.correctAnswer ?? "") })}
                </p>
                {q?.notes ? <p className="mt-1 text-base text-muted-foreground">{q.notes}</p> : null}
              </div>
            ) : null}
          </div>
        </div>
        <p className="mt-4 text-center text-base text-muted-foreground">
          {t("tg.noScore")}
        </p>
      </div>
      )}
    </GameFrame>
  );
}
