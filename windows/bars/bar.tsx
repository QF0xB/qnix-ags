import App from "ags/gtk4/app"
import { Astal, Gtk, Gdk } from 'ags/gtk4'
import { QButton } from '../../modules/PointerButton'
import { HyprlandWorkspaces } from './module/HyprlandWorkspaces'
import { DesktopControls } from './module/DesktopControls'


function Devider(): Gtk.Box {
    const devider = new Gtk.Box()
    devider.add_css_class("devider")
    return devider
}

function StartSection(): Gtk.Box {
    // Create buttons programmatically with cursor support
    const sidebarBtn = QButton({
        class: "sidebar-button",
        label: ""
    })

    const searchBtn = QButton({
        class: "search-button",
        onClicked: () => {
            print("Search button clicked")
        },
        label: ''
    })

    const systrayBtn = QButton({
        class: "button",
        label: '󰅀'
    })

    // Create main box
    const box = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        spacing: 4,
        halign: Gtk.Align.CENTER,
        valign: Gtk.Align.START,
        vexpand: false
    })
    box.add_css_class("start")

    box.append(sidebarBtn)
    box.append(Devider())
    box.append(searchBtn)

    const systrayBox = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL
    })
    systrayBox.add_css_class("systray")
    systrayBox.append(systrayBtn)
    box.append(systrayBox)

    return box
}

function MiddleSection(monitor: Gdk.Monitor): Gtk.Box {
    return HyprlandWorkspaces(monitor)
}

function EndSection(): Gtk.Box {
    const box = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        halign: Gtk.Align.CENTER,
        valign: Gtk.Align.END,
        spacing: 4,
        vexpand: false
    })
    box.add_css_class("end")

    const clockBox = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        halign: Gtk.Align.CENTER,
    })
    clockBox.add_css_class("clock")

    const label1 = new Gtk.Label({ label: "12" })
    const label2 = new Gtk.Label({ label: "00" })

    clockBox.append(label1)
    clockBox.append(label2)

    box.append(DesktopControls())
    box.append(Devider())
    box.append(clockBox)

    return box
}

export default function Bar(gdkmonitor: Gdk.Monitor, condensed: boolean) {
    const windowName = condensed ? "bar-condensed" : "bar-wide"

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
    startWrapper.append(StartSection())

    const centerWrapper = new Gtk.Box({
        vexpand: false,
        halign: Gtk.Align.CENTER
    })
    centerWrapper.append(MiddleSection(gdkmonitor))

    const endWrapper = new Gtk.Box({
        vexpand: false,
        halign: Gtk.Align.CENTER
    })
    endWrapper.append(EndSection())

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
