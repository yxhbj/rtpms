var fs = require('fs')
var express = require('express');
var router = express.Router();
var utils = require('../public/javascripts/utils');
var sortList=utils.sortList;
var getSettings=utils.getSettings;

/* GET backup home page. */
router.get('/', function(req, res, next) {
  res.render('backup', { title: 'iRT Service' });
});

/* POST backup data list. */
router.post("/backupData", async function(req, res, next) {
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
      var newBl = [];
      //console.log(objPage)
      utils.readDataFile(settings.institution.backupedFileName).then(data => {
        var resBl = data,
          backupTotalNumber = resBl.length,
          backupTotalSize = 0;
        resBl = resBl.map(b => {
          b.backupTimeStamp = b.institution.BackupTimeStamp;
          b.backupFileName = b.institution.BackupFileName;
          b.backupFileSize = b.institution.BackupFileSize;
          b.size = b.institution.PatientLiteList.PatientLite.DirSize;
          backupTotalSize += b.size / 1000;
          b.size = b.size.toFixed(2) + "MB";
          return b;
        });
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
        if (searchStr != "" && searchStr != undefined) {
          var reg = new RegExp(searchStr, "ig");
          //console.log(regName)
          resBl = resBl.filter(m => {
            if (
              m["LastName"].match(reg) ||
              m["FirstName"].match(reg) ||
              m["MiddleName"].match(reg) ||
              m["MRN"].match(reg) ||
              m.institution.BackupFileName.match(reg) ||
              m.institution.BackupTimeStamp.match(reg)
            ) {
              return m;
            }
          });
        }
        pageData = resBl.slice(
          (+objPage.cPage < 1 ? 0 : +objPage.cPage - 1) * +objPage.pSize,
          (+objPage.cPage < 1 ? 1 : +objPage.cPage) * +objPage.pSize
        );
        utils.getServers().then(servers=>{
          var server=servers.filter(s=>{
            if(s.ip==settings.pgConfig.host) {
              return s;
            }
          })[0];
          utils.getSysInfo(server).then(sysInfo=>{
            res.write(
              JSON.stringify({
                data: pageData,
                totals: resBl.length,
                backupTotalNumber: backupTotalNumber,
                backupTotalSize: backupTotalSize.toFixed(2),
                defaultSelectedInstitution: settings.institution.defaultInstitution,
                backupServerDisk: sysInfo.disk
              })
            );
            res.end();
          })
        })
      });
    });
  } catch (e) {
    console.log(e);
  }
});

/* POST backup pending list. */
router.post("/backupPending", async function(req, res, next) {
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
      fs.readFile(settings.institution.backupPendingFileName, (err, data) => {
        if (err) {
          console.log(err.stack);
          return;
        }
        var resBl = JSON.parse(data.toString()).data,
          backupPendingNumber = resBl.length,
          backupPendingSize = 0;
        resBl.forEach(b => {
          backupPendingSize += b.dirsize / 1000;
        });
        if (sortBy != "") {
          sortList(
            resBl,
            sortBy.replace(/^sort_/, ""),
            sortAscent,
            sortedBl => {
              resBl = sortedBl;
              //console.log(sortedBl,{'data':sortedBl,'totals':sortedBl.length})
            }
          );
        }
        res.write(
          JSON.stringify({
            data: resBl,
            totals: resBl.length,
            number: backupPendingNumber,
            size: backupPendingSize.toFixed(2)
          })
        );
        res.end();
      });
    });
  } catch (e) {
    console.log(e);
  }
});

module.exports = router;
