import { Gtk } from "ags/gtk4";

import {
    audioMenuState,
    setAudioMenuState,
} from "../vars"

import Wp, { AstalWpEndpoint } from "gi://AstalWp"
const wp = Wp.get_default()


function updateAudioBtn(audioBox: Gtk.Box, audioBtn: Gtk.Button, audioDevice: AstalWpEndpoint): void {
    const volume = Math.round(audioDevice.get_volume() * 100)
    
    // Remove existing child if any
    const existingChild = audioBtn.get_child()
    if (existingChild) {
        audioBtn.set_child(null)
    }
    
    const iconName = audioDevice.get_volume_icon()
    // Use a fallback icon if iconName is null or empty
    const finalIconName = (iconName && iconName.length > 0) ? iconName : "audio-volume-medium-symbolic"
    const icon = Gtk.Image.new_from_icon_name(finalIconName)
    audioBtn.set_child(icon)
    
    let name = audioDevice.get_name()
    if (name === null) {
        name = "Builtin Audio"
    }

    audioBox.set_tooltip_text(volume.toString() + "%" + "\n" + name)
}

function updateAudioLevel(audioLevel: Gtk.Label, audioDevice: AstalWpEndpoint): void {
    const volume = Math.round(audioDevice.get_volume() * 100)
    const mute = audioDevice.get_mute()
    if (mute) {
        audioLevel.set_visible(false)
    } else {
        audioLevel.set_visible(true)
        audioLevel.set_text(volume.toString() + "%")
    }

}

function disconnectSignals(currentDevice: AstalWpEndpoint | null, muteHandlerId: number | null, volumeHandlerId: number | null): void {
    if (currentDevice && muteHandlerId !== null) {
        currentDevice.disconnect(muteHandlerId)
    }
    if (currentDevice && volumeHandlerId !== null) {
        currentDevice.disconnect(volumeHandlerId)
    }
}

function connectSignals(audioBox: Gtk.Box, audioBtn: Gtk.Button, audioLevel: Gtk.Label, currentDevice: AstalWpEndpoint | null, muteHandlerId: number | null, volumeHandlerId: number | null): [AstalWpEndpoint | null, number | null, number | null] {
    disconnectSignals(currentDevice, muteHandlerId, volumeHandlerId)
    const newDevice = wp.get_default_speaker()
    muteHandlerId = newDevice.connect('notify::mute', () => {
        updateAudioBtn(audioBox, audioBtn, newDevice)
        updateAudioLevel(audioLevel, newDevice)
    })
    volumeHandlerId = newDevice.connect('notify::volume', () => {
        updateAudioBtn(audioBox, audioBtn, newDevice)
        updateAudioLevel(audioLevel, newDevice)
    })

    // Update UI immediately after connecting signals
    updateAudioBtn(audioBox, audioBtn, newDevice)
    updateAudioLevel(audioLevel, newDevice)

    return [newDevice, muteHandlerId, volumeHandlerId]
}

function audioBox(): Gtk.Box {
    const audioBox = new Gtk.Box({
        name: "audio-box",
        cssClasses: ["audio-box"],
        orientation: Gtk.Orientation.VERTICAL
    })

    const audioBtn = new Gtk.Button({
        name: "audio-btn",
        cssClasses: ["audio-btn"],
    })

    // Left-click: open menu (use clicked signal for left-click)
    audioBtn.connect('clicked', () => {
        setAudioMenuState(!audioMenuState())
    })

    // Right-click: toggle mute (use gesture for right-click)
    const rightClickGesture = new Gtk.GestureClick()
    rightClickGesture.set_button(3) // Right mouse button
    rightClickGesture.connect('pressed', () => {
        const currentDevice = wp.get_default_speaker()
        currentDevice.set_mute(!currentDevice.get_mute())
        updateAudioBtn(audioBox, audioBtn, currentDevice)
        updateAudioLevel(audioLevel, currentDevice)
    })
    audioBtn.add_controller(rightClickGesture)
    
    const audioLevel = new Gtk.Label({
        name: "audio-level",
        cssClasses: ["audio-level"],
    })

    audioBox.append(audioLevel)
    audioBox.append(audioBtn)


    const currentDevice: AstalWpEndpoint | null = wp.get_default_speaker()
    let muteHandlerId: number | null = null
    let volumeHandlerId: number | null = null

    connectSignals(audioBox, audioBtn, audioLevel, currentDevice, muteHandlerId, volumeHandlerId)

    const scrollController = new Gtk.EventControllerScroll({
        flags: Gtk.EventControllerScrollFlags.VERTICAL
    })
    
    scrollController.connect('scroll', (controller, _, dy) => {
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
            updateAudioBtn(audioBox, audioBtn, currentDevice)
            updateAudioLevel(audioLevel, currentDevice)
        }
        
        return true // Event handled
    })
    
    audioBox.add_controller(scrollController)

    return audioBox
}

export default function Audio(): Gtk.Box {
    const box = audioBox()
    return box
}