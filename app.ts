import app from "ags/gtk4/app"
import { Astal } from "ags/gtk4"
import Bar from "./windows/bars/Bar"
import Env from "./env"
import { compileScss } from "./cssHotReload"
import "./cssHotReload" // Enable SCSS hot reload
import NotificationPopupHandler from "./windows/notification/NotificationPopupHandler"

// Store bar windows by monitor connector name
const barWindows = new Map<string, Astal.Window>()

app.start({
  main() {
    const env = new Env()
    if (env.getDisplays().length == 0) {
      app.get_monitors().map(monitor => {
        const connector = monitor.get_connector() ?? ""
        const bar = new Bar(env, monitor);
        barWindows.set(connector, bar.getWindow())
        const notificationHandler = new NotificationPopupHandler(monitor, env)
        barWindows.set(connector, notificationHandler.getWindow())
      })
    } else {
      app.get_monitors().map(monitor => {
        const connector = monitor.get_connector() ?? "";
        const bar = new Bar(env, monitor);
        barWindows.set(connector, bar.getWindow())
        const notificationHandler = new NotificationPopupHandler(monitor, env)
        barWindows.set(connector, notificationHandler.getWindow())
      })
    }
  },
  requestHandler(argv: string[], res: (response: any) => void) {
    // Handle requests from ags -r command
    // When called as: ags -r "toggleBar()"
    // argv might be: ["toggleBar()"] or ["toggleBar", "()"] or just ["toggleBar"]
    const request = argv.join(" ").trim()
    const requestName = request.replace(/\(\)$/, "") // Remove trailing ()
    
    print(`[AGS] Request received: ${JSON.stringify(argv)} -> "${request}" -> "${requestName}"`)
    
    if (requestName === "toggleBar") {
      toggleBar()
      res(true)
    } else if (requestName === "reload") {
      reload()
      res(true)
    } else {
      print(`[AGS] Unknown request: "${requestName}" (original: ${JSON.stringify(argv)})`)
      res(false)
    }
  }
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
