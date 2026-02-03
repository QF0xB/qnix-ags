import { Gdk, Gtk } from "ags/gtk4"

// Constants
const ANIMATION_SPEED = 200

// Placeholder components - you'll need to implement these
// import Home from './home/Home'
// import AppLauncher from './appLauncher/AppLauncher'
// import Wallpapers from './wallpapers/Wallpapers'
// import Themes from './themes/Themes'

import Bar from "../Bar"
import Devider from "../../../utils/Devider"
import { debugLog } from "../../../utils/debug"
import Home from "./home/Home"
import { timeout } from "ags/time"
import Launcher from "./launcher/Launcher"

class SideBar {
    private revealer: Gtk.Revealer
    private stack: Gtk.Stack

    constructor(bar: Bar, left: boolean) {
        // Create Revealer with reactive state
        this.revealer = new Gtk.Revealer({
            name: "sidebar-revealer",
            cssClasses: ["sidebar-revealer"],
            transition_type: left
                ? Gtk.RevealerTransitionType.SLIDE_RIGHT
                : Gtk.RevealerTransitionType.SLIDE_LEFT,
            transition_duration: ANIMATION_SPEED,
            reveal_child: bar.getVars().getSideBarStateAccessor()(), // Initial state
            hexpand: false,  // Don't expand - size to content
        })

        // Connect to notify::allocated-width to track width
        this.revealer.connect('notify::allocated-width', () => {
            bar.getVars().getSideBarWidthSetter()(this.revealer.get_allocated_width())
        })

        // Create Stack with reactive state
        this.stack = new Gtk.Stack({
            name: "sidebar-stack",
            cssClasses: ["sidebar-stack"],
            transition_type: left
                ? Gtk.StackTransitionType.SLIDE_RIGHT
                : Gtk.StackTransitionType.SLIDE_LEFT,
            transition_duration: 200,
        })

        // Add child components to stack
        // Replace these with your actual components
        const homeWidget = new Home(bar).getWidget()
        const appLauncherWidget = new Launcher(bar).getWidget()
        const wallpapersWidget = this.createWallpapersWidget()
        const themesWidget = this.createThemesWidget()

        this.stack.add_named(homeWidget, 'home')
        this.stack.add_named(appLauncherWidget, 'appLauncher')
        this.stack.add_named(wallpapersWidget, 'wallpapers')
        this.stack.add_named(themesWidget, 'themes')

        // Subscribe to sideBarState to updatewidth
        bar.getVars().getSideBarStateAccessor().subscribe(() => {
            timeout(600, () => {
                bar.getVars().getSideBarWidthSetter()(this.stack.get_allocated_width())
            })
        })

        // Subscribe to state changes to update visible child
        bar.getVars().getSideBarShownStateAccessor().subscribe(() => {
            this.stack.set_visible_child_name(bar.getVars().getSideBarShownStateAccessor()())
            bar.getVars().getSideBarWidthSetter()(this.stack.get_allocated_width())
        })

        // Set initial visible child
        this.stack.set_visible_child_name(bar.getVars().getSideBarShownStateAccessor()())

        // Add stack to revealer
        this.revealer.set_child(this.stack)

        // Subscribe to state changes to update reveal_child
        bar.getVars().getSideBarStateAccessor().subscribe(() => {
            const shouldReveal = bar.getVars().getSideBarStateAccessor()()

            const shownState = bar.getVars().getSideBarShownStateAccessor()()
            debugLog('shown state changed to', shownState)
            switch (shownState) {
                case 'home':
                    this.stack.set_visible_child_name('home')
                    debugLog('setting visible child to home')
                    break
                case 'appLauncher':
                    this.stack.set_visible_child_name('appLauncher')
                    debugLog('setting visible child to appLauncher')
                    break
                case 'wallpapers':
                    this.stack.set_visible_child_name('wallpapers')
                    break
                case 'search':
                    this.stack.set_visible_child_name('themes')
                    break
            }

            this.revealer.set_reveal_child(shouldReveal)
            // When collapsed, ensure revealer takes 0 width
            if (!shouldReveal) {
                this.revealer.set_size_request(0, -1)
            } else {
                this.revealer.set_size_request(-1, -1)  // Size to content when revealed
            }
            debugLog('sidebar state changed to', shouldReveal)
        })
    }

    // Placeholder methods - replace with actual component imports
    private createHomeWidget(): Gtk.Widget {
        const box = new Gtk.Box({
            name: "home",
            cssClasses: ["home"],
        })

        box.append(new Gtk.Button({
            name: "home-btn",
            cssClasses: ["home-btn"],
            label: "󰈞",
        }))
        // Add your Home component content here
        return box
    }

    private createAppLauncherWidget(): Gtk.Widget {
        const box = new Gtk.Box({
            name: "app-launcher",
            cssClasses: ["app-launcher"],
        })

        box.append(new Gtk.Button({
            name: "app-launcher-btn",
            cssClasses: ["app-launcher-btn"],
            label: "󰈞",
        }))
        // Add your AppLauncher component content here
        return box
    }

    private createWallpapersWidget(): Gtk.Widget {
        const box = new Gtk.Box({
            name: "wallpapers",
            cssClasses: ["wallpapers"],
        })

        box.append(new Gtk.Button({
            name: "wallpapers-btn",
            cssClasses: ["wallpapers-btn"],
            label: "󰈞",
        }))

        // Add your Wallpapers component content here
        return box
    }

    private createThemesWidget(): Gtk.Widget {
        const box = new Gtk.Box({
            name: "themes",
            cssClasses: ["themes"],
        })
        box.append(new Gtk.Button({
            name: "themes-btn",
            cssClasses: ["themes-btn"],
            label: "󰈞",
        }))
        // Add your Themes component content here
        return box
    }

    public getWidget(): Gtk.Revealer {
        return this.revealer
    }
}

export default SideBar