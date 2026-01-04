import { Gtk } from "ags/gtk4"
import { interval, timeout, Timer } from "ags/time"
import Bar from "../Bar"
import { Destroyable } from "../../../utils/Destroyable"

export abstract class BarModule extends Destroyable {
    protected bar: Bar

    /**
     * Constructor.
     * @param bar - The bar instance.
     */
    constructor(bar: Bar) {
        super()
        this.bar = bar
    }

    /**
     * Get the bar instance.
     * @returns The bar instance.
     */
    public getBar(): Bar {
        return this.bar
    }
}