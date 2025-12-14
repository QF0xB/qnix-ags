import app from "ags/gtk4/app"
import Bar from "./windows/bars/bar"
import env from "./env"
import "./cssHotReload" // Enable SCSS hot reload

console.log("env", JSON.stringify(env, null, 2));
app.start({
  main() {
    if (env.displays.large.length == 0 && env.displays.small.length == 0) {
      // If no displays are configured, use the default large bar layout on all monitors.
      app.get_monitors().map(monitor => Bar(monitor, false))
    }

    app.get_monitors().map(monitor => {
      const connector = monitor.get_connector() ?? "";
    
      console.log("connector", connector);
      if (env.displays.large.includes(connector)) {
        Bar(monitor, false);
      } else if (env.displays.small.includes(connector)) {
        Bar(monitor, true);
      }
    });
  },
})
