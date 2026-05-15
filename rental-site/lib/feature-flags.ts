/**
 * Feature flags (mostly `NEXT_PUBLIC_*` — baked in at build time).
 *
 * Vehicle Health Hub: mileage, maintenance, damage, mechanic marketplace UI.
 * Backend (cron, actions, migrations) stays in place; flip the env var to
 * surface the UI again when you are ready for v2.
 */
export function isVehicleHealthUiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_SHOW_VEHICLE_HEALTH_UI === 'true'
}
