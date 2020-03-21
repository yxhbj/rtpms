const { ipcRenderer } = require("electron");
var institutionTable = document.querySelector("#institution-data-table");
var patientTable = document.querySelector("#patient-data-table");
var planTable = document.querySelector("#plan-data-table");

// 模拟了一个简单的promise请求,获取Institution数据
const getInstitutionData = function(paramse) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "http://192.168.1.16:3000/institution");
    xhr.setRequestHeader("Content-Type", "multipart/form-data");
    xhr.onreadystatechange = function() {
      if (xhr.readyState !== 4) {
        return;
      }
      if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 304) {
        resolve(xhr.response);
        var result = JSON.parse(xhr.response);
        patientInit(result.data[0].institutionid);
      } else {
        reject(xhr);
      }
    };

    // 一个简单的处理参数的示例
    let formData = "";
    for (let key in paramse) {
      if (formData !== "") {
        formData += "&";
      }
      formData += key + "=" + paramse[key];
    }
    xhr.send(formData);
  });
};

function institutionInit() {
  institutionTable.GM(
    "init",
    {
      supportRemind: false,
      gridManagerName: "institution-table",
      isCombSorting: false,
      height: "200px",
      supportCheckbox: true,
      useRowCheck: true,
      useRadio: true,
      supportAjaxPage: false,
      supportSorting: true,
      emptyTemplate: '<div class="gm-emptyTemplate">没有符合当前要求的数据</div>',
      ajaxData: function(settings, params) {
        // 传入参数信息
        return getInstitutionData(params);
      },
      query: {},
      pageSize: 20,
      columnData: [
        {
          key: "institutionid",
          remind: "编号",
          text: "编号",
          sorting: ""
        },
        {
          key: "name",
          remind: "机构名称",
          text: "机构名称",
          sorting: ""
        },
        {
          key: "institutionpath",
          remind: "文件路径",
          text: "文件路径",
          sorting: ""
        },
        {
          key: "lastmodifiedtimestamp",
          remind: "最近修改时间",
          text: "最近修改",
          sorting: ""
        }
      ],
      checkedAfter: function(checkedList, isChecked, rowData) {
        var _query = {
          institutionid: rowData.institutionid
        };
        patientTable.GM("setQuery", _query).GM("refreshGrid", function() {
          console.log("选择了分组" + rowData.name);
        });
      }
    },
    cb => console.log(cb)
  );
}

// 一个简单的promise请求,获取Patient数据
const getPatientData = function(paramse) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "http://192.168.1.16:3000/patient");
    xhr.setRequestHeader("Content-Type", "multipart/form-data");
    xhr.onreadystatechange = function() {
      if (xhr.readyState !== 4) {
        return;
      }
      if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 304) {
        resolve(xhr.response);
        var result = JSON.parse(xhr.response);
        //console.log(result)
        if (result.data.length > 0) {
          var _query = {
            patientid: result.data[0].patientid
          };
          var planTableMarginTop = document.defaultView.getComputedStyle(
            planTable,
            null
          )["margin-top"];
          if (planTableMarginTop != "0px")
            planTable.GM("setQuery", _query).GM("refreshGrid", function() {});
        }
      } else {
        reject(xhr);
      }
    };

    // 一个简单的处理参数的示例
    let formData = "";
    for (let key in paramse) {
      if (formData !== "") {
        formData += "&";
      }
      formData += key + "=" + paramse[key];
    }
    xhr.send(formData);
  });
};

function patientInit(institutionId) {
  patientTable.GM(
    "init",
    {
      supportRemind: false,
      gridManagerName: "patient-table",
      isCombSorting: false,
      height: "600px",
      supportCheckbox: true,
      useRowCheck: false,
      useRadio: true,
      supportAjaxPage: true,
      supportSorting: true,
      emptyTemplate: '<div class="gm-emptyTemplate">没有符合当前要求的数据</div>',
      ajaxData: function(settings, params) {
        // 传入参数信息
        return getPatientData(params);
      },
      query: {
        institutionid: institutionId
      },
      pageSize: 20,
      columnData: [
        {
          key: "patientid",
          remind: "TPS内部编号",
          text: "编号",
          sorting: ""
        },
        {
          key: "lastname",
          text: "姓氏",
          sorting: ""
        },
        {
          key: "firstname",
          text: "名字",
          sorting: ""
        },
        {
          key: "middlename",
          text: "中间名字",
          sorting: ""
        },
        {
          key: "medicalrecordnumber",
          remind: "medical record number",
          text: "病历号",
          sorting: ""
        },
        {
          key: "primaryphysician",
          text: "主管医生"
        },
        {
          key: "planLockDate",
          text: "计划锁定日期"
        },
        {
          key: "backupTimeStamp",
          text: "备份时间",
          sorting: "",
          filter: {
            option:[
              {value: '1', text: '未备份的数据项'},
              {value: '2', text: '已备份的数据项'},
              {value: '3', text: '全部'}
            ],
            selected: '3'
          }
        },
        {
          key: "backupFileName",
          text: "备份文件名称",
          sorting: ""
        },
        {
          key: "lastmodifiedtimestamp",
          remind: "",
          text: "最近修改",
          sorting: ""
        },
        {
          key: "patientpath",
          remind: "",
          text: "文件夹路径"
        },
        {
          key: "comment",
          remind: "",
          text: "备注"
        },
        {
          key: "action",
          //remind: 'the action',
          width: "60px",
          text: "操作",
          template: function(action, rowObject) {
            var actionButton = document.createElement("div");
            actionButton.innerText = "删除";
            actionButton.classList.add("plugin-action");
            actionButton.addEventListener("click", function(e) {
              if (
                rowObject.backupTimeStamp == undefined ||
                rowObject.backupTimeStamp == null
              ) {
                ipcRenderer.send("open-error-dialog");
              } else {
                ipcRenderer.send("delete-warning-dialog", rowObject);
              }
            });
            return actionButton;
          }
        }
      ],
      checkedAfter: function(checkedList, isChecked, rowData) {
        //console.log(checkedList,isChecked,rowData);
        console.log("选择了病人" + rowData.lastname + rowData.firstname);
        var _query = {
          patientid: rowData.patientid
        };
        //console.log(planTable.GM)
        var planTableMarginTop = document.defaultView.getComputedStyle(
          planTable,
          null
        )["margin-top"];
        if (planTableMarginTop != "0px") {
          planTable.GM("setQuery", _query).GM("refreshGrid", function() {});
        } else {
          planInit(rowData.patientid);
        }
      }
    },
    callBack => console.log(callBack)
  );
}

