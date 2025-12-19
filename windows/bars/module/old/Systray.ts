import { Gtk, Gdk } from 'ags/gtk4'
import Tray from "gi://AstalTray"
import GLib from 'gi://GLib'
import { QButton } from '../../../../utils/PointerButton'

const systray = Tray.get_default()

// Note: In GTK4, menu icons are controlled by the GMenuModel itself
// (via icon/verb-icon attributes), not by global settings.
// If icons don't appear, the menu model from AstalTray likely doesn't include them.

export function Revealer(onStateChange?: (revealed: boolean) => void): Gtk.Revealer {
    const revealer = new Gtk.Revealer({
        transition_type: Gtk.RevealerTransitionType.SLIDE_DOWN,
        transition_duration: 200,
        reveal_child: false,
    })

    const appsBox = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        spacing: 8,
        vexpand: false,
    })
    appsBox.add_css_class('apps')

    // Map to store item -> widget mappings for updates
    const itemWidgetMap = new Map<any, { icon: Gtk.Image, widget: Gtk.Widget }>()

    const updateIcon = (item: any, iconWidget: Gtk.Image) => {
        const gicon = item.get_gicon?.()
        if (gicon) {
            iconWidget.set_from_gicon(gicon)
        }
    }

    const updateTooltip = (item: any, widget: Gtk.Widget) => {
        const tooltip = item.get_tooltip_text?.()
        if (tooltip) {
            widget.set_tooltip_text(tooltip)
        }
    }

    const createItemWidget = (item: any) => {
        const icon = new Gtk.Image({
            pixel_size: 22,
        })
        updateIcon(item, icon)

        const isMenu = item.get_is_menu?.() ?? false
        const model = item.get_menu_model?.()

        // Menu items get a proper Gtk.MenuButton backed by the item's
        // menu_model / action_group so GTK can render the menu exactly
        // like in a normal bar (with icons, spacers, etc.).
        // However, some items (like bluez) may have is_menu=true but no menu_model yet.
        // In that case, we treat them as regular buttons until the menu_model becomes available.
        if (isMenu && model) {
            const popupMenuBox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 8,
                vexpand: false,
            })
            popupMenuBox.add_css_class('popupmenu')

            const menuButton = new Gtk.MenuButton({})
            menuButton.add_css_class('button')
            menuButton.add_css_class('systray-menubutton')
            menuButton.set_child(icon)
            updateTooltip(item, menuButton)
            menuButton.set_has_tooltip(true)
            menuButton.set_menu_model(model)

            const actionGroup = item.get_action_group?.()
            if (actionGroup) {
                menuButton.insert_action_group('dbusmenu', actionGroup)
            }

            // Add gesture for right-click (MenuButton already handles left-click)
            // For menu items, right-click shows the menu (same as left-click)
            const gesture = new Gtk.GestureClick()
            gesture.set_button(3) // Right mouse button
            gesture.connect('pressed', () => {
                // Right-click on menu items: show the menu
                menuButton.set_active(true)
            })
            menuButton.add_controller(gesture)

            popupMenuBox.append(menuButton)

            // Connect to item property changes
            item.connect('notify::gicon', () => updateIcon(item, icon))
            item.connect('notify::tooltip', () => updateTooltip(item, menuButton))
            // Listen for menu_model changes (in case it becomes available later)
            item.connect('notify::menu-model', () => {
                const newModel = item.get_menu_model?.()
                if (newModel) {
                    menuButton.set_menu_model(newModel)
                }
            })

            itemWidgetMap.set(item, { icon, widget: popupMenuBox })
            return popupMenuBox
        } else {
            // Regular button (either is_menu=false, or is_menu=true but no menu_model yet)
            const button = QButton({
                class: 'button',
            })

            button.set_child(icon)
            updateTooltip(item, button)
            button.set_has_tooltip(true)

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
            // Listen for menu_model changes (in case it becomes available later)
            // If a menu model appears, we'd need to recreate the widget, but for now
            // we'll just log it for debugging
            item.connect('notify::menu-model', () => {
                const newModel = item.get_menu_model?.()
                if (newModel && item.get_is_menu?.()) {
                    print(`Menu model became available for item, but widget already created. Consider recreating widget.`)
                }
            })

            itemWidgetMap.set(item, { icon, widget: button })
            return button
        }
    }

    const updateItems = () => {
        // Get current items
        const currentItems = new Set(systray.get_items())
        
        // Remove widgets for items that no longer exist
        for (const [item, _] of itemWidgetMap.entries()) {
            if (!currentItems.has(item)) {
                const widgetData = itemWidgetMap.get(item)
                if (widgetData) {
                    appsBox.remove(widgetData.widget)
                }
                itemWidgetMap.delete(item)
            }
        }

        // Add widgets for new items
        for (const item of currentItems) {
            if (!itemWidgetMap.has(item)) {
                const widget = createItemWidget(item)
                if (widget) {
                    appsBox.append(widget)
                }
            }
        }
    }
    
    updateItems() // initial (likely 0)
    
    // Connect to item-added signal for when new applets appear
    // https://aylur.github.io/libastal/tray/signal.Tray.item-added.html
    systray.connect('item-added', () => {
        updateItems()
    })
    
    // Connect to item-removed signal for when applets disappear
    systray.connect('item-removed', () => {
        updateItems()
    })
    
    // Also keep notify::items as a fallback
    systray.connect('notify::items', updateItems)

    revealer.set_child(appsBox)

    return revealer
}

export function Systray(): Gtk.Box {
    const box = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        halign: Gtk.Align.CENTER,
        valign: Gtk.Align.CENTER,
        spacing: 8,
        vexpand: false
    })
    box.add_css_class("systray")

    // Local mutable state, initialised from shared state
    let revealSysTray = true // revealSystrayState

    // Toggle button
    const toggleBtn = QButton({
        class: 'button',
        label: revealSysTray ? '󰅃' : '󰅀',
    })

    // Callback to update toggle button when revealer state changes
    const updateToggleButton = (revealed: boolean) => {
        revealSysTray = revealed
        toggleBtn.set_label(revealed ? '󰅃' : '󰅀')
    }

    const revealer = Revealer(updateToggleButton)
    box.append(revealer)
    revealer.set_reveal_child(revealSysTray)

    let autoHideId: number | null = null

    toggleBtn.connect('clicked', () => {
        revealSysTray = !revealSysTray
        revealer.set_reveal_child(revealSysTray)
        toggleBtn.set_label(revealSysTray ? '󰅃' : '󰅀')

        // Auto-hide after 5 seconds when opened
        if (revealSysTray) {
            if (autoHideId !== null) {
                GLib.source_remove(autoHideId)
            }
            autoHideId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 15000, () => {
                revealSysTray = false
                revealer.set_reveal_child(false)
                toggleBtn.set_label('󰅀')
                autoHideId = null
                return GLib.SOURCE_REMOVE
            })
        }
    })

    box.append(toggleBtn)

    return box
}