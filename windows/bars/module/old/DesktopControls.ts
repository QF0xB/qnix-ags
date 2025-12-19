import { Gtk } from "ags/gtk4"
import { QButton } from "../../../../utils/PointerButton"
import { execAsync } from "ags/process"
import GLib from "gi://GLib"
import Wp from "gi://AstalWp"
import Battery from "gi://AstalBattery"
import Hyprland from "gi://AstalHyprland"

const wp = Wp.get_default()
const hyprland = Hyprland.get_default()

function Devider(): Gtk.Box {
    const devider = new Gtk.Box()
    devider.add_css_class("desktop-controls-devider")
    return devider
}

function KeyboardButton(): Gtk.Widget {
    const keyboardBox = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        halign: Gtk.Align.CENTER
    })
    keyboardBox.add_css_class("keyboard-box")

    const keyboardIcon = new Gtk.Label()
    keyboardIcon.add_css_class("keyboard-icon")
    keyboardIcon.set_label("󰘲")
    keyboardBox.append(keyboardIcon)

    const keyboardLevel = new Gtk.Label()
    keyboardLevel.add_css_class("keyboard-layout")
    keyboardBox.append(keyboardLevel)

    // Make the box clickable
    const keyboardButton = QButton({
        class: "keyboard-button",
        onClicked: () => {
            // Cycle to next keyboard layout
            execAsync(["hyprctl", "switchxkblayout", "all", "next"]).catch(err => {
                console.error("Error cycling keyboard layout", err)
            })
            // Immediately update the display
            updateKeyboardLayout()
        }
    })
    
    // Set the button to contain the box content
    keyboardButton.set_child(keyboardBox)

    const updateKeyboardLayout = () => {
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
                        keyboardLevel.set_text(activeKeymap)
                        break
                    }
                }
            } catch (e) {
                console.error("Error parsing hyprctl devices output", e)
            }
        }).catch(err => {
            console.error("Error running hyprctl devices", err)
        })
    }

    updateKeyboardLayout()

    // Poll for keyboard layout changes (hyprctl doesn't have a signal)
    // Update every 1 second for more responsive updates
    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
        updateKeyboardLayout()
        return true // Continue polling
    })

    return keyboardButton
}

function AudioButton(): Gtk.Box {
    const speaker = wp.get_default_speaker()

    const audioBox = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        halign: Gtk.Align.CENTER
    })
    audioBox.add_css_class("audio-box")

    const audioLevel = new Gtk.Label()
    audioLevel.add_css_class("audio-level")

    const audioBtn = QButton({
        class: "audio-button",
        onClicked: () => {
            speaker.set_mute(!speaker.get_mute())

        }
    })

    // Add scroll support for volume control
    const scrollController = new Gtk.EventControllerScroll({
        flags: Gtk.EventControllerScrollFlags.VERTICAL
    })
    
    scrollController.connect('scroll', (controller, dx, dy) => {
        const currentVolume = speaker.get_volume()
        const step = 0.05 // 5% per scroll step
        let newVolume = currentVolume
        
        if (dy < 0) {
            // Scroll up - increase volume
            newVolume = Math.min(1.0, currentVolume + step)
        } else if (dy > 0) {
            // Scroll down - decrease volume
            newVolume = Math.max(0.0, currentVolume - step)
        }
        
        if (newVolume !== currentVolume) {
            if (newVolume < 0.00000001) {
                newVolume = 0
            }
            
            // Mute if volume is 0
            if (newVolume === 0) {
                speaker.set_mute(true)
            }

            speaker.set_volume(newVolume)
            // Unmute if scrolling while muted
            if (speaker.get_mute()) {
                speaker.set_mute(false)
            }
            // Update label immediately
            updateLabel(false)
        }
        
        return true // Event handled
    })
    
    audioBtn.add_controller(scrollController)

    const updateLabel = (muteEvent: boolean) => {
        const isMuted = speaker.get_mute()
        if (isMuted) {
            audioBtn.set_label("󰕿")
        } else {
            audioBtn.set_label("󰕾")
        }

        // Show/hide audio level based on mute state
        if (isMuted) {
            audioLevel.set_visible(false)
        } else {
            audioLevel.set_visible(true)
            audioLevel.set_text(Math.round(speaker.get_volume() * 100).toString() + "%")
        }

        // Send notification
        if (muteEvent) {
            execAsync([
                "notify-send",
                "-t", "500",
                isMuted ? "Device was muted." : "Device was unmuted."
            ]).catch(err => console.error("Failed to send notification:", err))
        } else {
            execAsync([
                "notify-send",
                "-t", "500",
                "-h", "int:value:" + Math.round(speaker.get_volume() * 100).toString(),
                "Volume: " + Math.round(speaker.get_volume() * 100).toString() + "%"
            ]).catch(err => console.error("Failed to send notification:", err))
        }
    }

    // Set initial label
    updateLabel(false)

    // Listen for mute state changes
    try {
        speaker.connect('notify::mute', () => updateLabel(true))
        speaker.connect('notify::volume', () => updateLabel(false))
    } catch (e) {
        console.error("Error connecting to speaker signals", e)
    }

    audioBox.append(audioBtn)
    audioBox.append(audioLevel)

    return audioBox
}

