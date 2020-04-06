"use strict";
var express = require("express");
var router = express.Router();
var utils = require("../base/utils");
var sortList = utils.sortList;
var getSettings = utils.getSettings;
var app = express();
var uri=`http://localhost:${app.get('port')}`;

/* GET home page. */
router.get("/", function(req, res) {
  res.render("../views/index", { title: "放疗数据管理" });
});
// /* GET home page. */
// router.get("/index", function(req, res) {
//   res.render("index", { title: "放疗数据管理" });
// });

// /* POST institution data list. */
// router.post("/institution", async function(req, res, next) {
//   var settings = await getSettings();
//   try {
//     let reqData = "";
//     req.on("data", function(dataChunk) {
//       reqData += decodeURIComponent(dataChunk);
//     });
//     req.on("end", function() {
//       res.setHeader("Content-Type", "application/json;charset=utf-8");
//       res.setHeader("Access-Control-Allow-Origin", "*");
//       var objPage = {},
//         sortBy = "",
//         sortAscent = true,
//         pageData = [];
//       var arr = reqData.split("&").map(m => {
//         var item = m.split("=");
//         objPage[item[0]] = item[1];
//       });
//       for (var a in objPage) {
//         if (a.substr(0, 5) == "sort_") {
//           sortBy = a;
//           sortAscent = objPage[a] == "ASC" ? true : false;
//         }
//       }
//       fs.readFile(settings.institution.institutionFileName, (err, data) => {
//         if (err) {
//           console.log(err.stack);
//           return;
//         }
//         var resBl = JSON.parse(data.toString()).data;
//         if (sortBy != "") {
//           sortList(
//             resBl,
//             sortBy.replace(/^sort_/, ""),
//             sortAscent,
//             sortedBl => {
//               resBl = sortedBl;
//             }
//           );
//         }
//         res.write(
//           JSON.stringify({
//             data: resBl,
//             totals: resBl.length,
//             settings: settings
//           })
//         );
//         res.end();
//       });
//     });
//   } catch (e) {
//     console.log(e);
//   }
// });

/* POST patient data list. */
router.post("/patient", async function(req, res, next) {
  let reqData = "";
  req.on("data", function(dataChunk) {
    reqData += decodeURIComponent(dataChunk);
  });
  req.on("end", function() {
    res.setHeader("Content-Type", "application/json;charset=utf-8");
    res.setHeader("Access-Control-Allow-Origin", "*");
    var objPage = {}

    reqData.split("&").forEach(m => {
      var item = m.split("=");
      objPage[item[0]] = item[1];
    });
    console.log(objPage);
    getSettings().then(settings=>{
      utils.getPgData("patient",objPage).then(data => {
        utils.getPgData("server",{"ip":`'${settings.pgConfig.host}'`}).then(servers=>{
          var server=servers.data[0];
          data.settings=settings
          data.dbServerDisk=server.disk
          res.write(JSON.stringify(data));
          res.end();
        }).catch(err => (err));
      })
      .catch(err => (err));
    })
    .catch(err => (err));
  });
});

/* POST plan data list. */
router.post("/plan", function(req, res, next) {
  try {
    let reqData = "";
    req.on("data", function(dataChunk) {
      reqData += decodeURIComponent(dataChunk);
    });
    req.on("end", function() {
      res.setHeader("Content-Type", "application/json;charset=utf-8");
      res.setHeader("Access-Control-Allow-Origin", "*");
      var objPage = {};
      reqData.split("&").forEach(m => {
        var item = m.split("=");
        objPage[item[0]] = item[1];
      });
      console.log(objPage)
      utils.getPgData("plan",objPage).then(data => {
        res.write(JSON.stringify(data));
        res.end();
      })
      .catch(err => (err));
    });
  } catch (e) {
    console.log(e);
  }
});


/* POST imageset data list. */
router.post("/image", async function(req, res, next) {
  //var resBl = utils.getImageData()
  //console.log(resBl)
  try {
    let reqData = "";
    req.on("data", function(dataChunk) {
      reqData += decodeURIComponent(dataChunk);
    });
    req.on("end", function() {
      res.setHeader("Content-Type", "application/json;charset=utf-8");
      res.setHeader("Access-Control-Allow-Origin", "*");
      var objPage = {};
      reqData.split("&").forEach(m => {
        var item = m.split("=");
        objPage[item[0]] = item[1];
      });
      console.log(objPage)
      utils.getPgData("images",objPage).then(data => {
        res.write(JSON.stringify(data));
        res.end();
      })
      .catch(err => (err));
    });
  } catch (e) {
    console.log(e);
  }
});

