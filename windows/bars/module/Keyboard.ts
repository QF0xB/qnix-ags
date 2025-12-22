import { Gdk, Gtk } from "ags/gtk4";
import { BarModule } from "./BarModule";
import { execAsync } from "ags/process";
import Hyprland from "gi://AstalHyprland";
const hyprland = Hyprland.get_default()

class Keyboard extends BarModule {
    private keyboardBox: Gtk.Box
    private keyboardBtn: Gtk.Button
    private keyboardLayout: Gtk.Label
    private keyboardIcon: Gtk.Label

    constructor() {
        super()

        this.keyboardBox = new Gtk.Box({
            name: "keyboard-box",
            cssClasses: ["keyboard-box"],
            orientation: Gtk.Orientation.VERTICAL
        })

        this.keyboardIcon = new Gtk.Label({
            name: "keyboard-icon",
            cssClasses: ["keyboard-icon"],
            label: "",
        })

        this.keyboardLayout = new Gtk.Label({
            name: "keyboard-layout",
            cssClasses: ["keyboard-layout"],
        })

        this.keyboardBtn = new Gtk.Button({
            name: "keyboard-btn",
            cssClasses: ["keyboard-btn"],
            cursor: Gdk.Cursor.new_from_name("pointer", null),
        })

        const btnContent = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 2,
        })
        btnContent.append(this.keyboardLayout)
        btnContent.append(this.keyboardIcon)

        this.keyboardBtn.set_child(btnContent)
        this.keyboardBox.append(this.keyboardBtn)

        this.update()

        this.setIntervalSafe(() => this.update(), 500)

        this.gestures()
    }

    private gestures(): void {
        this.clickGesture()
    }

    private clickGesture(): void {
        this.keyboardBtn.connect('clicked', () => {
            execAsync(["hyprctl", "switchxkblayout", "all", "next"])
        })
    }

    private update(): void {
        this.getKeyboardLayout()
    }

    private getKeyboardLayout(): void {
        execAsync(["hyprctl", "devices"]).then(output => {
            try {
                const lines = output.split('\n')
                let inKeyboards = false
                let currentKeyboard = ""
                let isMain = false
                let activeKeymap = ""

                for (const line of lines) {
                    if (line.trim() === "Keyboards:") {
                        inKeyboards = true
                        continue
                    }
                    if (inKeyboards && line.trim().startsWith("Keyboard at")) {
                        // Reset for new keyboard
                        isMain = false
                        activeKeymap = ""
                        currentKeyboard = line.trim()
                        continue
                    }
                    if (inKeyboards && line.includes("main: yes")) {
                        isMain = true
                    }
                    if (inKeyboards && line.includes("active keymap:")) {
                        const match = line.match(/active keymap:\s*(.+)/)
                        if (match) {
                            const fullKeymap = match[1].trim()
                            // Extract text inside parentheses
                            const parenMatch = fullKeymap.match(/\(([^)]+)\)/)
                            if (parenMatch) {
                                activeKeymap = parenMatch[1].trim()
                            } else {
                                activeKeymap = fullKeymap
                            }
                        }
                    }
                    // If we found the main keyboard and have the keymap, use it
                    if (isMain && activeKeymap) {
                        if (activeKeymap.includes("us")) {
                            this.keyboardLayout.set_text("US")
                        } else if (activeKeymap.includes("German")) {
                            this.keyboardLayout.set_text("DE")
                        } else if (activeKeymap.length > 3) {
                            this.keyboardLayout.set_text(activeKeymap.slice(0, 3))
                        } else {
                            this.keyboardLayout.set_text(activeKeymap.slice(0, 3))
                        }
                    }
                }
            } catch (e) {
                console.error("Error parsing hyprctl devices output", e)
            }
        }).catch(err => {
            console.error("Error running hyprctl devices", err)
        })
    }

    public getWidget(): Gtk.Widget {
        return this.keyboardBox
    }
}

export default Keyboard