function BatteryButton(): Gtk.Widget {
    const battery = Battery.get_default()

    const batteryBox = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        halign: Gtk.Align.CENTER
    })
    batteryBox.add_css_class("battery-box")

    const batteryIcon = new Gtk.Label()
    batteryIcon.add_css_class("battery-icon")
    batteryBox.append(batteryIcon)

    const batteryLevel = new Gtk.Label()
    batteryLevel.add_css_class("battery-level")
    batteryBox.append(batteryLevel)


    const updateBattery = () => {
        const isCharging = battery.get_charging()
        const percentage = Math.round(battery.get_percentage() * 100) + 1

        // Remove critical and warning classes first
        batteryIcon.remove_css_class("critical")
        batteryIcon.remove_css_class("warning")

        // Add classes based on thresholds
        if (percentage < 15) {
            batteryIcon.add_css_class("critical")
        } else if (percentage < 30) {
            batteryIcon.add_css_class("warning")
        }

        let icon = ""
        if (isCharging) {
            // Charging battery icons
            if (percentage === 100) {
                icon = "󰂅"
            } else if (percentage > 90) {
                icon = "󰂋"
            } else if (percentage > 80) {
                icon = "󰂊"
            } else if (percentage > 70) {
                icon = "󰢞"
            } else if (percentage > 60) {
                icon = "󰂉"
            } else if (percentage > 50) {
                icon = "󰢝"
            } else if (percentage > 40) {
                icon = "󰂈"
            } else if (percentage > 30) {
                icon = "󰂇"
            } else if (percentage > 20) {
                icon = "󰂆"
            } else if (percentage > 10) {
                icon = "󰢜"
            } else {
                icon = "󰢟"
            }
        } else {
            // Regular battery icons
            if (percentage === 100) {
                icon = "󰁹"
            } else if (percentage > 90) {
                icon = "󰂂"
            } else if (percentage > 80) {
                icon = "󰂁"
            } else if (percentage > 70) {
                icon = "󰂀"
            } else if (percentage > 60) {
                icon = "󰁿"
            } else if (percentage > 50) {
                icon = "󰁾"
            } else if (percentage > 40) {
                icon = "󰁽"
            } else if (percentage > 30) {
                icon = "󰁼"
            } else if (percentage > 20) {
                icon = "󰁻"
            } else if (percentage > 10) {
                icon = "󰁺"
            } else {
                icon = "󰂎"
            }
        }
        batteryIcon.set_label(icon)    


        batteryLevel.set_text(percentage + "%")
    }

    // Format time in seconds to "Xh Ym" or "Ym" format
    const formatTime = (seconds: number): string => {
        if (seconds <= 0 || !isFinite(seconds)) {
            return "Calculating..."
        }
        const hours = Math.floor(seconds / 3600)
        const minutes = Math.floor((seconds % 3600) / 60)
        if (hours > 0) {
            return `${hours}h ${minutes}m`
        } else {
            return `${minutes}m`
        }
    }

    // Get battery time message
    const getBatteryTimeMessage = (): string => {
        try {
            const isCharging = battery.get_charging()
            let timeSeconds = 0
            
            if (isCharging) {
                timeSeconds = battery.get_time_to_full()
                return `Time until full: ${formatTime(timeSeconds)}`
            } else {
                timeSeconds = battery.get_time_to_empty()
                return `Time until empty: ${formatTime(timeSeconds)}`
            }
        } catch (e) {
            console.error("Error getting battery time", e)
            return "Battery time unavailable"
        }
    }

    // Show time until full/empty when clicked
    const showBatteryTime = () => {
        const message = getBatteryTimeMessage()
        
        // Show notification
        execAsync([
            "notify-send",
            "-t", "3000",
            message
        ]).catch(err => console.error("Failed to send battery time notification", err))
    }

    // Make battery box clickable
    const batteryButton = QButton({
        class: "battery-button",
        onClicked: showBatteryTime
    })
    batteryButton.set_child(batteryBox)

    // Update tooltip with battery time
    const updateTooltip = () => {
        const tooltipText = getBatteryTimeMessage()
        // Set tooltip on the button (GTK4 tooltips work on the interactive widget)
        batteryButton.set_tooltip_text(tooltipText)
        batteryButton.set_has_tooltip(true)
    }

    // Enhanced updateBattery that also updates tooltip
    const updateBatteryWithTooltip = () => {
        updateBattery()
        updateTooltip()
    }

    // Set initial values
    updateBattery()
    updateTooltip()

    // Listen for battery state changes
    try {
        battery.connect('notify::percentage', () => {
            updateBatteryWithTooltip()
        })
        battery.connect('notify::charging', () => {
            updateBatteryWithTooltip()
        })
    } catch (e) {
        console.error("Error connecting to battery signals", e)
    }

    return batteryButton
}


