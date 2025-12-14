import App from 'ags/gtk4/app'
import GLib from 'gi://GLib'
import Gio from 'gi://Gio'

const CONFIG_DIR = GLib.get_user_config_dir()
const TMP = '/tmp'
const LOCAL_STATE = GLib.get_user_state_dir()
const AGS_ENV_DIR = GLib.build_filenamev([CONFIG_DIR, 'ags-env'])

// Detect source directory
function detectSourceDir(): string {
  const configAgs = GLib.build_filenamev([CONFIG_DIR, 'ags'])
  const currentDir = GLib.get_current_dir()
  const configStyles = GLib.build_filenamev([configAgs, 'styles.scss'])
  const currentStyles = GLib.build_filenamev([currentDir, 'styles.scss'])
  
  if (GLib.file_test(currentStyles, GLib.FileTest.EXISTS)) {
    print(`[cssHotReload] Using dev source: ${currentDir}`)
    return currentDir
  }
  
  if (GLib.file_test(configStyles, GLib.FileTest.EXISTS)) {
    print(`[cssHotReload] Using config source: ${configAgs}`)
    return configAgs
  }
  
  print(`[cssHotReload] Warning: styles.scss not found, using: ${currentDir}`)
  return currentDir
}

const SRC = detectSourceDir()

export function compileScss(): string {
  try {
    const [success, stdout, stderr, exitStatus] = GLib.spawn_sync(
      null,
      ['sass', `${SRC}/styles.scss`, `${TMP}/styles.css`, `--load-path=${LOCAL_STATE}`, `--load-path=${AGS_ENV_DIR}`],
      null,
      GLib.SpawnFlags.SEARCH_PATH,
      null
    )
    
    if (!success || exitStatus !== 0) {
      const errorMsg = stderr ? stderr.toString() : 'Unknown error'
      throw new Error(errorMsg)
    }
    
    App.apply_css(`${TMP}/styles.css`)
    return `${TMP}/styles.css`
  } catch(err) {
    print(`[cssHotReload] Error compiling: ${err}`)
    return ''
  }
}

// Hot Reload Setup
(function() {
  print('[cssHotReload] Setting up...')
  
  // Find all SCSS files
  const [success, stdout, stderr, exitStatus] = GLib.spawn_sync(
    null,
    ['find', '-L', SRC, '-path', '*/.direnv', '-prune', '-o', '-iname', '*.scss', '-print'],
    null,
    GLib.SpawnFlags.SEARCH_PATH,
    null
  )
  
  if (!success || exitStatus !== 0) {
    print(`[cssHotReload] Error finding SCSS files: ${stderr?.toString()}`)
    return
  }
  
  const scssFiles = stdout.toString()
    .split('\n')
    .filter(f => f.trim() !== '')
  
  print(`[cssHotReload] Found ${scssFiles.length} SCSS files`)
  
  // Initial compilation
  compileScss()
  print(`[cssHotReload] Initial compilation complete`)
  
  // Debounce timer
  let recompileTimer: number | null = null
  const scheduleRecompile = () => {
    if (recompileTimer !== null) {
      GLib.source_remove(recompileTimer)
    }
    recompileTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 200, () => {
      compileScss()
      recompileTimer = null
      return false
    })
  }
  
  // Watch files - store both monitors and files to prevent GC
  const monitorRefs: { monitor: Gio.FileMonitor; file: Gio.File }[] = []
  
  scssFiles.forEach(file => {
    const normalizedFile = GLib.canonicalize_filename(file, null) || file
    if (!GLib.file_test(normalizedFile, GLib.FileTest.EXISTS)) {
      return
    }
    
    const gfile = Gio.File.new_for_path(normalizedFile)
    try {
      const monitor = gfile.monitor_file(Gio.FileMonitorFlags.NONE, null)
      
      // Store both monitor and file to prevent garbage collection
      monitorRefs.push({ monitor, file: gfile })
      
      monitor.connect('changed', (
        _monitor: Gio.FileMonitor,
        _file: Gio.File,
        _otherFile: Gio.File | null,
        eventType: Gio.FileMonitorEvent
      ) => {
        if (eventType === Gio.FileMonitorEvent.CHANGED ||
            eventType === Gio.FileMonitorEvent.CHANGES_DONE_HINT ||
            eventType === Gio.FileMonitorEvent.ATTRIBUTE_CHANGED ||
            eventType === Gio.FileMonitorEvent.RENAMED) {
          scheduleRecompile()
        }
      })
    } catch (e) {
      print(`[cssHotReload] Failed to watch ${normalizedFile}: ${e}`)
    }
  })
  
  // Watch directories for atomic writes
  const dirsToWatch = new Set<string>()
  scssFiles.forEach(file => {
    const normalizedFile = GLib.canonicalize_filename(file, null) || file
    if (GLib.file_test(normalizedFile, GLib.FileTest.EXISTS)) {
      dirsToWatch.add(GLib.path_get_dirname(normalizedFile))
    }
  })
  
  const dirMonitorRefs: { monitor: Gio.FileMonitor; file: Gio.File }[] = []
  
  dirsToWatch.forEach(dir => {
    const dirFile = Gio.File.new_for_path(dir)
    if (!dirFile.query_exists(null)) {
      return
    }
    
    try {
      const dirMonitor = dirFile.monitor_directory(Gio.FileMonitorFlags.SEND_MOVED, null)
      dirMonitorRefs.push({ monitor: dirMonitor, file: dirFile })
      
      dirMonitor.connect('changed', (
        _monitor: Gio.FileMonitor,
        _file: Gio.File,
        _otherFile: Gio.File | null,
        eventType: Gio.FileMonitorEvent
      ) => {
        const filePath = _file.get_path() || ''
        
        if ((filePath.endsWith('.scss') || filePath.endsWith('.SCSS')) &&
            (eventType === Gio.FileMonitorEvent.CHANGED ||
             eventType === Gio.FileMonitorEvent.CHANGES_DONE_HINT ||
             eventType === Gio.FileMonitorEvent.RENAMED ||
             eventType === Gio.FileMonitorEvent.CREATED)) {
          const normalizedPath = GLib.canonicalize_filename(filePath, null) || filePath
          const matches = scssFiles.some(f => {
            const normalized = GLib.canonicalize_filename(f, null) || f
            return normalized === normalizedPath
          })
          
          if (matches) {
            scheduleRecompile()
          }
        }
      })
    } catch (e) {
      print(`[cssHotReload] Failed to watch directory ${dir}: ${e}`)
    }
  })
  
  // Store all refs in global scope to prevent GC
  ;(globalThis as any).__cssHotReloadRefs = { monitorRefs, dirMonitorRefs }
  
  print(`[cssHotReload] Setup complete, watching ${monitorRefs.length} files and ${dirMonitorRefs.length} directories`)
})()
