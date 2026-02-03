import { Destroyable } from "./Destroyable";
import { debugLog } from "./debug";
import { Gdk, Gtk } from "ags/gtk4";

// @ts-ignore: No type definitions for native module
import AstalNotifd from "gi://AstalNotifd";
import Notification from "./Notification";

class NotificationGroup extends Destroyable {
    private appName: string
    private widget: Gtk.Box
    private stack!: Gtk.Stack // Stack for preview and content, initialized in buildStack()
    private previewBox!: Gtk.Box // Preview box, initialized in buildStack()
    private expandedBox!: Gtk.Box // Expanded box with all notifications, initialized in buildStack()
    private isExpanded: boolean = false

    private countLabel!: Gtk.Label

    private notifications: Map<string, Notification> = new Map()

    constructor(appName: string) {
        super()
        this.appName = appName

        this.widget = new Gtk.Box({
            name: "notification-group-" + appName + "-box",
            cssClasses: ["notification-group-box"],
            orientation: Gtk.Orientation.VERTICAL,
        })

        this.buildHeader()
        this.buildStack()
    }

    private buildHeader(): void {
        const headerBox = new Gtk.Box({
            name: "notification-group-" + this.appName + "-header-box",
            cssClasses: ["notification-group-header-box"],
            orientation: Gtk.Orientation.HORIZONTAL,
        })

        headerBox.append(new Gtk.Label({
            name: "notification-group-" + this.appName + "-header-title",
            cssClasses: ["notification-group-header-title"],
            label: this.appName,
            halign: Gtk.Align.START,
            hexpand: true,
        }))

        this.countLabel = new Gtk.Label({
            name: "notification-group-" + this.appName + "-header-count",
            cssClasses: ["notification-group-header-count"],
            label: "(" + this.notifications.size.toString() + ")",
            halign: Gtk.Align.END,
            hexpand: false,
        })

        headerBox.append(this.countLabel)

        const closeBtn = new Gtk.Button({
            name: "notification-group-" + this.appName + "-header-close-btn",
            cssClasses: ["notification-group-header-close-btn"],
            label: "󰎟",
            halign: Gtk.Align.END,
            cursor: Gdk.Cursor.new_from_name("pointer", null),
            tooltipText: "Close all notifications for " + this.appName,
            hexpand: false,
        })

        this.connectSafe(closeBtn, 'clicked', () => {
            this.notifications.forEach((notification) => {
                notification.dismiss()
            })
        })

        headerBox.append(closeBtn)

        this.widget.append(headerBox)
    }

    private buildStack(): void {
        this.stack = new Gtk.Stack({
            name: "notification-group-" + this.appName + "-stack",
            cssClasses: ["notification-group-stack"],
            vexpand: true,
        })

        this.previewBox = new Gtk.Box({
            name: "notification-group-" + this.appName + "-preview-box",
            cssClasses: ["notification-group-preview-box"],
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 0,
            vexpand: true,
        })

        const previewClick = new Gtk.GestureClick()
        previewClick.connect("released", () => {
            this.toggleExpanded()
        })
        this.previewBox.add_controller(previewClick)

        this.expandedBox = new Gtk.Box({
            name: "notification-group-" + this.appName + "-expanded-box",
            cssClasses: ["notification-group-expanded-box"],
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 8,
        })

        const expandedClick = new Gtk.GestureClick()
        expandedClick.connect("released", () => {
            this.toggleExpanded()
        })

        this.expandedBox.add_controller(expandedClick)

        this.stack.add_named(this.previewBox, "preview")
        this.stack.add_named(this.expandedBox, "expanded")

        this.stack.set_visible_child_name("preview")

        this.widget.append(this.stack)

        this.updatePreview()
        this.updateExpanded()
    }

    private updatePreview(): void {
        // Clear preview container
        while (this.previewBox.get_first_child() !== null) {
            this.previewBox.remove(this.previewBox.get_first_child() as Gtk.Widget)
        }

        // Newest first
        const newestFirst = [...this.notifications.values()].reverse()
        if (newestFirst.length === 0) {
            return
        }

        const items = newestFirst.slice(0, 3) // [0]=newest, [1]=older, [2]=oldest (within top3)
        // Ensure newest (index 0) ends up on top when overlapping:
        // add back -> front using prepend.
        for (let idx = 0; idx < items.length; idx++) {
            const notification = items[idx]
            const w = notification.getPreviewWidget()
            w.get_css_classes().forEach((cssClass: string) => {
                if (cssClass.startsWith("notification-preview-")) {
                    w.remove_css_class(cssClass)
                }
            })

            w.add_css_class(`notification-preview-${idx}`)
            this.previewBox.prepend(w)
        }

        if (this.notifications.size > 3) {
            this.previewBox.prepend(new Gtk.Label({
                name: "notification-group-" + this.appName + "-preview-more",
                cssClasses: ["notification-group-preview-more"],
                label: "+" + (this.notifications.size - 3).toString() + " more",
                halign: Gtk.Align.END,
                hexpand: false,
            }))
        }
    }

    private updateExpanded(): void {
        while (this.expandedBox.get_first_child() !== null) {
            this.expandedBox.remove(this.expandedBox.get_first_child() as Gtk.Widget)
        }

        const newestFirst = [...this.notifications.values()].reverse()
        for (const notification of newestFirst) {
            this.expandedBox.append(notification.getWidget())
        }
    }

    private toggleExpanded(): void {
        this.isExpanded = !this.isExpanded

        if (this.isExpanded) {
            this.updateExpanded()
            this.stack.set_visible_child_name("expanded")
        } else {
            this.updatePreview()
            this.stack.set_visible_child_name("preview")
        }
    }

    private updateCount(): void {
        this.countLabel.set_label("(" + this.notifications.size.toString() + ")")
    }

    public addNotification(notification: Notification): void {
        const id = notification.getId()
        debugLog("adding notification: " + id + " to group: " + this.appName)
        if (this.notifications.has(id)) {
            return // Already added
        }
        this.notifications.set(id, notification)
        this.updateCount()
        // Stacking-only behavior: always show the stacked preview

        debugLog("notifications size: " + this.notifications.size)
        if (this.notifications.size <= 2) {
            debugLog("setting isExpanded to true")
            this.isExpanded = true
            this.updateExpanded()
            this.stack.set_visible_child_name("expanded")
        } else {
            debugLog("setting isExpanded to false")
            this.isExpanded = false
            this.updatePreview()
            this.stack.set_visible_child_name("preview")
        }
    }

    public removeNotification(id: string): void {
        const notification = this.notifications.get(id)
        if (notification) {
            notification.destroy()
            this.notifications.delete(id)
            this.updateCount()

            this.updatePreview()

            if (this.notifications.size <= 2) {
                // With 0/1 notifications, default to expanded (0 will just be empty)
                this.isExpanded = true
                this.updateExpanded()
                this.stack.set_visible_child_name("expanded")
            }
        }
    }

    public hasNotification(id: string): boolean {
        return this.notifications.has(id)
    }

    public getNotificationCount(): number {
        return this.notifications.size
    }

    public getAppName(): string {
        return this.appName
    }

    public getWidget(): Gtk.Box {
        return this.widget
    }
}

export default NotificationGroup