(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
var patientTable = document.querySelector("#patient-data-table");
var planTable = document.querySelector("#plan-data-table");
const Cookies=require('./js.cookie.js');

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
          if (planTableMarginTop != "0px"){
            planTable.GM("setQuery", _query);
          }
          var serverDisk=result.dbServerDisk
          document.querySelector('#totalstoragespace').innerText=serverDisk.total
          document.querySelector('#usedstoragespace').innerText=serverDisk.used
          document.querySelector('#storagespaceusage').innerText=serverDisk.usage
          if(Number(serverDisk.usage.match(/\d*/)[0])>80){
            document.querySelector('#usedstoragespace').style.color='red'
            document.querySelector('#storagespaceusage').style.color='red'
          }
        }
        resolve(xhr.response);
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
      height: "",
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
      query: { institutionid: institutionId },
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
          width: '60px',
          text: "操作",
          template: function(action, rowObject) {
            var actionButton = document.createElement("div");
            actionButton.innerText = "删除";
            actionButton.classList.add("plugin-action");
            actionButton.addEventListener("click", function(e) {
              delectPatientData(rowObject);
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
    callBack => {
      console.log(callBack);
    }
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
          xhr.response.replace(/"planislocked"\:\d{1}/g, m => {
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
    height: "",
    supportAjaxPage: false,
    supportSorting: true,
    emptyTemplate: '<div class="gm-emptyTemplate">没有符合当前要求的数据</div>',
    ajaxData: function(settings, params) {
      // 传入参数信息
      return getPlanData(params);
    },
    query: { patientid: patientid },
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
      },
        {
          key: "action",
          //remind: 'the action',
          //width: '450px',
          text: "操作",
          width:"60px",
          template: function(action, rowObject) {
            var planActionButton = document.createElement("div");
            planActionButton.innerText = "打开";
            planActionButton.classList.add("plugin-action");
            planActionButton.addEventListener("click", function(e) {
              const xhr = new XMLHttpRequest();
              xhr.open("POST", "http://192.168.1.16:3000/openPlan");
              xhr.setRequestHeader("Content-Type", "application/json; charset=UTF-8");
              xhr.send(JSON.stringify(rowObject));
              setTimeout(() => {
                var fs = require('fs'),
                    child_process = require('child_process'),
                    exec=child_process.exec,
                    host='220.194.46.182',
                    user='p3rtp',
                    password='p3rtp123';
                exec(`public\\scripts\\openplan.bat ${host} ${user} ${password}`)
                  .then(function(result) {
                    console.log(result.toString());
                  });
              }, 5000);

            });
            return planActionButton;
          }
        }
    ]
  });
}

