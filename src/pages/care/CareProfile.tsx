import { AppShell, useWorkspace } from "@/components/smriti";
import { useLanguage } from "@/hooks/use-language";
import { LANGUAGES, languageEnglishName, type LangCode } from "@/lib/i18n";

import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { X, Plus, Save } from "lucide-react";
import { cn } from "@/lib/utils";

type EventDraft = { label: string; detail?: string };

function ChipList({
  title,
  placeholder,
  items,
  onChange,
}: {
  title: string;
  placeholder: string;
  items: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const { t } = useLanguage();
  return (
    <div className="border-2 border-foreground bg-card p-5">
      <p className="label-caps text-muted-foreground">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.length === 0 ? (
          <span className="text-base italic text-muted-foreground/60">{t("cp.noneYet")}</span>
        ) : (
          items.map((it, i) => (
            <span key={`${it}-${i}`} className="flex items-center gap-2 border-2 border-foreground px-3 py-1.5 text-base font-semibold">
              {it}
              <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={t("cp.removeAria", { x: it })}>
                <X className="size-4 text-muted-foreground hover:text-destructive" />
              </button>
            </span>
          ))
        )}
      </div>
      <div className="mt-4 flex gap-2">
        <Input
          className="h-12 text-lg"
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) {
              e.preventDefault();
              onChange([...items, draft.trim()]);
              setDraft("");
            }
          }}
        />
        <Button
          variant="outline"
          className="h-12 border-2 px-4"
          onClick={() => {
            if (draft.trim()) {
              onChange([...items, draft.trim()]);
              setDraft("");
            }
          }}
        >
          <Plus className="size-5" />
        </Button>
      </div>
    </div>
  );
}

export default function CareProfile() {
  const { ready, summary } = useWorkspace();
  const { t, lang, setLanguage } = useLanguage();
  const patient = summary?.patient ?? null;
  const save = useMutation(api.smriti.savePatientProfile);

  const [name, setName] = useState("");
  const [hobbies, setHobbies] = useState<string[]>([]);
  const [music, setMusic] = useState<string[]>([]);
  const [places, setPlaces] = useState<string[]>([]);
  const [events, setEvents] = useState<EventDraft[]>([]);
  const [eventLabel, setEventLabel] = useState("");
  const [eventDetail, setEventDetail] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (patient) {
      setName(patient.name);
      setHobbies([...patient.hobbies]);
      setMusic([...patient.favouriteMusic]);
      setPlaces([...patient.importantPlaces]);
      setEvents([...patient.importantEvents]);
    }
  }, [patient?._id]);

  if (!ready || !patient) {
    return (
      <AppShell role="caregiver" subtitle="Profile">
        <div className="swiss-container py-24 text-center text-xl text-muted-foreground">Loading…</div>
      </AppShell>
    );
  }

  const submit = async () => {
    if (!name.trim()) return;
    await save({
      name: name.trim(),
      preferredLanguage: languageEnglishName(lang),
      hobbies,
      favouriteMusic: music,
      importantPlaces: places,
      importantEvents: events.filter((e) => e.label.trim()),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <AppShell role="caregiver" subtitle="Profile">
      <div className="swiss-container max-w-4xl py-10">
        <p className="label-caps text-swiss-red">{t("cp.caps")}</p>
        <h1 className="type-display mt-2 text-4xl md:text-5xl">{patient.name}</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          The games, reminders, and conversations all draw from this profile.
          Only real family information belongs here.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="border-2 border-foreground bg-card p-5">
            <p className="label-caps text-muted-foreground">{t("cp.nameL")}</p>
            <Input className="mt-2 h-14 text-xl" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="border-2 border-foreground bg-card p-5">
            <p className="label-caps text-muted-foreground">{t("cp.langL")}</p>
            <div role="group" aria-label={t("cp.langL")} className="mt-2 grid grid-cols-2 gap-2">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  aria-pressed={lang === l.code}
                  onClick={() => setLanguage(l.code as LangCode)}
                  className={cn(
                    "flex h-12 items-center justify-center gap-2 border-2 text-lg font-semibold transition-colors",
                    lang === l.code
                      ? "border-swiss-red bg-muted"
                      : "border-foreground/40 hover:border-foreground",
                  )}
                >
                  {l.native}
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{t("cp.langNote")}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <ChipList title={t("cp.hobbiesL")} placeholder={t("cp.hobbiesPh")} items={hobbies} onChange={setHobbies} />
          <ChipList title={t("cp.musicL")} placeholder={t("cp.musicPh")} items={music} onChange={setMusic} />
        </div>

        <div className="mt-4">
          <ChipList title={t("cp.placesL")} placeholder={t("cp.placesPh")} items={places} onChange={setPlaces} />
        </div>

        <div className="mt-4 border-2 border-foreground bg-card p-5">
          <p className="label-caps text-muted-foreground">{t("cp.eventsL")}</p>
          <div className="mt-3 space-y-2">
            {events.length === 0 ? (
              <p className="text-base italic text-muted-foreground/60">{t("cp.noEvents")}</p>
            ) : (
              events.map((e, i) => (
                <div key={i} className="flex items-center justify-between border-2 border-foreground/60 px-4 py-2">
                  <div>
                    <p className="text-lg font-bold">{e.label}</p>
                    {e.detail ? <p className="text-base text-muted-foreground">{e.detail}</p> : null}
                  </div>
                  <button type="button" onClick={() => setEvents(events.filter((_, j) => j !== i))} aria-label={t("cp.removeAria", { x: e.label })}>
                    <X className="size-5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Input className="h-12 text-lg" placeholder={t("cp.eventName")} value={eventLabel} onChange={(e) => setEventLabel(e.target.value)} />
            <Input className="h-12 text-lg" placeholder={t("cp.eventWhen")} value={eventDetail} onChange={(e) => setEventDetail(e.target.value)} />
            <Button
              variant="outline"
              className="h-12 shrink-0 border-2 px-4"
              onClick={() => {
                if (eventLabel.trim()) {
                  setEvents([...events, { label: eventLabel.trim(), detail: eventDetail.trim() || undefined }]);
                  setEventLabel("");
                  setEventDetail("");
                }
              }}
            >
              <Plus className="size-5" /> {t("cp.add")}
            </Button>
          </div>
        </div>

        <div className="mt-8 flex items-center gap-4">
          <Button className="h-14 px-8 text-lg" onClick={() => void submit()}>
            <Save className="size-5" /> {t("cp.save")}
          </Button>
          {saved ? <span className="text-lg font-semibold text-swiss-blue">{t("cp.saved")}</span> : null}
        </div>
      </div>
    </AppShell>
  );
}
