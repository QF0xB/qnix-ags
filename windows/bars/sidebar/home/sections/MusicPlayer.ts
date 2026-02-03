import Bar from "../../../Bar"
import { BarModule } from "../../../module/BarModule"
import { debugLog } from "../../../../../utils/debug"
import { Gdk, Gtk } from "ags/gtk4"
import GLib from "gi://GLib"

// @ts-ignore Ignore type errors for AstalMpris
import AstalMpris from "gi://AstalMpris"
import { timeout } from "ags/time"
import Pango from "gi://Pango?version=1.0"

const mpris = AstalMpris.get_default()

class MusicPlayer extends BarModule {
    private musicBox: Gtk.Box
    private players: Map<string, AstalMpris.Player>
    private progressIntervals: Map<string, any> = new Map() // Track progress intervals per player

    // General structure
    // arrow | section | arrow
    // section contains:
    // - metadata box
    // - paned (art cover on left, song data on right)
    // - indicator dots

    private mprisStack: Gtk.Stack
    private leftArrow: Gtk.Button
    private rightArrow: Gtk.Button

    private playerOrder: string[] = []
    private currentPlayerIndex: number = 0
    private indicatorDots: Gtk.Box
    private dotButtons: Map<string, Gtk.Button> = new Map()

    constructor(bar: Bar) {
        super(bar)

        this.players = new Map<string, AstalMpris.Player>()

        this.musicBox = new Gtk.Box({
            name: "sidebar-music-box",
            cssClasses: ["sidebar-music-box"],
            orientation: Gtk.Orientation.VERTICAL,
            halign: Gtk.Align.FILL,
            spacing: 4,
        })

        // Horizontal container for arrows and section
        const horizontalBox = new Gtk.Box({
            name: "sidebar-music-horizontal",
            cssClasses: ["sidebar-music-horizontal"],
            orientation: Gtk.Orientation.HORIZONTAL,
            halign: Gtk.Align.FILL,
            spacing: 4,
        })

        // Left arrow button - outside the section
        this.leftArrow = new Gtk.Button({
            name: "mpris-arrow-left",
            cssClasses: ["mpris-arrow", "mpris-arrow-left"],
            cursor: Gdk.Cursor.new_from_name("pointer", null),
            label: "◀",
            halign: Gtk.Align.CENTER,
            valign: Gtk.Align.CENTER,
            hexpand: false,
        })

        this.connectSafe(this.leftArrow, 'clicked', () => this.navigatePrevious())

        // Section box that contains only the stack
        const sectionBox = new Gtk.Box({
            name: "sidebar-music-section",
            cssClasses: ["sidebar-music-section"],
            orientation: Gtk.Orientation.HORIZONTAL,
            hexpand: true, // Expand to fill available space
        })

        // Stack for player content
        this.mprisStack = new Gtk.Stack({
            name: "mpris-stack",
            cssClasses: ["mpris-stack"],
            halign: Gtk.Align.FILL,
            hexpand: true,
            vexpand: false,
            transition_type: Gtk.StackTransitionType.SLIDE_LEFT_RIGHT,
            transition_duration: 200,
        })

        sectionBox.append(this.mprisStack)

        // Right arrow button - outside the section
        this.rightArrow = new Gtk.Button({
            name: "mpris-arrow-right",
            cssClasses: ["mpris-arrow", "mpris-arrow-right"],
            cursor: Gdk.Cursor.new_from_name("pointer", null),
            label: "▶",
            halign: Gtk.Align.CENTER,
            valign: Gtk.Align.CENTER,
            hexpand: false,
        })

        this.connectSafe(this.rightArrow, 'clicked', () => this.navigateNext())

        // Indicator dots container - outside the section
        this.indicatorDots = new Gtk.Box({
            name: "mpris-indicator-dots",
            cssClasses: ["mpris-indicator-dots"],
            orientation: Gtk.Orientation.HORIZONTAL,
            halign: Gtk.Align.CENTER,
            spacing: 4,
        })

        // arrow | section | arrow
        horizontalBox.append(this.leftArrow)
        horizontalBox.append(sectionBox)
        horizontalBox.append(this.rightArrow)

        this.musicBox.append(horizontalBox)
        this.musicBox.append(this.indicatorDots)

        // Initialize MPRIS handlers
        this.mprisHandlers()

        // Load initial players
        this.loadInitialPlayers()

        // Subscribe to sidebar state changes to pause/resume progress updates
        this.setupSidebarStateListener()
    }

