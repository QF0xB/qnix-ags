import { Gtk, Gdk } from "ags/gtk4"

// @ts-ignore: No type definitions for native module
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import AstalTray from "gi://AstalTray"
const tray = AstalTray.get_default()

import { trayState, setTrayState } from "../vars"
import { timeout, Timer } from "ags/time"

import env from "../../../env"

function revealer(itemBox: Gtk.Box): Gtk.Revealer {
    const revealer = new Gtk.Revealer({
        name: "tray-revealer",
        cssClasses: ["tray-revealer"],
        transition_type: Gtk.RevealerTransitionType.SLIDE_DOWN,
        transition_duration: 200,
        reveal_child: false,
    })

    revealer.set_child(itemBox)
    return revealer
}

function trayButton(): Gtk.Button {
    const trayButton = new Gtk.Button({
        name: "tray-button",
        cssClasses: ["tray-button"],
        cursor: Gdk.Cursor.new_from_name("pointer", null),
        label: (trayState() ? '󰅃' : '󰅀')
    })
    return trayButton
}

function updateTrayButton(trayButton: Gtk.Button): void {
    trayButton.set_label(trayState() ? '󰅃' : '󰅀')
}

function updateTrayToggle(trayButton: Gtk.Button, revealer: Gtk.Revealer, lastTimer: Timer | null): Timer | null {
    // Cancel any existing timer
    if (lastTimer !== null) {
        lastTimer.cancel()
    }

    const newState = !trayState()
    setTrayState(newState)
    revealer.set_reveal_child(newState)
    updateTrayButton(trayButton)

    // Auto-hide after 25 seconds when opened
    if (newState) {
        lastTimer = timeout(25000, () => {
            setTrayState(false)
            revealer.set_reveal_child(false)
            updateTrayButton(trayButton)
        })
    }

    return lastTimer
}

function updateIcon(item: any, icon: Gtk.Image): void {
    icon.set_from_gicon(item.get_gicon?.())
}

function updateTooltip(item: any, widget: Gtk.Widget): void {
    widget.set_tooltip_text(item.get_tooltip_text?.())
}

function updateActionGroup(item: any, menuButton: Gtk.MenuButton): void {
    const actionGroup = item.get_action_group?.()
    if (actionGroup) {
        menuButton.insert_action_group('dbusmenu', actionGroup)
    }
}

function buildItemWidget(item: any, itemWidgetMap: Map<any, { icon: Gtk.Image, widget: Gtk.Widget }>): Gtk.Widget {
    const icon = new Gtk.Image({
        pixel_size: 22,
    })
    updateIcon(item, icon) 

    const model = item.get_menu_model?.()

    if (model) {
        const popupMenuBox = new Gtk.Box({
            name: "tray-popup-menu-box-" + item.get_name?.(),
            cssClasses: ["tray-popup-menu-box"],
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 8,
            vexpand: false,
            halign: Gtk.Align.CENTER,
        })

        const menuButton = new Gtk.MenuButton({
            name: "tray-menu-button-" + item.get_name?.(),
            cssClasses: ["tray-element"],
            child: icon,
            menu_model: model,
            has_tooltip: true,
            halign: Gtk.Align.CENTER,
            valign: Gtk.Align.CENTER,
            direction: env.left ? Gtk.ArrowType.RIGHT : Gtk.ArrowType.LEFT, 
        })

        updateTooltip(item, menuButton)
        updateActionGroup(item, menuButton)

        popupMenuBox.append(menuButton)

        // Connect to item property changes
        item.connect('notify::gicon', () => updateIcon(item, icon))
        item.connect('notify::tooltip', () => updateTooltip(item, menuButton))
        // Listen for menu_model changes (in case it becomes available later)
        item.connect('notify::menu-model', () => menuButton.set_menu_model(item.get_menu_model?.()))

        itemWidgetMap.set(item, { icon, widget: popupMenuBox })
        return popupMenuBox
    } else {
        // Regular button (either is_menu=false, or is_menu=true but no menu_model yet)
        const button = new Gtk.Button({
            name: "tray-button-" + item.get_name?.(),
            cssClasses: ["tray-element"],
            child: icon,
            has_tooltip: true,
            halign: Gtk.Align.CENTER,
            valign: Gtk.Align.CENTER,
        })
        updateTooltip(item, button)

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
        item.connect('notify::gicon', () => updateIcon(item, icon))
        item.connect('notify::tooltip', () => updateTooltip(item, button))

        itemWidgetMap.set(item, { icon, widget: button })
        return button
    }
}

function updateItems(itemBox: Gtk.Box, itemWidgetMap: Map<any, { icon: Gtk.Image, widget: Gtk.Widget }>): void {
    // Get current items
    const currentItems = new Set(tray.get_items())
        
    // Remove widgets for items that no longer exist
    for (const [item, _] of itemWidgetMap.entries()) {
        if (!currentItems.has(item)) {
            const widgetData = itemWidgetMap.get(item)
            if (widgetData) {
                itemBox.remove(widgetData.widget)
            }
            itemWidgetMap.delete(item)
        }
    }

    // Add widgets for new items
    for (const item of currentItems) {
        if (!itemWidgetMap.has(item)) {
            const widget = buildItemWidget(item, itemWidgetMap)
            if (widget) {
                itemBox.append(widget)
            }
        }
    }
}

function itemBox(): Gtk.Box {
    const itemWidgetMap = new Map<any, { icon: Gtk.Image, widget: Gtk.Widget }>()
    
    const itemBox = new Gtk.Box({
        name: "tray-item-box",
        cssClasses: ["tray-item-box"],
        orientation: Gtk.Orientation.VERTICAL,
        spacing: 4,
        vexpand: false
    })

    // first update
    updateItems(itemBox, itemWidgetMap)

    // Connect to item-added signal for when new applets appear
    // https://aylur.github.io/libastal/tray/signal.Tray.item-added.html
    tray.connect('item-added', () => {
        updateItems(itemBox, itemWidgetMap)
    })

    // Connect to item-removed signal for when applets disappear
    tray.connect('item-removed', () => {
        updateItems(itemBox, itemWidgetMap)
    })

    // Also keep notify::items as a fallback
    tray.connect('notify::items', () => updateItems(itemBox, itemWidgetMap))

    return itemBox
}


export default function Tray(): Gtk.Box {
    const trayBox = new Gtk.Box({
        name: "tray",
        cssClasses: ["tray"],
        orientation: Gtk.Orientation.VERTICAL
    })

    const b = trayButton()
    const i = itemBox()
    const r = revealer(i)

    let lastTimer: Timer | null = null

    b.connect('clicked', () => lastTimer = updateTrayToggle(b, r, lastTimer));

    r.set_reveal_child(trayState())
    trayBox.append(r)
    trayBox.append(b)

    return trayBox
}