/* POST treatment data list. */
router.post("/treatment", async function(req, res, next) {
  var settings = await getSettings();
  try {
    let reqData = "";
    req.on("data", function(dataChunk) {
      reqData += decodeURIComponent(dataChunk);
    });
    req.on("end", function() {
      res.setHeader("Content-Type", "application/json;charset=utf-8");
      res.setHeader("Access-Control-Allow-Origin", "*");
      var objPage = {},
        sortBy = "",
        sortAscent = true,
        pageData = [];
      var arr = reqData.split("&").map(m => {
        var item = m.split("=");
        objPage[item[0]] = item[1];
      });
      for (var a in objPage) {
        if (a.substr(0, 5) == "sort_") {
          sortBy = a;
          sortAscent = objPage[a] == "ASC" ? true : false;
        }
      }
      var searchStr = objPage["searchString"];
      console.log(objPage);
      utils
        .readDataFile(settings.institution.patientFileName)
        .then(data => {
          var resBl = data.data;
          if (sortBy != "") {
            sortList(
              resBl,
              sortBy.replace(/^sort_/, ""),
              sortAscent,
              sortedBl => {
                resBl = sortedBl;
              }
            );
          }
          //按照名字和病历号搜索病人
          if (searchStr != "" && searchStr != undefined) {
            var reg = new RegExp(searchStr, "ig");
            resBl = resBl.filter(m => {
              if (
                m.firstname.match(reg) ||
                m.lastname.match(reg) ||
                m.middlename.match(reg) ||
                m.medicalrecordnumber.match(reg)
              ) {
                return m;
              }
            });
          }
          //分页显示
          pageData = resBl.slice(
            (+objPage.cPage < 1 ? 0 : +objPage.cPage - 1) * +objPage.pSize,
            (+objPage.cPage < 1 ? 1 : +objPage.cPage) * +objPage.pSize
          );
          res.write(
            JSON.stringify({
              data: pageData,
              totals: resBl.length,
              settings: settings
            })
          );
          res.end();
        })
        .catch(err => console.log(err));
    });
  } catch (e) {
    console.log(e);
  }
});
/* POST open plan. */
router.post("/openPlan", async function(req, res, next) {
  if (JSON.stringify(req.body) != "{}") {
    var plan = req.body;
    utils.exportPlanInfo(plan);
  }
});
/* POST patient data list. */
router.post("/deletePatient", async function(req, res, next) {
  if (JSON.stringify(req.body) != "{}") {
    var patients = req.body;
    utils.deletePatient(patients).then(result=>{
      console.log(result)
      res.write(JSON.stringify(result));
      res.end();
    }).catch(e=>console.log(e))
  }
});

/* POST backup data list. */
router.post("/backupData", async function(req, res, next) {
  var settings = await getSettings();
  let reqData = "";
  let objPage = {};
  req.on("data", function(dataChunk) {
    reqData += decodeURIComponent(dataChunk);
  });
  req.on("end", function() {
    res.setHeader("Content-Type", "application/json;charset=utf-8");
    res.setHeader("Access-Control-Allow-Origin", "*");
    var arr = reqData.split("&").map(m => {
      var item = m.split("=");
      objPage[item[0]] = item[1];
    });
    console.log(objPage)
    utils.getPgData("backup",objPage).then(result => {
      var backupTotalSize = 0;
      result.data = result.data.map(b => {
        b.backuptimestamp = b.institution.BackupTimeStamp;
        b.backupfilename = b.institution.BackupFileName;
        b.backupfilesize = b.institution.BackupFileSize;
        b.size = b.institution.PatientLiteList.PatientLite.DirSize;
        backupTotalSize += b.size / 1000;
        b.size = b.size.toFixed(2) + "MB";
        return b;
      });
      utils.getServers().then(servers=>{
        var server=servers.filter(s=>s.ip==settings.pgConfig.host)[0];
        result.backupTotalNumber = result.totals;
        result.backupTotalSize = backupTotalSize.toFixed(2);
        result.defaultSelectedInstitution = settings.institution.defaultInstitution;
        result.backupServerDisk = server.disk;
        // console.log(result.totals)    
        res.write(JSON.stringify(result))
        res.end();
      }).catch(e=>console.log(e));
    }).catch(e=>console.log(e));
  });
});

