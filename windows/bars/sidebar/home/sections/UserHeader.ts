import { Gdk, Gtk } from "ags/gtk4"
import Bar from "../../../Bar"
import { BarModule } from "../../../module/BarModule"
import { execAsync } from "ags/process"
import { debugLog } from "../../../../../utils/debug"

class UserHeader extends BarModule {
    private userHeaderBox: Gtk.Box
    private powerControlsStack: Gtk.Stack

    constructor(bar: Bar) {
        super(bar)

        this.userHeaderBox = new Gtk.Box({
            name: "user-header-box",
            cssClasses: ["user-header-box"],
            spacing: 12,
        })

        this.powerControlsStack = new Gtk.Stack({
            name: "power-controls-stack",
            cssClasses: ["power-controls-stack"],
            halign: Gtk.Align.END,
        })

        this.userHeaderBox.append(new Gtk.Label({
            name: "user-header-icon",
            cssClasses: ["user-header-icon"],
            label: "",
        }))

        const detailsBox = new Gtk.Box({
            name: "user-header-details-box",
            cssClasses: ["user-header-details-box"],
            spacing: 2,
            orientation: Gtk.Orientation.VERTICAL,
            valign: Gtk.Align.CENTER,
        })

        detailsBox.append(new Gtk.Label({
            name: "user-header-details-username",
            cssClasses: ["user-header-details-username"],
            label: "q.braendli",
        }))

        detailsBox.append(new Gtk.Label({
            name: "user-header-details-wm",
            cssClasses: ["user-header-details-wm"],
            label: "HYPRLAND",
        }))

        this.userHeaderBox.append(detailsBox)

        // Add a spacer to push power button to the end
        const spacer = new Gtk.Box({
            name: "user-header-spacer",
            cssClasses: ["user-header-spacer"],
            hexpand: true,  // Spacer expands to fill available space
        })
        this.userHeaderBox.append(spacer)

        this.userHeaderBox.append(this.powerControlsStack)

        this.buildPowerControls()
    }

    private buildPowerControls(): void {
        const powerButton = new Gtk.Button({
            name: "power-button",
            cssClasses: ["power-button"],
            cursor: Gdk.Cursor.new_from_name("pointer", null),
            halign: Gtk.Align.END,
            valign: Gtk.Align.CENTER,
            tooltipText: "Power",
            label: "",
        })

        const powerMenu = new Gtk.Box({
            name: "power-menu",
            cssClasses: ["power-menu"],
            halign: Gtk.Align.END,
            valign: Gtk.Align.CENTER,
            spacing: 12,
        })

        const shutdownButton = new Gtk.Button({
            name: "shutdown-button",
            cssClasses: ["shutdown-button"],
            label: "",
            tooltipText: "Shutdown",
            cursor: Gdk.Cursor.new_from_name("pointer", null),
        })

        const rebootButton = new Gtk.Button({
            name: "reboot-button",
            cssClasses: ["reboot-button"],
            label: "",
            tooltipText: "Reboot",
            cursor: Gdk.Cursor.new_from_name("pointer", null),
        })

        const suspendButton = new Gtk.Button({
            name: "suspend-button",
            cssClasses: ["suspend-button"],
            label: "",
            tooltipText: "Suspend",
            cursor: Gdk.Cursor.new_from_name("pointer", null),
        })

        const lockButton = new Gtk.Button({
            name: "lock-button",
            cssClasses: ["lock-button"],
            label: "",
            tooltipText: "Lock",
            cursor: Gdk.Cursor.new_from_name("pointer", null),
        })

        const closeHyprlandButton = new Gtk.Button({
            name: "close-hyprland-button",
            cssClasses: ["close-hyprland-button"],
            label: "󰶭",
            tooltipText: "Close Hyprland",
            cursor: Gdk.Cursor.new_from_name("pointer", null),
        })

        const closeButton = new Gtk.Button({
            name: "close-button",
            cssClasses: ["close-button"],
            label: "",
            tooltipText: "Close",
            cursor: Gdk.Cursor.new_from_name("pointer", null),
        })

        this.connectSafe(shutdownButton, 'clicked', () => {
            execAsync(["systemctl", "poweroff"])
        })
        this.connectSafe(rebootButton, 'clicked', () => {
            execAsync(["systemctl", "reboot"])
        })
        this.connectSafe(suspendButton, 'clicked', () => {
            execAsync(["systemctl", "suspend"]).then(() => {
                execAsync(["hyprlock"])
            })
        })
        this.connectSafe(lockButton, 'clicked', () => {
            execAsync(["hyprlock"])
        })

        this.connectSafe(closeHyprlandButton, 'clicked', () => {
            execAsync(["hyprctl", "dispatch", "exit"])
        })

        powerMenu.append(shutdownButton)
        powerMenu.append(rebootButton)
        powerMenu.append(suspendButton)
        powerMenu.append(lockButton)
        powerMenu.append(closeHyprlandButton)
        powerMenu.append(closeButton)

        // Add children to stack with names (required for set_visible_child_name)
        this.powerControlsStack.add_named(powerButton, "power-button")
        this.powerControlsStack.add_named(powerMenu, "power-menu")

        this.connectSafe(closeButton, 'clicked', () => {
            this.powerControlsStack.set_transition_type(Gtk.StackTransitionType.SLIDE_RIGHT)
            this.powerControlsStack.set_visible_child_name("power-button")
            debugLog("Closing power menu")
            debugLog("Side bar width:", this.getBar().getVars().getSideBarWidthAccessor()())
        })

        this.connectSafe(powerButton, 'clicked', () => {
            this.powerControlsStack.set_transition_type(Gtk.StackTransitionType.SLIDE_LEFT)
            this.powerControlsStack.set_visible_child_name("power-menu")
        })

    }

    public getWidget(): Gtk.Box {
        return this.userHeaderBox
    }
}

export default UserHeader