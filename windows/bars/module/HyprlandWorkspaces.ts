import { Gtk, Gdk } from 'ags/gtk4'
import { QButton } from '../../../modules/PointerButton'
import Hyprland from "gi://AstalHyprland"

const hyprland = Hyprland.get_default()

export function HyprlandWorkspaces(monitor: Gdk.Monitor): Gtk.Box {
    const box = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        halign: Gtk.Align.CENTER,
        valign: Gtk.Align.CENTER,
        spacing: 8,
        vexpand: false
    })
    box.add_css_class("middle")

    const workspaceBox = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        halign: Gtk.Align.CENTER,
        valign: Gtk.Align.CENTER,
        spacing: 8,
        vexpand: false
    })
    workspaceBox.add_css_class("workspace")

    box.append(workspaceBox)

    // Get monitor connector name
    const monitorName = monitor.get_connector() ?? ""

    // Get all workspaces from Hyprland
    const workspaces = hyprland.get_workspaces()

    // Filter workspaces for this monitor and sort by ID
    const monitorWorkspaces = Array.from(workspaces)
        .filter((ws: any) => ws.get_monitor().name === monitorName)
        .sort((a: any, b: any) => a.get_id() - b.get_id())

    // Store workspace buttons by ID for easy lookup
    const workspaceButtons = new Map<number, Gtk.Button>()

    // Create workspace buttons
    for (const workspace of monitorWorkspaces as any[]) {
        let wsId = workspace.get_id()
        if (wsId === 10) {
            wsId = 0;
        }
        const workspaceBtn = QButton({
            class: "button",
            onClicked: () => {
                hyprland.message(`dispatch workspace ${wsId}`)
            }
        })

        workspaceBtn.set_label(wsId.toString())

        workspaceButtons.set(wsId, workspaceBtn)
        workspaceBox.append(workspaceBtn)
    }

    const updateFocusedWorkspace = () => {
        const focusedWorkspace = hyprland.get_focused_workspace()
        if (focusedWorkspace) {
            let focusedWsId = focusedWorkspace.get_id()

            if (focusedWsId === 10) {
                focusedWsId = 0;
            }

            // Remove focused class from all buttons
            workspaceButtons.forEach((btn) => {
                btn.remove_css_class("focused")
            })

            // Add focused class to the focused workspace button and its label
            const focusedBtn = workspaceButtons.get(focusedWsId)
            if (focusedBtn) {
                focusedBtn.add_css_class("focused")
            }
        }
    }

    // Set initial focused state
    updateFocusedWorkspace()

    const updateWorkspaces = () => {
        const currentWorkspaces = hyprland.get_workspaces()
        const currentWorkspaceIds = new Set<number>()
        
        // Get current workspace IDs for this monitor
        for (const ws of currentWorkspaces) {
            const wsMonitor = (ws as any).get_monitor()
            if (wsMonitor && wsMonitor.name === monitorName) {
                let wsId = (ws as any).get_id()
                if (wsId === 10) {
                    wsId = 0;
                }
                currentWorkspaceIds.add(wsId)
                
                // Add new workspace if it doesn't exist
                if (!workspaceButtons.has(wsId)) {
                    const workspaceBtn = QButton({
                        class: "button",
                        onClicked: () => {
                            hyprland.message(`dispatch workspace ${wsId}`)
                        }
                    })
                    workspaceBtn.set_label(wsId.toString())
                    workspaceButtons.set(wsId, workspaceBtn)
                    workspaceBox.append(workspaceBtn)
                }
            }
        }
        
        // Remove workspaces that no longer exist
        const toRemove: number[] = []
        workspaceButtons.forEach((btn, wsId) => {
            if (!currentWorkspaceIds.has(wsId)) {
                toRemove.push(wsId)
            }
        })
        
        for (const wsId of toRemove) {
            const workspaceBtn = workspaceButtons.get(wsId)
            if (workspaceBtn) {
                workspaceBox.remove(workspaceBtn)
                workspaceButtons.delete(wsId)
            }
        }
        
        // Re-sort all buttons to ensure correct order
        // Get all workspace IDs and sort them numerically
        const allWsIds = Array.from(workspaceButtons.keys()).sort((a, b) => a - b)
        
        // Remove all buttons temporarily
        const buttonsToReorder = new Map<number, Gtk.Button>()
        for (const wsId of allWsIds) {
            const btn = workspaceButtons.get(wsId)
            if (btn) {
                workspaceBox.remove(btn)
                buttonsToReorder.set(wsId, btn)
            }
        }
        
        // Re-append in sorted order
        for (const wsId of allWsIds) {
            const btn = buttonsToReorder.get(wsId)
            if (btn) {
                workspaceBox.append(btn)
            }
        }
        
        // Update focused state after workspace changes
        updateFocusedWorkspace()
    }

    // Listen for workspace list changes
    try {
        hyprland.connect('notify::workspaces', updateWorkspaces)
    } catch (e) {
        console.error("Error connecting to notify::workspaces signal", e)
    }
    // Listen for workspace changes
    try {
        hyprland.connect('notify::focused-workspace', updateFocusedWorkspace)
    } catch (e) {
        // Try alternative signal names
        try {
            hyprland.connect('focused-workspace-changed', updateFocusedWorkspace)
        } catch (e2) {
            // Ignore if signal doesn't exist
        }
    }

    return box
}

