/** Set to true to enable debug logging in hot paths (vars, Bar, SideBar, etc.). */
export const DEBUG = false

export function debugLog(...args: unknown[]): void {
  if (DEBUG) console.log(...args)
}
