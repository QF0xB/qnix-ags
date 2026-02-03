import Gtk from "gi://Gtk"
import Notification from "../../utils/Notification"
import NotificationPopupHandler from "./NotificationPopupHandler"
import { Destroyable } from "../../utils/Destroyable"
import { debugLog } from "../../utils/debug"

class NotificationPopupList extends Destroyable {
    private notificationPopupHandler: NotificationPopupHandler
    private popups: Map<string, Notification> = new Map()
    private widget: Gtk.Box

    constructor(notificationPopupHandler: NotificationPopupHandler) {
        super()
        this.notificationPopupHandler = notificationPopupHandler

        this.widget = new Gtk.Box({
            name: "notification-popups",
            cssClasses: ["notification-popups"],
            marginTop: notificationPopupHandler.getCondensed() ? 12 : 20,
            marginEnd: notificationPopupHandler.getCondensed() ? 12 : 20,
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 8,
        })

        this.update()
    }

    private update(): void {
        while (this.widget.get_first_child() !== null) {
            this.widget.remove(this.widget.get_first_child() as Gtk.Widget)
        }

        for (const notification of this.popups.values()) {
            const notificationWidget = notification.getWidget()

            if (notificationWidget) {

                const gesture = new Gtk.GestureClick()
                this.connectSafe(gesture, 'released', () => {
                    this.removeNotification(notification.getId())
                })
                notificationWidget.add_controller(gesture)

                this.widget.append(notificationWidget)
            }
        }

        if (this.popups.size === 0) {
            this.widget.set_visible(false)
            this.notificationPopupHandler.getWindow().set_visible(false)
        } else {
            this.widget.set_visible(true)
            this.notificationPopupHandler.getWindow().set_visible(true)
        }

        this.widget.queue_resize()
    }

    public addNotification(notification: Notification): void {
        const id = notification.getId()
        if (this.popups.has(id)) {
            return
        }
        this.popups.set(id, notification)

        const timeout = notification.getNotification().get_expire_timeout()
        debugLog("Timeout for notification", id, "is", timeout)
        if(timeout && timeout > 0) {
            debugLog("Setting timeout for notification", id)
            debugLog(notification.getNotification().get_expire_timeout())
            this.setTimeoutSafe(() => this.removeNotification(id), notification.getNotification().get_expire_timeout())
        }
        
        this.connectSafe(notification.getNotification(), 'dismissed', () => this.removeNotification(id))

        this.update()
    }

    public removeNotification(id: string): void {
        const notification = this.popups.get(id)
        if (notification) {
            notification.destroy()
            this.popups.delete(id)
        }

        this.update()
    }

    public getWidget(): Gtk.Box {
        return this.widget
    }

    public getNotifications(): Notification[] {
        return Array.from(this.popups.values())
    }
}

export default NotificationPopupList