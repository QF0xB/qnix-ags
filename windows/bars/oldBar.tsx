import app from "ags/gtk4/app"
import { Astal, Gtk, Gdk } from "ags/gtk4"
import { execAsync } from "ags/process"
import { createPoll } from "ags/time"

export default function Bar(gdkmonitor: Gdk.Monitor, wide: boolean) {
  const time = createPoll("", 1000, "date +\"%H:%M\"")
  const { TOP, LEFT, BOTTOM } = Astal.WindowAnchor

  return (
    <window
      visible
      name={wide ? "bar-wide" : "bar-condensed"}
      class={wide ? "bar-wide" : "bar-condensed"}
      gdkmonitor={gdkmonitor}
      exclusivity={Astal.Exclusivity.EXCLUSIVE}
      anchor={TOP | LEFT | BOTTOM}
      application={app}
    >
      <box
        orientation={Gtk.Orientation.VERTICAL}
        class="bar-shell"
        spacing={wide ? 12 : 8}
        marginTop={wide ? 16 : 12}
        marginBottom={wide ? 16 : 12}
        marginStart={wide ? 10 : 6}
        marginEnd={0}
        homogeneous={false}
      >
        {/* Top: launcher/menu */}
        <button
          onClicked={() =>
            execAsync("rofi -show drun").catch(err => print(String(err)))
          }
          vexpand={false}
          valign={Gtk.Align.START}
          hexpand={false}
          halign={Gtk.Align.CENTER}
        >
          <label label="" />
        </button>

        {/* Spacer above middle */}
        <box vexpand hexpand />

        {/* Middle: placeholder for workspaces or other widgets */}
        <box
          orientation={Gtk.Orientation.VERTICAL}
          spacing={6}
          vexpand={false}
          hexpand
          halign={Gtk.Align.CENTER}
          valign={Gtk.Align.CENTER}
        >
          <label label="WS1" />
          <label label="WS2" />
          <label label="WS3" />
        </box>

        {/* Spacer below middle */}
        <box vexpand hexpand />

        {/* Bottom: clock */}
        <button
          vexpand={false}
          halign={Gtk.Align.CENTER}
          valign={Gtk.Align.END}
        >
          <label label={time} />
        </button>
      </box>
    </window>
  )
}
