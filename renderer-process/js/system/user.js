var renderTable = require("./renderTable");
var userTable = document.querySelector("#system-user-table");
userTable.border = "1";
userTable.width = "100%";
var thr, thd, tr, td;

genTableHead()
renderTable.postForm("users").then(users=>{
  try{
    users=JSON.parse(JSON.stringify(users))
    renderTable.loadData(userTable,'users',users);
  }
  catch(err){console.log(err)}
  //document.querySelector('#text_area').innerHTML = JSON.stringify(body.logs).replace(/\"/g,'').replace(/\\n/g,"<br>");
})

function genTableHead(){
  var columnData = {
    id: { text: "编号", editType: "disabled" },
    userName: { text: "姓名", editType: "textBox" },
    gender: { text: "性别", editType: "dropDownList" },
    cellPhone: { text: "手机号码", editType: "textBox" },
    email: { text: "邮箱", editType: "textBox" },
    loginName: { text: "登录名", editType: "textBox" },
    password: { text: "密码", editType: "password" },
    role: { text: "职位", editType: "dropDownList" },
    siteCode: { text: "单位", editType: "siteCode" }
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
    if(j=='id'){
      thd.style.width="30px";
    }
    if(j=='role'){
      thd.setAttribute("DataItems","{text:'管理员',value:'Administrator'},{text:'剂量师',value:'Planner'},{text:'物理师',value:'Physicist'}")
    }
    if(j=='gender'){
      const dataItems = "DataItems";
      thd.setAttribute(dataItems,"{text:'男',value:'male'},{text:'女',value:'female'},{text:'其他',value:'other'}")
    }
  }
  thd = thr.insertCell(thr.cells.length);
  thd.innerHTML = "操作";
  thd.align = "center";
  thd.width = "80px";
}
