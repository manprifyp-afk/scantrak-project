import { api } from "./api";
import { listCourses } from "./courses";

interface SessionBrief {
  id: string;
  title: string | null;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
}

export interface ActiveSession {
  sessionId: string;
  courseCode: string;
  courseTitle: string;
  sessionTitle: string | null;
  startsAt: string;
}

// A session is "available to check into" when it's active and the current time
// is within its window.
export async function getActiveSessions(): Promise<ActiveSession[]> {
  const courses = await listCourses();
  const now = Date.now();
  const out: ActiveSession[] = [];

  await Promise.all(
    courses.map(async (c) => {
      const { data: sessions } = await api.get<SessionBrief[]>(`/courses/${c.id}/sessions`);
      for (const s of sessions) {
        const running =
          s.isActive &&
          new Date(s.startsAt).getTime() <= now &&
          new Date(s.endsAt).getTime() >= now;
        if (running) {
          out.push({
            sessionId: s.id,
            courseCode: c.code,
            courseTitle: c.title,
            sessionTitle: s.title,
            startsAt: s.startsAt,
          });
        }
      }
    })
  );

  return out;
}
