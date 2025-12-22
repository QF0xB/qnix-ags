import { Gdk, Gtk, Astal } from "ags/gtk4"
import App from "ags/gtk4/app"
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

class Bar {
    private window: Astal.Window
    private condensed: boolean
    private laptop: boolean
    private left: boolean
    private gdkmonitor: Gdk.Monitor
    private modules: Map<string, BarModule> = new Map<string, BarModule>()

    constructor(gdkmonitor: Gdk.Monitor, condensed: boolean, laptop: boolean, left: boolean = true) {
        this.gdkmonitor = gdkmonitor
        this.condensed = condensed
        this.laptop = laptop
        this.left = left

        const windowName = condensed ? (laptop ? "bar-condensed-laptop" : "bar-condensed") : (laptop ? "bar-wide-laptop" : "bar-wide")

        this.window = new Astal.Window({
            visible: true,
            name: windowName,
            title: windowName,
            gdkmonitor: gdkmonitor,
            exclusivity: Astal.Exclusivity.EXCLUSIVE,
            anchor: Astal.WindowAnchor.TOP | Astal.WindowAnchor.BOTTOM | (left ? Astal.WindowAnchor.LEFT : Astal.WindowAnchor.RIGHT),
            application: App,
            layer: Astal.Layer.TOP,
            cssClasses: ["bar", laptop ? "bar-laptop" : "bar-desktop", left ? "bar-left" : "bar-right"]
        })

        this.loadModules()
        this.build()
    }

    private build(): void {
        const box = new Gtk.Box({
            name: "bar-inner",
            cssClasses:["bar-inner"],
            
            orientation: Gtk.Orientation.VERTICAL,
            spacing: this.condensed ? 8 : 12,
            marginTop: this.condensed ? 12 : 20,
            marginBottom: this.condensed ? 12 : 20,
            marginStart: 0,
            marginEnd: 0,
            vexpand: true,
            hexpand: true
        })
    
        const centerbox = new Gtk.CenterBox({
            orientation: Gtk.Orientation.VERTICAL,
            halign: Gtk.Align.CENTER,
            name: "centerbox",
            cssClasses: ["centerbox"],
            hexpand: true,
            vexpand: true
        })
    
        centerbox.set_start_widget(this.TopSection())
        centerbox.set_center_widget(this.MiddleSection())
        centerbox.set_end_widget(this.BottomSection())
    
        box.append(centerbox)
        this.window.set_child(box)

    }

    private loadModules(): void {
        // Top section
        this.addModule("sidebar-revealer", new SidebarRevealer())
        if (!this.condensed) {
            this.addModule("search", new Search())
            this.addModule("tray", new Tray())
        }

        // Middle section
        this.addModule("workspaces", new Workspaces(this.gdkmonitor))

        // Bottom section
        this.addModule("audio", new Audio())
        if (Battery.hasBattery()) {
            this.addModule("battery", new Battery())
        }
        this.addModule("keyboard", new Keyboard())
        this.addModule("clock", new Clock())
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
}

export default Bar
