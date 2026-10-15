export interface FocusSession {
  durationSeconds: number;
  elapsedSeconds: number;
  status: "idle" | "running" | "paused";
}
export const initialSession: FocusSession = {
  durationSeconds: 25 * 60,
  elapsedSeconds: 0,
  status: "idle",
};
