import { Gtk } from "ags/gtk4";
import AstalBattery from "gi://AstalBattery";
const battery = AstalBattery.get_default()

export function hasBattery(): boolean {
    if (!battery) return false
    return battery.get_percentage() >= 0 && battery.get_percentage() <= 1
}

function iconNameToNerdFont(iconName: string, isCharging: boolean): string {
    // Extract percentage from icon name (e.g., "battery-level-100-symbolic" -> 100)
    const match = iconName.match(/battery-level-(\d+)/)
    if (!match) {
        // Fallback for unknown icon names
        return isCharging ? "󰂅" : "󰁹"
    }

    const percent = parseInt(match[1], 10)

    if (isCharging) {
        // Charging battery icons (Nerd Font)
        if (percent === 100) {
            return "󰂅"
        } else if (percent > 90) {
            return "󰂋"
        } else if (percent > 80) {
            return "󰂊"
        } else if (percent > 70) {
            return "󰢞"
        } else if (percent > 60) {
            return "󰂉"
        } else if (percent > 50) {
            return "󰢝"
        } else if (percent > 40) {
            return "󰂈"
        } else if (percent > 30) {
            return "󰂇"
        } else if (percent > 20) {
            return "󰂆"
        } else if (percent > 10) {
            return "󰢜"
        } else {
            return "󰢟"
        }
    } else {
        // Regular battery icons (Nerd Font)
        if (percent === 100) {
            return "󰁹"
        } else if (percent > 90) {
            return "󰂂"
        } else if (percent > 80) {
            return "󰂁"
        } else if (percent > 70) {
            return "󰂀"
        } else if (percent > 60) {
            return "󰁿"
        } else if (percent > 50) {
            return "󰁾"
        } else if (percent > 40) {
            return "󰁽"
        } else if (percent > 30) {
            return "󰁼"
        } else if (percent > 20) {
            return "󰁻"
        } else if (percent > 10) {
            return "󰁺"
        } else {
            return "󰂎"
        }
    }
}

function updateBatteryIcon(batteryBtn: Gtk.Button): void {
    const existingChild = batteryBtn.get_child()
    if (existingChild) {
        batteryBtn.set_child(null)
    }

    const iconName = battery.get_battery_icon_name()
    const batteryState = battery.get_state()
    const percentage = battery.get_percentage()

    const isCharging = batteryState === AstalBattery.State.CHARGING ||
        batteryState === AstalBattery.State.FULLY_CHARGED ||
        batteryState === AstalBattery.State.PENDING_CHARGE

    if (percentage >= 0 && percentage <= 1) {
        // Use Nerd Font emoji instead of icon name
        const emoji = iconNameToNerdFont(iconName, isCharging || percentage === 1)
        const label = new Gtk.Label({ label: emoji })
        batteryBtn.set_child(label)
    }

    console.log(battery.get_power_supply())
}

function updateBatteryLevel(batteryLevel: Gtk.Label): void {
    const percentage = battery.get_percentage()
    if (percentage >= 0 && percentage <= 1) {
        batteryLevel.set_text((percentage * 100).toString() + "%")
    }
}

function formatTime(seconds: number): string {
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

function getBatteryTimeMessage(): string {
    const batteryState = battery.get_state()
    const percentage = battery.get_percentage()
    if (percentage === 1 || batteryState === AstalBattery.State.FULLY_CHARGED) {
        return "Fully charged"
    } else if (batteryState === AstalBattery.State.CHARGING || batteryState === AstalBattery.State.PENDING_CHARGE) {
        const timeToFull = battery.get_time_to_full()
        return "Time until full:\n " + formatTime(timeToFull)
    } else {
        const timeToEmpty = battery.get_time_to_empty()
        return "Time until empty:\n" + formatTime(timeToEmpty)
    }
}

function updateBatteryTooltip(batteryBox: Gtk.Box): void {
    const percentage = battery.get_percentage()
    if (percentage >= 0 && percentage <= 1) {
        batteryBox.set_tooltip_text(getBatteryTimeMessage())
    }
}

export default function Battery(): Gtk.Box {
    const batteryBox = new Gtk.Box({
        name: "battery-box",
        cssClasses: ["battery-box"],
        orientation: Gtk.Orientation.VERTICAL,
    })

    const batteryLevel = new Gtk.Label({
        name: "battery-level",
        cssClasses: ["battery-level"],
    })
    batteryBox.append(batteryLevel)

    const batteryBtn = new Gtk.Button({
        name: "battery-icon",
        cssClasses: ["battery-icon"],
    })
    batteryBox.append(batteryBtn)

    updateBatteryIcon(batteryBtn)
    updateBatteryLevel(batteryLevel)
    updateBatteryTooltip(batteryBox)

    batteryBox.connect('notify::percentage', () => {
        updateBatteryIcon(batteryBtn)
        updateBatteryLevel(batteryLevel)
        updateBatteryTooltip(batteryBox)
    })
    batteryBox.connect('notify::state', () => {
        updateBatteryIcon(batteryBtn)
        updateBatteryLevel(batteryLevel)
        updateBatteryTooltip(batteryBox)
    })
    batteryBox.connect('notify::battery_icon_name', () => {
        updateBatteryIcon(batteryBtn)
        updateBatteryLevel(batteryLevel)
        updateBatteryTooltip(batteryBox)
    })

    return batteryBox
}