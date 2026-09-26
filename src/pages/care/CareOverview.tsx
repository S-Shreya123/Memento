import { AppShell, useWorkspace } from "@/components/smriti";
import { useLanguage } from "@/hooks/use-language";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { useQuery } from "convex/react";
import { Link } from "react-router";
import { Images, Network, Puzzle, BellRing } from "lucide-react";

export default function CareOverview() {
  const { summary } = useWorkspace();
  const { t } = useLanguage();
  const stats = useQuery(api.smriti.getActivityStats, summary?.patient ? {} : "skip");

  const maxDaily = Math.max(1, ...(stats?.daily ?? []).map((d) => d.games + d.jigsaw));
  const photoTotal = stats?.totals.photoAnswers ?? 0;
  const treeTotal = stats?.totals.treeAnswers ?? 0;

  return (
    <AppShell role="caregiver" subtitle="Overview">
      <div className="swiss-container py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label-caps text-swiss-red">Caregiver dashboard</p>
            <h1 className="type-display mt-2 text-4xl md:text-5xl">{summary?.patient?.name ?? "—"}</h1>
            <p className="mt-2 text-lg text-muted-foreground">
              {t("co.sub", {
                lang: summary?.patient?.preferredLanguage ?? "—",
                name: summary?.patient?.name?.split(" ")[0] ?? "",
              })}
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" className="h-12 border-2 px-5 text-base">
              <Link to="/care/family">{t("co.editFamily")}</Link>
            </Button>
            <Button asChild className="h-12 px-5 text-base">
              <Link to="/care/profile">{t("co.editProfile")}</Link>
            </Button>
          </div>
        </div>

        {/* 14-day engagement */}
        <section className="mt-10">
          <div className="flex items-end justify-between">
            <h2 className="text-2xl font-bold">{t("co.last14")}</h2>
            <p className="label-caps text-muted-foreground">
              {t("co.legendGames")} · {t("co.legendJigsaw")}
            </p>
          </div>
          <div className="mt-4 border-2 border-foreground bg-card p-5">
            <div className="flex h-36 items-end gap-1.5">
              {stats == null ? (
                <p className="text-muted-foreground">Loading…</p>
              ) : (
                stats.daily.map((d) => (
                    <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                      <div className="flex h-28 w-full flex-col justify-end gap-0.5">
                        <div className="w-full bg-swiss-blue" style={{ height: `${(d.jigsaw / maxDaily) * 100}%` }} />
                        <div className="w-full bg-swiss-red" style={{ height: `${(d.games / maxDaily) * 100}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{d.day.slice(8)}</span>
                    </div>
                  ))
              )}
            </div>
            <div className="mt-4 flex gap-6 border-t-2 border-foreground pt-3">
              <span className="flex items-center gap-2 text-sm"><span className="size-3 bg-swiss-red" /> {t("co.legendGames")}</span>
              <span className="flex items-center gap-2 text-sm"><span className="size-3 bg-swiss-blue" /> {t("co.legendJigsaw")}</span>
            </div>
          </div>
        </section>

        {/* Game stats */}
        <section className="mt-10 grid gap-5 md:grid-cols-3">
          <div className="border-2 border-foreground bg-card p-5">
            <div className="flex items-center justify-between">
              <Images className="size-6 text-swiss-red" />
              <span className="label-caps text-muted-foreground">{t("co.level", { n: stats?.levels.photoLevel ?? "—" })}</span>
            </div>
            <p className="mt-3 text-2xl font-bold">{t("co.photoGame")}</p>
            <div className="mt-3 grid grid-cols-3 border-2 border-foreground text-center">
              <div className="border-r-2 border-foreground p-2">
                <p className="num-mono text-2xl font-bold">{stats?.totals.photoCorrect ?? 0}</p>
                <p className="text-xs text-muted-foreground">{t("co.correct")}</p>
              </div>
              <div className="border-r-2 border-foreground p-2">
                <p className="num-mono text-2xl font-bold">{stats?.totals.photoHintOrSkip ?? 0}</p>
                <p className="text-xs text-muted-foreground">{t("co.hintOrSkip")}</p>
              </div>
              <div className="p-2">
                <p className="num-mono text-2xl font-bold">{stats?.totals.photoAnswers ?? 0}</p>
                <p className="text-xs text-muted-foreground">{t("co.total")}</p>
              </div>
            </div>
          </div>

          <div className="border-2 border-foreground bg-card p-5">
            <div className="flex items-center justify-between">
              <Network className="size-6 text-swiss-blue" />
              <span className="label-caps text-muted-foreground">{t("co.level", { n: stats?.levels.relationshipLevel ?? "—" })}</span>
            </div>
            <p className="mt-3 text-2xl font-bold">{t("co.treeGame")}</p>
            <div className="mt-3 grid grid-cols-3 border-2 border-foreground text-center">
              <div className="border-r-2 border-foreground p-2">
                <p className="num-mono text-2xl font-bold">{stats?.totals.treeCorrect ?? 0}</p>
                <p className="text-xs text-muted-foreground">{t("co.correct")}</p>
              </div>
              <div className="border-r-2 border-foreground p-2">
                <p className="num-mono text-2xl font-bold">{stats?.totals.treeHintOrSkip ?? 0}</p>
                <p className="text-xs text-muted-foreground">{t("co.hintOrSkip")}</p>
              </div>
              <div className="p-2">
                <p className="num-mono text-2xl font-bold">{stats?.totals.treeAnswers ?? 0}</p>
                <p className="text-xs text-muted-foreground">{t("co.total")}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {t("co.engagementNote")}
            </p>
          </div>

          <div className="border-2 border-foreground bg-card p-5">
            <div className="flex items-center justify-between">
              <Puzzle className="size-6 text-foreground" />
              <span className="label-caps text-muted-foreground">{t("co.completedN", { n: stats?.totals.jigsawCompleted ?? 0 })}</span>
            </div>
            <p className="mt-3 text-2xl font-bold">{t("co.actJigsaw")}</p>
            <div className="mt-3 space-y-2">
              {(stats?.jigsaw ?? []).slice(0, 5).map((j) => (
                <div key={j._id} className="flex items-center justify-between border-b border-border pb-2 text-base">
                  <span className="num-mono font-semibold">{j.pieceCount} {t("co.pcs")}</span>
                  <span className="num-mono text-muted-foreground">
                    {j.timeSeconds != null ? `${Math.floor(j.timeSeconds / 60)}:${String(j.timeSeconds % 60).padStart(2, "0")}` : "—"}
                  </span>
                  <span className="num-mono text-muted-foreground">{j.mistakes ?? 0} {t("co.mislaid")}</span>
                  <span className="num-mono text-muted-foreground">{j.hints ?? 0} {t("co.peeks")}</span>
                </div>
              ))}
              {(stats?.jigsaw ?? []).length === 0 ? (
                <p className="text-base text-muted-foreground">{t("co.noPuzzles")}</p>
              ) : null}
            </div>
          </div>
        </section>

        {/* Reminders + recent */}
        <section className="mt-10 grid gap-5 lg:grid-cols-2">
          <div className="border-2 border-foreground bg-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">{t("co.remindersToday")}</h2>
              <BellRing className="size-6 text-swiss-red" />
            </div>
            <p className="mt-2 num-mono text-4xl font-bold">
              {stats?.reminderStats.doneToday ?? 0}/{stats?.reminderStats.total ?? 0}
            </p>
            <p className="text-sm text-muted-foreground">{t("co.doneToday")}</p>
            <Button asChild variant="outline" className="mt-4 h-11 border-2">
              <Link to="/care/reminders">{t("co.manage")}</Link>
            </Button>
          </div>
          <div className="border-2 border-foreground bg-card p-5">
            <h2 className="text-2xl font-bold">{t("co.recent")}</h2>
            <div className="mt-3 divide-y divide-border">
              {(stats?.recent ?? []).map((l) => (
                <div key={l._id} className="flex items-center justify-between py-2 text-base">
                  <span className="font-semibold">
                    {l.activityType === "photo_recognition" ? t("co.actPhoto") : l.activityType === "family_tree" ? t("co.actTree") : t("co.actJigsaw")}
                  </span>
                  <span className="text-muted-foreground">
                    {l.outcome === "correct" ? t("co.oCorrect") : l.outcome === "incorrect" ? t("co.oIncorrect") : l.outcome === "hint_used" ? t("co.oHint") : t("co.oLater")}
                  </span>
                  <span className="num-mono text-sm text-muted-foreground">
                    {new Date(l.at).toLocaleDateString(undefined, { day: "2-digit", month: "short" })} {new Date(l.at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
              {(stats?.recent ?? []).length === 0 ? (
                <p className="py-2 text-base text-muted-foreground">{t("co.nothingLogged")}</p>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
