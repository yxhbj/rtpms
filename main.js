// only add update server if it's not being run from cli
if (require.main !== module) {
  require('update-electron-app')({
    logger: require('electron-log')
  })
}

const path = require('path')
const glob = require('glob')
const {app, BrowserWindow, Menu} = require('electron')

const debug = true///--debug/.test(process.argv[2])
let isDevelopment = true//false

if(isDevelopment){
  require('electron-reload')(__dirname
  , {
  electron: path.join(__dirname, 'node_modules', '.bin', 'electron.cmd')
  })
}

if (process.mas) app.setName('RTPMS')

let mainWindow = null

function initialize () {
  const gotTheLock = requestSingleInstanceLock()
  if (!gotTheLock) return app.quit()

  loadFuncs()

  function createWindow () {
    const windowOptions = {
      width: 1080,
      minWidth: 680,
      height: 840,
      title: app.name,
      icon:path.join(__dirname, '/assets/app-icon/win/favicon.ico'),
//       transparent: true,
      // frame: false,
      webPreferences: {
        nodeIntegration: true
      }  
    }
    Menu.setApplicationMenu(null)
    mainWindow = new BrowserWindow(windowOptions)
    mainWindow.loadURL(path.join('file://', __dirname, '/sections/index.html'))

    // Launch fullscreen with DevTools open, usage: npm run debug
    if (debug) {
      mainWindow.webContents.openDevTools()
      mainWindow.maximize()
      require('devtron').install()
    }

    mainWindow.on('closed', () => {
      mainWindow = null
    })
  }

  app.on('ready', () => {
    createWindow()
  })
  app.on('reload', () => {
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  app.on('activate', () => {
    if (mainWindow === null) {
      createWindow()
    }
  })
}

// Make this app a single instance app.
//
// The main window will be restored and focused instead of a second window
// opened when a person attempts to launch a second instance.
//
// Returns true if the current version of the app should quit instead of
// launching.
function requestSingleInstanceLock () {
  if (process.mas) return false

  return app.requestSingleInstanceLock(() => {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
      // 当运行第二个实例时,将会聚焦到myWindow这个窗口
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.focus()
      }
    })
  })
}

// Require each JS file in the main-process dir
function loadFuncs () {
  const files = glob.sync(path.join(__dirname, 'main-process/**/*.js'))
  files.forEach((file) => { require(file) })
}
require(path.join(__dirname,'/core.js'))

initialize()