    private setupSidebarStateListener(): void {
        this.getBar().getVars().getSideBarStateAccessor().subscribe(() => {
            const isOpen = this.getBar().getVars().getSideBarStateAccessor()()
            if (!isOpen) {
                // Sidebar closed - stop all progress updates
                this.stopAllProgressUpdates()
            }
        })
    }

    private stopAllProgressUpdates(): void {
        this.progressIntervals.forEach((interval, _) => {
            if (interval) {
                this.cancelTimerSafe(interval)
            }
        })
        this.progressIntervals.clear()
    }

    private mprisHandlers(): void {
        this.connectSafe(mpris, 'player-added', (_: any, player: any) => {
            this.registerPlayer(player)
        })

        this.connectSafe(mpris, 'player-closed', (_: any, player: any) => {
            this.unregisterPlayer(player)
        })
    }

    private loadInitialPlayers(): void {
        try {
            const players = mpris.get_players()
            for (const player of players) {
                try {
                    this.registerPlayer(player)
                } catch (err) {
                    console.error("Error registering initial player:", err)
                }
            }
            this.updateNavigationButtons()
        } catch (err) {
            console.error("Error loading initial players:", err)
        }
    }

    private registerPlayer(player: AstalMpris.Player): void {
        try {
            const identity = player.get_identity()
            if (this.players.has(identity)) {
                return // Already registered
            }

            this.players.set(identity, player)
            this.playerOrder.push(identity)

            // Create player widget (placeholder for now)
            const playerWidget = this.createPlayerWidget(player)
            this.mprisStack.add_named(playerWidget, identity)

            // Create indicator dot for this player
            this.createIndicatorDot(identity)

            // Show the first player if this is the first one
            if (this.playerOrder.length === 1) {
                this.mprisStack.set_visible_child_name(identity)
                this.currentPlayerIndex = 0
            }

            // Volume updates are now handled in createControlsBox
            this.updateNavigationButtons()
            this.updateIndicatorDots()
            debugLog("player added:", identity)
        } catch (err) {
            console.error("Error registering player:", err)
        }
    }

    private unregisterPlayer(player: AstalMpris.Player): void {
        try {
            const identity = player.get_identity()
            const index = this.playerOrder.indexOf(identity)

            if (index !== -1) {
                this.playerOrder.splice(index, 1)

                // Adjust current index if needed
                if (this.currentPlayerIndex >= this.playerOrder.length) {
                    this.currentPlayerIndex = Math.max(0, this.playerOrder.length - 1)
                } else if (index < this.currentPlayerIndex) {
                    this.currentPlayerIndex--
                }

                // Remove from stack
                const widget = this.mprisStack.get_child_by_name(identity)
                if (widget) {
                    this.mprisStack.remove(widget)
                }

                // Remove indicator dot
                this.removeIndicatorDot(identity)

                // Stop and remove progress interval for this player
                const progressInterval = this.progressIntervals.get(identity)
                if (progressInterval) {
                    this.cancelTimerSafe(progressInterval)
                    this.progressIntervals.delete(identity)
                }

                // Show next available player
                if (this.playerOrder.length > 0) {
                    this.mprisStack.set_visible_child_name(this.playerOrder[this.currentPlayerIndex])
                }
            }

            this.players.delete(identity)
            this.updateNavigationButtons()
            this.updateIndicatorDots()
            debugLog("player closed:", identity)
        } catch (err) {
            console.error("Error unregistering player:", err)
        }
    }

