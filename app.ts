import app from "ags/gtk4/app"
import { Gdk } from "ags/gtk4"
import Bar from "./windows/bars/bar"
import env from "./env"
import { compileScss } from "./cssHotReload"
import "./cssHotReload" // Enable SCSS hot reload

// Store bar windows by monitor connector name
const barWindows = new Map<string, ReturnType<typeof Bar>>()

console.log("env", JSON.stringify(env, null, 2));

app.start({
  main() {
    if (env.displays.large.length == 0 && env.displays.small.length == 0) {
      // If no displays are configured, use the default large bar layout on all monitors.
      app.get_monitors().map(monitor => {
        const connector = monitor.get_connector() ?? ""
        const window = Bar(monitor, false)
        barWindows.set(connector, window)
      })
    } else {
      app.get_monitors().map(monitor => {
        const connector = monitor.get_connector() ?? "";
      
        console.log("connector", connector);
        if (env.displays.large.includes(connector)) {
          const window = Bar(monitor, false);
          barWindows.set(connector, window)
        } else if (env.displays.small.includes(connector)) {
          const window = Bar(monitor, true);
          barWindows.set(connector, window)
        }
      });
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
