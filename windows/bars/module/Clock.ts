import { Gtk, Gdk } from "ags/gtk4";
import { BarModule } from "./BarModule";
import Bar from "../Bar"

class Clock extends BarModule {
    private clockBox: Gtk.Box
    private label1: Gtk.Label
    private label2: Gtk.Label
    private clockBtn: Gtk.Button
    
    constructor(bar: Bar) {
        super(bar)

        this.clockBox = new Gtk.Box({
            name: "clock-box",
            cssClasses: ["clock-box"],
            orientation: Gtk.Orientation.VERTICAL
        })

        this.label1 = new Gtk.Label({
            name: "clock-label-hours",
            cssClasses: ["clock-label-hours"],
        })
        this.label2 = new Gtk.Label({
            name: "clock-label-minutes",
            cssClasses: ["clock-label-minutes"],
        })

        const buttonContent = new Gtk.Box ({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 2,
        })
        buttonContent.append(this.label1)
        buttonContent.append(this.label2)

        this.clockBtn = new Gtk.Button({
            name: "clock-btn",
            cssClasses: ["clock-btn"],
            cursor: Gdk.Cursor.new_from_name("pointer", null),
        })
        this.clockBtn.set_child(buttonContent)
        this.clockBox.append(this.clockBtn)

        this.update()

        this.setIntervalSafe(() => this.update(), 1000)

        this.gestures()
    }

    private update(): void {
        const now = new Date()
        this.label1.set_label(now.getHours().toString().padStart(2, '0'))
        this.label2.set_label(now.getMinutes().toString().padStart(2, '0'))
        this.clockBtn.set_tooltip_text(now.toLocaleString())
    }

    private gestures(): void {
        this.clickGesture()
    }

    private clickGesture(): void {
        this.clockBtn.connect('clicked', () => {
            this.getBar().getVars().toggleClockMenuState()
        })
    }

    public getWidget(): Gtk.Box {
        return this.clockBox
    }
}

export default Clock