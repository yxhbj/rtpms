var renderTable = require("./renderTable");
var serverTable = document.querySelector("#system-server-table");
  serverTable.border = "1";
  serverTable.width = "100%";
var thr, thd, tr, td;

genTableHead()
renderTable.postForm("servers").then(servers=>{
  try{
    servers=JSON.parse(JSON.stringify(servers))
    renderTable.loadData(serverTable,'servers',servers);
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
  renderTable.postForm("sysInfo",server).then(server=>{
    try{
      server=JSON.parse(server)
      document.querySelector("#text_area").innerHTML = server.logs.replace(/\"/g, "").replace(/\r\n/g, "<br>");
    }
    catch(err){console.log(err)}
  }).catch(e=>console.log(e))
}

function genTableHead(){
  var columnData = {
    id: { text: "编号", editType: "disabled" },
    host: { text: "名称", editType: "textBox" },
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
      thd.setAttribute("DataItems","{text:'节点服务器',value:'NodeServer'},{text:'计划服务器',value:'PlanningServer'},{text:'独立服务器',value:'StandaloneServer'},{text:'备份服务器',value:'BackupServer'}")
    }
    if(j=='os'){
      thd.setAttribute("DataItems","{text:'Solaris',value:'Solaris'},{text:'Windows',value:'Windows'},{text:'Linux',value:'Linux'},{text:'Mac OS',value:'Mac OS'}")
    }
  }
  thd = thr.insertCell(thr.cells.length);
  thd.innerHTML = "操作";
  thd.align = "center";
  thd.width = "80px";
}
