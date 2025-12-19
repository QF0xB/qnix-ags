import { Gtk, Gdk } from "ags/gtk4"

// @ts-expect-error: No type for gi://AstalHyprland
import Hyprland, { Workspace } from "gi://AstalHyprland"
const hyprland = Hyprland.get_default()

function getWorkspaces(monitor: Gdk.Monitor): Workspace[] {
    const workspaces = hyprland.get_workspaces()
    const connector = monitor.get_connector()

    return Array.from(workspaces)
        .filter((ws: Workspace) => {
            const mon = ws.get_monitor()
            if (!mon || !connector) {
                return false
            }
            return mon.name === connector
        })
        .sort((a: Workspace, b: Workspace) => a.get_id() - b.get_id())
}

function buildWorkspaceButton(ws: Workspace): Gtk.Button {
    return new Gtk.Button({
        name: "workspace-button-" + ws.get_id().toString(),
        cssClasses: ["workspace-button"],
        has_tooltip: false,
        label: ws.get_id().toString()
    })
}

function loadWorkspaceButtons(workspaces: Workspace[]): Map<number, Gtk.Button> {
    const workspaceButtons = new Map<number, Gtk.Button>()
    for (const ws of workspaces) {
        const workspaceBtn = buildWorkspaceButton(ws)
        workspaceButtons.set(ws.get_id(), workspaceBtn)
    }

    // Sort by workspace ID
    const sortedEntries = new Map<number, Gtk.Button>([...workspaceButtons.entries()].sort(([a], [b]) => a - b))
    return sortedEntries
}

function applyWorkspaceButtons(workspaceBox: Gtk.Box, sortedWorkspaceButtons: Map<number, Gtk.Button>): void {
    // remove all children
    let child = workspaceBox.get_first_child()
    while (child != null) {
        workspaceBox.remove(child)
        child = workspaceBox.get_first_child()
    }
    // add new buttons
    sortedWorkspaceButtons.forEach((btn, wsId) => {
        workspaceBox.append(btn)
    })

    updateFocusedWorkspace(sortedWorkspaceButtons)
}

function updateFocusedWorkspace(sortedWorkspaceButtons: Map<number, Gtk.Button>): void {
    const focusedWorkspace = hyprland.get_focused_workspace()
    const focusedWorkspaceId = focusedWorkspace?.get_id()
    
    if (focusedWorkspaceId === undefined) {
        return
    }
    
    const focusedWorkspaceBtn = sortedWorkspaceButtons.get(focusedWorkspaceId)
    
    sortedWorkspaceButtons.forEach((btn, _) => {
        btn.remove_css_class("focused")
    })

    if (focusedWorkspaceBtn) {
        focusedWorkspaceBtn.add_css_class("focused")
    }
    // If button doesn't exist yet, it will be created in the next workspace list update
}

function workSpaceBox(monitor: Gdk.Monitor): Gtk.Box {
    const workspaceBox = new Gtk.Box({
        name: "workspaces",
        cssClasses: ["workspaces"],
        orientation: Gtk.Orientation.VERTICAL,
        spacing: 8,
        vexpand: true
    })

    // Maintain a persistent map of buttons
    const workspaceButtons = new Map<number, Gtk.Button>()
    
    function updateWorkspaceList() {
        const workspaces = getWorkspaces(monitor)
        const currentWorkspaceIds = new Set<number>()
        
        // Get current workspace IDs
        for (const ws of workspaces) {
            currentWorkspaceIds.add(ws.get_id())
        }
        
        // Remove buttons for workspaces that no longer exist
        const toRemove: number[] = []
        workspaceButtons.forEach((btn, wsId) => {
            if (!currentWorkspaceIds.has(wsId)) {
                // Only remove if the button is actually a child of the box
                const parent = btn.get_parent()
                if (parent === workspaceBox) {
                    workspaceBox.remove(btn)
                }
                toRemove.push(wsId)
            }
        })
        toRemove.forEach(wsId => workspaceButtons.delete(wsId))
        
        // Add buttons for new workspaces and append them immediately
        for (const ws of workspaces) {
            if (!workspaceButtons.has(ws.get_id())) {
                const btn = buildWorkspaceButton(ws)
                workspaceButtons.set(ws.get_id(), btn)
                workspaceBox.append(btn)
            }
        }
        
        // Reorder buttons to match workspace order
        const sortedIds = Array.from(workspaceButtons.keys()).sort((a, b) => a - b)
        const buttonsToReorder: Gtk.Button[] = []
        for (const wsId of sortedIds) {
            const btn = workspaceButtons.get(wsId)
            if (btn) {
                const parent = btn.get_parent()
                if (parent === workspaceBox) {
                    workspaceBox.remove(btn)
                }
                buttonsToReorder.push(btn)
            }
        }
        for (const btn of buttonsToReorder) {
            workspaceBox.append(btn)
        }
        
        updateFocusedWorkspace(workspaceButtons)
    }
    
    // Initial setup
    updateWorkspaceList()

    // Listen for workspace list changes
    try {
        hyprland.connect('notify::workspaces', updateWorkspaceList)
        hyprland.connect('notify::focused-workspace', () => {
            // Only update focused state, don't recreate buttons
            updateFocusedWorkspace(workspaceButtons)
        })
    } catch (e) {
        console.error("Error connecting to notify::workspaces signal", e)
    }

    return workspaceBox
}

export default function Workspaces(monitor: Gdk.Monitor): Gtk.Box {
    const workspaceBox = workSpaceBox(monitor)

    return workspaceBox
}