function init() {
  const xhr = new XMLHttpRequest();
  xhr.open("POST", "http://192.168.1.16:3000/settings");
  //xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded;");
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
        var allInst = { id: "All", name: "All institutions" };
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

function refreshPatientList() {
  var _query = {
    searchString: document
      .querySelector('[name="search-Field"]')
      .value.replace(/[^a-zA-Z0-9\-\_\/]/g, ""),
    institutionid: document.querySelector("#institution-filter").value
  };
  patientTable.GM("setQuery", _query);
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

// 删除功能
function delectPatientData(rowObject) {
  window.event.stopPropagation();
  if (
    rowObject.backupTimeStamp == undefined ||
    rowObject.backupTimeStamp == null
  ) {
    window.alert("不能删除未备份的数据");
  } else {
    // 执行删除操作
    var patientInfo =
      rowObject.lastname +
      " " +
      (rowObject.firtname == undefined ? "" : rowObject.firtname) +
      " " +
      rowObject.medicalrecordnumber;
    if (
      window.confirm(
        "此删除将立即进行，请确保在Pinnacle中没有打开该病人，否则，所有打开所进行的更改都将丢失。确认要删除[" +
          patientInfo +
          "]?"
      )
    ) {
      var patients = [];
      patients.push(rowObject);
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "http://192.168.1.16:3000/deletePatient");
      xhr.setRequestHeader("Content-Type", "application/json; charset=UTF-8");
      xhr.onreadystatechange = function() {
        console.log(xhr.status)
        if (xhr.readyState !== 4) {
          return;
        }
        if (xhr.status >= 200 && xhr.status < 300 || xhr.status === 304) {
          var result=JSON.parse(xhr.response)
          console.log(result)
          setTimeout(()=>{
              patientTable.GM('refreshGrid');
            window.alert('删除已完成，如必要，请退出并重新打开当前已经打开的LaunchPad以刷新。');
          }, 6000);
        }
      }
      xhr.send(JSON.stringify(patients));
    }
  }
}

init();

const getTreatmentData = function(paramse) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "http://192.168.1.16:3000/treatment");
    xhr.setRequestHeader("Content-Type", "multipart/form-data");
    xhr.onreadystatechange = function() {
      if (xhr.readyState !== 4) {
        return;
      }
      if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 304) {
        resolve(xhr.response);
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

var treatTable = document.querySelector("#treatment-data-table");
function treatmentInit() {
  treatTable.GM(
    "init",
    {
      supportRemind: false,
      gridManagerName: "trentment-table",
      isCombSorting: false,
      height: window.outerHeight * 0.9,
      supportCheckbox: true,
      useRowCheck: false,
      useRadio: false,
      supportAjaxPage: true,
      supportSorting: true,
      emptyTemplate: '<div class="gm-emptyTemplate">没有符合当前要求的数据</div>',
      ajaxData: function(settings, params) {
        // 传入参数信息
        return getTreatmentData(params);
      },
      query: {},
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
          sorting: "",
          // template: function(lastname, rowObject) {
          //   var lastNameInput = document.createElement("input");
          //   lastNameInput.value = lastname;
          //   return lastNameInput;
          // }
        },
        {
          key: "firstname",
          text: "名字",
          sorting: "",
          // template: function(firstname, rowObject) {
          //   var firstNameInput = document.createElement("input");
          //   firstNameInput.value = firstname;
          //   firstNameInput.addEventListener("change", function(e) {
          //     rowObject.firstname = firstNameInput.value;
          //     refreshTreatData(firstNameInput, rowObject, e);
          //   });
          //   return firstNameInput;
          // }
        },
        {
          key: "middlename",
          text: "中间名字",
          sorting: "",
          // template: function(middlename, rowObject) {
          //   var middleNameInput = document.createElement("input");
          //   middleNameInput.value = middlename;
          //   return middleNameInput;
          // }
        },
        {
          key: "medicalrecordnumber",
          remind: "medical record number",
          text: "病历号",
          sorting: "",
          // template: function(medicalrecordnumber, rowObject) {
          //   var mrnInput = document.createElement("input");
          //   mrnInput.value = medicalrecordnumber;
          //   return mrnInput;
          // }
        },
        {
          key: "primaryphysician",
          text: "主管医生",
          // template: function(primaryphysician, rowObject) {
          //   var primaryphysicianInput = document.createElement("input");
          //   primaryphysicianInput.value = primaryphysician;
          //   return primaryphysicianInput;
          // }
        },
        {
          key: "planLockDate",
          text: "计划锁定日期",
          // template: function(planLockDate, rowObject) {
          //   var planLockDateInput = document.createElement("input");
          //   planLockDateInput.value = planLockDate;
          //   return planLockDateInput;
          // }
        },
        {
          key: "backupTimeStamp",
          text: "备份时间",
          sorting: "",
          // template: function(backupTimeStamp, rowObject) {
          //   var backupTimeStampInput = document.createElement("input");
          //   backupTimeStampInput.value = backupTimeStamp;
          //   return backupTimeStampInput;
          // }
        },
        {
          key: "backupFileName",
          text: "备份文件名称",
          sorting: "",
          // template: function(backupFileName, rowObject) {
          //   var backupFileNameInput = document.createElement("input");
          //   backupFileNameInput.value = backupFileName;
          //   return backupFileNameInput;
          // }
        },
        {
          key: "lastmodifiedtimestamp",
          text: "最近修改",
          sorting: "",
          // template: function(lastmodifiedtimestamp, rowObject) {
          //   var lastmodifiedtimestampInput = document.createElement("input");
          //   lastmodifiedtimestampInput.value = lastmodifiedtimestamp;
          //   return lastmodifiedtimestampInput;
          // }
        },
        {
          key: "patientpath",
          text: "文件夹路径",
          // template: function(patientpath, rowObject) {
          //   var patientPathInput = document.createElement("input");
          //   patientPathInput.value = patientpath;
          //   return patientPathInput;
          // }
        },
        {
          key: "comment",
          text: "备注",
          // template: function(comment, rowObject) {
          //   var commentInput = document.createElement("input");
          //   commentInput.value = comment;
          //   return commentInput;
          // }
        },
        {
          key: "action",
          text: "操作",
          // template: function(action, rowObject) {
          //   var treatActionButton = document.createElement("div");
          //   treatActionButton.innerText = "编辑";
          //   treatActionButton.classList.add("plugin-action");
          //   treatActionButton.addEventListener("click", function(e) {
          //     editRowData(rowObject);
          //   });
          //   return treatActionButton;
          // }
        }
      ],
      cellClick: function(rowData,rowIndex,columnIndex) {
        console.log(rowData,rowIndex,columnIndex);
      }
    },
    callBack => {
      console.log(callBack);
    }
  );
}
function refreshTreatData(key, fieldName, rowObject, e) {
  console.log(key, fieldName, rowObject, e);
}

