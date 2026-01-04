import { Gtk, Gdk } from "ags/gtk4"

// @ts-ignore: No type definitions for native module
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import AstalTray from "gi://AstalTray"
const tray = AstalTray.get_default()

import { Timer } from "ags/time"

import env from "../../../env"
import { BarModule } from "./BarModule"
import Bar from "../Bar"
import TrayItem from "./TrayItem"

class Tray extends BarModule {
    private trayBox: Gtk.Box
    private trayBtn: Gtk.Button
    private trayRevealer: Gtk.Revealer
    private trayRevealTimeout: Timer | null = null
    private trayItems: TrayItemWidget

    constructor(bar: Bar) {
        super(bar)

        this.trayBox = new Gtk.Box({
            name: "tray-box",
            cssClasses: ["tray"],
            orientation: Gtk.Orientation.VERTICAL,
        })

        this.trayBtn = new Gtk.Button({
            name: "tray-btn",
            cssClasses: ["tray-btn"],
            cursor: Gdk.Cursor.new_from_name("pointer", null),
            label: (this.getBar().getVars().getTrayStateAccessor()() ? '󰅃' : '󰅀'),
        })

        this.trayRevealer = new Gtk.Revealer({
            name: "tray-revealer",
            cssClasses: ["tray-revealer"],
            transition_type: Gtk.RevealerTransitionType.SLIDE_DOWN,
            transition_duration: 200,
            reveal_child: false,
        })

        this.trayItems = new TrayItemWidget(this.getBar())

        this.trayBox.append(this.trayRevealer)
        this.trayBox.append(this.trayBtn)
        this.trayRevealer.set_child(this.trayItems.getWidget())

        this.update()

        this.gestures()
    }

    private update(): void {
        this.updateTrayButton()
        this.updateRevealState()
        this.updateBtnIcon()
    }

    private updateTrayButton(): void {
        this.trayBtn.set_label(this.getBar().getVars().getTrayStateAccessor()() ? '󰅃' : '󰅀')
    }

    private updateRevealState(): void {
        this.trayRevealer.set_reveal_child(this.getBar().getVars().getTrayStateAccessor()())
        this.updateTrayRevealTimeout()
    }

    private updateTrayRevealTimeout(): void { // Auto-hide after 25 seconds when opened, reset on click
       if (this.trayRevealTimeout !== null) {
            this.cancelTimerSafe(this.trayRevealTimeout)
        }
        if (this.getBar().getVars().getTrayStateAccessor()()) {
            this.trayRevealTimeout = this.setTimeoutSafe(() => {
                this.getBar().getVars().getTrayStateSetter()(false)
                this.trayRevealer.set_reveal_child(false)
                this.updateTrayButton()
            }, 25000) // Auto-hide after 25 seconds when opened
        }
    }

    private updateBtnIcon(): void {
        this.trayBtn.set_label(this.getBar().getVars().getTrayStateAccessor()() ? '󰅃' : '󰅀')
    }

    private gestures(): void {
        this.clickGesture()
    }

    private clickGesture(): void {
        this.trayBtn.connect('clicked', () => {
            this.getBar().getVars().toggleTrayState()
            this.update()
        })
    }

    public getWidget(): Gtk.Widget {
        return this.trayBox
    }
}

class TrayItemWidget extends BarModule {
    private itemWidgetMap: Map<any, Gtk.Widget >
    private itemBox: Gtk.Box

    constructor(bar: Bar) {
        super(bar)

        this.itemWidgetMap = new Map<any, Gtk.Widget>()

        this.itemBox = new Gtk.Box({
            name: "tray-item-box",
            cssClasses: ["tray-item-box"],
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 4,
            vexpand: false,
        })

        this.connectSafe(tray, 'item-added', () => this.updateItems())
        this.connectSafe(tray, 'item-removed', () => this.updateItems())
        this.connectSafe(tray, 'notify::items', () => this.updateItems())

        this.updateItems()
    }

    private updateItems(): void {
        // Get current items
        const currentItems = new Set(tray.get_items())

        // Remove widgets for items that no longer exist
        for (const [item, _] of this.itemWidgetMap.entries()) {
            if (!currentItems.has(item)) {
                const widgetData = this.itemWidgetMap.get(item)
                if (widgetData) {
                    this.itemBox.remove(widgetData)
                }
                this.itemWidgetMap.delete(item)
            }
        }

        // Add widgets for new items
        for (const item of currentItems) {
            if (!this.itemWidgetMap.has(item)) {
                // const widget = this.buildItemWidget(item)
                const widget = new TrayItem(this.getBar(), "tray", item).getWidget()
                if (widget) {
                    this.itemBox.append(widget)
                    this.itemWidgetMap.set(item, widget)
                }
            }
        }
    }

    private buildItemWidget(item: any): Gtk.Widget {
        const icon = new Gtk.Image({})
        this.updateIcon(item, icon)

        const model = item.get_menu_model?.()
        if (model) {
            const menuBox = new Gtk.Box({
                name: "tray-popup-menu-box-" + item.get_name?.(),
                cssClasses: ["tray-popup-menu-box"],
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 8,
                vexpand: false,
                halign: Gtk.Align.CENTER,
            })

            const menuBtn = new Gtk.MenuButton({
                name: "tray-menu-btn-" + item.get_name?.(),
                cssClasses: ["tray-element"],
                child: icon,
                menu_model: model,
                has_tooltip: true,
                halign: Gtk.Align.CENTER,
                valign: Gtk.Align.CENTER,
                direction: this.getBar().isLeft() ? Gtk.ArrowType.RIGHT : Gtk.ArrowType.LEFT,
            })

            menuBox.append(menuBtn)

            this.updateTooltip(item, menuBtn)
            this.updateActionGroup(item, menuBtn)

            // Connect to item property changes
            this.connectSafe(item, 'notify::gicon', () => this.updateIcon(item, icon))
            this.connectSafe(item, 'notify::tooltip', () => this.updateTooltip(item, menuBtn))
            // Listen for menu_model changes (in case it becomes available later)
            this.connectSafe(item, 'notify::menu-model', () => menuBtn.set_menu_model(item.get_menu_model?.()))


            return menuBox
        } else {
            const button = new Gtk.Button({
                name: "tray-button-" + item.get_name?.(),
                cssClasses: ["tray-element"],
                child: icon,
                has_tooltip: true,
                halign: Gtk.Align.CENTER,
                valign: Gtk.Align.CENTER,
            })
            this.updateTooltip(item, button)

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
            this.connectSafe(item, 'notify::gicon', () => this.updateIcon(item, icon))
            this.connectSafe(item, 'notify::tooltip', () => this.updateTooltip(item, button))

            return button
        }
    }

    private updateIcon(item: any, icon: Gtk.Image) {
        icon.set_from_gicon(item.get_gicon?.())
    }

    private updateTooltip(item: any, widget: Gtk.Widget) {
        widget.set_tooltip_text(item.get_tooltip_text?.())
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

export default Tray