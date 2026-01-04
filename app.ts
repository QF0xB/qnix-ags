import app from "ags/gtk4/app"
import { Astal, Gtk, Gdk } from "ags/gtk4"
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
  }
})

// Reload AGS configuration
export function reload() {
  // Recompile SCSS
  compileScss()

  // You can add more reload logic here if needed
  // For a full reload, you might need to restart AGS
  print("AGS configuration reloaded")
}
