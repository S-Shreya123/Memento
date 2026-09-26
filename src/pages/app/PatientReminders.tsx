import { AppShell, useWorkspace, REMINDER_TYPES } from "@/components/smriti";
import { useLanguage } from "@/hooks/use-language";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery } from "convex/react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

function minutesOf(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export default function PatientReminders() {
  const { ready } = useWorkspace();
  const { t } = useLanguage();
  const reminders = useQuery(api.smriti.getReminders, ready ? {} : "skip");
  const setStatus = useMutation(api.smriti.setReminderStatus);
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

  const upcoming = (reminders ?? []).filter(
    (r) => r.status !== "done" && minutesOf(r.timeOfDay) >= nowMinutes - 60,
  );
  const later = (reminders ?? []).filter(
    (r) => r.status !== "done" && minutesOf(r.timeOfDay) < nowMinutes - 60,
  );
  const doneToday = (reminders ?? []).filter((r) => r.status === "done");

  return (
    <AppShell role="patient">
      <div className="swiss-container max-w-4xl py-10">
        <h1 className="type-display text-4xl md:text-5xl">{t("pr.title")}</h1>
        <p className="mt-3 text-lg text-muted-foreground">{t("pr.sub")}</p>

        {reminders === undefined ? (
          <p className="mt-10 text-xl text-muted-foreground">Loading…</p>
        ) : (
          <div className="mt-8 space-y-8">
            <section>
              <p className="label-caps mb-3 text-muted-foreground">{t("pr.comingUp")}</p>
              {upcoming.length === 0 ? (
                <p className="border-2 border-foreground bg-card p-6 text-xl">
                  {t("pr.nothingMore")}
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {upcoming.map((r) => {
                    const rt = REMINDER_TYPES[r.type];
                    return (
                      <div key={r._id} className="border-2 border-foreground bg-card p-5">
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-4xl">{rt.emoji}</span>
                          <span className="num-mono text-2xl font-bold text-swiss-blue">{r.timeOfDay}</span>
                        </div>
                        <p className="mt-3 text-2xl font-bold leading-snug">{r.title}</p>
                        {r.detail ? <p className="mt-1 text-lg text-muted-foreground">{r.detail}</p> : null}
                        <Button
                          className="mt-4 h-14 w-full text-lg"
                          onClick={() => void setStatus({ id: r._id, status: "done" })}
                        >
                          <Check className="size-5" /> {t("pr.done")}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {later.length > 0 ? (
              <section>
                <p className="label-caps mb-3 text-muted-foreground">{t("pr.later")}</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {later.map((r) => (
                    <div key={r._id} className="border-2 border-foreground/50 bg-card p-5">
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-4xl">{REMINDER_TYPES[r.type].emoji}</span>
                        <span className="num-mono text-2xl font-bold text-muted-foreground">{r.timeOfDay}</span>
                      </div>
                      <p className="mt-3 text-2xl font-bold leading-snug">{r.title}</p>
                      {r.detail ? <p className="mt-1 text-lg text-muted-foreground">{r.detail}</p> : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {doneToday.length > 0 ? (
              <section>
                <p className="label-caps mb-3 text-muted-foreground">{t("pr.completed")}</p>
                <div className="flex flex-wrap gap-2">
                  {doneToday.map((r) => (
                    <span key={r._id} className="border-2 border-swiss-blue bg-muted px-4 py-2 text-lg font-semibold">
                      {REMINDER_TYPES[r.type].emoji} {r.title} · {r.timeOfDay}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </AppShell>
  );
}