treatmentInit();

// 一个简单的promise请求,获取Backup数据
const getBackupData = function(paramse) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "http://192.168.1.16:3000/backupData");
    xhr.setRequestHeader("Content-Type", "multipart/form-data");
    xhr.onreadystatechange = function() {
      if (xhr.readyState !== 4) {
        return;
      }
      if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 304) {
        var serverDisk=JSON.parse(xhr.response).backupServerDisk
        document.querySelector('#totalbackupstoragespace').innerText=serverDisk.total
        document.querySelector('#usedbackupstoragespace').innerText=serverDisk.used
        document.querySelector('#backupstoragespaceusage').innerText=serverDisk.usage
        if(Number(serverDisk.usage.match(/\d*/)[0])>80){
          document.querySelector('#usedbackupstoragespace').style.color='red'
          document.querySelector('#backupstoragespaceusage').style.color='red'
        }
        resolve(xhr.response);
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
var table = document.querySelector("#backup-data-table");
function backupInit() {
  table.GM(
    {
      ajaxData: function(settings, params) {
        return getBackupData(params);
      },
      firstLoading: true,
      supportRemind: true,
      gridManagerName: "test",
      isCombSorting: false,
      height: "",
      supportAjaxPage: true,
      supportSorting: true,
      query: {},
      pageSize: 20,
      columnData: [
        {
          key: "LastName",
          //width: '100px',
          text: "姓氏",
          sorting: ""
        },
        {
          key: "FirstName",
          text: "名字",
          sorting: ""
        },
        {
          key: "MiddleName",
          text: "中间名",
          sorting: ""
        },
        {
          key: "MRN",
          //width: '60px',
          text: "病历号",
          sorting: ""
        },
        {
          key: "backupTimeStamp",
          //width: '60px',
          text: "备份时间",
          sorting: ""
          // template: function(createDate, rowObject){
          //  return new Date(createDate).format('YYYY-MM-DD HH:mm:ss');
          // }
        },
        {
          key: "backupFileName",
          text: "备份文件名称"
        },
        {
          key: "backupFileSize",
          text: "备份文件大小"
        },
        {
          key: "size",
          text: "数据容量"
          //width: '60px',
          //sorting: 'ASC'
        }
      ]
    },
    function(query) {
      // 渲染完成后的回调函数
      console.log(query);
    }
  );
}
backupInit();

var pendingTable = document.querySelector('#backup-pending-table');

const getPendingData = function(params) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', 'http://192.168.1.16:3000/backupPending');
        xhr.setRequestHeader('Content-Type', 'multipart/form-data');
        xhr.onreadystatechange = function() {
            if (xhr.readyState !== 4) {
                return;
            }
            if (xhr.status >= 200 && xhr.status < 300 || xhr.status === 304) {
                resolve(xhr.response);
                var backupPendingNumber=JSON.parse(xhr.response).number,
                    backupPendingSize=JSON.parse(xhr.response).size
                document.querySelector(".data-meta-pending-number").innerHTML=backupPendingNumber
                document.querySelector(".data-meta-pending-size").innerHTML=backupPendingSize
                var result=JSON.parse(xhr.response)
            } else {
                reject(xhr);
            }
        };

        // 一个简单的处理参数的示例
        let formData = '';
        for (let key in params) {
            if(formData !== '') {
                formData += '&';
            }
            formData += key + '=' + params[key];
        }
        xhr.send(formData);
    });
};

