import { Gdk, Gtk } from "ags/gtk4"
import { 
    sideBarState, 
    setSideBarState, 
    sideBarShownState,
    setSideBarShownState,
} from "../vars"
import { BarModule } from "./BarModule"

class SidebarRevealer extends BarModule {
    private sidebarRevealerBox: Gtk.Box
    private sidebarBtn: Gtk.Button

    constructor() {
        super()

        this.sidebarRevealerBox = new Gtk.Box({
            name: "sidebar-revealer-box",
            cssClasses: ["sidebar-revealer-box"],
            orientation: Gtk.Orientation.VERTICAL,
        })

        this.sidebarBtn = new Gtk.Button({
            name: "sidebar-btn",
            cssClasses: ["sidebar-btn"],
            cursor: Gdk.Cursor.new_from_name("pointer", null),
            label: "",
        })

        this.sidebarRevealerBox.append(this.sidebarBtn)

        this.gestures()
    }

    private gestures(): void {
        this.clickGesture()
    }

    private clickGesture(): void {
        this.sidebarBtn.connect('clicked', () => {
            setSideBarState(!sideBarState())
        })
    }

    public getWidget(): Gtk.Box {
        return this.sidebarRevealerBox
    }
}

export default SidebarRevealer