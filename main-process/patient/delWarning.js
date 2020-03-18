const {ipcMain, dialog} = require('electron')

ipcMain.on('delete-warning-dialog', (event,arg) => {
  const options = {
    type: 'warning',
    title: '警告！',
    message: "此操作将立即删除病人并且不可取消，确定删除！",
    buttons: ['Yes', 'No']
  }
  dialog.showMessageBox(options, (index) => {
    var para={}
    para.index=index
    para.patient=arg
    event.sender.send('delete-dialog-selection', para)
  })
})

