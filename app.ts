import app from "ags/gtk4/app"
import { Astal, Gtk } from "ags/gtk4"
import { execAsync } from "ags/process"
import Bar from "./windows/bars/Bar"
import Env from "./env"
import { compileScss } from "./cssHotReload"
import "./cssHotReload" // Enable SCSS hot reload
import NotificationPopupHandler from "./windows/notification/NotificationPopupHandler"

// Store bar windows and bar instances by monitor connector name
const barWindows = new Map<string, Astal.Window>()
const barInstances = new Map<string, Bar>()

app.start({
  main() {
    const env = new Env()
    if (env.getDisplays().length == 0) {
      app.get_monitors().map(monitor => {
        const connector = monitor.get_connector() ?? ""
        const bar = new Bar(env, monitor)
        barInstances.set(connector, bar)
        barWindows.set(connector, bar.getWindow())
        const notificationHandler = new NotificationPopupHandler(monitor, env)
        barWindows.set(connector, notificationHandler.getWindow())
      })
    } else {
      app.get_monitors().map(monitor => {
        const connector = monitor.get_connector() ?? ""
        const bar = new Bar(env, monitor)
        barInstances.set(connector, bar)
        barWindows.set(connector, bar.getWindow())
        const notificationHandler = new NotificationPopupHandler(monitor, env)
        barWindows.set(connector, notificationHandler.getWindow())
      })
    }
  },

  requestHandler(argv: string[], response: (res: string) => void) {
    const cmd = argv.find((a) => a === "toggleLauncher" || a === "toggle-launcher") ?? argv[argv.length - 1]
    if (cmd === "toggleLauncher" || cmd === "toggle-launcher") {
      getFocusedMonitorConnector()
        .then((connector) => {
          toggleLauncher(connector)
          response("ok")
        })
        .catch(() => {
          toggleLauncher()
          response("ok")
        })
    } else {
      response(`unknown request: ${cmd}`)
    }
  },
})

// Toggle bar visibility on the focused monitor
export function toggleBar() {
  // Get the primary monitor (usually the focused one)
  const monitors = app.get_monitors()
  if (monitors.length === 0) return
  
  // Use the first monitor as primary/focused, or you can implement more sophisticated detection
  const primaryMonitor = monitors[0]
  const connector = primaryMonitor.get_connector() ?? ""
  
  const window = barWindows.get(connector)
  if (window) {
    const visible = window.get_visible()
    window.set_visible(!visible)
  } else {
    // If window not found, toggle all bars as fallback
    barWindows.forEach((win) => {
      const visible = win.get_visible()
      win.set_visible(!visible)
    })
  }
}

// Reload AGS configuration
export function reload() {
  // Recompile SCSS
  compileScss()

  // You can add more reload logic here if needed
  // For a full reload, you might need to restart AGS
  print("AGS configuration reloaded")
}

// Get the focused monitor connector from Hyprland (so launcher opens on the right screen)
function getFocusedMonitorConnector(): Promise<string | null> {
  return execAsync(["hyprctl", "-j", "monitors"])
    .then((stdout) => {
      const monitors = JSON.parse(stdout) as Array<{ name: string; focused: boolean }>
      const focused = monitors.find((m) => m.focused)
      return focused?.name ?? null
    })
    .catch(() => null)
}

// Open the app launcher sidebar on the given monitor (or first if connector is null)
export function toggleLauncher(connector?: string | null) {
  const barForMonitor =
    connector != null ? barInstances.get(connector) : undefined
  const bar = barForMonitor ?? barInstances.values().next().value
  if (!bar) return
  bar.getVars().getSideBarShownStateSetter()("appLauncher")
  const willOpen = !bar.getVars().getSideBarStateAccessor()()
  bar.getVars().getSideBarStateSetter()(willOpen)
  // When opening, set bar to EXCLUSIVE keyboard mode so the compositor gives it focus (like Rofi).
  // When closing, sidebar state subscription in Bar will set it back to ON_DEMAND.
  if (willOpen) {
    bar.setKeyboardModeExclusive(true)
    const win = bar.getWindow() as unknown as Gtk.Window
    if (win && typeof win.present === "function") win.present()
    const title = typeof win.get_name === "function" ? win.get_name() : ""
    if (title) {
      const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      execAsync(["hyprctl", "dispatch", "focuswindow", `title:^(${escaped})$`]).catch(
        () => {},
      )
    }
  }
}