    private createPlayerWidget(player: AstalMpris.Player): Gtk.Widget {
        // Main vertical container
        const mainBox = new Gtk.Box({
            name: "sidebar-music-player-box-" + player.get_identity(),
            cssClasses: ["sidebar-music-player-box"],
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 8,
            hexpand: true,
            vexpand: false,
        })

        try {
            // Top row: metadata (name, artist) - full width
            mainBox.append(this.createMetadataBox(player))

            // Bottom section: image on left, controls on right
            const paned = new Gtk.Paned({
                name: "mpris-paned-" + player.get_identity(),
                cssClasses: ["mpris-paned"],
                orientation: Gtk.Orientation.HORIZONTAL,
                shrink_start_child: false,
                shrink_end_child: false,
                resize_start_child: false,
                resize_end_child: false,
            })

            const artCover = new Gtk.Picture({
                name: "mpris-art-cover-" + player.get_identity(),
                cssClasses: ["mpris-art-cover"],
                halign: Gtk.Align.FILL,
                valign: Gtk.Align.FILL,
                content_fit: Gtk.ContentFit.FILL,
                hexpand: true,
                vexpand: true,
            })

            const controlsBox = this.createControlsBox(player)

            paned.set_start_child(artCover)
            paned.set_end_child(controlsBox)

            // Block all pointer events on the paned to prevent dragging
            const gesture = new Gtk.GestureClick()
            gesture.set_button(0) // All mouse buttons
            gesture.connect('pressed', () => {
                // Prevent default behavior
                return true
            })
            paned.add_controller(gesture)

            // Set paned position to 50/50 split
            this.connectSafe(paned, 'realize', () => {
                timeout(200, () => {
                    const width = paned.get_allocated_width()
                    if (width > 0) {
                        paned.set_position(width / 2) // 50/50 split
                    }
                })
            })

            // Update position when width changes to maintain 50/50 split
            // Also reset position if user tries to drag
            this.connectSafe(paned, 'notify::allocated-width', () => {
                const width = paned.get_allocated_width()
                if (width > 0) {
                    paned.set_position(width / 2) // 50/50 split
                }
            })

            // Reset position if it changes (user tried to drag)
            this.connectSafe(paned, 'notify::position', () => {
                const width = paned.get_allocated_width()
                const position = paned.get_position()
                if (width > 0 && Math.abs(position - width / 2) > 1) {
                    // Position changed from 50/50, reset it
                    paned.set_position(width / 2)
                }
            })

            mainBox.append(paned)

            const updateArtCover = () => {
                const artUrl = player.get_art_url()

                if (!artUrl) return

                // Wait for widget to be realized before applying CSS
                if (!artCover.get_realized()) {
                    debugLog("widget not realized, waiting for realize")
                    artCover.connect('realize', () => updateArtCover())
                    return
                }

                if (artUrl) {
                    if (artUrl.startsWith('file://')) {
                        try {
                            const filePath = GLib.filename_from_uri(artUrl)[0]
                            artCover.set_filename(filePath)
                        } catch (err) {
                            console.error("Error loading image:", err)
                        }
                    } else {
                        artCover.set_filename(artUrl)
                    }
                }
            }

            updateArtCover()
            this.connectSafe(player, 'notify::art-url', () => updateArtCover())

            debugLog("art url:", player.get_art_url())
        } catch (err) {
            console.error("Error creating player widget:", err)
        }

        return mainBox
    }

