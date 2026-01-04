import GLib from "gi://GLib";

const CONFIG_DIR = GLib.get_user_config_dir();
const ENV_PATH = GLib.build_filenamev([CONFIG_DIR, "ags-env", "env.json"]);


class Env {
    private displays: Display[]
    private laptop: boolean
    private hideBorderTrail: boolean
    
    constructor() {
        this.displays = []
        this.laptop = false
        this.hideBorderTrail = true

        try {
            const [ok, bytes] = GLib.file_get_contents(ENV_PATH);
            if (ok) {
                const decoder = new TextDecoder();
                const jsonString = decoder.decode(bytes);
                const parsed = JSON.parse(jsonString) as { displays?: Display[], laptop?: boolean, hideBorderTrail?: boolean };
                
                // Assign parsed values to instance properties
                if (parsed.displays) {
                    this.displays = parsed.displays;
                }
                if (parsed.laptop !== undefined) {
                    this.laptop = parsed.laptop;
                }

                if (parsed.hideBorderTrail !== undefined) {
                    this.hideBorderTrail = parsed.hideBorderTrail;
                }
            }
        } catch (e) {
            console.error("Failed to read AGS environment file:", e);
        }
    }

    public getDisplays(): Display[] {
        return this.displays
    }

    public getDisplay(connector: string): Display | undefined {
        return this.displays.find(display => display.connector === connector)
    }

    public getCondensedDisplays(): Display[] {
        return this.displays.filter(display => display.condensed)
    }

    public getNonCondensedDisplays(): Display[] {
        return this.displays.filter(display => !display.condensed)
    }

    public getLaptop(): boolean {
        return this.laptop
    }

    public getHideBorderTrail(): boolean {
        return this.hideBorderTrail
    }
}

type Display = {
    connector: string
    left: boolean
    condensed: boolean
}

export default Env;