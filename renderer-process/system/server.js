var editTable = require("./editTable");
var serverTable = document.querySelector("#system-server-table");
serverTable.border = "1";
serverTable.width = "100%";
var thr, thd, tr, td;

genTableHead()
postForm("http://127.0.0.1:3000/server").then(servers=>{
  try{
    servers=JSON.parse(JSON.stringify(servers))
    loadData(servers);
    renderData(servers)
  }
  catch(err){console.log(err)}
  //document.querySelector('#text_area').innerHTML = JSON.stringify(body.logs).replace(/\"/g,'').replace(/\\n/g,"<br>");
})

function renderData(data){
  try{
    var ss = document.getElementById("servers");
    if (ss.options.length == 0) {
      //定义加载服务器列表
      data.forEach(server => {
        var op = document.createElement("option");
        op.setAttribute("label", server.server);
        op.setAttribute("value", server.id);
        ss.appendChild(op);
      });
    }
    document.querySelector('[name="selectedServer"]')
      .addEventListener("input", function() {
        getLogs(data[this.value])
      });
    document.querySelector('[name="selectedServer"]')
      .addEventListener("change", function() {
        getLogs(data[this.value])
      });
      getLogs(data[0])
  }catch(err){console.log(err)}
}

function getLogs(server){
  postForm("http://127.0.0.1:3000/sysInfo",server).then(server=>{
    try{
      server=JSON.parse(server)
      document.querySelector("#text_area").innerHTML = server.logs.replace(/\"/g, "").replace(/\r\n/g, "<br>");
    }
    catch(err){console.log(err)}
  }).catch(e=>console.log(e))
}

function postForm(uri, data) {
  return new Promise((resolve,reject)=>{
    const xhr = new XMLHttpRequest();
    xhr.open("POST", uri);
    xhr.setRequestHeader("Content-Type", "application/json; charset=UTF-8");
    xhr.onreadystatechange = function() {
      if (xhr.readyState !== 4) {
        return;
      }
      if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 304) {
        var body = data == undefined ? JSON.parse(xhr.response) : xhr.response;
        resolve(body);
      } else {
        return;
      }
    };
    xhr.send(JSON.stringify(data));
  })
}

function genTableHead(){
  var columnData = {
    id: { text: "编号", editType: "textBox" },
    server: { text: "名称", editType: "textBox" },
    ip: { text: "ip地址", editType: "textBox" },
    backupDirectory: { text: "存储路径", editType: "textBox" },
    storageVolume: { text: "数据区", editType: "textBox" },
    loginName: { text: "登录名", editType: "textBox" },
    password: { text: "登录密码", editType: "password" },
    type: { text: "服务器类型", editType: "dropDownList" },
    os: { text: "操作系统", editType: "dropDownList" }
  };    
  thr = serverTable.insertRow(serverTable.rows.length);
  for (let j in columnData) {
    thd = thr.insertCell(thr.cells.length);
    thd.setAttribute("editType", columnData[j].editType);
    thd.innerHTML = columnData[j].text;
    thd.value=j;
    thd.align = "center";
    thr.style.backgroundColor = "lightgrey";
    thr.style.height = "30px";
    if(j=='type'){
      thd.setAttribute("DataItems","{text:'NodeServer',value:'NodeServer'},{text:'PlanningServer',value:'PlanningServer'},{text:'StandaloneServer',value:'StandaloneServer'},{text:'StorageServer',value:'StorageServer'}")
    }
    if(j=='os'){
      thd.setAttribute("DataItems","{text:'Solaris',value:'Solaris'},{text:'Windows',value:'Windows'},{text:'Linux',value:'Linux'},{text:'Mac OS',value:'Mac OS'}")
    }
  }
  thd = thr.insertCell(thr.cells.length);
  thd.innerHTML = "操作";
  thd.align = "center";
  thd.width = "80px";
  // loadData(
  //   [{
  //     id: 0,
  //     server: "",
  //     ip: "",
  //     backupDirectory: "",
  //     storageVolume:"",
  //     loginName: "",
  //     password: "",
  //     type: "",
  //     os:""
  //   }])
}

function loadData(servers){
  for (var i = 0; i < servers.length; i++) {
    //循环插入元素
    tr = serverTable.insertRow(serverTable.rows.length);
    tr.style.height = "30px";
    if (i % 2 === 0) {
      tr.style.backgroundColor = "white";
    } else {
      tr.style.backgroundColor = "white";
    }
    for (let j in servers[i]) {
      if (j != "logs" && j != "disk") {
        td = tr.insertCell(tr.cells.length);
        td.value=servers[i][j]
        if (j == "password") {
          td.innerHTML = servers[i][j].replace(/./g, "*");
        } else {
          td.innerHTML = servers[i][j];
        }
        td.align = "center";
      }
    }
    addAction(tr)
  }
  editTable.editTable(serverTable);
}

function addAction(tr){
  td = tr.insertCell(tr.cells.length);
  var addImg = document.createElement("img");
  addImg.src="./assets/img/plus.png";
  td.appendChild(addImg)
  addImg.width="16";
  addImg.style.margin="4px";
  addImg.addEventListener("click",e=>{
    var newRow=editTable.addRow(serverTable)
    newRow.cells[0].innerHTML=newRow.rowIndex-1;
    newRow.removeChild(newRow.cells[newRow.cells.length-1]);
    addAction(newRow)
  })
  var delImg = document.createElement("img");
  delImg.src="./assets/img/minus.png";
  td.appendChild(delImg)
  delImg.width="16";
  delImg.style.margin="4px";
  delImg.addEventListener("click",e=>{
    serverTable.deleteRow(e.target.parentNode.parentNode.rowIndex)
  })
  var saveImg = document.createElement("img");
  saveImg.src="./assets/img/save.png";
  td.appendChild(saveImg)
  saveImg.width="16";
  saveImg.style.margin="4px";
  saveImg.addEventListener("click",e=>{
    console.log(e)
    var formData=editTable.getTableData(serverTable)
    console.log(formData)
    postForm("http://127.0.0.1:3000/server",formData);
  })
  td.align = "center";
}