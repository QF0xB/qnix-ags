import { Gdk, Gtk } from "ags/gtk4";
import { BarModule } from "./BarModule";

// @ts-ignore: No type definitions for native module
import Wp from "gi://AstalWp"
const wp = Wp.get_default()

import Bar from "../Bar"

class Audio extends BarModule {
    private audioBox: Gtk.Box
    private audioBtn: Gtk.Button
    private audioLevel: Gtk.Label
    private audioIcon: Gtk.Image

    constructor(bar: Bar) {
        super(bar)
        
        this.audioBox = new Gtk.Box({
            name: "audio-box",
            cssClasses: ["audio-box"],
            orientation: Gtk.Orientation.VERTICAL
        })

        this.audioLevel = new Gtk.Label({
            name: "audio-level",
            cssClasses: ["audio-level"],
        })

        this.audioIcon = new Gtk.Image({
            name: "audio-icon",
            cssClasses: ["audio-icon"],
        })

        // Box that contains the icon and the level
        const buttonContent = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 2,
        })
        buttonContent.append(this.audioLevel)
        buttonContent.append(this.audioIcon)

        this.audioBtn = new Gtk.Button({
            name: "audio-btn",
            cssClasses: ["audio-btn"],
            has_tooltip: true,
            cursor: Gdk.Cursor.new_from_name("pointer", null),
        })
        this.audioBtn.set_child(buttonContent)
        this.audioBox.append(this.audioBtn)

        this.update()

        this.reconnectSignals()
        this.connectSafe(wp, 'notify::default_speaker', () => this.reconnectSignals())

        this.gestures()
    }

    private gestures(): void {
        this.clickGesture()
        this.scrollHandler()
    }

    private reconnectSignals(): void {
        this.disconnectAllSafe()
        this.connectSafe(wp.get_default_speaker(), 'notify::mute', () => this.update())
        this.connectSafe(wp.get_default_speaker(), 'notify::volume', () => this.update())
        this.connectSafe(wp.get_default_speaker(), 'notify::volume_icon_name', () => this.update())
    }

    private update(): void {
        if (wp.get_default_speaker() === null) return
        
        this.updateIcon()
        this.updateLevel()
        this.updateTooltip()
    }

    private updateIcon(): void {
        const iconName = wp.get_default_speaker()?.get_volume_icon()
        const finalIconName = (iconName && iconName.length > 0) ? iconName : "audio-volume-medium-symbolic"
        this.audioIcon.set_from_icon_name(finalIconName)
    }

    private updateLevel(): void {
        const volume = Math.round(wp.get_default_speaker()?.get_volume() * 100)
        this.audioLevel.set_text(volume.toString() + "%")
        this.audioLevel.set_visible(!(wp.get_default_speaker()?.get_mute() ?? false)) // Hide if volume is 0
    }

    private updateTooltip(): void {
        const name = wp.get_default_speaker()?.get_name()
        const volume = Math.round(wp.get_default_speaker()?.get_volume() * 100)
        this.audioBox.set_tooltip_text(volume.toString() + "%" + "\n" + (name ?? "Builtin Audio"))
    }

    private clickGesture(): void {
        this.audioBtn.connect('clicked', () => {
            this.getBar().getVars().toggleAudioMenuState()
        })

        const clickGesture = new Gtk.GestureClick()
        clickGesture.set_button(3) // Listen to all buttons
        clickGesture.connect('pressed', () => {
            if (wp.get_default_speaker() === null) return
                const currentDevice = wp.get_default_speaker()
                if (currentDevice === null) return
                currentDevice.set_mute(!currentDevice.get_mute())
                this.update()
            }
        )
        this.audioBtn.add_controller(clickGesture)
    }

    private scrollHandler(): void {
        const scrollController = new Gtk.EventControllerScroll({
            flags: Gtk.EventControllerScrollFlags.VERTICAL
        })
        
        scrollController.connect('scroll', (controller, _, dy) => {
            if (wp.get_default_speaker() === null) return
            const currentDevice = wp.get_default_speaker()
            const currentVolume = currentDevice.get_volume()
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
                    currentDevice.set_mute(true)
                }
    
                currentDevice.set_volume(newVolume)
                // Unmute if scrolling while muted
                if (currentDevice.get_mute()) {
                    currentDevice.set_mute(false)
                }
                // Update label immediately
                this.update()
            }
            
            return true // Event handled
        })
        
        this.audioBtn.add_controller(scrollController)
    }

    public getWidget(): Gtk.Widget {
        return this.audioBox
    }
}

export default Audio