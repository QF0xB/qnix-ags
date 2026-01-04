import Bar from "../../../Bar";
import { BarModule } from "../../../module/BarModule";
import { Gtk } from "ags/gtk4";
import { execAsync } from "ags/process";

// @ts-ignore: No type definitions for native module
import AstalTray from "gi://AstalTray"
import TrayItem from "../../../module/TrayItem";
import Tray from "../../../module/Tray";

// @ts-ignore: No type definitions for native module
import AstalNotifd from "gi://AstalNotifd"
const notifd = AstalNotifd.get_default()

const tray = AstalTray.get_default()

class DesktopControls extends BarModule {
    private desktopControlsBox: Gtk.Box

    private networkTrayItem: TrayItem | null = null
    private bluetoothTrayItem: TrayItem | null = null
    private notifdBtn: Gtk.Button | null = null

    private networkBox: Gtk.Box
    private bluetoothBox: Gtk.Box
    private notifdBox: Gtk.Box

    constructor(bar: Bar) {
        super(bar)

        this.desktopControlsBox = new Gtk.Box({
            name: "desktop-controls-box",
            cssClasses: ["desktop-controls-box"],
            homogeneous: true,
            spacing: 12,
            valign: Gtk.Align.CENTER,
        })

        this.networkBox = new Gtk.Box({
            name: "desktop-controls-network-box",
            cssClasses: ["desktop-controls-network-box"],
            orientation: Gtk.Orientation.VERTICAL,
        })

        this.bluetoothBox = new Gtk.Box({
            name: "desktop-controls-bluetooth-box",
            cssClasses: ["desktop-controls-bluetooth-box"],
            orientation: Gtk.Orientation.VERTICAL,
        })

        this.notifdBox = new Gtk.Box({
            name: "desktop-controls-notifd-box",
            cssClasses: ["desktop-controls-notifd-box"],
            orientation: Gtk.Orientation.VERTICAL,
        })

        this.buildNetworkTrayItem()
        this.buildBluetoothControls()
        this.buildNotifdControls()

        this.desktopControlsBox.append(this.networkBox)
        this.desktopControlsBox.append(this.bluetoothBox)
        this.desktopControlsBox.append(this.notifdBox)

        // Initial update
        this.updateNetworkTrayItem()
        this.updateBluetoothTrayItem()
        this.updateNotifdControls()
    }

    private findNetworkTrayItem(): AstalTray.TrayItem | undefined {
        return tray.get_items().find((item: AstalTray.TrayItem) => {
            return item.get_title() === "Network"
        })
    }

    private updateNetworkTrayItem(): void {
        // Remove existing widget
        this.networkTrayItem = null

        // Find and add network item
        const networkItem = this.findNetworkTrayItem()
        if (networkItem) {
            this.networkTrayItem = new TrayItem(this.getBar(), "desktop-controls", networkItem, "LAN")
        }

        while (this.networkBox.get_first_child() !== null) {
            this.networkBox.remove(this.networkBox.get_first_child() as Gtk.Widget)
        }

        this.networkBox.prepend(this.networkTrayItem?.getWidget() ?? new Gtk.Box({ name: "broken-box" }))
    }

    private buildNetworkTrayItem(): void {
        // Listen for tray item changes and update network item
        this.connectSafe(tray, 'item-added', () => this.updateNetworkTrayItem())
        this.connectSafe(tray, 'item-removed', () => this.updateNetworkTrayItem())
        this.connectSafe(tray, 'notify::items', () => this.updateNetworkTrayItem())

        this.updateNetworkTrayItem()
    }

    private findBluetoothTrayItem(): AstalTray.TrayItem | undefined {
        return tray.get_items().find((item: AstalTray.TrayItem) => {
            return item.get_title() === "blueman"
        })
    }

    private updateBluetoothTrayItem(): void {
        // Remove existing widget
        this.bluetoothTrayItem = null

        // Find and add network item
        const bluetoothItem = this.findBluetoothTrayItem()
        if (bluetoothItem) {
            this.bluetoothTrayItem = new TrayItem(this.getBar(), "desktop-controls", bluetoothItem, "Bluetooth")
        }

        while (this.bluetoothBox.get_first_child() !== null) {
            this.bluetoothBox.remove(this.bluetoothBox.get_first_child() as Gtk.Widget)
        }

        this.bluetoothBox.prepend(this.bluetoothTrayItem?.getWidget() ?? new Gtk.Box({ name: "broken-box" }))

    }


    private buildBluetoothControls(): void {
        // Listen for tray item changes and update network item
        this.connectSafe(tray, 'item-added', () => this.updateBluetoothTrayItem())
        this.connectSafe(tray, 'item-removed', () => this.updateBluetoothTrayItem())
        this.connectSafe(tray, 'notify::items', () => this.updateBluetoothTrayItem())

        this.updateBluetoothTrayItem()
    }


    private updateNotifdControls(): void {
        const dnd = notifd.get_dont_disturb()

        const iconImg = new Gtk.Image({
            name: "desktop-controls-notifd-icon",
            cssClasses: ["desktop-controls-notifd-icon"],
            icon_name: dnd ? "notifications-disabled-symbolic" : "notifications-symbolic",
        })
        
        this.notifdBtn?.set_child(iconImg)
        if (dnd) {
            this.notifdBtn?.set_tooltip_text("Notifications are disabled")
            this.notifdBtn?.add_css_class("inactive")
        } else {
            this.notifdBtn?.set_tooltip_text("Notifications are enabled")
            this.notifdBtn?.remove_css_class("inactive")
        }
    }

    private buildNotifdControls(): void {
        // Listen for notifd changes and update notifd controls
        this.connectSafe(notifd, 'notify::dont-disturb', () => this.updateNotifdControls())

        const notifdElem = new Gtk.Box({
            name: "desktop-controls-notifd-element",
            cssClasses: ["desktop-controls-element", "desktop-controls-notifd-element"],
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 4,
        })

        this.notifdBtn = new Gtk.Button({
            name: "desktop-controls-notifd-btn",
            cssClasses: ["desktop-controls-element-btn", "desktop-controls-notifd-btn"],
            hexpand: false,
            vexpand: false,
            halign: Gtk.Align.CENTER,
            valign: Gtk.Align.CENTER,
        })

        notifdElem.append(this.notifdBtn)

        notifdElem.append(new Gtk.Label({
            name: "desktop-controls-notifd-label",
            cssClasses: ["desktop-controls-element-label", "desktop-controls-notifd-label"],
            label: "DND",
        }))

        this.connectSafe(this.notifdBtn, 'clicked', () => {
            const newDndState = !notifd.get_dont_disturb()
            notifd.set_dont_disturb(newDndState)
            
            // Send notification
            const message = newDndState ? "Do Not Disturb enabled" : "Do Not Disturb disabled"
            const icon = newDndState ? "notifications-disabled-symbolic" : "notifications-symbolic"
            execAsync([
                "dunstify",
                "-t", "2000",
                "-r", "2594",
                "-i", icon,
                "DND",
                message
            ]).catch(err => {
                console.error("Failed to send DND notification:", err)
            })
        })

        this.updateNotifdControls()

        this.notifdBox.append(notifdElem)
    }

    public getWidget(): Gtk.Box {
        return this.desktopControlsBox
    }
}

export default DesktopControls