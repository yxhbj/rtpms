var editTable = require("./editTable");
var userTable = document.querySelector("#system-user-table");
userTable.border = "1";
userTable.width = "100%";
var thr, thd, tr, td;

genTableHead()
postForm("http://192.168.0.105:3000/users").then(users=>{
  try{
    users=JSON.parse(JSON.stringify(users))
    loadData(users);
  }
  catch(err){console.log(err)}
  //document.querySelector('#text_area').innerHTML = JSON.stringify(body.logs).replace(/\"/g,'').replace(/\\n/g,"<br>");
})

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
    userName: { text: "姓名", editType: "textBox" },
    gender: { text: "性别", editType: "textBox" },
    cellPhone: { text: "手机号码", editType: "textBox" },
    email: { text: "邮箱", editType: "textBox" },
    loginName: { text: "登录名", editType: "textBox" },
    password: { text: "登录密码", editType: "password" },
    role: { text: "用户角色", editType: "dropDownList" }
  };    
  thr = userTable.insertRow(userTable.rows.length);
  for (let j in columnData) {
    thd = thr.insertCell(thr.cells.length);
    thd.setAttribute("editType", columnData[j].editType);
    thd.innerHTML = columnData[j].text;
    thd.value=j;
    thd.align = "center";
    thr.style.backgroundColor = "lightgrey";
    thr.style.height = "30px";
    if(j=='role'){
      thd.setAttribute("DataItems","{text:'Administrator',value:'Admonistrator'},{text:'Planner',value:'Planner'},{text:'Physicist',value:'Physicist'}")
    }
  }
  thd = thr.insertCell(thr.cells.length);
  thd.innerHTML = "操作";
  thd.align = "center";
  thd.width = "80px";
}

function loadData(users){
  for (var i = 0; i < users.length; i++) {
    //循环插入元素
    tr = userTable.insertRow(userTable.rows.length);
    tr.style.height = "30px";
    if (i % 2 === 0) {
      tr.style.backgroundColor = "white";
    } else {
      tr.style.backgroundColor = "white";
    }
    for (let j in users[i]) {
        td = tr.insertCell(tr.cells.length);
        td.value=users[i][j]
        if (j == "password") {
            td.innerHTML = users[i][j].replace(/./g, "*");
        } else {
            td.innerHTML = users[i][j];
        }
        td.align = "center";
    }
    addAction(tr)
  }
  editTable.editTable(userTable);
}

function addAction(tr){
  td = tr.insertCell(tr.cells.length);
  var addImg = document.createElement("img");
  addImg.src="./assets/img/plus.png";
  td.appendChild(addImg)
  addImg.width="16";
  addImg.style.margin="4px";
  addImg.addEventListener("click",e=>{
    var newRow=editTable.addRow(userTable)
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
    userTable.deleteRow(e.target.parentNode.parentNode.rowIndex)
  })
  var saveImg = document.createElement("img");
  saveImg.src="./assets/img/save.png";
  td.appendChild(saveImg)
  saveImg.width="16";
  saveImg.style.margin="4px";
  saveImg.addEventListener("click",e=>{
    //console.log(e)
    var formData=editTable.getTableData(userTable)
    //console.log(formData)
    postForm("http://192.168.0.105:3000/users",formData);
  })
  td.align = "center";
}