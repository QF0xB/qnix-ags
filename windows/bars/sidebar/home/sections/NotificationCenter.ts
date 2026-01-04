import { Gdk, Gtk } from "ags/gtk4"
import Bar from "../../../Bar"
import { BarModule } from "../../../module/BarModule"

// @ts-ignore: No type definitions for native module
import AstalNotifd from "gi://AstalNotifd"
import NotificationGroup from "../../../../../utils/NotificationGroup"
import Notification from "../../../../../utils/Notification"
const notifd = AstalNotifd.get_default()

class NotificationCenter extends BarModule {
    private notificationCenterBox: Gtk.Box
    private notificationListBox: Gtk.Box
    private scrolledWindow: Gtk.ScrolledWindow
    private groups: Map<string, NotificationGroup> = new Map() // Group by app name
    private notificationIds: Set<string> = new Set()

    constructor(bar: Bar) {
        super(bar)

        this.notificationCenterBox = new Gtk.Box({
            name: "notification-center-box",
            cssClasses: ["notification-center-box"],
            orientation: Gtk.Orientation.VERTICAL,
            vexpand: true, // Expand to fill available space
        })

        this.notificationListBox = new Gtk.Box({
            name: "notification-center-notification-list-box",
            cssClasses: ["notification-center-notification-list-box"],
            orientation: Gtk.Orientation.VERTICAL,
            vexpand: false, // Don't expand
            spacing: 8,
        })

        // Wrap notification list in a scrolled window
        this.scrolledWindow = new Gtk.ScrolledWindow({
            name: "notification-center-scrolled",
            cssClasses: ["notification-center-scrolled"],
            vexpand: true, // Expand to fill available space
            hexpand: true,
            min_content_height: 0,
            propagate_natural_height: false,
            vscrollbar_policy: Gtk.PolicyType.ALWAYS, // Show vertical scrollbar when needed
        })
        this.scrolledWindow.set_child(this.notificationListBox)

        this.buildHeader()
        this.buildNotifications()
    }

    private updateNotifications(): void {
        const notifications = notifd.get_notifications()
        // Reverse order so newest notifications appear first (on top)
        const reversedNotifications = [...notifications].reverse()
        

        // Group notifications by app name (which identifies the app/messenger)
        const notificationsByApp = new Map<string, Notification[]>()
        reversedNotifications.forEach((notification: AstalNotifd.Notification) => {
            if (this.notificationIds.has(notification.get_id())) {
                return
            }
            // Use app_name as the grouping key (e.g., "Telegram", "Discord", etc.)
            const appName = notification.get_app_name() || "Unknown"
            
            if (!notificationsByApp.has(appName)) {
                notificationsByApp.set(appName, [])
            }
            notificationsByApp.get(appName)!.push(new Notification(notification))
            this.notificationIds.add(notification.get_id())
        })

        // Process each app group
        notificationsByApp.forEach((appNotifications: Notification[], appName: string) => {
            let group = this.groups.get(appName)
            
            if (!group) {
                // Create new group
                group = new NotificationGroup(appName)
                this.groups.set(appName, group)
            } else {
                this.notificationListBox.remove(group.getWidget())
            }

            this.notificationListBox.prepend(group.getWidget())
            

            // Add new notifications to group
            appNotifications.forEach((notification: Notification) => {
                group!.addNotification(notification)
            })
        })

        // Remove notifications that are no longer present
        const currentIds = new Set(notifications.map((n: AstalNotifd.Notification) => n.get_id()))
        const idsToRemove: string[] = []
        
        this.notificationIds.forEach((id: string) => {
            if (!currentIds.has(id)) {
                idsToRemove.push(id)
            }
        })

        idsToRemove.forEach((id: string) => {
            this.notificationIds.delete(id)
            this.groups.forEach((group) => {
                group.removeNotification(id)
                if (group.getNotificationCount() <= 0) {
                    this.notificationListBox.remove(group.getWidget())
                    this.groups.delete(group.getAppName())
                }
            })
        })
    }

    private buildNotifications(): void {
        this.connectSafe(notifd, 'resolved', () => this.updateNotifications())
        this.connectSafe(notifd, 'notified', () => this.updateNotifications())

        this.updateNotifications()
        
        // Append scrolled window instead of list box directly
        this.notificationCenterBox.append(this.scrolledWindow)
    }

    private buildHeader(): void {
        const headerBox = new Gtk.Box({
            name: "notification-center-header-box",
            cssClasses: ["notification-center-header-box"],
            valign: Gtk.Align.START,
        })

        headerBox.append(new Gtk.Label( {
            name: "notification-center-header-title",
            cssClasses: ["notification-center-header-title"],
            label: "Notifications", 
            halign: Gtk.Align.START,
            hexpand: true,  // Expand to fill available space, pushing button to the right
        }))

        const btn = new Gtk.Button({
            name: "notification-center-header-btn",
            cssClasses: ["notification-center-header-btn"],
            label: "󰎟",
            cursor: Gdk.Cursor.new_from_name("pointer", null),
            tooltipText: "Close all notifications",
            halign: Gtk.Align.END,
            valign: Gtk.Align.CENTER,
        })

        this.connectSafe(btn, 'clicked', () => {
            notifd.get_notifications().forEach((notification: any) => {
                notification.dismiss()
            })
        })

        headerBox.append(btn)
        this.notificationCenterBox.append(headerBox)
    }

    public getWidget(): Gtk.Box {
        return this.notificationCenterBox
    }
}

export default NotificationCenter