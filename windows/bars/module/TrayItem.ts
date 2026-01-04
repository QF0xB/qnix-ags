import { Gtk } from "ags/gtk4"
// @ts-ignore: No type definitions for native module
import AstalTray from "gi://AstalTray"
import Gio from "gi://Gio"

import Bar from "../Bar"
import { BarModule } from "./BarModule"

class TrayItem extends BarModule {
    private icon: Gtk.Image
    private itemBox: Gtk.Box
    private label: string | null

    constructor(bar: Bar, classPrefix: string, item: AstalTray.TrayItem, label: string | null = null) {
        super(bar)
        this.label = label

        this.icon = new Gtk.Image({})
        this.itemBox = new Gtk.Box({
            name: classPrefix + "-" + item.get_title() + "-box",
            cssClasses: [classPrefix + "-" + item.get_title() + "-box", classPrefix + "-element"],
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 4,
            vexpand: false,
        })

        this.update(classPrefix, item)
    }

    public update(classPrefix: string, item: AstalTray.TrayItem): void {
        while (this.itemBox.get_first_child() !== null) {
            this.itemBox.remove(this.itemBox.get_first_child() as Gtk.Widget)
        }

        this.updateIcon(item)

        if (item.get_menu_model() !== null && item.get_menu_model() !== undefined) {
            const menuBtn = new Gtk.MenuButton({
                name: classPrefix + "-" + item.get_title() + "-btn",
                cssClasses: [classPrefix + "-" + item.get_title() + "-btn", classPrefix + "-element-btn"],
                child: this.icon,
                menu_model: item.get_menu_model(),
                halign: Gtk.Align.CENTER,
                valign: Gtk.Align.CENTER,
            })
            this.itemBox.append(menuBtn)

            this.updateTooltip(item)
            this.updateActionGroup(item, menuBtn)

            // Connect to item property changes
            this.connectSafe(item, 'notify::gicon', () => this.updateIcon(item))
            this.connectSafe(item, 'notify::tooltip', () => this.updateTooltip(item))
            this.connectSafe(item, 'notify::menu-model', () => menuBtn.set_menu_model(item.get_menu_model()))

        } else {
            const button = new Gtk.Button({
                name: classPrefix + "-" + item.get_title() + "-btn",
                cssClasses: [classPrefix + "-" + item.get_title() + "-btn", classPrefix + "-element-btn"],
                child: this.icon,
                halign: Gtk.Align.CENTER,
                valign: Gtk.Align.CENTER,
            })

            // Left-click handler
            button.connect('clicked', () => {
                // simple applet that responds to activate
                item.about_to_show?.()
                item.activate(0, 0)
            })

            // Right-click handler using gesture
            const gesture = new Gtk.GestureClick()
            gesture.set_button(3) // Right mouse button
            gesture.connect('pressed', () => {
                // Right-click: call secondary_activate as per AstalTray API
                // https://aylur.github.io/libastal/tray/class.TrayItem.html
                item.secondary_activate(0, 0)
            })
            button.add_controller(gesture)

            // Connect to item property changes
            this.connectSafe(item, 'notify::gicon', () => this.updateIcon(item))
            this.connectSafe(item, 'notify::tooltip', () => this.updateTooltip(item))

            this.itemBox.append(button)
        }

        if (this.label) {
            this.itemBox.append(new Gtk.Label({
                name: classPrefix + "-" + item.get_title() + "-label",
                cssClasses: [classPrefix + "-" + item.get_title() + "-label", classPrefix + "-element-label"],
                label: this.label,
            }))
        }
    }

    private getSymbolicIconName(gicon: any): string | null {
        // Check if it's a ThemedIcon
        if (gicon instanceof Gio.ThemedIcon) {
            const names = gicon.get_names()
            if (names && names.length > 0) {
                const iconName = names[0]
                // Convert to symbolic: remove existing -symbolic suffix if present, then add it
                // Also handle cases where icon might already be symbolic
                if (iconName.endsWith('-symbolic')) {
                    return iconName
                }
                // Try appending -symbolic
                return iconName + '-symbolic'
            }
        }
        return null
    }

    public updateIcon(item: AstalTray.TrayItem): void {
        const gicon = item.get_gicon()
        if (!gicon) {
            return
        }

        // Try to get symbolic icon name
        const symbolicName = this.getSymbolicIconName(gicon)
        if (symbolicName) {
            this.icon.set_from_icon_name(symbolicName)
        } else {
            // Fallback to original icon if we can't convert it
            this.icon.set_from_gicon(gicon)
        }
    }

    public updateTooltip(item: AstalTray.TrayItem): void {
        this.itemBox.set_tooltip_text(item.get_tooltip_text())
    }

    private updateActionGroup(item: any, menuButton: Gtk.MenuButton) {
        const actionGroup = item.get_action_group?.()
        if (actionGroup) {
            menuButton.insert_action_group('dbusmenu', actionGroup)
        }
    }

    public getWidget(): Gtk.Widget {
        return this.itemBox
    }
}

export default TrayItem