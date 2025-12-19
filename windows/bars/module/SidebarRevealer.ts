import { Gdk, Gtk } from "ags/gtk4"
import { 
    sideBarState, 
    setSideBarState, 
    sideBarShownState,
    setSideBarShownState,
} from "../vars"

export default function SidebarRevealer(): Gtk.Box {
    const sidebarRevealerBox = new Gtk.Box({
        name: "sidebar-revealer",
        cssClasses: ["sidebar-revealer"],
        halign: Gtk.Align.CENTER, 
        valign: Gtk.Align.CENTER,
        hexpand: true,

    })

    const sidebarButton = new Gtk.Button({
        name: "sidebar-button",
        cssClasses: ["sidebar-button"],
        cursor: Gdk.Cursor.new_from_name("pointer", null),
        label: "",
    })

    sidebarButton.connect('clicked', () => {
        // Toggle sidebar state
        setSideBarState(!sideBarState())
    })

    sidebarRevealerBox.append(sidebarButton)

    return sidebarRevealerBox
}