import { Gdk, Gtk } from "ags/gtk4"
import Pango from "gi://Pango?version=1.0"

// @ts-ignore: No type definitions for native module
import AstalNotifd from "gi://AstalNotifd"
import { Destroyable } from "./Destroyable"

class Notification extends Destroyable {
    private notification: AstalNotifd.Notification
    private id: string
    private widget: Gtk.Box
    private previewWidget: Gtk.Box
    private createdAt: number // Track when notification was created for timestamp
    private closeCallback: () => void

    constructor(notification: AstalNotifd.Notification, closeCallback: () => void = () => { this.dismiss() }) {
        super()

        this.notification = notification
        this.closeCallback = closeCallback
        this.id = notification.get_id()
        this.createdAt = Date.now() / 1000 // Store creation time in seconds
        this.widget = new Gtk.Box({
            name: "notification-" + this.id,
            cssClasses: ["notification"],
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 8,
        })

        this.previewWidget = new Gtk.Box({
            name: "notification-" + this.id + "-preview",
            cssClasses: ["notification-preview"],
            orientation: Gtk.Orientation.VERTICAL,
            // Critical for stacked previews: do NOT allow the preview card to stretch vertically.
            // If it stretches, overlap math (e.g. "5px sliver") becomes impossible.
            vexpand: false,
            valign: Gtk.Align.START,
            hexpand: true,
        })

        this.update()
    }

    public update(notification: AstalNotifd.Notification | null = null ): void {
        if (notification) {
            this.notification = notification
        }

        // GI enums come through as numbers at runtime (e.g. 0/1/2), even if typed as an enum.
        // Also note: LOW is often 0, so `if (urgency)` would incorrectly skip it.
        const urgency: AstalNotifd.Urgency = this.notification.get_urgency()
        const urgencyClass = (() => {
            switch (urgency) {
                case AstalNotifd.Urgency.LOW:
                    return "low"
                case AstalNotifd.Urgency.NORMAL:
                    return "normal"
                case AstalNotifd.Urgency.CRITICAL:
                    return "critical"
                default:
                    return `urgency-${urgency}`
            }
        })()
        // Replace any previous urgency classes
        this.widget.get_css_classes().forEach((cssClass: string) => {
            if (cssClass === "low" || cssClass === "normal" || cssClass === "critical" || cssClass.startsWith("urgency-")) {
                this.widget.remove_css_class(cssClass)
            }
        })
        this.widget.add_css_class(urgencyClass)

        while (this.widget.get_first_child() !== null) {
            this.widget.remove(this.widget.get_first_child() as Gtk.Widget)
        }

        const mainBox = new Gtk.Box({
            name: "notification-" + this.id + "-main-box",
            cssClasses: ["notification-main-box"],
            orientation: Gtk.Orientation.HORIZONTAL,
            hexpand: true,
            valign: Gtk.Align.START,
            vexpand: false,
        })

        const actionBox = new Gtk.Box({
            name: "notification-" + this.id + "-action-box",
            cssClasses: ["notification-action-box"],
            orientation: Gtk.Orientation.HORIZONTAL,
            homogeneous: true,
            spacing: 8,
        })

        this.widget.append(mainBox)

        const pictureBox = new Gtk.Box({
            name: "notification-" + this.id + "-picture-box",
            cssClasses: ["notification-picture-box"],
            orientation: Gtk.Orientation.VERTICAL,
            valign: Gtk.Align.START,
            halign: Gtk.Align.START,
            hexpand: false,
            vexpand: false,
        })

        const contentBox = new Gtk.Box({
            name: "notification-" + this.id + "-content-box",
            cssClasses: ["notification-content-box"],
            orientation: Gtk.Orientation.VERTICAL,
            valign: Gtk.Align.START,
            halign: Gtk.Align.START,
            hexpand: true,
            vexpand: false,
        })

        const closeBox = new Gtk.Box({
            name: "notification-" + this.id + "-close-box",
            cssClasses: ["notification-close-box"],
            orientation: Gtk.Orientation.HORIZONTAL,
            vexpand: true,
        })

        // Always create picture box for consistent layout
        const picture = new Gtk.Image({
            name: "notification-" + this.id + "-picture",
            cssClasses: ["notification-picture"],
            valign: Gtk.Align.START,
            halign: Gtk.Align.START,
            hexpand: false,
            vexpand: false,
        })

        // Try to load image/icon, but don't break if it fails
        try {
            if (this.notification.get_image()) {
                const imagePath = this.notification.get_image()
                if (imagePath) {
                    picture.set_from_file(imagePath)
                    pictureBox.append(picture)
                    mainBox.append(pictureBox)
                    console.log("notification image: " + imagePath)
                }
            } else if (this.notification.get_app_icon()) {
                const iconName = this.notification.get_app_icon()
                if (iconName) {
                    picture.set_from_icon_name(iconName)
                    pictureBox.append(picture)
                    mainBox.append(pictureBox)
                    console.log("notification icon: " + iconName)
                }
            }
        } catch (e) {
            // If image loading fails, just skip the picture
        }

        mainBox.append(contentBox)
        mainBox.append(closeBox)

        
        
        // Summary row with timestamp
        const summaryRow = new Gtk.Box({
            name: "notification-" + this.id + "-summary-row",
            cssClasses: ["notification-summary-row"],
            orientation: Gtk.Orientation.HORIZONTAL,
            hexpand: false,
        })
        
        const summary = new Gtk.Label({
            name: "notification-" + this.id + "-summary",
            cssClasses: ["notification-summary"],
            label: this.notification.get_summary().trim(),
            halign: Gtk.Align.START,
            hexpand: true,
            max_width_chars: 20,
            ellipsize: Pango.EllipsizeMode.END,
        })
        summaryRow.append(summary)
        
        // Add timestamp
        const timestamp = this.formatTimeAgo()
        if (timestamp) {
            const timeLabel = new Gtk.Label({
                name: "notification-" + this.id + "-time",
                cssClasses: ["notification-time"],
                label: timestamp,
                halign: Gtk.Align.START,
                hexpand: false,
            })

            this.setIntervalSafe(() => {
                timeLabel.set_label(this.formatTimeAgo())
            }, 60000) // Update every minute

            summaryRow.append(timeLabel)
        }
        
        contentBox.append(summaryRow)
        summary.add_css_class(urgencyClass)

        const body = new Gtk.Label({
            name: "notification-" + this.id + "-body",
            cssClasses: ["notification-body"],
            label: this.notification.get_body() || "",
            halign: Gtk.Align.START,
            hexpand: true,
            wrap: true,
            lines: 3, // Limit to 3 lines
            ellipsize: Pango.EllipsizeMode.END, 
            natural_wrap_mode: Gtk.NaturalWrapMode.WORD,
            wrap_mode: Pango.WrapMode.WORD_CHAR,
        })
        contentBox.append(body)


        for (const action of this.notification.get_actions()) {
            const actionBtn = new Gtk.Button({
                name: "notification-" + this.id + "-action-btn",
                cssClasses: ["notification-action-btn"],
                label: action.get_label(),
                cursor: Gdk.Cursor.new_from_name("pointer", null),
            })

            this.connectSafe(actionBtn, 'clicked', () => {
                this.notification.invoke(action.get_id())
                this.dismiss()
            })

            actionBox.append(actionBtn)
        }

        if (this.notification.get_actions().length > 0) {
            this.widget.append(actionBox)
        }

        const closeBtn = new Gtk.Button({
            name: "notification-" + this.id + "-close-btn",
            cssClasses: ["notification-close-btn"],
            label: "",
            cursor: Gdk.Cursor.new_from_name("pointer", null),
            valign: Gtk.Align.END,
        })

        this.connectSafe(closeBtn, 'clicked', () => {
            this.closeCallback()
        })

        closeBox.append(closeBtn)

        this.updatePreview()
    }

