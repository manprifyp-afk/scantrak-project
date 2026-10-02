import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Loader2,
  AlertCircle,
  Square,
  Clock,
  Radio,
} from "lucide-react";
import { getApiErrorMessage } from "../../lib/api";
import { getPosition } from "../../lib/location";
import {
  createSession,
  getCurrentCode,
  getQrImage,
  closeSession,
  type Session,
} from "../../lib/sessions";

const DURATIONS = [
  { label: "1 hour", minutes: 60 },
  { label: "1.5 hours", minutes: 90 },
  { label: "2 hours", minutes: 120 },
  { label: "3 hours", minutes: 180 },
];

export function SessionControl() {
  const { courseId } = useParams();
  const [session, setSession] = useState<Session | null>(null);

  return (
    <div className="space-y-6">
      <Link
        to="/lecturer"
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-800"
      >
        <ArrowLeft className="size-4" />
        Back to courses
      </Link>

      {session ? (
        <LiveSession session={session} onClose={() => setSession(null)} />
      ) : (
        <SessionSetup courseId={courseId!} onStarted={setSession} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Phase 1 — set radius + duration, capture GPS, create the session
// ---------------------------------------------------------------------------
function SessionSetup({
  courseId,
  onStarted,
}: {
  courseId: string;
  onStarted: (s: Session) => void;
}) {
  const [radius, setRadius] = useState(50);
  const [minutes, setMinutes] = useState(120);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setBusy(true);
    setError(null);
    try {
      const pos = await getPosition(); // prompts for location permission
      const now = new Date();
      const end = new Date(now.getTime() + minutes * 60_000);
      const session = await createSession({
        courseId,
        startsAt: now.toISOString(),
        endsAt: end.toISOString(),
        latitude: pos.lat,
        longitude: pos.lng,
        radiusMeters: radius,
      });
      onStarted(session);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md space-y-5 rounded-xl border border-ink-200 bg-surface p-6 shadow-sm">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Start a live session</h1>
        <p className="mt-1 text-sm text-ink-500">
          Your current location becomes the centre of the attendance zone.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg bg-fail-soft px-3 py-2 text-sm text-fail"
        >
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="radius" className="block text-sm font-medium text-ink-700">
          Attendance radius (metres)
        </label>
        <input
          id="radius"
          type="number"
          min={5}
          max={1000}
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
          disabled={busy}
          className="w-full rounded-lg border border-ink-200 px-3 py-2 text-ink-900 outline-none focus:border-brand-500 disabled:opacity-60"
        />
        <p className="text-xs text-ink-400">
          Students must be within this distance to check in. 50 m suits most rooms.
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="duration" className="block text-sm font-medium text-ink-700">
          Duration
        </label>
        <select
          id="duration"
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
          disabled={busy}
          className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-ink-900 outline-none focus:border-brand-500 disabled:opacity-60"
        >
          {DURATIONS.map((d) => (
            <option key={d.minutes} value={d.minutes}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handleStart}
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <MapPin className="size-4" />}
        {busy ? "Getting your location…" : "Capture location & start"}
      </button>
      <p className="text-center text-xs text-ink-400">
        Your browser will ask for permission to use your location.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Phase 2 — live rotating code + QR, with a countdown and end-session control
// ---------------------------------------------------------------------------
function LiveSession({ session, onClose }: { session: Session; onClose: () => void }) {
  const [code, setCode] = useState("");
  const [qr, setQr] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [closing, setClosing] = useState(false);

  // Poll the current code every 3s; only re-fetch the QR when the code actually
  // rotates. A local 1s ticker keeps the countdown smooth between polls.
  useEffect(() => {
    let active = true;
    let lastCode = "";

    async function tick() {
      try {
        const c = await getCurrentCode(session.id);
        if (!active) return;
        setCode(c.code);
        setSecondsLeft(c.expiresInSeconds);
        if (c.code !== lastCode) {
          lastCode = c.code;
          const q = await getQrImage(session.id);
          if (active) setQr(q.image);
        }
      } catch {
        /* transient poll error — keep the last good code on screen */
      }
    }

    tick();
    const poll = setInterval(tick, 3000);
    const ticker = setInterval(() => {
      if (active) setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);

    return () => {
      active = false;
      clearInterval(poll);
      clearInterval(ticker);
    };
  }, [session.id]);

  async function handleEnd() {
    setClosing(true);
    try {
      await closeSession(session.id);
      onClose();
    } catch {
      setClosing(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-pass-soft px-2.5 py-1 text-xs font-medium text-pass">
          <span className="size-1.5 rounded-full bg-pass" />
          Live
        </span>
        <h1 className="mt-2 text-2xl font-semibold text-ink-900">Session running</h1>
        <p className="text-sm text-ink-500">
          Students enter this code — or scan the QR — to check in.
        </p>
      </div>

      {/* Code + QR: two equal, centered cards */}
      <div className="grid items-stretch gap-5 md:grid-cols-2">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-ink-200 bg-surface p-8 text-center shadow-sm">
          {code ? (
            <>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                Check-in code
              </p>
              <p className="mt-2 font-mono text-6xl font-medium tracking-[0.15em] text-ink-900">
                {code}
              </p>
              <p className="mt-4 inline-flex items-center gap-1.5 text-sm text-ink-500">
                <Clock className="size-4" />
                New code in {secondsLeft}s
              </p>
            </>
          ) : (
            <p className="inline-flex items-center gap-2 text-ink-500">
              <Loader2 className="size-4 animate-spin" />
              Generating code…
            </p>
          )}
        </div>

        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-ink-200 bg-surface p-6 shadow-sm">
          {qr ? (
            <img
              src={qr}
              alt="Attendance QR code"
              className="aspect-square w-full max-w-[320px] rounded-lg"
            />
          ) : (
            <div className="grid aspect-square w-full max-w-[320px] place-items-center text-ink-400">
              <Loader2 className="size-6 animate-spin" />
            </div>
          )}
          <p className="text-sm text-ink-400">Scan to check in</p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-ink-400">Radius</dt>
          <dd className="font-medium text-ink-800">{session.radiusMeters} m</dd>
        </div>
        <div>
          <dt className="text-ink-400">Centre</dt>
          <dd className="font-mono text-ink-800">
            {session.latitude.toFixed(5)}, {session.longitude.toFixed(5)}
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleEnd}
          disabled={closing}
          className="inline-flex items-center gap-2 rounded-lg bg-fail px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60"
        >
          {closing ? <Loader2 className="size-4 animate-spin" /> : <Square className="size-4" />}
          End session
        </button>
        <Link
          to={`/lecturer/sessions/${session.id}/attendance`}
          className="inline-flex items-center gap-2 rounded-lg border border-ink-200 px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-50"
        >
          <Radio className="size-4" />
          Live attendance
        </Link>
      </div>
    </div>
  );
}
