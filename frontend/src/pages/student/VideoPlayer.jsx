import React, { useEffect, useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api, toYouTubeEmbed, formatDuration } from "@/lib/apiClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, PlayCircle, ListVideo } from "lucide-react";

export default function VideoPlayer() {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const [video, setVideo] = useState(null);
  const [chapter, setChapter] = useState(null);
  const [playlist, setPlaylist] = useState([]);
  const [loading, setLoading] = useState(true);
  const tickRef = useRef(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: v } = await api.get(`/videos/${videoId}`);
      setVideo(v);
      const { data: ch } = await api.get(`/chapters/${v.chapter_id}`);
      setChapter(ch);
      const { data: pl } = await api.get(`/videos`, { params: { chapter_id: v.chapter_id } });
      setPlaylist(pl);
      setLoading(false);
    })();
  }, [videoId]);

  // Heuristic progress tracking — simulate watch progress every 30s
  useEffect(() => {
    if (!video) return;
    let position = 0;
    tickRef.current = setInterval(() => {
      position = Math.min(position + 30, video.duration_seconds || 600);
      api.post("/progress", {
        video_id: video.id,
        position_seconds: position,
        duration_seconds: video.duration_seconds || 600,
      }).catch(() => {});
    }, 30000);
    return () => clearInterval(tickRef.current);
  }, [video]);

  if (loading || !video) return <Skeleton className="h-96 w-full rounded-lg" />;

  const currIdx = playlist.findIndex((p) => p.id === video.id);
  const prev = currIdx > 0 ? playlist[currIdx - 1] : null;
  const next = currIdx < playlist.length - 1 ? playlist[currIdx + 1] : null;
  const embed = toYouTubeEmbed(video.url);

  return (
    <div className="space-y-6">
      <Link to={`/chapters/${chapter?.id}`} className="text-sm text-slate-500 hover:text-slate-900 inline-flex items-center gap-1" data-testid="back-to-chapter">
        <ChevronLeft className="h-4 w-4" /> Back to {chapter?.name}
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="aspect-video bg-black rounded-lg overflow-hidden ring-1 ring-slate-200" data-testid="video-player-frame">
            <iframe
              src={embed}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-[#C92A2A] mb-1">Lesson {currIdx + 1} of {playlist.length}</div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900" data-testid="video-title">
              {video.title}
            </h1>
            <p className="text-slate-500 mt-2 text-sm">{video.description}</p>
            <div className="text-xs text-slate-500 mt-1">Duration: {formatDuration(video.duration_seconds)}</div>
          </div>

          <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-3">
            <Button
              variant="outline"
              disabled={!prev}
              onClick={() => prev && navigate(`/videos/${prev.id}`)}
              className="rounded-md"
              data-testid="prev-lesson-btn"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <div className="text-sm text-slate-500 hidden sm:block">
              {prev ? prev.title : "Start of chapter"} → {next ? next.title : "End of chapter"}
            </div>
            <Button
              disabled={!next}
              onClick={() => next && navigate(`/videos/${next.id}`)}
              className="bg-[#C92A2A] hover:bg-[#A52A2A] text-white rounded-md disabled:opacity-50"
              data-testid="next-lesson-btn"
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>

        <aside className="bg-white border border-slate-200 rounded-lg p-4 max-h-[640px] flex flex-col" data-testid="playlist-panel">
          <div className="text-xs uppercase tracking-widest text-slate-500 flex items-center gap-2 mb-3"><ListVideo className="h-4 w-4" /> Chapter playlist</div>
          <div className="space-y-1 overflow-y-auto thin-scroll flex-1">
            {playlist.map((p, i) => {
              const active = p.id === video.id;
              return (
                <Link
                  key={p.id}
                  to={`/videos/${p.id}`}
                  className={`flex items-center gap-3 p-2 rounded-md transition-colors ${active ? "bg-red-50" : "hover:bg-slate-50"}`}
                  data-testid={`playlist-item-${p.id}`}
                >
                  <div className={`h-9 w-9 rounded-md grid place-items-center flex-shrink-0 ${active ? "bg-[#C92A2A] text-white" : "bg-slate-100 text-slate-600"}`}>
                    <PlayCircle className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm truncate ${active ? "font-semibold text-[#C92A2A]" : "text-slate-700"}`}>{i + 1}. {p.title}</div>
                    <div className="text-[11px] text-slate-500">{formatDuration(p.duration_seconds)}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}
