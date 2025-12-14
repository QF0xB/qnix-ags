import { Gtk } from 'ags/gtk4'

export interface ButtonProps {
    class?: string
    onClicked?: () => void
    label?: string
}

/**
 * Create a QButton (custom button with pointer cursor support)
 * Automatically sets cursor to 'pointer' on hover and 'default' on leave
 * 
 * Note: Can't extend Gtk.Button in GJS, so this is a factory function
 * that returns a configured Gtk.Button instance.
 */
export function QButton(props: ButtonProps = {}): Gtk.Button {
    const button = new Gtk.Button()
    
    // Apply CSS class
    if (props.class) {
        button.add_css_class(props.class)
    }
    
    // Connect click handler
    if (props.onClicked) {
        button.connect('clicked', props.onClicked)
    }
    
    // Setup cursor using GTK4 EventControllerMotion
    const motionController = new Gtk.EventControllerMotion()
    motionController.connect('enter', () => {
        button.set_cursor_from_name('pointer')
    })
    motionController.connect('leave', () => {
        button.set_cursor_from_name('default')
    })
    button.add_controller(motionController)
    
    // Add label if provided
    if (props.label) {
        const label = new Gtk.Label({ label: props.label })
        button.set_child(label)
    }
    
    return button
}

