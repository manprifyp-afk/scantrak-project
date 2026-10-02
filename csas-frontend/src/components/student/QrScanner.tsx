import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { X, CameraOff } from "lucide-react";

interface Props {
  onResult: (text: string) => void;
  onClose: () => void;
}

// Full-screen camera overlay. Decodes QR frames with jsQR and hands the raw
// text back to the parent. Camera + this component need a secure context
// (HTTPS, or localhost during development).
export function QrScanner({ onResult, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Keep the latest callbacks in refs so the camera effect runs exactly once.
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    let stream: MediaStream | null = null;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    async function start() {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setError(
          "The camera needs a secure (HTTPS) connection. On a phone, open the app over HTTPS — or enter the code by hand below."
        );
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        video.setAttribute("playsinline", "true");
        await video.play();
        raf = requestAnimationFrame(tick);
      } catch {
        setError("Couldn't open the camera. Check the camera permission, or enter the code by hand below.");
      }
    }

    function tick() {
      const video = videoRef.current;
      if (cancelled || !video || !ctx) return;
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const found = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
        if (found && found.data) {
          cancelled = true;
          stream?.getTracks().forEach((t) => t.stop());
          onResultRef.current(found.data);
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    }

    start();
    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-night">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="font-display font-semibold">Scan the QR</span>
        <button
          onClick={onClose}
          aria-label="Close scanner"
          className="grid size-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {error ? (
          <div className="mx-auto max-w-xs px-6 text-center text-ink-300">
            <CameraOff className="mx-auto mb-3 size-8 text-ink-400" />
            <p className="text-sm">{error}</p>
            <button
              onClick={onClose}
              className="mt-5 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
            >
              Enter code instead
            </button>
          </div>
        ) : (
          <>
            <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
            {/* Scanning frame */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative size-60 max-w-[70vw]">
                <span className="absolute left-0 top-0 size-8 rounded-tl-xl border-l-4 border-t-4 border-brand-400" />
                <span className="absolute right-0 top-0 size-8 rounded-tr-xl border-r-4 border-t-4 border-brand-400" />
                <span className="absolute bottom-0 left-0 size-8 rounded-bl-xl border-b-4 border-l-4 border-brand-400" />
                <span className="absolute bottom-0 right-0 size-8 rounded-br-xl border-b-4 border-r-4 border-brand-400" />
              </div>
            </div>
          </>
        )}
      </div>

      {!error && (
        <p className="px-6 py-5 text-center text-sm text-ink-300">
          Point your camera at the code on the screen.
        </p>
      )}
    </div>
  );
}
