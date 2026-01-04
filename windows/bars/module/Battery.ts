import { Gdk, Gtk } from "ags/gtk4";

// @ts-ignore: No type definitions for native module
import AstalBattery from "gi://AstalBattery";
import { BarModule } from "./BarModule";
import Bar from "../Bar"
const battery = AstalBattery.get_default()

export class Battery extends BarModule {
    public static hasBattery(): boolean {
        if (!battery) return false
        return battery.get_percentage() >= 0 && battery.get_percentage() <= 1
    }
    private batteryBox: Gtk.Box
    private batteryLevel: Gtk.Label
    private batteryBtn: Gtk.Button
    private batteryIcon: Gtk.Image

    constructor(bar: Bar) {
        super(bar)  

        if (!Battery.hasBattery()) {
            throw new Error("No battery found")
        }

        this.batteryBox = new Gtk.Box({
            name: "battery-box",
            cssClasses: ["battery-box"],
            orientation: Gtk.Orientation.VERTICAL,
        })

        this.batteryLevel = new Gtk.Label({
            name: "battery-level",
            cssClasses: ["battery-level"],
        })

        this.batteryIcon = new Gtk.Image({
            name: "battery-icon",
            cssClasses: ["battery-icon"],
        })

        // Box that contains the icon and the level
        const buttonContent = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 2,
        })
        buttonContent.append(this.batteryLevel)
        buttonContent.append(this.batteryIcon)

        this.batteryBtn = new Gtk.Button({
            name: "battery-btn",
            cssClasses: ["battery-btn"],
            has_tooltip: true,
            cursor: Gdk.Cursor.new_from_name("pointer", null),
        })
        this.batteryBtn.set_child(buttonContent)
        this.batteryBox.append(this.batteryBtn)

        this.updateBatteryIcon()
        this.updateBatteryLevel()
        this.updateBatteryTooltip()

        this.connectSafe(battery, 'notify::percentage', () => {
            this.updateBatteryIcon()
            this.updateBatteryLevel()
            this.updateBatteryTooltip()
        })
        this.connectSafe(battery, 'notify::state', () => {
            this.updateBatteryIcon()
            this.updateBatteryTooltip()
        })
        this.connectSafe(battery, 'notify::battery_icon_name', () => {
            this.updateBatteryIcon()
            this.updateBatteryTooltip()
        })
    }

    private updateBatteryIcon(): void {
        const iconName = battery.get_battery_icon_name()
        const batteryState = battery.get_state()
        const percentage = battery.get_percentage()
        const isCharging = batteryState === AstalBattery.State.CHARGING || batteryState === AstalBattery.State.FULLY_CHARGED || batteryState === AstalBattery.State.PENDING_CHARGE
        if (percentage >= 0 && percentage <= 1) {
            const emoji = this.iconNameToNerdFont(iconName, isCharging || percentage === 1)
            this.batteryIcon.set_from_icon_name(iconName)
        }
    }
    private updateBatteryLevel(): void {
        const percentage = battery.get_percentage()
        if (percentage >= 0 && percentage <= 1) {
            this.batteryLevel.set_text((Math.round(percentage * 100)).toString() + "%")
        }
    }
    private updateBatteryTooltip(): void {
        const percentage = battery.get_percentage()
        if (percentage >= 0 && percentage <= 1) {
            this.batteryBtn.set_tooltip_text(this.getBatteryTimeMessage())
        }
    }

    private getBatteryTimeMessage(): string {
        const batteryState = battery.get_state()
        const percentage = Math.round(battery.get_percentage() * 100) 
        if (percentage === 100) {
            return "Fully charged"
        } else if (batteryState === AstalBattery.State.CHARGING || batteryState === AstalBattery.State.PENDING_CHARGE) {
            return "Time until full: " + this.formatTime(battery.get_time_to_full())
        } else {
            return "Time until empty: " + this.formatTime(battery.get_time_to_empty())
        }
    }

    private formatTime(seconds: number): string {
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

    private iconNameToNerdFont(iconName: string, isCharging: boolean): string {
        const match = iconName.match(/battery-level-(\d+)/)
        if (!match) {
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

    public getWidget(): Gtk.Box {
        return this.batteryBox
    }
}

export default Battery