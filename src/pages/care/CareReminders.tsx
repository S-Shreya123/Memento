import { AppShell, useWorkspace, REMINDER_TYPES } from "@/components/smriti";
import { useLanguage } from "@/hooks/use-language";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Plus, Trash2, Pencil, X } from "lucide-react";

type Draft = {
  id?: string;
  type: "medicine" | "hydration" | "activity" | "appointment";
  title: string;
  detail: string;
  timeOfDay: string;
  recurrence: "daily" | "weekdays" | "weekends" | "once";
  onceDate: string;
};

const empty: Draft = { type: "medicine", title: "", detail: "", timeOfDay: "08:00", recurrence: "daily", onceDate: "" };

export default function CareReminders() {
  const { ready, summary } = useWorkspace();
  const { t } = useLanguage();
  const reminders = useQuery(api.smriti.getReminders, ready ? {} : "skip");
  const save = useMutation(api.smriti.saveReminder);
  const remove = useMutation(api.smriti.deleteReminder);
  const setStatus = useMutation(api.smriti.setReminderStatus);
  const [form, setForm] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  if (!ready) {
    return (
      <AppShell role="caregiver" subtitle="Reminders">
        <div className="swiss-container py-24 text-center text-xl text-muted-foreground">Loading…</div>
      </AppShell>
    );
  }

  const submit = async () => {
    if (!form || !form.title.trim()) return;
    setSaving(true);
    try {
      await save({
        id: form.id as never,
        type: form.type,
        title: form.title.trim(),
        detail: form.detail.trim() || undefined,
        timeOfDay: form.timeOfDay,
        recurrence: form.recurrence,
        onceDate: form.onceDate || undefined,
      });
      setForm(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell role="caregiver" subtitle="Reminders">
      <div className="swiss-container max-w-4xl py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label-caps text-swiss-red">{t("cr.caps")}</p>
            <h1 className="type-display mt-2 text-4xl md:text-5xl">{t("cr.title")}</h1>
            <p className="mt-2 text-lg text-muted-foreground">
              {t("cr.sub", { name: summary?.patient?.name?.split(" ")[0] ?? "" })}
            </p>
          </div>
          <Button className="h-12 px-5 text-base" onClick={() => setForm({ ...empty })}>
            <Plus className="size-5" /> {t("cr.new")}
          </Button>
        </div>

        <div className="mt-8 space-y-3">
          {(reminders ?? []).map((r) => (
            <div key={r._id} className="flex flex-wrap items-center gap-4 border-2 border-foreground bg-card p-4">
              <span className="text-3xl">{REMINDER_TYPES[r.type].emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xl font-bold">{r.title}</p>
                <p className="text-base text-muted-foreground">
                  {t(`rem.${r.type === "hydration" ? "water" : r.type}`)} · {t(`cr.rec${r.recurrence.charAt(0).toUpperCase()}${r.recurrence.slice(1)}`)}
                  {r.detail ? ` · ${r.detail}` : ""}
                </p>
              </div>
              <span className="num-mono text-2xl font-bold text-swiss-blue">{r.timeOfDay}</span>
              <span className={`label-caps border-2 px-2 py-1 ${r.status === "done" ? "border-swiss-blue text-swiss-blue" : "border-foreground/40 text-muted-foreground"}`}>
                {r.status === "done" ? t("cr.doneTag") : r.status}
              </span>
              <div className="flex gap-2">
                {r.status === "done" ? (
                  <Button variant="outline" size="sm" className="h-9 border-2" onClick={() => void setStatus({ id: r._id, status: "pending" })}>
                    {t("cr.reset")}
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 border-2"
                  onClick={() =>
                    setForm({
                      id: r._id,
                      type: r.type,
                      title: r.title,
                      detail: r.detail ?? "",
                      timeOfDay: r.timeOfDay,
                      recurrence: r.recurrence,
                      onceDate: r.onceDate ?? "",
                    })
                  }
                >
                  <Pencil className="size-4" />
                </Button>
                <Button variant="outline" size="sm" className="h-9 border-2 text-destructive" onClick={() => { if (confirm("Delete this reminder?")) void remove({ id: r._id }); }}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
          {(reminders ?? []).length === 0 ? (
            <p className="border-2 border-foreground bg-card p-6 text-lg text-muted-foreground">
              {t("cr.none")}
            </p>
          ) : null}
        </div>

        {form ? (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setForm(null)}>
            <div className="w-full max-w-lg border-2 border-foreground bg-card p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold">{form.id ? t("cr.editT") : t("cr.new")}</h3>
                <Button variant="ghost" size="icon" onClick={() => setForm(null)}><X className="size-5" /></Button>
              </div>
              <div className="mt-5 space-y-4">
                <div>
                  <label className="label-caps text-muted-foreground">{t("cr.typeL")}</label>
                  <div className="mt-1 grid grid-cols-4 gap-2">
                    {(Object.keys(REMINDER_TYPES) as Array<keyof typeof REMINDER_TYPES>).map((rt) => (
                      <button
                        key={rt}
                        type="button"
                        className={`border-2 py-3 text-base font-semibold ${form.type === rt ? "border-swiss-red bg-swiss-red text-white" : "border-foreground/40 hover:border-foreground"}`}
                        onClick={() => setForm({ ...form, type: rt })}
                      >
                        {REMINDER_TYPES[rt].emoji}
                        <span className="mt-1 block text-xs font-normal">{t(`rem.${rt === "hydration" ? "water" : rt}`)}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label-caps text-muted-foreground">{t("cr.titleL")}</label>
                  <Input className="mt-1 h-12 text-lg" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t("cr.titlePh")} />
                </div>
                <div>
                  <label className="label-caps text-muted-foreground">{t("cr.detailL")}</label>
                  <Input className="mt-1 h-12 text-lg" value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} placeholder={t("cr.detailPh")} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label-caps text-muted-foreground">{t("cr.timeL")}</label>
                    <Input type="time" className="mt-1 h-12 text-lg" value={form.timeOfDay} onChange={(e) => setForm({ ...form, timeOfDay: e.target.value })} />
                  </div>
                  <div>
                    <label className="label-caps text-muted-foreground">{t("cr.repeatsL")}</label>
                    <select
                      className="mt-1 h-12 w-full border-2 border-foreground bg-background px-3 text-lg"
                      value={form.recurrence}
                      onChange={(e) => setForm({ ...form, recurrence: e.target.value as Draft["recurrence"] })}
                    >
                      <option value="daily">{t("cr.everyDay")}</option>
                      <option value="weekdays">{t("cr.weekdays")}</option>
                      <option value="weekends">{t("cr.weekends")}</option>
                      <option value="once">{t("cr.once")}</option>
                    </select>
                  </div>
                </div>
                {form.recurrence === "once" ? (
                  <div>
                    <label className="label-caps text-muted-foreground">{t("cr.dateL")}</label>
                    <Input type="date" className="mt-1 h-12 text-lg" value={form.onceDate} onChange={(e) => setForm({ ...form, onceDate: e.target.value })} />
                  </div>
                ) : null}
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" className="h-12 border-2 px-6 text-base" onClick={() => setForm(null)}>{t("common.cancel")}</Button>
                  <Button className="h-12 px-6 text-base" disabled={saving || !form.title.trim()} onClick={submit}>{t("cr.save")}</Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
