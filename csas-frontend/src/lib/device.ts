// Browser "installation ID" used for device binding. A real hardware ID isn't
// available to web pages, so we generate a stable UUID once and persist it.
// (Weaker than a native app: clearing storage or switching browsers resets it.)
const KEY = "csas-device-id";

export function getDeviceId(): string {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}