/* POST backup pending list. */
router.post("/backupPending", async function(req, res, next) {
  try {
    var settings = await getSettings();
    let reqData = "";
    req.on("data", function(dataChunk) {
      reqData += decodeURIComponent(dataChunk);
    });
    req.on("end", function() {
      res.setHeader("Content-Type", "application/json;charset=utf-8");
      res.setHeader("Access-Control-Allow-Origin", "*");

      var objPage = {};
      if(reqData!=''){
        reqData.split("&").forEach(m => {
          var item = m.split("=");
          objPage[item[0]] = item[1];
        });
      }
      console.log(objPage)
      //objPage.backuptimestamp='1';

      utils.getPgData("patient", objPage).then(result => {
        result.number = result.data.length;
        var backupPendingSize = 0;
        result.data.forEach(b => {
          backupPendingSize += b.dirsize / 1024;
        });
        result.size=backupPendingSize.toFixed(0)

        res.write(
          JSON.stringify(result)
        );
        res.end();
      }).catch (function(e) {
        console.log(e)
      });
    });
  } catch (e) {
    console.log(e);
  }
});

/* POST settings. */
router.post("/settings", async function(req, res, next) {
  var settings = await getSettings();
  if (JSON.stringify(req.body) != "{}") {
    settings = req.body;
    utils.setSettings(settings);
  }
  res.setHeader("Access-Control-Allow-Origin", uri);
  res.setHeader("Content-Type", "application/json;charset=utf-8");
  utils.getInstList().then(instList=>{
    settings.institution.institutions=instList
    res.write(JSON.stringify(settings));
    res.end();
  }).catch(e=>console.log(e))
});

/* POST data synchronization. */
router.post('/synchronization', function(req, res, next) {
  getSettings().then(settings=>{
    utils.updateDatabase(settings);
  }).catch(e=>console.log(e))
});

/* POST server list. */
router.post('/servers', async function(req, res, next) {
  var type=["nodeServer","planningServer","standaloneServer","storageServer"]
  var servers = await utils.getServers();
  //console.log(servers)
  if (JSON.stringify(req.body)!='{}'){
    servers=req.body
    console.log(servers)
    utils.setServers(servers);
  }
  res.setHeader("Content-Type", "application/json;charset=utf-8" );    
  // servers=servers.map(async server=>{
  //   try{
  //     try {
  //       const sysInfo = await utils.getSysInfo(server);
  //       server.logs = sysInfo.logs;
  //       server.disk = sysInfo.disk;
  //       return server;
  //     }
  //     catch (e) {
  //       return server;
  //     }
  //   }
  //   catch(err){
  //     console.log(err)
  //   }
  // })
  res.write(JSON.stringify(servers));
  res.end();
})

/* POST server logs. */
router.post('/sysInfo', async function(req, res, next) {
  var server;
  if (JSON.stringify(req.body)!='{}'){
    server=req.body;
  }
  res.setHeader("Content-Type", "application/json;charset=utf-8" );    
  utils.getSysInfo(server).then(sysInfo=>{
    server.logs = sysInfo.logs;
    res.write(JSON.stringify(server));
    res.end();
  })
  .catch(err=>{
    console.log(err)
  })
})


/* POST login */
router.post('/login', async function(req, res, next) {
  var user;
  if (JSON.stringify(req.body)!='{}'){
    user=req.body;
  }
  res.setHeader("Content-Type", "application/json;charset=utf-8" );    
  utils.getUsers().then(users=>{
    var userInfo = users.filter(u=>{
      if(u.loginName===user.loginName&&u.password===user.password) return u
    });
    res.write(JSON.stringify(userInfo));
    res.end();
  })
  .catch(err=>{
    console.log(err)
  })
})

module.exports = router;
