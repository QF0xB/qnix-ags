import { Gtk } from "ags/gtk4"
import { interval, timeout, Timer } from "ags/time"

export abstract class Destroyable {
    protected signalHandlers: Array<{ object: any, handler: number }> = []
    protected timerTracker: Timer[] = []
    protected destroyed: boolean = false

    /**
     * Connect a signal to the object safely.
     * @param object 
     * @param signal - The signal to connect to.
     * @param callback - The callback to call when the signal is emitted.
     * @returns The handler ID.
     */
    protected connectSafe<T extends { connect: (signal: string, callback: (...args: any[]) => void) => number }>(
        object: T,
        signal: string,
        callback: (...args: any[]) => void
    ): number {
        if (this.isDestroyed()) {
            throw new Error("Cannot connect signal after module has been destroyed")
        }
        const handler = object.connect(signal, callback)
        this.signalHandlers.push({ object, handler })
        return handler
    }

    /**
     * Set a interval timer safely.
    * 
    * @param callback - The callback to call when the interval is reached.
    * @param delay - The delay in milliseconds.
    * @returns The timer.
    * 
    * @throws Error if the module has been destroyed or if the delay is not greater than 0.
    */
    protected setIntervalSafe(callback: () => void, delay: number): Timer {
        if (this.isDestroyed()) {
            throw new Error("Cannot set interval after module has been destroyed")
        }

        if (delay <= 0) {
            throw new Error("Delay must be greater than 0")
        }

        const timer = interval(delay, callback)
        this.timerTracker.push(timer)
        return timer
    }

    /**
     * Set a timeout timer safely.
     * 
     * @param callback - The callback to call when the timeout is reached.
     * @param delay - The delay in milliseconds.
     * @returns The timer.
     * 
     * @throws Error if the module has been destroyed or if the delay is not greater than 0.
     */
    protected setTimeoutSafe(callback: () => void, delay: number): Timer {
        if (this.isDestroyed()) {
            throw new Error("Cannot setTimeout after module has been destroyed")
        }

        if (delay <= 0) {
            throw new Error("Delay must be greater than 0")
        }

        const timer = timeout(delay, callback)
        this.timerTracker.push(timer)
        return timer
    }

    /**
     * Cancel a timer safely.
     * 
     * @param timer - The timer to cancel.
     * 
     * @throws Error if the module has been destroyed or if the timer is not a valid timer.
     */
    protected cancelTimerSafe(timer: Timer): void {
        if (this.isDestroyed()) {
            throw new Error("Cannot cancel timer after module has been destroyed")
        }

        if (!this.timerTracker.includes(timer)) {
            throw new Error("Timer is not a valid timer")
        }

        timer.cancel()
        this.timerTracker = this.timerTracker.filter((t) => t !== timer)
    }

    /**
     * Disconnect a signal safely.
     * 
     * @param object - The object to disconnect the signal from.
     * @param handler - The handler to disconnect.
     * 
     * @throws Error if the module has been destroyed.
     */
    protected disconnectSafe(object: any, handler: number): void {
        if (this.isDestroyed()) {
            throw new Error("Cannot disconnect signal after module has been destroyed")
        }

        object.disconnect(handler)
    }

    /**
     * Disconnect all signals safely.
     * 
     * @throws Error if the module has been destroyed.
     */
    protected disconnectAllSafe(): void {
        if (this.isDestroyed()) {
            throw new Error("Cannot disconnect signals after module has been destroyed")
        }

        this.signalHandlers.forEach(({ object, handler }) => {
            this.disconnectSafe(object, handler)
        })
    }

    /**
     * Destroy the module.
     * 
     * Disconnect all signals and set the destroyed flag to true.
     */
    public destroy(): void {
        if (this.isDestroyed()) {
            throw new Error("Cannot destroy module that has already been destroyed")
        }
        this.signalHandlers.forEach(({ object, handler }) => {
            try {
                if (object && typeof object.disconnect === 'function') {
                    object.disconnect(handler)
                }
            } catch (error) {
                console.error("Error disconnecting signal", error)
            }
        })

        this.timerTracker.forEach((timer) => {
            this.cancelTimerSafe(timer)
        })

        this.destroyed = true
        this.signalHandlers = []
        this.timerTracker = []

        this.onDestroy()
    }

    /**
     * Called when the module is destroyed.
     */
    public onDestroy(): void {
        // Override in subclass to perform custom cleanup
    }

    /**
     * Get the main widget of the module.
     * 
     * Must be implemented by the subclass.
     * @returns The main widget of the module.
     */
    public abstract getWidget(): Gtk.Widget

    /**
     * Check if the module has been destroyed.
     * @returns True if the module has been destroyed, false otherwise.
     */
    public isDestroyed(): boolean {
        return this.destroyed
    }
}