import App from "ags/gtk4/app"
import { Astal, Gtk, Gdk } from 'ags/gtk4'
import GLib from 'gi://GLib'
import { QButton } from '../../../utils/PointerButton'
import { HyprlandWorkspaces } from '../module/old/HyprlandWorkspaces'
import { DesktopControls } from '../module/old/DesktopControls'
import { Systray } from "../module/old/Systray"


function Devider(): Gtk.Box {
    const devider = new Gtk.Box()
    devider.add_css_class("devider")
    return devider
}

function StartSection(condensed: boolean): Gtk.Box {
    // Create buttons programmatically with cursor support
    const sidebarBtn = QButton({
        class: "sidebar-button",
        label: ""
    })

    // Create main box
    const box = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        spacing: 4,
        halign: Gtk.Align.CENTER,
        valign: Gtk.Align.START,
        vexpand: false
    })
    box.set_name("startbox")
    box.add_css_class("start")

    box.append(sidebarBtn)

    // Only show search and systray on wide bars
    if (!condensed) {
        const searchBtn = QButton({
            class: "search-button",
            onClicked: () => {
                // Run rofi launcher command
                const command = 'uwsm app -- rofi -show drun -config ~/.config/rofi/launchers/type-1/style-9.rasi -run-command "uwsm app -- {cmd}"'
                GLib.spawn_command_line_async(command)
            },
            label: ''
        })

        box.append(Devider())
        box.append(searchBtn)

        
        box.append(Systray())
    }

    return box
}

function MiddleSection(monitor: Gdk.Monitor): Gtk.Box {
    return HyprlandWorkspaces(monitor)
}

function EndSection(condensed: boolean): Gtk.Box {
    const box = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        halign: Gtk.Align.CENTER,
        valign: Gtk.Align.END,
        spacing: 4,
        vexpand: false
    })
    box.set_name("endbox")
    box.add_css_class("end")

    const clockBox = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        halign: Gtk.Align.CENTER,
    })
    clockBox.add_css_class("clock")
    clockBox.set_name("clockbox")

    const label1 = new Gtk.Label()
    const label2 = new Gtk.Label()

    clockBox.append(label1)
    clockBox.append(label2)

    // Update clock function
    const updateClock = () => {
        const now = new Date()
        label1.set_label(now.getHours().toString().padStart(2, '0'))
        label2.set_label(now.getMinutes().toString().padStart(2, '0'))
    }

    // Update immediately and then every second
    updateClock()
    GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => {
        updateClock()
        return true
    })

    // Only show desktop controls on wide bars
    if (!condensed) {
        box.append(DesktopControls())
        box.append(Devider())
    }
    box.append(clockBox)

    return box
}

export default function Bar(gdkmonitor: Gdk.Monitor, condensed: boolean, laptop: boolean) {
    const windowName = condensed ? (laptop ? "bar-condensed-laptop" : "bar-condensed") : (laptop ? "bar-wide-laptop" : "bar-wide")

    // Create main bar box
    const barBox = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        spacing: condensed ? 8 : 12,
        marginTop: condensed ? 12 : 20,
        marginBottom: condensed ? 12 : 20,
        marginStart: 0,
        marginEnd: 0,
        vexpand: true,
        hexpand: true
    })
    barBox.add_css_class("bar")

    // Create centerbox for sections
    const centerbox = new Gtk.CenterBox({
        orientation: Gtk.Orientation.VERTICAL,
        halign: Gtk.Align.CENTER,
        vexpand: true,
        hexpand: true
    })
    centerbox.add_css_class("sections")

    // Create wrapper boxes for each section
    const startWrapper = new Gtk.Box({
        vexpand: false,
        halign: Gtk.Align.CENTER
    })
    startWrapper.append(StartSection(condensed))

    const centerWrapper = new Gtk.Box({
        vexpand: false,
        halign: Gtk.Align.CENTER
    })
    centerWrapper.append(MiddleSection(gdkmonitor))

    const endWrapper = new Gtk.Box({
        vexpand: false,
        halign: Gtk.Align.CENTER
    })
    endWrapper.append(EndSection(condensed))

    // Set centerbox children
    centerbox.set_start_widget(startWrapper)
    centerbox.set_center_widget(centerWrapper)
    centerbox.set_end_widget(endWrapper)

    barBox.append(centerbox)

    // Create window
    const window = new Astal.Window({
        visible: true,
        name: windowName,
        gdkmonitor: gdkmonitor,
        exclusivity: Astal.Exclusivity.EXCLUSIVE,
        anchor: Astal.WindowAnchor.TOP | Astal.WindowAnchor.BOTTOM | Astal.WindowAnchor.LEFT,
        application: App,
        layer: Astal.Layer.TOP
    })
    window.add_css_class(condensed ? "bar-condensed" : "bar-wide")
    window.set_child(barBox)

    return window
}