    private createMetadataBox(player: AstalMpris.Player): Gtk.Box {
        const box = new Gtk.Box({
            name: "sidebar-music-meta-data-box-" + player.get_identity(),
            cssClasses: ["sidebar-music-meta-data-box"],
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 0,
            halign: Gtk.Align.FILL,
            hexpand: true,
        })

        const titleLabel = new Gtk.Label({
            name: "mpris-title-" + player.get_identity(),
            cssClasses: ["mpris-title"],
            halign: Gtk.Align.CENTER,
            hexpand: true,
            vexpand: false,
            max_width_chars: 20,
            ellipsize: Pango.EllipsizeMode.END,
            has_tooltip: true,
        })

        const artistLabel = new Gtk.Label({
            name: "mpris-artist-" + player.get_identity(),
            cssClasses: ["mpris-artist"],
            halign: Gtk.Align.CENTER,
            hexpand: true,
            vexpand: false,
            max_width_chars: 26,
            ellipsize: Pango.EllipsizeMode.END,
            has_tooltip: true,
        })

        const updateSongData = () => {
            try {
                const title = player.get_title() || "Unknown Title"
                const artist = player.get_artist() || "Unknown Artist"

                titleLabel.set_text(title)
                artistLabel.set_text(artist)

                // Set tooltip with full text
                titleLabel.set_tooltip_text(title)
                artistLabel.set_tooltip_text(artist)
            } catch (err) {
                console.error("Error getting metadata:", err)
                titleLabel.set_text("Unknown")
                artistLabel.set_text("Unknown")
            }
        }

        this.connectSafe(player, 'notify::title', () => updateSongData())
        this.connectSafe(player, 'notify::artist', () => updateSongData())
        this.connectSafe(player, 'notify::album', () => updateSongData())

        updateSongData()

        box.append(titleLabel)
        box.append(artistLabel)

        return box
    }