// 一个简单的promise请求,获取Plan数据
const getPlanData = function(paramse) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "http://192.168.1.16:3000/plan");
    xhr.setRequestHeader("Content-Type", "multipart/form-data");
    xhr.onreadystatechange = function() {
      if (xhr.readyState !== 4) {
        return;
      }
      if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 304) {
        resolve(
          xhr.response.replace(/\"planislocked\"\:\d{1}/g, m => {
            return m.substr(-1) == 1
              ? '"planislocked":' + '"Yes"'
              : '"planislocked":' + '"No"';
          })
        );
      } else {
        reject(xhr);
      }
    };

    // 一个简单的处理参数的示例
    let formData = "";

    for (let key in paramse) {
      if (formData !== "") {
        formData += "&";
      }
      formData += key + "=" + paramse[key];
    }
    xhr.send(formData);
  });
};

function planInit(patientid) {
  planTable.GM("init", {
    supportRemind: false,
    gridManagerName: "plan-table",
    isCombSorting: false,
    supportCheckbox: false,
    height: "200px",
    supportAjaxPage: false,
    supportSorting: true,
    emptyTemplate: '<div class="gm-emptyTemplate">没有符合当前要求的数据</div>',
    ajaxData: function(settings, params) {
      // 传入参数信息
      return getPlanData(params);
    },
    query: {
      patientid: patientid
    },
    pageSize: 20,
    columnData: [
      {
        key: "planname",
        remind: "计划名称",
        text: "计划名称",
        sorting: ""
      },
      {
        key: "pinnacleversiondescription",
        remind: "计划软件版本",
        text: "软件版本",
        sorting: ""
      },
      {
        key: "dosimetrist",
        remind: "计划制定剂量师",
        text: "剂量师",
        sorting: ""
      },
      {
        key: "comment",
        remind: "备注信息",
        text: "备注",
        sorting: ""
      },
      {
        key: "lastmodifiedtimestamp",
        remind: "最近修改时间",
        text: "最近修改",
        sorting: ""
      },
      {
        key: "planLockDate",
        text: "计划锁定日期"
      },
      {
        key: "planpath",
        remind: "文件夹路径",
        text: "文件夹路径"
      }
    ]
  });
}

function init() {
  const xhr = new XMLHttpRequest();
  xhr.open("POST", "http://192.168.1.16:3000/settings");
  xhr.setRequestHeader("Content-Type", "multipart/form-data");
  xhr.onreadystatechange = function() {
    //console.log(xhr.status)
    if (xhr.readyState !== 4) {
      return;
    }
    if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 304) {
      var result = JSON.parse(xhr.response);
      //console.log(result)
      var ss = document.getElementById("institutionList");
      if (ss.options.length == 0) {
        //定义加载institution列表
        var instList = JSON.parse(
          JSON.stringify(result.institution.institutions)
        );
        var allInst = {
          id: "All",
          name: "All institutions"
        };
        instList.push(allInst);
        instList.forEach(institution => {
          var op = document.createElement("option");
          op.setAttribute("label", institution.name);
          op.setAttribute("value", institution.id);
          ss.appendChild(op);
        });
      }
      document.querySelector("#institution-filter").value =
        result.institution.defaultInstitution;
      patientInit(result.institution.defaultInstitution);
    }
  };
  xhr.send("");
}

init();

function refreshPatientList() {
  var _query = {
    searchString: document
      .querySelector('[name="search-Field"]')
      .value.replace(/[^a-zA-Z0-9\-\_\s\/]/g, ""),
    institutionid: document.querySelector("#institution-filter").value
  };
  patientTable.GM("setQuery", _query).GM("refreshGrid", function() {});
}

//绑定选择Institution事件
document
  .querySelector("#institution-filter")
  .addEventListener("change", function() {
    refreshPatientList();
  });
//绑定搜索事件
document
  .querySelector('[name="search-Field"]')
  .addEventListener("change", function() {
    refreshPatientList();
  });
//绑定搜索事件
document
  .querySelector('[name="search-Field"]')
  .addEventListener("input", function() {
    refreshPatientList();
  });

ipcRenderer.on("delete-dialog-selection", (event, para) => {
  if (para.index === 0) {
    var patients = [];
    patients.push(para.patient);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "http://192.168.1.16:3000/deletePatient");
    xhr.setRequestHeader("Content-Type", "application/json; charset=UTF-8");
    xhr.send(JSON.stringify(patients));
    setTimeout(() => {
      refreshPatientList();
      window.alert(
        "删除已完成，如必要，请退出并重新打开当前已经打开的LaunchPad以刷新。"
      );
    }, 10000);
  }
});