    private updatePreview(): void {
        while (this.previewWidget.get_first_child() !== null) {
            this.previewWidget.remove(this.previewWidget.get_first_child() as Gtk.Widget)
        }

        const urgency: AstalNotifd.Urgency = this.notification.get_urgency()
        const urgencyClass = (() => {
            switch (urgency) {
                case AstalNotifd.Urgency.LOW:
                    return "low"
                case AstalNotifd.Urgency.NORMAL:
                    return "normal"
                case AstalNotifd.Urgency.CRITICAL:
                    return "critical"
                default:
                    return `urgency-${urgency}`
            }
        })()
        this.previewWidget.get_css_classes().forEach((cssClass: string) => {
            if (cssClass === "low" || cssClass === "normal" || cssClass === "critical" || cssClass.startsWith("urgency-")) {
                this.previewWidget.remove_css_class(cssClass)
            }
        })
        this.previewWidget.add_css_class(urgencyClass)

        const metaBox = new Gtk.Box({
            name: "notification-" + this.id + "-preview-meta-box",
            cssClasses: ["notification-preview-meta-box"],
            orientation: Gtk.Orientation.VERTICAL,
            valign: Gtk.Align.START,
            halign: Gtk.Align.START,
            hexpand: true,
            vexpand: false,
        })

        const summary = new Gtk.Label({
            name: "notification-" + this.id + "-preview-summary",
            cssClasses: ["notification-preview-summary"],
            label: this.notification.get_summary().trim(),
            halign: Gtk.Align.START,
            hexpand: true,
            max_width_chars: 20,
            ellipsize: Pango.EllipsizeMode.END,
        })

        summary.add_css_class(urgencyClass)


        metaBox.append(summary)

        const body = new Gtk.Label({
            name: "notification-" + this.id + "-preview-body",
            cssClasses: ["notification-preview-body"],
            label: this.notification.get_body() || "",
            halign: Gtk.Align.START,
            hexpand: true,
            wrap: true,
            lines: 1, // Limit to 1 lines
            ellipsize: Pango.EllipsizeMode.END, 
        })
        metaBox.append(body)

        this.previewWidget.append(metaBox)

        const timestamp = this.formatTimeAgo()
        if (timestamp) {
            const timeLabel = new Gtk.Label({
                name: "notification-" + this.id + "-preview-time",
                cssClasses: ["notification-preview-time"],
                label: timestamp,
                halign: Gtk.Align.START,
                hexpand: false,
            })
            this.previewWidget.append(timeLabel)
        }
    }

    public dismiss(): void {
        this.notification.dismiss()
    }

    public getPreviewWidget(): Gtk.Box {
        return this.previewWidget
    }

    public getWidget(): Gtk.Box {
        return this.widget
    }

    public getId(): string {
        return this.id
    }

    public getNotification(): AstalNotifd.Notification {
        return this.notification
    }

    private formatTimeAgo(): string {
        try {
            // Use the tracked creation time
            const now = Date.now() / 1000 // Current time in seconds
            const diff = now - this.createdAt
            
            if (diff < 60) {
                return "just now"
            } else if (diff < 3600) {
                const minutes = Math.floor(diff / 60)
                return `${minutes}m ago`
            } else if (diff < 86400) {
                const hours = Math.floor(diff / 3600)
                return `${hours}h ago`
            } else {
                const days = Math.floor(diff / 86400)
                return `${days}d ago`
            }
        } catch (e) {
            return ""
        }
    }
}

export default Notification