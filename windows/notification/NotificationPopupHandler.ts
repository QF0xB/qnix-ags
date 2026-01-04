import { Astal, Gdk, Gtk } from "ags/gtk4"
import App from "ags/gtk4/app"

// @ts-ignore: No type definitions for native module
import AstalNotifd from "gi://AstalNotifd"
const notifd = AstalNotifd.get_default()

import Env from "../../env"
import NotificationPopupList from "./NotificationPopupList"
import Notification from "../../utils/Notification"

class NotificationPopupHandler {
    private window: Astal.Window
    private env: Env
    private left: boolean
    private condensed: boolean

    private popupList: NotificationPopupList

    constructor(gdkmonitor: Gdk.Monitor, env: Env) {
        this.env = env
        this.left = env.getDisplay(gdkmonitor.get_connector() ?? "")?.left ?? true
        this.condensed = env.getDisplay(gdkmonitor.get_connector() ?? "")?.condensed ?? false

        this.window = new Astal.Window({
            visible: true,
            name: "notification-window",
            title: "Notification",
            gdkmonitor: gdkmonitor,
            anchor: Astal.WindowAnchor.TOP | (this.left ? Astal.WindowAnchor.RIGHT : Astal.WindowAnchor.LEFT),
            application: App,
            layer: Astal.Layer.OVERLAY,
            exclusivity: Astal.Exclusivity.NORMAL,
        })

        this.popupList = new NotificationPopupList(this)

        // "notified" argument signature differs across bindings; handle both cases:
        // - (notifd, notification)
        // - (notifd, id, replaced)
        notifd.connect('notified', (...args: any[]) => {
            if (notifd.get_dont_disturb()) {
                return
            }
            
            let n: AstalNotifd.Notification | null = null

            // Try to find a Notification object in args
            for (const a of args) {
                if (a && typeof a.get_id === "function") {
                    n = a as AstalNotifd.Notification
                    break
                }
            }

            // Otherwise, try to find an id and look it up
            if (!n) {
                const maybeId = args.find(a => typeof a === "number") as number | undefined
                if (typeof maybeId === "number") {
                    n = notifd.get_notification(maybeId) ?? null
                }
            }

            if (n) {
                this.popupList.addNotification(new Notification(n))
            }
        })

        notifd.connect('resolved', (...args: any[]) => {
            const maybeId = args.find(a => typeof a === "number") as number | undefined
            if (typeof maybeId === "number") {
                this.popupList.removeNotification(maybeId.toString())
            }
        })

        this.window.set_child(this.popupList.getWidget())
    }

    public handleNotification(notification: AstalNotifd.Notification): void {
        console.log("Handling notification", notification)
    }

    public getWindow(): Astal.Window {
        return this.window
    }

    public getCondensed(): boolean {
        return this.condensed
    }

    public destroy(): void {
        this.window.destroy()
    }
}

export default NotificationPopupHandler