pendingTable.GM('init',{
  supportRemind: false
  ,gridManagerName: 'pending-table'
  ,isCombSorting: false
  //,height: '400px'
  ,supportCheckbox:false
  ,useRowCheck:false
  ,useRadio:false
  ,supportAjaxPage:false
  ,supportSorting: true
  ,emptyTemplate: '<div class="gm-emptyTemplate">没有符合当前要求的数据</div>'
  ,ajaxData:  function(settings, params) {
      // 传入参数信息
      return getPendingData(params); 
    }
  ,query: {}
  ,pageSize:20
  ,columnData: [{
      key: 'patientid',
      remind: '',
      text: '编号',
      sorting: '',
    },{
      key: 'lastname',
      remind: '',
      text: '姓氏',
      sorting: ''
    },{
      key: 'firstname',
      remind: '',
      text: '名字',
      sorting: ''
    },{
      key: 'middlename',
      remind: '',
      text: '中间名字',
      sorting: ''
    },{
      key: 'medicalrecordnumber',
      remind: '',
      text: '病历号',
      sorting: ''
    },{
      key: 'primaryphysician',
      remind: '',
      text: '主管医生'
    },{
      key: 'comment',
      remind: '',
      text: '备注'
    },{
      key: 'planLockDate',
      text: '计划锁定日期',
    },{
      key: 'lastmodifiedtimestamp',
      remind: '',
      text: '最近修改',
      sorting: ''
    },{
      key: 'patientpath',
      remind: '',
      text: '文件夹路径',
    }
  ]
},callBack=>{
  //console.log(callBack)
});
// 绑定搜索事件
document
  .querySelector('[name="search-string"]')
  .addEventListener("input", function() {
    var _query = {
      searchString: document
        .querySelector('[name="search-string"]')
        .value.replace(/[^a-zA-Z0-9\s\_\-]/g, "")
    };
    table.GM("setQuery", _query).GM("refreshGrid", function() {
      console.log("搜索成功...");
    });
  });

  var loginUser=Cookies.getJSON('userInfo');
  document.getElementById('user-info').innerHTML=loginUser.userName; 
  document.querySelector('.logout').addEventListener("click",event=>{
    console.log(event)
    Cookies.remove('userInfo');
    Cookies.remove('rtpmsLogin');
    window.location.href="http://192.168.1.16:3000/";
    exit;
  })
},{"./js.cookie.js":3,"child_process":1,"fs":1}],3:[function(require,module,exports){
/*!
 * JavaScript Cookie v2.2.1
 * https://github.com/js-cookie/js-cookie
 *
 * Copyright 2006, 2015 Klaus Hartl & Fagner Brack
 * Released under the MIT license
 */
;(function (factory) {
	var registeredInModuleLoader;
	if (typeof define === 'function' && define.amd) {
		define(factory);
		registeredInModuleLoader = true;
	}
	if (typeof exports === 'object') {
		module.exports = factory();
		registeredInModuleLoader = true;
	}
	if (!registeredInModuleLoader) {
		var OldCookies = window.Cookies;
		var api = window.Cookies = factory();
		api.noConflict = function () {
			window.Cookies = OldCookies;
			return api;
		};
	}
}(function () {
	function extend () {
		var i = 0;
		var result = {};
		for (; i < arguments.length; i++) {
			var attributes = arguments[ i ];
			for (var key in attributes) {
				result[key] = attributes[key];
			}
		}
		return result;
	}

	function decode (s) {
		return s.replace(/(%[0-9A-Z]{2})+/g, decodeURIComponent);
	}

	function init (converter) {
		function api() {}

		function set (key, value, attributes) {
			if (typeof document === 'undefined') {
				return;
			}

			attributes = extend({
				path: '/'
			}, api.defaults, attributes);

			if (typeof attributes.expires === 'number') {
				attributes.expires = new Date(new Date() * 1 + attributes.expires * 864e+5);
			}

			// We're using "expires" because "max-age" is not supported by IE
			attributes.expires = attributes.expires ? attributes.expires.toUTCString() : '';

			try {
				var result = JSON.stringify(value);
				if (/^[\{\[]/.test(result)) {
					value = result;
				}
			} catch (e) {}

			value = converter.write ?
				converter.write(value, key) :
				encodeURIComponent(String(value))
					.replace(/%(23|24|26|2B|3A|3C|3E|3D|2F|3F|40|5B|5D|5E|60|7B|7D|7C)/g, decodeURIComponent);

			key = encodeURIComponent(String(key))
				.replace(/%(23|24|26|2B|5E|60|7C)/g, decodeURIComponent)
				.replace(/[\(\)]/g, escape);

			var stringifiedAttributes = '';
			for (var attributeName in attributes) {
				if (!attributes[attributeName]) {
					continue;
				}
				stringifiedAttributes += '; ' + attributeName;
				if (attributes[attributeName] === true) {
					continue;
				}

				// Considers RFC 6265 section 5.2:
				// ...
				// 3.  If the remaining unparsed-attributes contains a %x3B (";")
				//     character:
				// Consume the characters of the unparsed-attributes up to,
				// not including, the first %x3B (";") character.
				// ...
				stringifiedAttributes += '=' + attributes[attributeName].split(';')[0];
			}

			return (document.cookie = key + '=' + value + stringifiedAttributes);
		}

		function get (key, json) {
			if (typeof document === 'undefined') {
				return;
			}

			var jar = {};
			// To prevent the for loop in the first place assign an empty array
			// in case there are no cookies at all.
			var cookies = document.cookie ? document.cookie.split('; ') : [];
			var i = 0;

			for (; i < cookies.length; i++) {
				var parts = cookies[i].split('=');
				var cookie = parts.slice(1).join('=');

				if (!json && cookie.charAt(0) === '"') {
					cookie = cookie.slice(1, -1);
				}

				try {
					var name = decode(parts[0]);
					cookie = (converter.read || converter)(cookie, name) ||
						decode(cookie);

					if (json) {
						try {
							cookie = JSON.parse(cookie);
						} catch (e) {}
					}

					jar[name] = cookie;

					if (key === name) {
						break;
					}
				} catch (e) {}
			}

			return key ? jar[key] : jar;
		}

		api.set = set;
		api.get = function (key) {
			return get(key, false /* read as raw */);
		};
		api.getJSON = function (key) {
			return get(key, true /* read as json */);
		};
		api.remove = function (key, attributes) {
			set(key, '', extend(attributes, {
				expires: -1
			}));
		};

		api.defaults = {};

		api.withConverter = init;

		return api;
	}

	return init(function () {});
}));

},{}]},{},[2]);
