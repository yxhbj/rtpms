const sampleUser = [{
        id: 1,
        username: "",
        gender: "other",
        cellPhone: "",
        email: "",
        loginName: "",
        password: "",
        role: "Administrator",
        siteCode:""
    }];
const sampleServer = [{
        id: 1,
        host: "dell",
        ip: "220.194.46.182",
        backupDirectory: "/autoDataSets/NFSarchive/",
        storageVolume: "/PrimaryPatientData",
        loginName: "p3rtp",
        password: "p3rtp123",
        type: "BackupServer",
        os: "Solaris"
    }];

const postForm = function(dataType, data){
  return new Promise((resolve,reject)=>{
    const xhr = new XMLHttpRequest();
    xhr.open("POST", uri+dataType);
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
  
const loadData = function(tableEle,dataType,data){
    //console.log(dataType,data.length)
    data=dataType=="users"?data.length==0?sampleUser:data:data.length==0?sampleServer:data
    // console.log(data)
  for (var i = 0; i < data.length; i++) {
    //循环插入元素
    tr = tableEle.insertRow(tableEle.rows.length);
    tr.style.height = "30px";
    if (i % 2 === 0) {
      tr.style.backgroundColor = "white";
    } else {
      tr.style.backgroundColor = "white";
    }
    for (let j in data[i]) {
      //console.log(j)
        td = tr.insertCell(tr.cells.length);
        td.value=data[i][j]
        var editType = td.parentNode.parentNode.rows[0].cells[td.cellIndex].getAttribute("editType");
        if(editType=="password"){
          td.innerText = "********";
        }else if(editType=="dropDownList"){
          td.innerText = wordTable[data[i][j]];
        }else{
          td.innerText = data[i][j];
        }
        td.align = "center";
    }
    addAction(tableEle,tr,dataType)
  }
  editTable(tableEle);
}

const addAction = function(tableEle,tr,dataType){
    td = tr.insertCell(tr.cells.length);
    var addImg = document.createElement("img");
    addImg.src="img/plus.png";
    td.appendChild(addImg)
    addImg.width="16";
    addImg.style.margin="4px";
    addImg.addEventListener("click",e=>{
      var newRow=editTable.addRow(tableEle)
      newRow.cells[0].innerHTML=newRow.cells[0].value;
      newRow.removeChild(newRow.cells[newRow.cells.length-1]);
      addAction(tableEle,newRow,dataType)
    })
    var delImg = document.createElement("img");
    delImg.src="img/minus.png";
    td.appendChild(delImg)
    delImg.width="16";
    delImg.style.margin="4px";
    delImg.addEventListener("click",e=>{
      tableEle.deleteRow(e.target.parentNode.parentNode.rowIndex)
    })
    var saveImg = document.createElement("img");
    saveImg.src="img/save.png";
    td.appendChild(saveImg)
    saveImg.width="16";
    saveImg.style.margin="4px";
    saveImg.addEventListener("click",e=>{
      //console.log(e)
      var formData=getTableData(tableEle)
      //console.log(formData)
      postForm(dataType,formData);
    })
    td.align = "center";
}