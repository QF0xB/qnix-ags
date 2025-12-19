import { Gtk, Gdk} from "ags/gtk4"
import GLib from "gi://GLib"

export default function SearchButton(): Gtk.Box {
    const searchButtonBox = new Gtk.Box({
        name: "search-button-box",
        cssClasses: ["search-button-box"],
        orientation: Gtk.Orientation.VERTICAL,
    })

    const searchButton = new Gtk.Button({
        name: "search-button",
        cssClasses: ["search-button"],
        cursor: Gdk.Cursor.new_from_name("pointer", null),
        label: "",
    })

    searchButton.connect('clicked', () => {
        // Run rofi launcher command
        const command = 'uwsm app -- rofi -show drun -config ~/.config/rofi/launchers/type-1/style-9.rasi -run-command "uwsm app -- {cmd}"'
        GLib.spawn_command_line_async(command)
    })

    searchButtonBox.append(searchButton)

    return searchButtonBox
}