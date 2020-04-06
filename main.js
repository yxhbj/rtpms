// only add update server if it's not being run from cli
if (require.main !== module) {
  require('update-electron-app')({
    logger: require('electron-log')
  })
}

const path = require('path')
const glob = require('glob')
const {app, BrowserWindow, Menu, Tray} = require('electron')
const uri='http://localhost:3000'

const debug = /--debug/.test(process.argv[2])
let isDevelopment = false

if(isDevelopment){
  require('electron-reload')(__dirname
  , {
  electron: path.join(__dirname, 'node_modules', '.bin', 'electron.cmd')
  })
}

if (process.mas) app.setName('RTPMS')

let mainWindow = null
let tray = null

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
      icon:path.join(__dirname, '/public/app-icon/win/favicon.ico'),
//       transparent: true,
      // frame: false,
      webPreferences: {
        nodeIntegration: true
      }  
    }
    Menu.setApplicationMenu(null)
    mainWindow = new BrowserWindow(windowOptions)
    mainWindow.loadURL(uri)

    // Launch fullscreen with DevTools open, usage: npm run debug
    if (debug) {
      mainWindow.webContents.openDevTools()
      mainWindow.maximize()
      require('devtron').install()
    }

    mainWindow.on('closed', () => {
      mainWindow = null
    })

    tray = new Tray(path.join(__dirname, '/public/app-icon/win/favicon.ico'))
    const contextMenu = Menu.buildFromTemplate([
        {
            label: '退出',
           click: function () {
              settings.delete('activeSectionButtonId')
             app.quit();
            }
        }
    ])
    tray.setToolTip('放疗数据管理')
    tray.setContextMenu(contextMenu)
    tray.on('click',function(){
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.maximize();//mainWindow.show()
      mainWindow.isVisible() ? mainWindow.setSkipTaskbar(false):mainWindow.setSkipTaskbar(true); 
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
  const files = glob.sync(path.join(__dirname, '/base/**/*.js'))
  files.forEach((file) => { require(file) })
}
require(path.join(__dirname,'/base.js'))

initialize()


