export async function logout() {
  // The hosting layer owns this top-level SIWC route.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign('/signout-with-chatgpt?return_to=%2F');
}
