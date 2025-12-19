import { Gdk, Gtk, Astal } from "ags/gtk4"
import App from "ags/gtk4/app"
import SidebarRevealer from "./module/SidebarRevealer"
import Devider from "../../utils/Devider"
import Tray from "./module/Tray"
import SearchButton from "./module/Search"
import Workspaces from "./module/Workspaces"
import Clock from "./module/Clock"
import Audio from "./module/Audio"
import Battery, { hasBattery } from "./module/Battery"

function TopSection(condensed:boolean): Gtk.Box {
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

    box.append(SidebarRevealer())
    if (!condensed) {
        box.append(Devider("default-devider"))
        box.append(SearchButton())
        box.append(Tray())
    }

    return box
}

function MiddleSection(condensed:boolean, gdkmonitor: Gdk.Monitor): Gtk.Box {
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

    box.append(Workspaces(gdkmonitor))

    return box
}

function BottomSection(condensed:boolean): Gtk.Box {
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
        vexpand: false,
        hexpand: false
    })

    
    systemBox.append(Audio())

    if(hasBattery()) {
        systemBox.append(Devider("system-devider"))
        systemBox.append(Battery())
    }
    
    if (!condensed) {
        box.append(systemBox)
        box.append(Devider("default-devider"))
    }
    box.append(Clock())

    return box
}

export default function Bar(gdkmonitor: Gdk.Monitor, condensed: boolean, laptop: boolean, left: boolean = true) {
    const windowName = condensed ? (laptop ? "bar-condensed-laptop" : "bar-condensed") : (laptop ? "bar-wide-laptop" : "bar-wide")

    const window = new Astal.Window({
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

    const box = new Gtk.Box({
        name: "bar-inner",
        cssClasses:["bar-inner"],
        
        orientation: Gtk.Orientation.VERTICAL,
        spacing: condensed ? 8 : 12,
        marginTop: condensed ? 12 : 20,
        marginBottom: condensed ? 12 : 20,
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

    centerbox.set_start_widget(TopSection(condensed))
    centerbox.set_center_widget(MiddleSection(condensed, gdkmonitor))
    centerbox.set_end_widget(BottomSection(condensed))

    box.append(centerbox) // Add centerbox to box
    window.set_child(box) // Add box to window

    return window
}