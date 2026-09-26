import { AppShell, useWorkspace } from "@/components/smriti";
import { useLanguage } from "@/hooks/use-language";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { useQuery } from "convex/react";
import { Link } from "react-router";
import { Images, Network, Puzzle, ChevronRight, Clock } from "lucide-react";

const GAMES = [
  {
    to: "/app/game/photo",
    icon: Images,
    num: "01",
    titleKey: "home.game1t",
    descKey: "home.game1d",
    accent: "bg-swiss-red text-white",
  },
  {
    to: "/app/game/tree",
    icon: Network,
    num: "02",
    titleKey: "home.game2t",
    descKey: "home.game2d",
    accent: "bg-swiss-blue text-white",
  },
  {
    to: "/app/jigsaw",
    icon: Puzzle,
    num: "03",
    titleKey: "home.game3t",
    descKey: "home.game3d",
    accent: "bg-foreground text-background",
  },
];

export default function PatientHome() {
  const { summary, ready } = useWorkspace();
  const { t } = useLanguage();
  const reminders = useQuery(
    api.smriti.getReminders,
    ready ? {} : "skip",
  );

  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const upcoming = (reminders ?? [])
    .filter((r) => r.status !== "done")
    .sort((a, b) => (a.timeOfDay < b.timeOfDay ? -1 : 1))
    .find((r) => {
      const [h, m] = r.timeOfDay.split(":").map(Number);
      return h * 60 + m >= nowMinutes - 30;
    }) ?? (reminders ?? [])[0];

  return (
    <AppShell role="patient">
      <div className="swiss-container grid-bg py-10 md:py-14">
        {/* Greeting band */}
        <div className="border-2 border-foreground bg-card">
          <div className="flex flex-col gap-4 p-6 md:flex-row md:items-end md:justify-between md:p-8">
            <div>
              <p className="label-caps text-swiss-red">{t("home.caps")}</p>
              <h1 className="type-display mt-2 text-4xl md:text-6xl">
                {t("home.hello", { name: summary?.patient?.name?.split(" ")[0] ?? "" })}
              </h1>
              <p className="mt-3 max-w-xl text-lg md:text-xl text-muted-foreground">
                {t("home.sub")}
              </p>
            </div>
            {upcoming ? (
              <Link
                to="/app/reminders"
                className="border-2 border-foreground bg-background p-5 transition-colors hover:bg-muted md:min-w-[300px]"
              >
                <p className="label-caps flex items-center gap-2 text-muted-foreground">
                  <Clock className="size-4" /> {t("home.comingUp")}
                </p>
                <p className="mt-2 text-2xl font-bold leading-tight">
                  {upcoming.title}
                </p>
                <p className="num-mono mt-1 text-xl text-swiss-blue">
                  {upcoming.timeOfDay}
                </p>
              </Link>
            ) : null}
          </div>
          <div className="h-2 bg-swiss-red" />
        </div>

        {/* Games — the single must-have, front and center */}
        <h2 className="label-caps mt-12 mb-4 text-muted-foreground">
          {t("home.todays")}
        </h2>
        <div className="grid gap-5 md:grid-cols-3">
          {GAMES.map((g) => (
            <Link
              key={g.to}
              to={g.to}
              className="group flex flex-col border-2 border-foreground bg-card transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0_0_var(--foreground)]"
            >
              <div className={`flex items-center justify-between p-5 ${g.accent}`}>
                <g.icon className="size-10" strokeWidth={1.75} />
                <span className="type-display num-mono text-4xl opacity-40">
                  {g.num}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="text-2xl font-bold leading-snug">{t(g.titleKey)}</h3>
                <p className="mt-2 text-lg text-muted-foreground">{t(g.descKey)}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-lg font-semibold text-swiss-red">
                  {t("jg.start")}
                  <ChevronRight className="size-5 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t-2 border-foreground pt-6">
          <p className="text-lg text-muted-foreground">
            {t("home.needHelp")}{" "}
            <Link to="/app/helpers" className="font-semibold text-swiss-blue underline underline-offset-4">
              {t("home.helpersLink")}
            </Link>{" "}
            {t("home.helpersSuffix")}
          </p>
          <Link
            to="/app/library"
            className="border-2 border-foreground px-5 py-3 text-lg font-semibold transition-colors hover:bg-muted"
          >
            {t("home.browse")}
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
