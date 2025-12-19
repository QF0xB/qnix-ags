import { Accessor, createState, Setter } from "gnim"

/** Menus */
export const [clockMenuState, setClockMenuState]: [Accessor<boolean>, Setter<boolean>] = createState(false)
export const [audioMenuState, setAudioMenuState]: [Accessor<boolean>, Setter<boolean>] = createState(false)

/** Bar revealers */
export const [trayState, setTrayState]: [Accessor<boolean>, Setter<boolean>] = createState(false)

/** Sidebar */
export const [sideBarState, setSideBarState]: [Accessor<boolean>, Setter<boolean>] = createState(false)
// Current sidebar shown (home, appLauncher, settings)
export const [sideBarShownState, setSideBarShownState]: [Accessor<string>, Setter<string>] = createState('home')

/** Connectors */
sideBarState.subscribe((): void => {
    const value = sideBarState()

    setClockMenuState(false) // Close clock menu on sidebar toggle
    if (!value) {
        setSideBarShownState('home') // Reset sidebar to home on close
    }
})