    private createControlsBox(player: AstalMpris.Player): Gtk.Box {
        const box = new Gtk.Box({
            name: "sidebar-music-controls-box-" + player.get_identity(),
            cssClasses: ["sidebar-music-controls-box"],
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 0,
            hexpand: true,
        })

        const playControlsBox = new Gtk.Box({
            name: "sidebar-music-play-controls-box-" + player.get_identity(),
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 0,
            hexpand: true,
        })

        const volumeControlsBox = new Gtk.Box({
            name: "sidebar-music-volume-controls-box-" + player.get_identity(),
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 4,
            hexpand: true,
        })

        // Progress bar container with time labels above
        const progressContainer = new Gtk.Box({
            name: "sidebar-music-progress-container-" + player.get_identity(),
            cssClasses: ["sidebar-music-progress-container"],
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 2,
            hexpand: true,
        })

        // Time labels container (above the bar)
        const timeLabelsContainer = new Gtk.Box({
            name: "sidebar-music-time-labels-" + player.get_identity(),
            cssClasses: ["sidebar-music-time-labels"],
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 0,
            hexpand: true,
        })

        // Current time label
        const currentTimeLabel = new Gtk.Label({
            name: "sidebar-music-current-time-" + player.get_identity(),
            cssClasses: ["sidebar-music-time-label"],
            label: "0:00",
            halign: Gtk.Align.START,
            hexpand: false,
        })

        // Total duration label
        const totalTimeLabel = new Gtk.Label({
            name: "sidebar-music-total-time-" + player.get_identity(),
            cssClasses: ["sidebar-music-time-label"],
            label: "0:00",
            halign: Gtk.Align.END,
            hexpand: true, // Expand to push to the right
        })

        // Progress bar for song position
        const progressAdjustment = new Gtk.Adjustment({
            lower: 0,
            upper: 100,
            value: 0,
            step_increment: 1,
            page_increment: 10,
        })

        const progressBar = new Gtk.Scale({
            name: "sidebar-music-progress-bar-" + player.get_identity(),
            cssClasses: ["sidebar-music-progress-bar"],
            orientation: Gtk.Orientation.HORIZONTAL,
            adjustment: progressAdjustment,
            draw_value: false,
            hexpand: true,
            vexpand: false,
        })

        // Format seconds to MM:SS (matching reference implementation style)
        // Note: MPRIS get_position() and get_length() return seconds
        const formatTime = (seconds: number): string => {
            if (!seconds || seconds <= 0) return "0:00"
            const roundedSeconds = Math.round(seconds)
            const mins = Math.floor(roundedSeconds / 60)
            const secs = roundedSeconds % 60
            return `${mins}:${String(secs).padStart(2, '0')}`
        }

        // Update progress bar based on player position
        let isUpdatingFromPlayerPosition = false
        let isUpdatingFromProgressBar = false

        const updateProgress = () => {
            if (isUpdatingFromProgressBar) return
            try {
                isUpdatingFromPlayerPosition = true
                const position = player.get_position() || 0
                const length = player.get_length() || 0
                
                // Only update if we have valid values
                if (length > 0) {
                    const progress = (position / length) * 100
                    progressAdjustment.set_value(progress)
                }
                
                // Update time labels (position and length are in seconds)
                currentTimeLabel.set_text(formatTime(position))
                totalTimeLabel.set_text(formatTime(length))
            } catch (err) {
                console.error("Error updating progress:", err)
            } finally {
                isUpdatingFromPlayerPosition = false
            }
        }

        // Update progress periodically while playing
        const playerId = player.get_identity()
        const startProgressUpdates = () => {
            // Check if sidebar is open before starting updates
            if (!this.getBar().getVars().getSideBarStateAccessor()()) {
                return // Don't start if sidebar is closed
            }
            
            // Stop existing interval if any
            const existingInterval = this.progressIntervals.get(playerId)
            if (existingInterval) {
                this.cancelTimerSafe(existingInterval)
            }
            
            const progressInterval = this.setIntervalSafe(() => {
                // Check sidebar state on each update
                if (!this.getBar().getVars().getSideBarStateAccessor()()) {
                    stopProgressUpdates()
                    return
                }
                if (player.get_playback_status() === AstalMpris.PlaybackStatus.PLAYING) {
                    updateProgress()
                }
            }, 250) // Update every 250ms (reduced from 100ms for performance)
            
            this.progressIntervals.set(playerId, progressInterval)
        }

        const stopProgressUpdates = () => {
            const existingInterval = this.progressIntervals.get(playerId)
            if (existingInterval) {
                this.cancelTimerSafe(existingInterval)
                this.progressIntervals.delete(playerId)
            }
        }

        // Connect to playback status changes
        this.connectSafe(player, 'notify::playback-status', () => {
            const status = player.get_playback_status()
            if (status === AstalMpris.PlaybackStatus.PLAYING) {
                startProgressUpdates()
            } else {
                stopProgressUpdates()
            }
        })

        // Connect to position and length changes
        this.connectSafe(player, 'notify::position', () => updateProgress())
        this.connectSafe(player, 'notify::length', () => updateProgress())

        // Connect progress bar changes to seek
        this.connectSafe(progressBar, 'value-changed', () => {
            if (isUpdatingFromPlayerPosition) return
            try {
                isUpdatingFromProgressBar = true
                const progress = progressBar.get_value()
                const length = player.get_length() || 1
                const position = (progress / 100) * length
                player.set_position(position)
            } catch (err) {
                console.error("Error seeking:", err)
            } finally {
                isUpdatingFromProgressBar = false
            }
        })

        // Initial update
        updateProgress()
        if (player.get_playback_status() === AstalMpris.PlaybackStatus.PLAYING) {
            startProgressUpdates()
        }

        const prevButton = new Gtk.Button({
            name: "sidebar-music-prev-button-" + player.get_identity(),
            cssClasses: ["sidebar-music-prev-button", "sidebar-music-control-button"],
            halign: Gtk.Align.CENTER,
            valign: Gtk.Align.CENTER,
            hexpand: true,
            vexpand: false,
            icon_name: "media-skip-backward-symbolic",
            cursor: Gdk.Cursor.new_from_name("pointer", null),
        })

        this.connectSafe(prevButton, 'clicked', () => {
            player.previous()
        })

        const playButton = new Gtk.Button({
            name: "sidebar-music-play-button-" + player.get_identity(),
            cssClasses: ["sidebar-music-play-button", "sidebar-music-control-button"],
            halign: Gtk.Align.CENTER,
            valign: Gtk.Align.CENTER,
            hexpand: true,
            vexpand: false,
            icon_name: "media-playback-start-symbolic",
            cursor: Gdk.Cursor.new_from_name("pointer", null),
        })

        this.connectSafe(playButton, 'clicked', () => {
            player.play_pause()
        })

        const nextButton = new Gtk.Button({
            name: "sidebar-music-next-button-" + player.get_identity(),
            cssClasses: ["sidebar-music-next-button", "sidebar-music-control-button"],
            halign: Gtk.Align.CENTER,
            valign: Gtk.Align.CENTER,
            hexpand: true,
            vexpand: false,
            icon_name: "media-skip-forward-symbolic",
            cursor: Gdk.Cursor.new_from_name("pointer", null),
        })

        this.connectSafe(nextButton, 'clicked', () => {
            player.next()
        })

        const updateControls = () => {
            const state = player.get_playback_status()
            if (state === AstalMpris.PlaybackStatus.PLAYING) {
                playButton.set_icon_name("media-playback-pause-symbolic")
            } else {
                playButton.set_icon_name("media-playback-start-symbolic")
            }
        }

        this.connectSafe(player, 'notify::playback-status', () => updateControls())
        updateControls()

        const volumeAdjustment = new Gtk.Adjustment({
            lower: 0,
            upper: 100,
            value: Math.round(player.get_volume() * 100),
            step_increment: 1,
            page_increment: 10,
        })

        const volumeSlider = new Gtk.Scale({
            name: "sidebar-music-volume-slider-" + player.get_identity(),
            cssClasses: ["sidebar-music-volume-slider"],
            orientation: Gtk.Orientation.HORIZONTAL,
            adjustment: volumeAdjustment,
            draw_value: false,
            hexpand: true,
            vexpand: false,
            sensitive: true, // Make sure it's interactive
        })

        // Flag to prevent feedback loop
        let isUpdatingFromPlayer = false
        let isUpdatingFromSlider = false

        // Connect slider changes to player volume
        this.connectSafe(volumeSlider, 'value-changed', () => {
            if (isUpdatingFromPlayer) return
            try {
                isUpdatingFromSlider = true
                const value = volumeSlider.get_value()
                const volumeValue = Math.max(0, Math.min(1, value / 100)) // Clamp to 0.0-1.0
                
                // Try to set volume - some players may not support this
                // Note: Some MPRIS players (like Chromium/Brave) don't support volume control
                // and will always return 1.0 regardless of what you set
                try {
                    const oldVolume = player.get_volume()
                    player.set_volume(volumeValue)
                    
                    // Small delay to let the change propagate
                    timeout(10, () => {
                        const actualVolume = player.get_volume()
                        if (Math.abs(actualVolume - volumeValue) > 0.01 && Math.abs(actualVolume - oldVolume) < 0.01) {
                            console.warn(`Player ${player.get_identity()} does not support volume control. Volume remains at ${actualVolume}`)
                            // Disable the slider if volume control is not supported
                            volumeSlider.set_sensitive(false)
                        }
                    })
                } catch (setErr) {
                    console.error("Error calling set_volume:", setErr)
                    volumeSlider.set_sensitive(false)
                }
            } catch (err) {
                console.error("Error setting volume:", err)
            } finally {
                isUpdatingFromSlider = false
            }
        })

        // Update slider when player volume changes (but don't trigger value-changed)
        this.connectSafe(player, 'notify::volume', () => {
            if (isUpdatingFromSlider) return // Don't update if we just set it from slider
            try {
                isUpdatingFromPlayer = true
                const volume = player.get_volume()
                const newValue = Math.round(volume * 100)
                // Only update if value actually changed to avoid feedback loop
                if (Math.abs(volumeAdjustment.get_value() - newValue) > 0.5) {
                    volumeAdjustment.set_value(newValue)
                }
            } catch (err) {
                console.error("Error updating volume slider:", err)
            } finally {
                isUpdatingFromPlayer = false
            }
        })

        playControlsBox.append(prevButton)
        playControlsBox.append(playButton)
        playControlsBox.append(nextButton)

        // Add time labels above the progress bar
        timeLabelsContainer.append(currentTimeLabel)
        timeLabelsContainer.append(totalTimeLabel)
        progressContainer.append(timeLabelsContainer)
        progressContainer.append(progressBar)
        volumeControlsBox.append(volumeSlider)

        box.append(progressContainer)
        box.append(playControlsBox)
        box.append(volumeControlsBox)

        return box
    }

