import { Link } from "react-router-dom";
import {
  Loader2,
  AlertCircle,
  Radio,
  ChevronRight,
  MapPin,
} from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { getAllSessions, type LecturerSession } from "../../lib/sessions";
import { getOverview } from "../../lib/reports";

interface SessionsData {
  sessions: LecturerSession[];
  counts: Map<string, number>;
}

async function loadSessions(): Promise<SessionsData> {
  const [sessions, overview] = await Promise.all([getAllSessions(), getOverview()]);
  const counts = new Map(overview.perSession.map((p) => [p.sessionId, p.present + p.late]));
  return { sessions, counts };
}

function when(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function Sessions() {
  const { data, loading, error, reload } = useAsync(loadSessions);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="font-mono text-[11.5px] uppercase tracking-[0.1em] text-ink-500">
          All sessions
        </p>
        <h1 className="mt-1 text-[25px] font-semibold tracking-tight text-ink-900">Sessions</h1>
      </header>

      {loading && (
        <div className="flex items-center gap-2 text-ink-500">
          <Loader2 className="size-4 animate-spin" /> Loading sessions…
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-lg bg-fail-soft px-4 py-3 text-sm text-fail"
        >
          <span className="flex items-center gap-2">
            <AlertCircle className="size-4" />
            {error}
          </span>
          <button onClick={reload} className="font-medium underline hover:no-underline">
            Retry
          </button>
        </div>
      )}

      {!loading && !error && data && (
        data.sessions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink-200 p-12 text-center text-ink-500">
            <Radio className="mx-auto mb-2 size-6 text-ink-400" />
            No sessions yet. Start one from a course on your dashboard.
          </div>
        ) : (
          <div className="space-y-2.5">
            {data.sessions.map((s) => (
              <Link
                key={s.id}
                to={`/lecturer/sessions/${s.id}/attendance`}
                className="flex items-center gap-4 rounded-2xl border border-white/5 bg-night px-5 py-4 text-white transition-colors hover:border-brand-500/40"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-medium text-brand-300">
                      {s.courseCode}
                    </span>
                    {s.isActive ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-pass/20 px-2 py-0.5 text-[11px] font-semibold text-[#8fce9a]">
                        <span className="size-1.5 rounded-full bg-pass" /> Live
                      </span>
                    ) : (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-ink-300">
                        Ended
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate font-medium text-white">
                    {s.title ?? "Untitled session"}
                  </p>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-300">
                    {s.venue && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3" /> {s.venue}
                      </span>
                    )}
                    <span className="font-mono">{when(s.startsAt)}</span>
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-display text-lg font-semibold text-white">
                    {data.counts.get(s.id) ?? 0}
                  </p>
                  <p className="text-[11px] text-ink-400">checked in</p>
                </div>

                <ChevronRight className="size-4 shrink-0 text-ink-400" />
              </Link>
            ))}
          </div>
        )
      )}
    </div>
  );
}
