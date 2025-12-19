import { Gtk } from "ags/gtk4"

export default function Devider(className: string): Gtk.Box {
    const devider = new Gtk.Box({
        name: className,
        cssClasses: [className],
    })
    return devider
}