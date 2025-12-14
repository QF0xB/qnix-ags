import GLib from "gi://GLib";

const CONFIG_DIR = GLib.get_user_config_dir();
const ENV_PATH = GLib.build_filenamev([CONFIG_DIR, "ags-env", "env.json"]);

type Displays = {
    large: string[]
    small: string[]
}

export type Env = {
    displays: Displays
}

let env: Env = {
    displays: {
        large: [],
        small: [],
    }
}

try {
    const [ok, bytes] = GLib.file_get_contents(ENV_PATH);
    if (ok) {
        env = JSON.parse(bytes.toString());
    }
} catch (e) {
    console.error("Failed to read AGS environment file:", e);
}

export default env;