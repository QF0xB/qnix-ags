import { Gtk, Gdk} from "ags/gtk4"
import GLib from "gi://GLib"
import { BarModule } from "./BarModule"

import {
    sideBarShownState,
    setSideBarShownState,
    sideBarState,
    setSideBarState,
} from "../vars"

class Search extends BarModule {
    private searchBox: Gtk.Box
    private searchBtn: Gtk.Button

    constructor() {
        super()

        this.searchBox = new Gtk.Box({
            name: "search-box",
            cssClasses: ["search-box"],
            orientation: Gtk.Orientation.VERTICAL,
        })

        this.searchBtn = new Gtk.Button({
            name: "search-btn",
            cssClasses: ["search-btn"],
            cursor: Gdk.Cursor.new_from_name("pointer", null),
            label: "",
        })

        this.searchBox.append(this.searchBtn)

        this.gestures()
    }

    private gestures(): void {
        this.clickGesture()
    }

    private clickGesture(): void {
        this.searchBtn.connect('clicked', () => {
            setSideBarShownState('search')
            setSideBarState(!sideBarState())
            // Run rofi launcher command (Until sidebar is done)
            const command = 'uwsm app -- rofi -show drun -config ~/.config/rofi/launchers/type-1/style-9.rasi -run-command "uwsm app -- {cmd}"'
            GLib.spawn_command_line_async(command)
        })
    }

    public getWidget(): Gtk.Box {
        return this.searchBox
    }
}

export default Search