import { Gtk } from "ags/gtk4"
import UserHeader from "./sections/UserHeader"
import DesktopControls from "./sections/DesktopControls"
import Bar from "../../Bar"
import MusicPlayer from "./sections/MusicPlayer"
import NotificationCenter from "./sections/NotificationCenter"

class Home {
    private box: Gtk.Box

    constructor(bar: Bar) {
        this.box = new Gtk.Box({
            name: "home-box",
            cssClasses: ["home-box", bar.isLeft() ? "home-box-left" : "home-box-right"],
            orientation: Gtk.Orientation.VERTICAL,
        })

        this.box.append(new UserHeader(bar).getWidget())
        this.box.append(new DesktopControls(bar).getWidget())
        this.box.append(new MusicPlayer(bar).getWidget())
        this.box.append(new NotificationCenter(bar).getWidget())
    }

    public getWidget(): Gtk.Box {
        return this.box
    }
}

export default Home