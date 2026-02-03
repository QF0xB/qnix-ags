// @ts-ignore: No type definitions for native module
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import AppsService from 'gi://AstalApps'

import { Gtk } from 'ags/gtk4'
import { timeout, Timer } from 'ags/time'
import Bar from '../../Bar'
import { BarModule } from '../../module/BarModule'

const SEARCH_DEBOUNCE_MS = 150

class Launcher extends BarModule {
    private box: Gtk.Box
    private header: Gtk.Box
    private searchEntry!: Gtk.SearchEntry
    private appsService: AppsService
    private appsBox: Gtk.Box
    private currentApps: AppsService.AppInfo[] = []
    private appWidgets = new Map<string, Gtk.Widget>()
    private searchDebounceTimer: Timer | null = null

    constructor(bar: Bar) {
        super(bar)

        this.box = new Gtk.Box({
            name: "launcher-box",
            cssClasses: ["launcher-box"],
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 12,
        })

        this.header = new Gtk.Box({
            name: "launcher-header",
            cssClasses: ["launcher-header"],
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 12,
        })

        this.appsBox = new Gtk.Box({
            name: "apps-box",
            cssClasses: ["apps-box"],
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 12,
        })

        // Wrapper with margin so the scrollbar sits away from the list content
        const scrollContent = new Gtk.Box({
            name: "launcher-apps-scroll-content",
            cssClasses: ["launcher-apps-scroll-content"],
            orientation: Gtk.Orientation.VERTICAL,
        })
        scrollContent.append(this.appsBox)

        const scrolledWindow = new Gtk.ScrolledWindow({
            name: "launcher-apps-scrolled",
            cssClasses: ["launcher-apps-scrolled"],
            hscrollbar_policy: Gtk.PolicyType.NEVER,
            vscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
            hexpand: true,
            vexpand: true,
        })
        scrolledWindow.set_child(scrollContent)

        this.createHeader()
        this.box.append(this.header)
        this.box.append(scrolledWindow)

        // When the launcher page is shown (stack switches to us), load apps and grab focus.
        // Apps are loaded here so they're only fetched when the launcher is actually opened.
        this.box.connect('map', () => {
            this.updateApps()
            this.searchEntry.grab_focus()
            // Delayed grabs so focus works when launcher is opened via command (Hyprland focuses window, then we focus the entry)
            timeout(100, () => this.searchEntry.grab_focus())
            timeout(300, () => this.searchEntry.grab_focus())
        })

        this.appsService = new AppsService.Apps({
            nameMultiplier: 4,
            entryMultiplier: 0,
            executableMultiplier: 2
          })
    }

    private createHeader(): void {
        this.searchEntry = new Gtk.SearchEntry({
            name: "launcher-search",
            cssClasses: ["launcher-search"],
            placeholder_text: "Search apps…",
            hexpand: true,
            width_request: 200,
        })
        this.searchEntry.set_can_focus(true)
        this.searchEntry.set_sensitive(true)

        this.connectSafe(this.searchEntry, 'search-changed', () => {
            if (this.searchDebounceTimer) this.cancelTimerSafe(this.searchDebounceTimer)
            this.searchDebounceTimer = this.setTimeoutSafe(() => {
                this.searchDebounceTimer = null
                this.updateApps()
            }, SEARCH_DEBOUNCE_MS)
        })

        this.connectSafe(this.searchEntry, 'activate', () => {
            this.launchFirstAndClose()
        })

        this.header.append(this.searchEntry)
    }

    private updateApps(): void {
        const apps = this.appsService.fuzzy_query(this.searchEntry.get_text())
        this.currentApps = apps
        const newNames = apps.map((a: AppsService.AppInfo) => a.get_name())

        // Remove widgets for apps no longer in the list
        const toRemove = [...this.appWidgets.keys()].filter((n) => !newNames.includes(n))
        for (const name of toRemove) {
            const w = this.appWidgets.get(name)!
            this.appsBox.remove(w)
            this.appWidgets.delete(name)
        }

        // Add or reorder widgets to match newApps order
        let prev: Gtk.Widget | null = null
        for (const app of apps) {
            const name = app.get_name()
            let widget = this.appWidgets.get(name)
            if (!widget) {
                widget = new AppWidget(this.getBar(), app).getWidget()
                this.appWidgets.set(name, widget)
            } else {
                this.appsBox.remove(widget)
            }
            if (prev) this.appsBox.insert_child_after(widget, prev)
            else this.appsBox.prepend(widget)
            prev = widget
        }
    }

    private launchFirstAndClose(): void {
        if (this.currentApps.length === 0) return
        this.currentApps[0].launch()
        this.getBar().getVars().getSideBarStateSetter()(false)
    }

    getWidget(): Gtk.Box {
        return this.box;
    }
}

export default Launcher

class AppWidget extends BarModule {
    private button: Gtk.Button

    constructor(bar: Bar, app: AppsService.AppInfo) {
        super(bar)
        this.button = this.createButton(app)
    }

    private createButton(app: AppsService.AppInfo): Gtk.Button {
        const button = new Gtk.Button({
            name: app.get_name() + "-app-button",
            cssClasses: ["app-button"],
            label: app.get_name(),
        })

        button.connect('clicked', () => {
            app.launch()
            this.getBar().getVars().getSideBarStateSetter()(false)
        })
        return button
    }

    public getWidget(): Gtk.Box {
        const box = new Gtk.Box({
            name: "app-box",
            cssClasses: ["app-box"],
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 12,
        })
        box.append(this.button)
        return box
    }
}