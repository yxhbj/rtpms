// only add update server if it's not being run from cli
if (require.main !== module) {
  require('update-electron-app')({
    logger: require('electron-log')
  })
}

const path = require('path')
const glob = require('glob')
const {app, Menu, Tray} = require('electron')
const debug = /--debug/.test(process.argv[2])
let isDevelopment = false

if(isDevelopment){
  require('electron-reload')(__dirname
  , {
  electron: path.join(__dirname, 'node_modules', '.bin', 'electron.cmd')
  })
}

if (process.mas) app.setName('RTPMS')

let tray = null

function initialize () {
  function createTray(){
    tray = new Tray(path.join(__dirname, '/public/app-icon/win/favicon.ico'))
    const contextMenu = Menu.buildFromTemplate([
        {
            label: '退出',
           click: function () {
              app.quit();
            }
        }
    ])
    tray.setToolTip('放疗数据管理')
    tray.setContextMenu(contextMenu)
  }

  app.on('ready', () => {
    loadFuncs()  
    createTray()
  })

}

// Require each JS file in the main-process dir
function loadFuncs () {
  const files = glob.sync(path.join(__dirname, '/base/**/*.js'))
  files.forEach((file) => { require(file) })
}

initialize()


