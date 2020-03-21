var backupNumber, backupSize;
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
        var backupNumber = JSON.parse(xhr.response).backupTotalNumber,
          backupSize = JSON.parse(xhr.response).backupTotalSize,
          defaultSelectedInstitution = JSON.parse(xhr.response)
            .defaultSelectedInstitution;
        document.querySelector(
          ".data-meta-backup-number"
        ).innerHTML = backupNumber;
        document.querySelector(".data-meta-backup-size").innerHTML = backupSize;
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
table.GM({
  supportRemind: true,
  gridManagerName: "backupData",
  //      ,disableCache:true
  isCombSorting: false,
  height: "600px",
  supportAjaxPage: true,
  supportSorting: true,
  supportAutoOrder: true,
  ajaxData: function(settings, params) {
    // 传入参数信息
    return getBackupData(params);
  },
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
      key: "size",
      text: "文件大小"
      //width: '60px',
      //sorting: 'ASC'
    }
  ],
  // 分页前事件
  pagingBefore: function(query) {
    console.log("pagingBefore", query);
  },
  // 分页后事件
  pagingAfter: function(data) {
    console.log("pagingAfter", data);
  },
  // 排序前事件
  sortingBefore: function(data) {
    console.log("sortBefore", data);
  },
  // 排序后事件
  sortingAfter: function(data) {
    console.log("sortAfter", data);
  },
  // 宽度调整前事件
  adjustBefore: function(event) {
    console.log("adjustBefore", event);
  },
  // 宽度调整后事件
  adjustAfter: function(event) {
    console.log("adjustAfter", event);
  },
  // 拖拽前事件
  dragBefore: function(event) {
    console.log("dragBefore", event);
  },
  // 拖拽后事件
  dragAfter: function(event) {
    console.log("dragAfter", event);
  }
});

var pendingTable = document.querySelector("#backup-pending-table");

const getPendingData = function(params) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "http://192.168.1.16:3000/backupPending");
    xhr.setRequestHeader("Content-Type", "multipart/form-data");
    xhr.onreadystatechange = function() {
      if (xhr.readyState !== 4) {
        return;
      }
      if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 304) {
        resolve(xhr.response);
        var backupPendingNumber = JSON.parse(xhr.response).number,
          backupPendingSize = JSON.parse(xhr.response).size;
        document.querySelector(
          ".data-meta-pending-number"
        ).innerHTML = backupPendingNumber;
        document.querySelector(
          ".data-meta-pending-size"
        ).innerHTML = backupPendingSize;
        var result = JSON.parse(xhr.response);
      } else {
        reject(xhr);
      }
    };

    // 一个简单的处理参数的示例
    let formData = "";
    for (let key in params) {
      if (formData !== "") {
        formData += "&";
      }
      formData += key + "=" + params[key];
    }
    xhr.send(formData);
  });
};

pendingTable.GM(
  "init",
  {
    supportRemind: false,
    gridManagerName: "pending-table",
    isCombSorting: false,
    height: "400px",
    supportCheckbox: false,
    useRowCheck: false,
    useRadio: false,
    supportAjaxPage: false,
    supportSorting: true,
    emptyTemplate: '<div class="gm-emptyTemplate">没有符合当前要求的数据</div>',
    ajaxData: function(settings, params) {
      // 传入参数信息
      return getPendingData(params);
    },
    query: {},
    pageSize: 20,
    columnData: [
      {
        key: "patientid",
        remind: "",
        text: "编号",
        sorting: ""
      },
      {
        key: "lastname",
        remind: "",
        text: "姓氏",
        sorting: ""
      },
      {
        key: "firstname",
        remind: "",
        text: "名字",
        sorting: ""
      },
      {
        key: "middlename",
        remind: "",
        text: "中间名字",
        sorting: ""
      },
      {
        key: "medicalrecordnumber",
        remind: "",
        text: "病历号",
        sorting: ""
      },
      {
        key: "primaryphysician",
        remind: "",
        text: "主管医生"
      },
      {
        key: "comment",
        remind: "",
        text: "备注"
      },
      {
        key: "planLockDate",
        text: "计划锁定日期"
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
      }
    ]
  },
  callBack => {
    //console.log(callBack)
  }
);

// 日期格式化,不是插件的代码,只用于处理时间格式化
Date.prototype.format = function(fmt) {
  var o = {
    "M+": this.getMonth() + 1, //月份
    "D+": this.getDate(), //日
    "d+": this.getDate(), //日
    "H+": this.getHours(), //小时
    "h+": this.getHours(), //小时
    "m+": this.getMinutes(), //分
    "s+": this.getSeconds(), //秒
    "q+": Math.floor((this.getMonth() + 3) / 3), //季度
    S: this.getMilliseconds() //毫秒
  };
  if (/([Y,y]+)/.test(fmt)) {
    fmt = fmt.replace(
      RegExp.$1,
      (this.getFullYear() + "").substr(4 - RegExp.$1.length)
    );
  }
  for (var k in o) {
    if (new RegExp("(" + k + ")").test(fmt)) {
      fmt = fmt.replace(
        RegExp.$1,
        RegExp.$1.length == 1 ? o[k] : ("00" + o[k]).substr(("" + o[k]).length)
      );
    }
  }
  return fmt;
};

// 绑定搜索事件
document
  .querySelector('[name="search-Backup"]')
  .addEventListener("change", function() {
    refreshBackupList();
  });
document
  .querySelector('[name="search-Backup"]')
  .addEventListener("input", function() {
    refreshBackupList();
  });

function refreshBackupList() {
  var _query = {
    searchString: document
      .querySelector('[name="search-Backup"]')
      .value.replace(/[^a-zA-Z0-9\-\_\s\/]/g, "")
  };
  table.GM("setQuery", _query).GM("refreshGrid", function() {});
}