    private navigatePrevious(): void {
        if (this.playerOrder.length === 0 || this.currentPlayerIndex === 0) return

        this.currentPlayerIndex--
        const playerId = this.playerOrder[this.currentPlayerIndex]
        this.mprisStack.set_transition_type(Gtk.StackTransitionType.SLIDE_RIGHT)
        this.mprisStack.set_visible_child_name(playerId)
        this.updateNavigationButtons()
        this.updateIndicatorDots()
    }

    private navigateNext(): void {
        if (this.playerOrder.length === 0 || this.currentPlayerIndex >= this.playerOrder.length - 1) return

        this.currentPlayerIndex++
        const playerId = this.playerOrder[this.currentPlayerIndex]
        this.mprisStack.set_transition_type(Gtk.StackTransitionType.SLIDE_LEFT)
        this.mprisStack.set_visible_child_name(playerId)
        this.updateNavigationButtons()
        this.updateIndicatorDots()
    }

    private updateNavigationButtons(): void {
        const hasMultiple = this.playerOrder.length > 1

        // Disable left arrow if at first player, disable right arrow if at last player
        const canGoLeft = hasMultiple && this.currentPlayerIndex > 0
        const canGoRight = hasMultiple && this.currentPlayerIndex < this.playerOrder.length - 1

        this.leftArrow.set_sensitive(canGoLeft)
        this.rightArrow.set_sensitive(canGoRight)
    }

