import React, { useEffect, useState } from "react";
import { api } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import BatchCard from "@/components/BatchCard";
import LiveClassCard from "@/components/LiveClassCard";
import { Link } from "react-router-dom";
import { FileText, ClipboardList, PlayCircle, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function SectionHeader({ title, action }) {
  return (
    <div className="flex items-end justify-between mb-5">
      <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">{title}</h2>
      {action}
    </div>
  );
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [continueWatching, setContinueWatching] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [{ data: d }, { data: cw }] = await Promise.all([
          api.get("/dashboard/student"),
          api.get("/progress/continue-watching"),
        ]);
        setData(d);
        setContinueWatching(cw);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  const { batches = [], live_classes = [], latest_notes = [], latest_tests = [] } = data || {};

  return (
    <div className="space-y-12">
      {/* Welcome hero */}
      <section
        className="relative overflow-hidden rounded-lg border border-slate-200 bg-white p-6 sm:p-10"
        data-testid="welcome-hero"
      >
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-[#C92A2A] mb-3">
            <Sparkles className="h-3.5 w-3.5" /> Daily Briefing
          </div>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tighter text-slate-900 leading-[1.05]">
            Hello, {user?.name?.split(" ")[0]} — let's get one chapter closer to your goal.
          </h1>
          <p className="mt-4 text-slate-600 max-w-lg">
            You're enrolled in <span className="font-semibold text-slate-900">{batches.length}</span> batch
            {batches.length === 1 ? "" : "es"}. Keep your streak alive by finishing one lesson today.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/batches">
              <Button className="bg-[#C92A2A] hover:bg-[#A52A2A] text-white rounded-md" data-testid="go-batches-btn">
                Continue Learning <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/live-classes">
              <Button variant="outline" className="rounded-md border-slate-300" data-testid="go-live-btn">
                See Live Classes
              </Button>
            </Link>
          </div>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-1/2 hidden lg:block opacity-30 pointer-events-none">
          <img
            src="https://images.unsplash.com/photo-1635372722656-389f87a941b7?auto=format&fit=crop&q=85&w=1200"
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      </section>

      {/* Upcoming live */}
      {live_classes.length > 0 && (
        <section>
          <SectionHeader
            title="Upcoming Live Classes"
            action={
              <Link to="/live-classes" className="text-sm text-[#C92A2A] font-medium hover:underline">
                View all →
              </Link>
            }
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="upcoming-live-grid">
            {live_classes.slice(0, 3).map((lc) => (
              <LiveClassCard key={lc.id} liveClass={lc} />
            ))}
          </div>
        </section>
      )}

      {/* Continue Watching */}
      {continueWatching.length > 0 && (
        <section>
          <SectionHeader title="Continue Watching" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="continue-watching-grid">
            {continueWatching.slice(0, 6).map((p) => {
              const pct = p.duration_seconds ? Math.min(100, Math.round((p.position_seconds / p.duration_seconds) * 100)) : 0;
              return (
                <Link
                  key={p.video_id}
                  to={`/videos/${p.video_id}`}
                  className="bg-white border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors"
                  data-testid={`continue-watching-${p.video_id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-md bg-red-50 text-[#C92A2A] grid place-items-center flex-shrink-0">
                      <PlayCircle className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-slate-500">{p.subject?.name} • {p.chapter?.name}</div>
                      <h4 className="font-semibold text-slate-900 mt-0.5 line-clamp-2">{p.video?.title}</h4>
                      <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#C92A2A]" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">{pct}% watched</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* My Batches */}
      <section>
        <SectionHeader
          title="My Batches"
          action={
            <Link to="/batches" className="text-sm text-[#C92A2A] font-medium hover:underline">
              All batches →
            </Link>
          }
        />
        {batches.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-lg p-10 text-center text-slate-500">
            You're not enrolled in any batch yet.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="my-batches-grid">
            {batches.slice(0, 3).map((b) => <BatchCard key={b.id} batch={b} testid="dashboard-batch" />)}
          </div>
        )}
      </section>

      {/* Latest notes + tests */}
      <section className="grid lg:grid-cols-2 gap-6">
        <div>
          <SectionHeader title="Latest Notes" />
          <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100" data-testid="latest-notes-list">
            {latest_notes.length === 0 && <div className="p-6 text-slate-500 text-sm">No notes yet.</div>}
            {latest_notes.map((n) => (
              <a
                key={n.id}
                href={n.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 p-4 hover:bg-slate-50"
                data-testid={`note-${n.id}`}
              >
                <div className="h-10 w-10 rounded-md bg-blue-50 text-[#1E3A8A] grid place-items-center"><FileText className="h-5 w-5" /></div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 truncate">{n.title}</div>
                  <div className="text-xs text-slate-500 truncate">{n.description}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </a>
            ))}
          </div>
        </div>
        <div>
          <SectionHeader title="Latest Tests" />
          <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100" data-testid="latest-tests-list">
            {latest_tests.length === 0 && <div className="p-6 text-slate-500 text-sm">No tests yet.</div>}
            {latest_tests.map((t) => (
              <Link
                key={t.id}
                to={`/tests/${t.id}`}
                className="flex items-center gap-3 p-4 hover:bg-slate-50"
                data-testid={`test-${t.id}`}
              >
                <div className="h-10 w-10 rounded-md bg-red-50 text-[#C92A2A] grid place-items-center"><ClipboardList className="h-5 w-5" /></div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 truncate">{t.title}</div>
                  <div className="text-xs text-slate-500">{t.questions?.length || 0} questions • {t.duration_minutes} min</div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
