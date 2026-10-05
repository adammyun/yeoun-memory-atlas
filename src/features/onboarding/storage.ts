export const ONBOARDING_VERSION = 1;
export const ONBOARDING_STORAGE_KEY = `yeoun:onboarding:v${ONBOARDING_VERSION}`;

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

type OnboardingState = {
  version: number;
  completed: boolean;
};

export function isOnboardingCompleted(storage: StorageLike) {
  try {
    const raw = storage.getItem(ONBOARDING_STORAGE_KEY);
    if (!raw) return false;
    const state = JSON.parse(raw) as Partial<OnboardingState>;
    return state.version === ONBOARDING_VERSION && state.completed === true;
  } catch {
    return false;
  }
}

export function shouldStartOnboarding(
  storage: StorageLike,
  forced = false,
) {
  return forced || !isOnboardingCompleted(storage);
}

export function completeOnboarding(storage: StorageLike) {
  try {
    storage.setItem(
      ONBOARDING_STORAGE_KEY,
      JSON.stringify({ version: ONBOARDING_VERSION, completed: true }),
    );
  } catch {
    // The tour can still finish when storage is unavailable or full.
  }
}

export function resetOnboarding(storage: StorageLike) {
  try {
    storage.removeItem(ONBOARDING_STORAGE_KEY);
  } catch {
    // A blocked storage API should not make the developer route unusable.
  }
}
