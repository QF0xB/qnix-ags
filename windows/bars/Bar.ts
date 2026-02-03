import Gtk4LayerShell from "gi://Gtk4LayerShell?version=1.0"
import { Gdk, Gtk, Astal } from "ags/gtk4"
import { debugLog } from "../../utils/debug"
import App from "ags/gtk4/app"
import { timeout } from "ags/time"
import SidebarRevealer from "./module/SidebarRevealer"
import Devider from "../../utils/Devider"
import Tray from "./module/Tray"
import Search from "./module/Search"
import Workspaces from "./module/Workspaces"
import Clock from "./module/Clock"
import Audio from "./module/Audio"
import Battery from "./module/Battery"
import { BarModule } from "./module/BarModule"
import Keyboard from "./module/Keyboard"
import SideBar from "./sidebar/SideBar"
import Vars from "./vars"
import Env from "../../env"

class Bar {
    private window: Astal.Window
    private condensed: boolean
    private laptop: boolean
    private left: boolean
    private gdkmonitor: Gdk.Monitor
    private modules: Map<string, BarModule> = new Map<string, BarModule>()
    private env: Env
    private vars: Vars

    constructor(env: Env, gdkmonitor: Gdk.Monitor) {
        this.gdkmonitor = gdkmonitor
        this.condensed = env.getDisplay(gdkmonitor.get_connector() ?? "")?.condensed ?? false
        this.laptop = env.getLaptop()
        this.left = env.getDisplay(gdkmonitor.get_connector() ?? "")?.left ?? true
        this.env = env
        this.vars = new Vars()

        const windowName = this.condensed ? (this.laptop ? "bar-condensed-laptop" : "bar-condensed") : (this.laptop ? "bar-wide-laptop" : "bar-wide") + "-" + gdkmonitor.get_connector()

        this.window = new Astal.Window({
            visible: true,
            name: windowName,
            title: windowName,
            gdkmonitor: gdkmonitor,
            exclusivity: Astal.Exclusivity.EXCLUSIVE,
            anchor: Astal.WindowAnchor.TOP | Astal.WindowAnchor.BOTTOM | (this.left ? Astal.WindowAnchor.LEFT : Astal.WindowAnchor.RIGHT),
            application: App,
            layer: Astal.Layer.TOP,
            hexpand: false,
        })

        // Allow the bar to receive keyboard focus when the user clicks on it (e.g. the launcher search entry).
        // Without this, layer shell default is NONE and the surface never gets focus.
        try {
            const gtkWindow = this.window as unknown as Gtk.Window
            if (Gtk4LayerShell.is_layer_window && Gtk4LayerShell.is_layer_window(gtkWindow)) {
                Gtk4LayerShell.set_keyboard_mode(gtkWindow, Gtk4LayerShell.KeyboardMode.ON_DEMAND)
            }
        } catch (e) {
            console.warn("Could not set bar keyboard mode:", e)
        }

        // When sidebar closes, restore ON_DEMAND so we don't keep exclusive keyboard
        this.vars.getSideBarStateAccessor().subscribe(() => {
            if (!this.vars.getSideBarStateAccessor()()) {
                this.setKeyboardModeExclusive(false)
            }
        })

        this.loadModules()
        this.build()
    }

    private build(): void {
        const masterBox = new Gtk.Box({
            name: "bar",
            cssClasses: ["bar", this.laptop ? "bar-laptop" : "bar-desktop", this.left ? "bar-left" : "bar-right"],
            orientation: Gtk.Orientation.HORIZONTAL,
            marginTop: this.condensed ? 12 : 20,
            marginBottom: this.condensed ? 12 : 20,
            spacing: 0,  // No spacing between sidebar and bar-inner
            hexpand: false,  // Don't expand - size to content
            vexpand: false,
            halign: Gtk.Align.START,  // Align to start, don't center
        })

        const sidebar = new SideBar(this, this.left)
        const sidebarWidget = sidebar.getWidget()

        // Connect to revealer's allocated width changes to trigger window resize
        sidebarWidget.connect('notify::allocated-width', () => {
            // When revealer width changes, immediately trigger window resize
            masterBox.queue_resize()
            this.window.queue_resize()
        })


        const box = new Gtk.Box({
            name: "bar-inner",
            cssClasses: ["bar-inner"],
            orientation: Gtk.Orientation.VERTICAL,
            spacing: this.condensed ? 8 : 12,
            marginStart: 0,
            marginEnd: 0,
            vexpand: true,
            hexpand: false  // Don't expand horizontally - size to content
        })

        const centerbox = new Gtk.CenterBox({
            orientation: Gtk.Orientation.VERTICAL,
            halign: Gtk.Align.CENTER,
            name: "centerbox",
            cssClasses: ["centerbox"],
            hexpand: false,
            vexpand: true
        })

        centerbox.set_start_widget(this.TopSection())
        centerbox.set_center_widget(this.MiddleSection())
        centerbox.set_end_widget(this.BottomSection())

        box.append(centerbox)

        if (this.left) {
            masterBox.append(sidebarWidget)
            masterBox.append(box)
        } else {
            masterBox.append(box)
            masterBox.append(sidebarWidget)
        }

        this.window.set_child(masterBox)

        // Prime the window by calling set_default_size() once during initialization
        // This sets up the window to automatically respect size changes from the start
        // After the first set_default_size() call, the window will automatically resize
        timeout(1000, () => {
            const windowWidget = this.window as unknown as Gtk.Widget
            if (windowWidget) {
                const initialWidth = masterBox.get_allocated_width()
                const initialHeight = windowWidget.get_allocated_height()
                const gtkWindow = this.window as unknown as Gtk.Window
                if (gtkWindow && typeof (gtkWindow as any).set_default_size === 'function' && initialWidth > 0) {
                    const logMessage = `Priming window with initial size: ${initialWidth} x ${initialHeight}`
                    debugLog(logMessage)
                        ; (gtkWindow as any).set_default_size(initialWidth, initialHeight)
                    // This primes the window so it will automatically respect size changes from the first toggle
                }
            }
        })

        // Hide border during sidebar transition to prevent trail
        this.getVars().getSideBarStateAccessor().subscribe(() => {
            if (!this.env.getHideBorderTrail()) {
                return
            }

            if (this.getVars().getSideBarStateAccessor()()) {
                debugLog('not hiding border during sidebar show transition')
                return
            }

            debugLog('hiding border during sidebar transition')
            masterBox.add_css_class(this.left ? 'bar-anim-left' : 'bar-anim-right')
            // Restore border after transition completes
            timeout(750, () => {
                debugLog('restoring border after sidebar transition')
                masterBox.remove_css_class(this.left ? 'bar-anim-left' : 'bar-anim-right')
            })
        })
    }