    private createIndicatorDot(playerId: string): void {
        // Get player name for the label
        const player = this.players.get(playerId)
        let playerName = playerId
        if (player) {
            try {
                playerName = player.get_identity()
            } catch (err) {
                console.error("Error getting player identity:", err)
            }
        }

        const dot = new Gtk.Button({
            name: "mpris-dot-" + playerId,
            cssClasses: ["mpris-dot"],
            has_tooltip: false,
            label: playerName,
            cursor: Gdk.Cursor.new_from_name("pointer", null),
        })

        // Make dots clickable to navigate to that player
        this.connectSafe(dot, 'clicked', () => {
            const index = this.playerOrder.indexOf(playerId)
            if (index !== -1 && index !== this.currentPlayerIndex) {
                const oldIndex = this.currentPlayerIndex
                this.currentPlayerIndex = index
                const direction = index > oldIndex
                    ? Gtk.StackTransitionType.SLIDE_LEFT
                    : Gtk.StackTransitionType.SLIDE_RIGHT
                this.mprisStack.set_transition_type(direction)
                this.mprisStack.set_visible_child_name(playerId)
                this.updateNavigationButtons()
                this.updateIndicatorDots()
            }
        })

        this.dotButtons.set(playerId, dot)
        this.indicatorDots.append(dot)
    }

    private removeIndicatorDot(playerId: string): void {
        const dot = this.dotButtons.get(playerId)
        if (dot) {
            this.indicatorDots.remove(dot)
            this.dotButtons.delete(playerId)
        }
    }

    private updateIndicatorDots(): void {
        // Update focused dot (using same class name as workspaces)
        this.dotButtons.forEach((dot, playerId) => {
            const index = this.playerOrder.indexOf(playerId)
            if (index === this.currentPlayerIndex) {
                dot.add_css_class("focused")
            } else {
                dot.remove_css_class("focused")
            }
        })
    }

    private updateVolume(player: AstalMpris.Player): void {
        // Volume is now handled in createControlsBox
        // This method is kept for compatibility but does nothing
    }

    public getWidget(): Gtk.Box {
        return this.musicBox
    }
}

export default MusicPlayer