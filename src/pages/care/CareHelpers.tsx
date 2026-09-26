import { AppShell, useWorkspace, HELPER_ROLES } from "@/components/smriti";
import { useLanguage } from "@/hooks/use-language";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Plus, Trash2, Pencil, X, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

type Draft = {
  id?: string;
  name: string;
  role: "volunteer" | "community_helper" | "local_language_speaker" | "healthcare_professional";
  languages: string;
  phone: string;
  area: string;
  notes: string;
};

const empty: Draft = { name: "", role: "volunteer", languages: "Assamese, English", phone: "", area: "", notes: "" };

export default function CareHelpers() {
  const { ready } = useWorkspace();
  const { t } = useLanguage();
  const helpers = useQuery(api.smriti.getHelpers, ready ? {} : "skip");
  const save = useMutation(api.smriti.saveHelper);
  const remove = useMutation(api.smriti.deleteHelper);
  const [form, setForm] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  if (!ready) {
    return (
      <AppShell role="caregiver" subtitle="Helpers">
        <div className="swiss-container py-24 text-center text-xl text-muted-foreground">Loading…</div>
      </AppShell>
    );
  }

  const submit = async () => {
    if (!form || !form.name.trim() || !form.phone.trim()) return;
    setSaving(true);
    try {
      await save({
        id: form.id as never,
        name: form.name.trim(),
        role: form.role,
        languages: form.languages.split(",").map((s) => s.trim()).filter(Boolean),
        phone: form.phone.trim(),
        area: form.area.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      setForm(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell role="caregiver" subtitle="Helpers">
      <div className="swiss-container max-w-4xl py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label-caps text-swiss-red">{t("ch.caps")}</p>
            <h1 className="type-display mt-2 text-4xl md:text-5xl">{t("ch.title")}</h1>
            <p className="mt-2 text-lg text-muted-foreground">{t("ch.sub")}</p>
          </div>
          <Button className="h-12 px-5 text-base" onClick={() => setForm({ ...empty })}>
            <Plus className="size-5" /> {t("ch.add")}
          </Button>
        </div>

        <div className="mt-8 space-y-3">
          {(helpers ?? []).map((h) => {
            const role = HELPER_ROLES[h.role];
            return (
              <div key={h._id} className="flex flex-wrap items-center gap-4 border-2 border-foreground bg-card p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <p className="text-xl font-bold">{h.name}</p>
                    <span className={cn("label-caps border-2 px-2 py-0.5", role.color)}>{t(role.key)}</span>
                  </div>
                  <p className="text-base text-muted-foreground">
                    {h.languages.join(", ")}
                    {h.area ? ` · ${h.area}` : ""}
                    {h.notes ? ` · ${h.notes}` : ""}
                  </p>
                </div>
                <a href={`tel:${h.phone.replace(/\s/g, "")}`} className="num-mono text-lg font-semibold text-swiss-blue hover:underline">
                  {h.phone}
                </a>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 border-2"
                    onClick={() =>
                      setForm({
                        id: h._id,
                        name: h.name,
                        role: h.role,
                        languages: h.languages.join(", "),
                        phone: h.phone,
                        area: h.area ?? "",
                        notes: h.notes ?? "",
                      })
                    }
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-9 border-2 text-destructive" onClick={() => { if (confirm(t("ch.deleteQ"))) void remove({ id: h._id }); }}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            );
          })}
          {(helpers ?? []).length === 0 ? (
            <p className="border-2 border-foreground bg-card p-6 text-lg text-muted-foreground">
              {t("ch.none")}
            </p>
          ) : null}
        </div>

        {form ? (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setForm(null)}>
            <div className="w-full max-w-lg border-2 border-foreground bg-card p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold">{form.id ? t("ch.editT") : t("ch.addT")}</h3>
                <Button variant="ghost" size="icon" onClick={() => setForm(null)}><X className="size-5" /></Button>
              </div>
              <div className="mt-5 space-y-4">
                <div>
                  <label className="label-caps text-muted-foreground">{t("ch.nameL")}</label>
                  <Input className="mt-1 h-12 text-lg" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("ch.namePh")} />
                </div>
                <div>
                  <label className="label-caps text-muted-foreground">{t("ch.roleL")}</label>
                  <select
                    className="mt-1 h-12 w-full border-2 border-foreground bg-background px-3 text-lg"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as Draft["role"] })}
                  >
                    <option value="volunteer">{t("role.volunteer")}</option>
                    <option value="community_helper">{t("role.community")}</option>
                    <option value="local_language_speaker">{t("role.language")}</option>
                    <option value="healthcare_professional">{t("role.professional")}</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label-caps text-muted-foreground">{t("ch.langsL")}</label>
                    <Input className="mt-1 h-12 text-lg" value={form.languages} onChange={(e) => setForm({ ...form, languages: e.target.value })} />
                  </div>
                  <div>
                    <label className="label-caps text-muted-foreground">{t("ch.phoneL")}</label>
                    <Input className="mt-1 h-12 text-lg" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 …" />
                  </div>
                </div>
                <div>
                  <label className="label-caps text-muted-foreground">{t("ch.areaL")}</label>
                  <Input className="mt-1 h-12 text-lg" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder={t("ch.areaPh")} />
                </div>
                <div>
                  <label className="label-caps text-muted-foreground">{t("ch.notesL")}</label>
                  <Input className="mt-1 h-12 text-lg" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder={t("ch.notesPh")} />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" className="h-12 border-2 px-6 text-base" onClick={() => setForm(null)}>{t("common.cancel")}</Button>
                  <Button className="h-12 px-6 text-base" disabled={saving || !form.name.trim() || !form.phone.trim()} onClick={submit}>{t("ch.save")}</Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
