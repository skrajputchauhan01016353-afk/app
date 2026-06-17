import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/apiClient";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight, Atom, FlaskConical, Leaf, Sigma, Microscope, BookOpen } from "lucide-react";
import CourseProgress from "@/components/CourseProgress";
import { resolveImage } from "@/lib/apiClient";

const ICONS = { Atom, FlaskConical, Leaf, Sigma, Microscope, BookOpen };

export default function BatchDetail() {
  const { batchId } = useParams();
  const [batch, setBatch] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: b }, { data: s }] = await Promise.all([
        api.get(`/batches/${batchId}`),
        api.get(`/subjects`, { params: { batch_id: batchId } }),
      ]);
      setBatch(b);
      setSubjects(s);
      setLoading(false);
    })();
  }, [batchId]);

  if (loading) return <Skeleton className="h-64 w-full rounded-lg" />;

  return (
    <div className="space-y-8">
      <div className="text-sm text-slate-500" data-testid="breadcrumb">
        <Link to="/batches" className="hover:text-slate-900">Batches</Link> <ChevronRight className="inline h-3 w-3" /> <span className="text-slate-900">{batch?.name}</span>
      </div>
      <div
        className="relative overflow-hidden rounded-xl border border-slate-200"
        data-testid="batch-hero"
      >
        <div className="relative aspect-[21/9] sm:aspect-[21/7] bg-slate-900">
          {batch?.cover_url && (
            <img src={resolveImage(batch.cover_url)} alt={batch.name} className="absolute inset-0 h-full w-full object-cover opacity-60" />
          )}
          <div className="absolute inset-0 grr-hero-gradient opacity-95 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B1E55]/80 via-[#0B1E55]/30 to-transparent" />
          <div className="absolute inset-0 p-6 sm:p-10 flex flex-col justify-end text-white">
            <div className="text-xs uppercase tracking-[0.3em] text-[#FED7AA] font-semibold mb-2">{batch?.target_exam} • {batch?.year}</div>
            <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tighter">{batch?.name}</h1>
            <p className="mt-3 max-w-2xl text-white/85">{batch?.description}</p>
          </div>
        </div>
      </div>

      <CourseProgress batchId={batchId} />

      <div>
        <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-5">Subjects</h2>
        {subjects.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-lg p-10 text-center text-slate-500">
            No subjects yet.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="subjects-grid">
            {subjects.map((s) => {
              const Icon = ICONS[s.icon] || BookOpen;
              return (
                <Link to={`/subjects/${s.id}`} key={s.id} data-testid={`subject-card-${s.id}`}>
                  <Card className="card-lift overflow-hidden bg-white border-slate-200 rounded-xl flex flex-col h-full">
                    <div className="relative aspect-[16/9] bg-slate-100">
                      {s.cover_url ? (
                        <img src={resolveImage(s.cover_url)} alt={s.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full" style={{ background: s.color || "#1D4ED8" }} />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                      <div
                        className="absolute top-3 left-3 h-10 w-10 rounded-lg grid place-items-center text-white shadow"
                        style={{ background: s.color || "#1D4ED8" }}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="font-display text-xl font-semibold tracking-tight text-slate-900">{s.name}</h3>
                      <div className="text-xs text-slate-500 mt-1">Browse chapters →</div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
