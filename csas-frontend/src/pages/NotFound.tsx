import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div className="min-h-dvh grid place-items-center px-4 text-center">
      <div>
        <p className="font-mono text-sm text-ink-400">404</p>
        <h1 className="text-2xl font-semibold text-ink-900 mt-1">Page not found</h1>
        <Link to="/login" className="text-brand-600 hover:underline text-sm mt-3 inline-block">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
