import { api } from "./api";
import { getDeviceId } from "./device";
import { getPosition } from "./location";

export interface ScanResult {
  status: "PRESENT" | "LATE";
  recordedAt: string;
  distanceMeters: number;
}

export async function submitScan(sessionId: string, code: string): Promise<ScanResult> {
  const pos = await getPosition(); // prompts for location permission
  const { data } = await api.post<ScanResult>("/attendance/scan", {
    sessionId,
    code: code.trim(),
    latitude: pos.lat,
    longitude: pos.lng,
    deviceId: getDeviceId(),
  });
  return data;
}
