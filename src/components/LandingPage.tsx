import { motion, Variants, Easing } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Mic, Layers, TrendingUp, ArrowRight, Play, Zap, Target, Clock, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LandingPageProps {
  onTryDemo?: () => void;
}

const easeOut: Easing = [0.4, 0, 0.2, 1];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.08 * i, duration: 0.5, ease: easeOut },
  }),
};

export function LandingPage({ onTryDemo }: LandingPageProps) {
  const navigate = useNavigate();

  const features = [
    {
      icon: Mic,
      title: "Voice-first planning",
      description: "Start a session by speaking. No friction. No spreadsheets pretending to be a life.",
      color: "bg-blue-500/10 text-blue-500",
    },
    {
      icon: Layers,
      title: "Templates + routines",
      description: "Turn your best sessions into repeatable flows, so momentum becomes automatic.",
      color: "bg-emerald-500/10 text-emerald-500",
    },
    {
      icon: TrendingUp,
      title: "Progress that matters",
      description: "Track sessions, streaks, and outcomes—not busywork metrics.",
      color: "bg-violet-500/10 text-violet-500",
    },
  ];

  const steps = [
    { icon: Target, title: "Set your intent", description: "Define what you'll accomplish" },
    { icon: Clock, title: "Focus deeply", description: "Work with guided structure" },
    { icon: Flame, title: "Build momentum", description: "See your progress compound" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Nav */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold tracking-tight text-lg">FocusFlow</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/auth"
              className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign in
            </Link>
            <Button onClick={() => navigate("/auth")} size="sm">
              Get started free
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 pb-20 pt-12 md:grid-cols-2 md:pt-20">
        <div className="flex flex-col justify-center">
          <motion.div
            initial="hidden"
            animate="show"
            variants={fadeUp}
            custom={0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 w-fit"
          >
            <Mic className="w-4 h-4" />
            Voice-first productivity
          </motion.div>

          <motion.h1
            initial="hidden"
            animate="show"
            variants={fadeUp}
            custom={1}
            className="text-balance text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl"
          >
            Master your focus.
            <br />
            <span className="text-primary">Build your empire.</span>
          </motion.h1>

          <motion.p
            initial="hidden"
            animate="show"
            variants={fadeUp}
            custom={2}
            className="mt-6 max-w-xl text-pretty text-base text-muted-foreground md:text-lg"
          >
            A voice-first work session system: plan fast, execute clean, track what you actually did.
            No productivity cosplay.
          </motion.p>

          <motion.div
            initial="hidden"
            animate="show"
            variants={fadeUp}
            custom={3}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <Button
              onClick={() => navigate("/auth")}
              size="lg"
              className="gap-2"
            >
              Get started free
              <ArrowRight className="w-4 h-4" />
            </Button>

            <Button
              onClick={() => onTryDemo?.()}
              variant="outline"
              size="lg"
              className="gap-2"
            >
              <Play className="w-4 h-4" />
              Try demo
            </Button>
          </motion.div>

          <motion.p
            initial="hidden"
            animate="show"
            variants={fadeUp}
            custom={4}
            className="mt-5 text-sm text-muted-foreground"
          >
            Already have an account?{" "}
            <Link to="/auth" className="font-medium text-foreground hover:text-primary transition-colors">
              Sign in
            </Link>
          </motion.p>
        </div>

        {/* Right side mock */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
          className="relative hidden md:block"
        >
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-primary animate-pulse" />
                <span className="text-sm font-semibold">Today's Session</span>
              </div>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">25 min</span>
            </div>

            <div className="space-y-3">
              {[
                "Define the next action",
                "Remove distractions",
                "Run the timer",
                "Log what happened",
              ].map((t, i) => (
                <div key={t} className="flex items-center gap-3 rounded-xl bg-muted/50 p-3 border border-border/50">
                  <div className={`h-3 w-3 rounded-full ${i === 0 ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                  <span className="text-sm flex-1">{t}</span>
                  <span className="text-xs text-muted-foreground">Step {i + 1}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-xl bg-primary/10 border border-primary/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Mic className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-primary">Voice prompt</span>
              </div>
              <p className="text-sm text-foreground">
                "What's the one thing that makes everything else easier today?"
              </p>
            </div>
          </div>

          {/* Background effects */}
          <div className="pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
          <div className="pointer-events-none absolute -top-12 -right-12 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        </motion.div>
      </section>

      {/* Features */}
      <section className="bg-secondary/30 border-y border-border">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            custom={0}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Built for real work, not productivity theater
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Simple tools that help you ship, not distract you from shipping.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-80px" }}
                variants={fadeUp}
                custom={i}
                className="rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
              >
                <div className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center mb-4`}>
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUp}
          custom={0}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            How it works
          </h2>
          <p className="mt-4 text-muted-foreground">
            Three steps to focused work that actually ships.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-80px" }}
              variants={fadeUp}
              custom={i}
              className="text-center"
            >
              <div className="relative inline-flex items-center justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                    <step.icon className="w-5 h-5" />
                  </div>
                </div>
                <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-foreground text-background text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
              </div>
              <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-6 bg-primary/5 border-y border-primary/10">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-3 gap-8 text-center">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={0}
            >
              <div className="text-3xl font-bold text-foreground">∞</div>
              <div className="text-sm text-muted-foreground mt-1">Focus sessions</div>
            </motion.div>
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={1}
            >
              <div className="text-3xl font-bold text-foreground">12+</div>
              <div className="text-sm text-muted-foreground mt-1">Achievements</div>
            </motion.div>
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={2}
            >
              <div className="text-3xl font-bold text-foreground">100%</div>
              <div className="text-sm text-muted-foreground mt-1">Free to start</div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-2xl text-center">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
          >
            <h2 className="text-3xl font-bold mb-4">Ready to work like you mean it?</h2>
            <p className="text-muted-foreground mb-8">
              Create a free account in under a minute.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => onTryDemo?.()} variant="outline" size="lg">
                Try demo first
              </Button>
              <Button onClick={() => navigate("/auth")} size="lg" className="gap-2">
                Create free account
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
                <Zap className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">FocusFlow</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Built for makers who ship.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