// Helper function to check if battery is available
function hasBattery(): boolean {
    try {
        // First check if battery directory exists in /sys/class/power_supply/
        // This is more reliable than relying on Battery.get_default() which might
        // return an object even when no battery exists
        const batteryDir = GLib.file_test("/sys/class/power_supply/BAT0", GLib.FileTest.EXISTS) ||
                          GLib.file_test("/sys/class/power_supply/BAT1", GLib.FileTest.EXISTS)
        
        if (!batteryDir) {
            return false
        }
        
        // Also verify the Battery API works
        const battery = Battery.get_default()
        if (!battery) return false
        
        // Try to get percentage - if it throws, no battery
        const percentage = battery.get_percentage()
        battery.get_charging() // This will throw if battery doesn't exist
        
        // Percentage should be between 0 and 1
        return percentage >= 0 && percentage <= 1
    } catch (e) {
        return false
    }
}

// Helper function to check if audio/speaker is available
function hasAudio(): boolean {
    try {
        const speaker = wp.get_default_speaker()
        if (!speaker) return false
        
        // Try to get volume - if it throws, no audio
        // Also verify the speaker object is functional
        const volume = speaker.get_volume()
        speaker.get_mute() // This will throw if speaker doesn't exist
        return volume >= 0 && volume <= 1
    } catch (e) {
        return false
    }
}

export function DesktopControls(): Gtk.Box {
    const box = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        halign: Gtk.Align.CENTER
    })
    box.add_css_class("desktop-controls")

    const components: Gtk.Widget[] = []
    const hasAudioDevice = hasAudio()
    const hasBatteryDevice = hasBattery()

    // Add audio button if available
    if (hasAudioDevice) {
        components.push(AudioButton())
        components.push(Devider())
    }

    // Add battery button if available
    if (hasBatteryDevice) {
        components.push(BatteryButton())
        components.push(Devider())
    }

    // Keyboard should always be available, but we can add it last
    components.push(KeyboardButton())

    // Append all components
    for (const component of components) {
        box.append(component)
    }

    return box
}