    private loadModules(): void {
        // Top section
        this.addModule("sidebar-revealer", new SidebarRevealer(this))
        if (!this.condensed) {
            this.addModule("search", new Search(this))
            this.addModule("tray", new Tray(this))
        }

        // Middle section
        this.addModule("workspaces", new Workspaces(this, this.gdkmonitor))

        // Bottom section
        this.addModule("audio", new Audio(this))
        if (Battery.hasBattery()) {
            this.addModule("battery", new Battery(this))
        }
        this.addModule("keyboard", new Keyboard(this))
        this.addModule("clock", new Clock(this))
    }

    private TopSection(): Gtk.Box {
        const box = new Gtk.Box({
            name: "top-section",
            cssClasses: ["top-section"],
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 4,
            halign: Gtk.Align.CENTER,
            valign: Gtk.Align.START,
            vexpand: false,
            hexpand: false
        })

        box.append(this.getModule("sidebar-revealer")?.getWidget() ?? new Gtk.Box())
        if (!this.condensed) {
            box.append(Devider("default-devider"))
            box.append(this.getModule("search")?.getWidget() ?? new Gtk.Box())
            box.append(this.getModule("tray")?.getWidget() ?? new Gtk.Box())
        }

        return box
    }

    private MiddleSection(): Gtk.Box {
        const box = new Gtk.Box({
            name: "middle-section",
            cssClasses: ["middle-section"],
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 8,
            halign: Gtk.Align.CENTER,
            valign: Gtk.Align.CENTER,
            vexpand: false,
            hexpand: false
        })

        box.append(this.getModule("workspaces")?.getWidget() ?? new Gtk.Box())
        return box
    }

    private BottomSection(): Gtk.Box {
        const box = new Gtk.Box({
            name: "bottom-section",
            cssClasses: ["bottom-section"],
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 4,
            halign: Gtk.Align.CENTER,
            valign: Gtk.Align.END,
            vexpand: false,
            hexpand: false
        })

        const systemBox = new Gtk.Box({
            name: "system-box",
            cssClasses: ["system-box"],
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 4,
        })
        systemBox.append(this.getModule("audio")?.getWidget() ?? new Gtk.Box())
        if (this.hasModule("battery")) {
            systemBox.append(Devider("system-devider"))
            systemBox.append(this.getModule("battery")?.getWidget() ?? new Gtk.Box())
            systemBox.append(Devider("system-devider"))
            systemBox.append(this.getModule("keyboard")?.getWidget() ?? new Gtk.Box())
        }

        if (!this.condensed) {
            box.append(systemBox)
            box.append(Devider("default-devider"))
        }

        box.append(this.getModule("clock")?.getWidget() ?? new Gtk.Box())
        return box
    }

    public getWindow(): Astal.Window {
        return this.window
    }

    /**
     * Set layer shell keyboard mode to EXCLUSIVE (grabs keyboard like Rofi) or ON_DEMAND.
     * Call with true when opening the launcher so the user can type immediately.
     */
    public setKeyboardModeExclusive(exclusive: boolean): void {
        try {
            const gtkWindow = this.window as unknown as Gtk.Window
            if (!Gtk4LayerShell.is_layer_window || !Gtk4LayerShell.is_layer_window(gtkWindow)) return
            Gtk4LayerShell.set_keyboard_mode(
                gtkWindow,
                exclusive ? Gtk4LayerShell.KeyboardMode.EXCLUSIVE : Gtk4LayerShell.KeyboardMode.ON_DEMAND,
            )
        } catch (e) {
            console.warn("Could not set bar keyboard mode:", e)
        }
    }

    public getGdkMonitor(): Gdk.Monitor {
        return this.gdkmonitor
    }

    public isCondensed(): boolean {
        return this.condensed
    }

    public isLaptop(): boolean {
        return this.laptop
    }

    public isLeft(): boolean {
        return this.left
    }

    public destroy(): void {
        this.window.destroy()
        this.modules.forEach((module, key) => {
            module.destroy()
            this.modules.delete(key)
        })
        this.modules.clear()
    }

    public addModule(name: string, module: BarModule): void {
        this.modules.set(name, module)
    }

    public getModule(name: string): BarModule | undefined {
        return this.modules.get(name) ?? undefined
    }

    public hasModule(name: string): boolean {
        return this.modules.has(name)
    }

    public getVars(): Vars {
        return this.vars
    }
}

export default Bar
