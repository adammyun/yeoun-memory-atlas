export const DEVELOPER_GESTURE_CLICKS = 5;
export const DEVELOPER_GESTURE_WINDOW_MS = 2_000;

export type DeveloperGestureState = {
  clicks: number[];
  activated: boolean;
};

export function recordDeveloperClick(
  clicks: number[],
  timestamp: number,
): DeveloperGestureState {
  const recent = [...clicks, timestamp].filter(
    (click) => timestamp - click <= DEVELOPER_GESTURE_WINDOW_MS,
  );
  return {
    clicks: recent.length >= DEVELOPER_GESTURE_CLICKS ? [] : recent,
    activated: recent.length >= DEVELOPER_GESTURE_CLICKS,
  };
}
