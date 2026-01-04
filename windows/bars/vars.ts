import { Accessor, createState, Setter } from "gnim"

class Vars {
    clockMenuState: [Accessor<boolean>, Setter<boolean>]
    audioMenuState: [Accessor<boolean>, Setter<boolean>]
    trayState: [Accessor<boolean>, Setter<boolean>]
    sideBarState: [Accessor<boolean>, Setter<boolean>]
    sideBarShownState: [Accessor<string>, Setter<string>]
    sideBarWidth: [Accessor<number>, Setter<number>]

    constructor() {
        this.clockMenuState = createState(false)
        this.audioMenuState = createState(false)
        this.trayState = createState(false)
        this.sideBarState = createState(false)
        this.sideBarShownState = createState('home')
        this.sideBarWidth = createState(0)

        this.subscribers()
    }

    private subscribers(): void {
        this.clockMenuState[0].subscribe(() => {
            console.log('clock menu state changed to', this.clockMenuState[0]())
        })
        this.audioMenuState[0].subscribe(() => {
            console.log('audio menu state changed to', this.audioMenuState[0]())
        })
        this.trayState[0].subscribe(() => {
            console.log('tray state changed to', this.trayState[0]())
        })
        this.sideBarState[0].subscribe(() => {
            console.log('side bar state changed to', this.sideBarState[0]())
            
            if (!this.sideBarState[0]()) {
                this.sideBarShownState[1]('home')
            }
        })
        this.sideBarShownState[0].subscribe(() => {
            console.log('side bar shown state changed to', this.sideBarShownState[0]())
        })
        this.sideBarWidth[0].subscribe(() => {
            console.log('side bar width changed to', this.sideBarWidth[0]())
        })
    }

    // Clock Menu
    public getClockMenuState(): [Accessor<boolean>, Setter<boolean>] {
        return this.clockMenuState
    }

    public getClockMenuStateAccessor(): Accessor<boolean> {
        return this.clockMenuState[0]
    }

    public getClockMenuStateSetter(): Setter<boolean> {
        return this.clockMenuState[1]
    }

    public toggleClockMenuState(): boolean {
        const currentState = this.getClockMenuStateAccessor()()
        this.getClockMenuStateSetter()(!currentState)
        return !currentState
    }

    // Audio Menu
    public getAudioMenuState(): [Accessor<boolean>, Setter<boolean>] {
        return this.audioMenuState
    }

    public getAudioMenuStateAccessor(): Accessor<boolean> {
        return this.audioMenuState[0]
    }

    public getAudioMenuStateSetter(): Setter<boolean> {
        return this.audioMenuState[1]
    }

    public toggleAudioMenuState(): boolean {
        const currentState = this.getAudioMenuStateAccessor()()
        this.getAudioMenuStateSetter()(!currentState)
        return !currentState
    }

    // Tray
    public getTrayState(): [Accessor<boolean>, Setter<boolean>] {
        return this.trayState
    }

    public getTrayStateAccessor(): Accessor<boolean> {
        return this.trayState[0]
    }

    public toggleTrayState(): boolean {
        const currentState = this.getTrayStateAccessor()()
        this.getTrayStateSetter()(!currentState)
        return !currentState
    }

    public getTrayStateSetter(): Setter<boolean> {
        return this.trayState[1]
    }

    // Side Bar
    public getSideBarState(): [Accessor<boolean>, Setter<boolean>] {
        return this.sideBarState
    }

    public getSideBarStateAccessor(): Accessor<boolean> {
        return this.sideBarState[0]
    }

    public getSideBarStateSetter(): Setter<boolean> {
        return this.sideBarState[1]
    }

    public toggleSideBarState(): boolean {
        const currentState = this.getSideBarStateAccessor()()
        this.getSideBarStateSetter()(!currentState)
        return !currentState
    }

    public getSideBarShownState(): [Accessor<string>, Setter<string>] {
        return this.sideBarShownState
    }

    public getSideBarShownStateAccessor(): Accessor<string> {
        return this.sideBarShownState[0]
    }

    public getSideBarShownStateSetter(): Setter<string> {
        return this.sideBarShownState[1]
    }

    public getSideBarWidth(): [Accessor<number>, Setter<number>] {
        return this.sideBarWidth
    }

    public getSideBarWidthAccessor(): Accessor<number> {
        return this.sideBarWidth[0]
    }

    public getSideBarWidthSetter(): Setter<number> {
        return this.sideBarWidth[1]
    }
}

export default Vars