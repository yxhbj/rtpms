const {ipcMain, dialog} = require('electron')

ipcMain.on('open-error-dialog', (event) => {
  dialog.showErrorBox('危险操作提示', '未备份的病人数据不能删除！')
})
