import { Gtk } from "ags/gtk4";
import { interval } from "ags/time";

function updateClock(label1: Gtk.Label, label2: Gtk.Label): void {
    const now = new Date()
    label1.set_label(now.getHours().toString().padStart(2, '0'))
    label2.set_label(now.getMinutes().toString().padStart(2, '0'))
}

export default function Clock(): Gtk.Box {
    const clockBox = new Gtk.Box({
        name: "clock-box",
        cssClasses: ["clock-box"],
        orientation: Gtk.Orientation.VERTICAL
    })

    const label1 = new Gtk.Label()
    const label2 = new Gtk.Label()

    clockBox.append(label1)
    clockBox.append(label2)

    updateClock(label1, label2)
    interval(1000, () => updateClock(label1, label2))

    return clockBox
}