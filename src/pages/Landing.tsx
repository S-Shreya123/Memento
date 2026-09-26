import { Button } from "@/components/ui/button";
import { Link, Navigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import {
  Images,
  Network,
  Puzzle,
  BellRing,
  HeartHandshake,
  Users,
  Library,
  ArrowRight,
} from "lucide-react";

const ACTIVITIES = [
  {
    icon: Images,
    num: "01",
    title: "Photo recognition",
    desc: "A gentle game built from your own family photographs, with soft hints and no pressure to perform.",
  },
  {
    icon: Network,
    num: "02",
    title: "Family connections",
    desc: "Simple questions about the people you love, drawn from the relationships your family has recorded.",
  },
  {
    icon: Puzzle,
    num: "03",
    title: "Photo puzzles",
    desc: "Piece a treasured photograph back together at whatever size feels comfortable that day.",
  },
];

const SUPPORT = [
  {
    icon: BellRing,
    title: "Memory assistance & reminders",
    desc: "Medicines, hydration, daily routines, and appointments appear as calm, friendly prompts at exactly the right moment.",
  },
  {
    icon: Library,
    title: "A private memory library",
    desc: "Every photo, person, place, and story your family adds becomes a searchable album that grows with you.",
  },
  {
    icon: Users,
    title: "Caregiver support",
    desc: "A dedicated dashboard shows activity and engagement as simple, honest trends — never medical scores.",
  },
  {
    icon: HeartHandshake,
    title: "Community helpers",
    desc: "Volunteers, local-language speakers, and qualified healthcare professionals, reachable in a single tap.",
  },
];

export default function Landing() {
  // A remembered household opens Memento straight into their family's space —
  // no need to walk through the marketing page again.
  const { isLoading, isAuthenticated } = useAuth();
  if (!isLoading && isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b-2 border-foreground">
        <div className="swiss-container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center bg-swiss-red font-extrabold text-lg text-white">
              M
            </span>
            <span className="type-display text-2xl">Memento</span>
            <span className="label-caps hidden border-l-2 border-foreground/20 pl-3 text-muted-foreground sm:inline">
              Personalized dementia care
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="h-11 px-4 text-base">
              <Link to="/auth">Log in</Link>
            </Button>
            <Button asChild className="h-11 px-5 text-base">
              <Link to="/auth?mode=signup">Sign up free</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="grid-bg border-b-2 border-foreground">
        <div className="swiss-container grid gap-10 py-16 md:py-24 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="label-caps text-swiss-red">
              Personalized cognitive activities, powered by your family
            </p>
            <h1 className="type-display mt-4 text-5xl md:text-7xl">
              Memories,
              <br />
              kept close,
              <br />
              <span className="text-swiss-red">every day.</span>
            </h1>
            <p className="mt-6 max-w-xl text-xl leading-relaxed text-muted-foreground">
              Memento supports elderly people living with dementia and the
              families who care for them. It turns your own photos and stories
              into gentle cognitive activities, memory assistance, and
              reminders — with a caregiver dashboard that keeps the whole
              household quietly in sync.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="h-14 px-8 text-lg">
                <Link to="/auth?mode=signup">
                  Create your family account <ArrowRight className="size-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-14 border-2 px-8 text-lg">
                <Link to="/auth">Explore the demo family</Link>
              </Button>
            </div>
            <p className="mt-4 text-base text-muted-foreground">
              Sign up in seconds. A fully populated demo family is ready the
              moment you log in, so you can see everything working before
              adding your own.
            </p>
          </div>
          <div className="lg:col-span-5">
            <div className="border-2 border-foreground bg-card">
              <div className="h-2 bg-swiss-red" />
              <div className="p-6">
                <p className="label-caps text-muted-foreground">A day with Memento</p>
                <div className="mt-4 space-y-3">
                  {[
                    { t: "08:30", label: "Morning medicine reminder", em: "💊" },
                    { t: "10:00", label: "Photo recognition activity", em: "🖼️" },
                    { t: "15:00", label: "Family photo puzzle", em: "🧩" },
                    { t: "17:00", label: "Evening walk reminder", em: "🚶" },
                  ].map((row) => (
                    <div
                      key={row.t}
                      className="flex items-center gap-4 border-2 border-foreground/30 p-3"
                    >
                      <span className="text-2xl">{row.em}</span>
                      <span className="num-mono text-lg font-bold text-swiss-blue">
                        {row.t}
                      </span>
                      <span className="text-lg font-semibold">{row.label}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  Designed for elderly eyes: large type, generous buttons, and
                  nothing that hurries you.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Activities */}
      <section className="border-b-2 border-foreground">
        <div className="swiss-container py-16">
          <div className="flex items-end justify-between">
            <h2 className="type-display text-4xl md:text-5xl">
              Activities made of your memories
            </h2>
            <p className="label-caps hidden text-muted-foreground md:block">
              Built only from what your family uploads
            </p>
          </div>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Memento never invents faces, names, or stories. The activities
            come entirely from the photos and details your family adds — and
            each session adjusts quietly to feel comfortable, never testing.
          </p>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {ACTIVITIES.map((g) => (
              <div key={g.num} className="border-2 border-foreground bg-card">
                <div className="flex items-center justify-between p-5">
                  <g.icon className="size-9 text-swiss-red" strokeWidth={1.75} />
                  <span className="type-display num-mono text-3xl text-foreground/20">
                    {g.num}
                  </span>
                </div>
                <div className="border-t-2 border-foreground p-5">
                  <h3 className="text-2xl font-bold">{g.title}</h3>
                  <p className="mt-2 text-lg text-muted-foreground">{g.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Support pillars */}
      <section className="border-b-2 border-foreground bg-muted/40">
        <div className="swiss-container py-16">
          <h2 className="type-display text-4xl md:text-5xl">
            More than a game
          </h2>
          <div className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {SUPPORT.map((c) => (
              <div key={c.title} className="border-t-2 border-foreground pt-5">
                <c.icon className="size-8 text-swiss-blue" />
                <h3 className="mt-4 text-2xl font-bold leading-snug">{c.title}</h3>
                <p className="mt-2 text-lg leading-relaxed text-muted-foreground">
                  {c.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="border-b-2 border-foreground">
        <div className="swiss-container grid gap-8 py-16 lg:grid-cols-12">
          <h2 className="type-display text-4xl md:text-5xl lg:col-span-5">
            Dignified by design
          </h2>
          <ul className="space-y-4 text-lg text-muted-foreground lg:col-span-7">
            <li className="border-t-2 border-foreground pt-4">
              <span className="font-bold text-foreground">Your family&apos;s truth only.</span>{" "}
              Every face, name, and story in Memento is entered by your
              family. The app fabricates nothing and invents no one.
            </li>
            <li className="border-t-2 border-foreground pt-4">
              <span className="font-bold text-foreground">Engagement, never assessment.</span>{" "}
              Caregivers see simple activity trends. There are no severity
              ratings and no scores to worry about.
            </li>
            <li className="border-t-2 border-foreground pt-4">
              <span className="font-bold text-foreground">“I don&apos;t remember” is always welcome.</span>{" "}
              Hints and forgotten answers are treated as natural parts of the
              day, and the activities adapt with kindness in response.
            </li>
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-swiss-red text-white">
        <div className="swiss-container flex flex-col items-start justify-between gap-6 py-16 md:flex-row md:items-center">
          <div>
            <h2 className="type-display text-4xl md:text-5xl">
              Begin with a photograph you love.
            </h2>
            <p className="mt-3 max-w-xl text-lg text-white/85">
              Sign up today, add your first family photo, and Memento takes
              care of the rest.
            </p>
          </div>
          <Button
            asChild
            variant="secondary"
            className="h-14 bg-white px-8 text-lg text-swiss-red hover:bg-white/90"
          >
            <Link to="/auth?mode=signup">Sign up free</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <div className="swiss-container flex h-14 items-center justify-between">
          <span className="label-caps text-muted-foreground">
            Memento — memory care made personal
          </span>
          <span className="label-caps text-muted-foreground">
            Engagement, never assessment
          </span>
        </div>
        <div className="h-1.5 w-full bg-swiss-red" />
        <div className="h-1.5 w-full bg-swiss-blue" />
      </footer>
    </div>
  );
}
