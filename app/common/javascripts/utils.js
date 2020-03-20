var request = require("request"),
  fs = require("fs"),
  appPath = __dirname,
  schedule = require("node-schedule");

const electronSettings = require("electron-settings");

//----------------------------------ssh section-------------------------

const node_ssh = require("node-ssh"); // ssh连接服务器

function execCommands(config, commands) {
  return new Promise((resolve, reject) => {
    const ssh = new node_ssh();
    ssh
      .connect(config)
      .then(() => {
        Promise.all(
          commands.map(it => {
            return execCommand(it, ssh)
              .then(result => result)
              .catch(e => e);
          })
        )
          .then(res => {
            ssh.dispose();
            resolve(res);
          })
          .catch(e => reject(e));
      })
      .catch(e => reject(e));
  });
}

function execCommand(command, ssh) {
  return new Promise((resolve, reject) => {
    ssh
      .exec(command, [], {
        stream: "stdout",
        options: { pty: true, maxBuffer: 1024 * 2000 }
      })
      .then(function(result) {
        resolve(result.toString());
      });
  });
}

//----------------------------------fs section-------------------------

function readDataFile(fileName) {
  return new Promise((resolve, reject) => {
    fs.readFile(fileName, (err, data) => {
      if (err) {
        reject("notExist");
      } else {
        data = data.toString();
        if (
          data.length == 0 ||
          data == "[]" ||
          data == "{}" ||
          data == "" ||
          data == null ||
          data == undefined
        ) {
          reject("empty");
        } else {
          try {
            var jsonData = JSON.parse(data.toString());
            resolve(jsonData);
          } catch (e) {
            setTimeout(() => {
              try {
                readDataFile(fileName);
              } catch (err) {
                reject(invalidateData);
              }
            }, 1000);
            return e;
          }
        }
      }
    });
  });
}

//Write to file
function writeDataFile(tableName, fileName, data) {
  var ws = fs.createWriteStream(fileName, { start: 0 });
  var buffer = new Buffer.from(JSON.stringify(data));
  ws.write(buffer, "utf8", function(err, buffer) {
    console.log(err ? err : `Write ${tableName} completely finished.`);
  });
  ws.end("");
}

function writeFile(table, fileData) {
  //Write to file
  var ws = fs.createWriteStream(table.fileName, { start: 0 });
  var buffer = new Buffer.from(JSON.stringify(fileData));
  ws.write(buffer, "utf8", function(err, buffer) {
    console.log(`Write ${table.tbName} completely finished`);
  });
  ws.end("");
}

//----------------------------------setting section-------------------------

function defaultSettings() {
  return {
    backup: {
      startTime: "01:00",
      autoDeletePatient: 0,
      capacityUpperLimit: 80,
      backupNumberPerDay: 20,
      backupLockedOnly: 1
    },
    pgConfig: {
      host: "220.194.46.182",
      user: "postgres",
      database: "clinical",
      password: "postgres",
      port: 5432,
      max: 20,
      idleTimeoutMillis: 1000 // 1s
    },
    institution: {
      pgServerID: 2,
      defaultInstitution: 0,
      institutions: [{ id: 0, name: "institution_0" }],
      backupedFileName: "database/backuped.json",
      backupPendingFileName: "database/backupPending.json",
      institutionFileName: "database/institution.json",
      patientFileName: "database/patient.json",
      planFileName: "database/plan.json"
    }
  };
}

//read settings
function getSettings() {
  return new Promise((resolve, reject) => {
    var settings = electronSettings.get("appSetting", defaultSettings());
    setSettings(settings);
    resolve(settings);
  });
}

function setSettings(settings) {
  electronSettings.set("appSetting", settings);
}

function updateSettings() {
  getSettings()
    .then(settings => {
      getInstList(settings.pgConfig)
        .then(result => {
          settings.institution.institutions = result;
          setSettings(settings);
          return settings;
        })
        .catch(error => console.log(error));
    })
    .catch(error => console.log(error));
}

function getInstList(pgConfig) {
  const pg = require("pg");
  var pool = new pg.Pool(pgConfig);
  var _query = "SELECT institutionid AS id,name FROM institution";
  return new Promise((resolve, reject) => {
    pool.connect(function(err, client, done) {
      if (err) {
        reject(err);
      } else {
        client.query(_query, function(err, result) {
          done();
          if (err) {
            reject(err);
          } else {
            resolve(result.rows);
          }
        });
      }
    });
  });
}

//----------------------------------server section-------------------------

//read server list
function getServers() {
  return new Promise((resolve, reject) => {
    var servers = electronSettings.get("servers");
    resolve(servers);
  });
}

function setServers(servers) {
  electronSettings.set("servers", servers);
}

function updateServers() {
  getServers()
    .then(data => {
      Promise.all(
        data.map(s => {
          if (JSON.stringify(s) != "{}") {
            return getSysInfo(s)
              .then(sysInfo => {
                s.logs = sysInfo.logs;
                s.disk = sysInfo.disk;
                return s;
              })
              .catch(e => s);
          } else {
            return defaultServers();
          }
        })
      )
        .then(res => {
          setServers(res);
        })
        .catch(setServers(defaultServers()));
    })
    .catch(err => {
      setServers(defaultServers());
    });
}
function getSysInfo(s) {
  return new Promise((resolve, reject) => {
    var config = {
      host: s.ip,
      username: s.loginName,
      password: s.password
    };
    var volume = s.storageVolume.match(/^\/[^\/]*/)[0];
    var logCmd = "cat /var/adm/messages",
      diskCmd = `df -h | grep ${volume}`;
    diskUseCmd = `du -sah ${s.storageVolume}`;
    if (s.os != "Solaris") {
      logCmd = "cat /var/log/dmesg /var/log/log*";
    }
    execCommands(config, [logCmd, diskCmd, diskUseCmd])
      .then(result => {
        //console.log(logCmd,result)
        var sysInfo = {};
        sysInfo.logs = result[0];
        sysInfo.disk = {
          total: result[1].toString().match(/[\.\d]+[M|G||T]/)[0],
          used: result[2].toString().match(/[\.\d]+[M|G||T]/)[0],
          usage: result[1].toString().match(/[\.\d]+%/)[0]
        };
        resolve(sysInfo);
      })
      .catch(e => reject(e));
  });
}

function defaultServers() {
  return [
    {
      id: 0,
      server: "dell",
      ip: "220.194.46.182",
      backupDirectory: "/autoDataSets/NFSarchive/",
      storageVolume: "/PrimaryPatientData",
      loginName: "p3rtp",
      password: "p3rtp123",
      type: "BackupServer",
      os: "Solaris"
    },
    {
      id: 1,
      server: "synology",
      ip: "220.194.46.182",
      backupDirectory: "/autoDataSets/NFSarchive/",
      storageVolume: "/PrimaryPatientData",
      loginName: "p3rtp",
      password: "p3rtp123",
      type: "BackupServer",
      os: "Solaris"
    },
    {
      id: 2,
      server: "oracle x6-2",
      ip: "220.194.46.182",
      backupDirectory: "/autoDataSets/NFSarchive/",
      storageVolume: "/PrimaryPatientData",
      loginName: "p3rtp",
      password: "p3rtp123",
      type: "StandaloneServer",
      os: "Solaris"
    },
    {
      id: 3,
      server: "oracle x3-2",
      ip: "220.194.46.182",
      backupDirectory: "/autoDataSets/NFSarchive/",
      storageVolume: "/PrimaryPatientData",
      loginName: "p3rtp",
      password: "p3rtp123",
      type: "PlanningServer",
      os: "Solaris"
    }
  ];
}

function initServers() {
  var type = [
    "nodeServer",
    "planningServer",
    "standaloneServer",
    "storageServer"
  ];
  getServers()
    .then(result => {
      console.log("It looks like server list was set already!");
    })
    .catch(error => {
      var servers = defaultServers();
      setServers(servers);
    });
}

//----------------------------------user section-------------------------

function sampleUser() {
  return [
    {
      id: 0,
      username: "",
      gender: "",
      cellPhone: "",
      email: "",
      loginName: "",
      password: "",
      role: ""
    }
  ]
}
//read user list
function getUsers() {
  return new Promise((resolve, reject) => {
    var users = electronSettings.get("users",sampleUser());
    resolve(users);
  });
}

function setUsers(users) {
  electronSettings.set("users", users);
}

function updateUsers(users) {
  electronSettings.set("users", users);
}

//----------------------------------backup section-------------------------

function updateBackupedFile() {
  schedule.scheduleJob("0 * * * * *", () => {
    updateBackupData();
  });
}

//get backup data from backuped files
async function getBackupData(settings) {
  try {
    return await readDataFile(settings.institution.backupedFileName);
  } catch (err) {
    return [];
  }
}

//update backup data
function updateBackupData() {
  readBackupedFileList()
    .then(system => checkAndWrite(system))
    .catch(err => console.log(err));
}

function readBackupedFileList() {
  return new Promise((resolve, reject) => {
    Promise.all([getSettings(), getServers()])
      .then(system => {
        //console.log(system[0])
        var settings = system[0],
          servers = system[1],
          server = servers.filter(s => {
            if (s.ip == settings.pgConfig.host) {
              return s;
            }
          })[0],
          backupServer = servers.filter(s => {
            if (s.type == "BackupServer") {
              return s;
            }
          }),
          searchVolume=" ";
        backupServer.forEach(f=>searchVolume+=f.backupDirectory+" ")

        var config = {
          host: server.ip,
          username: server.loginName,
          password: server.password
        };
        var cmd = `find ${searchVolume} -type f -name '*.tar' -ls`;
        execCommands(config, [cmd])
          .then(result => {
            var arr = result[0].split("\r\n");
            arr = arr.map(m => {
              var fileInfo = m.replace(/^\s*/, "").split(/\s+/g);
              return {
                fileName: fileInfo[10],
                fileSize: (fileInfo[6] / 1024 / 1024).toFixed(3)
              };
            });
            resolve({
              settings: settings,
              servers: servers,
              config: config,
              data: arr
            });
          })
          .catch(e => e);
      })
      .catch(err => reject(err));
  });
}

function backupValid(backupFiles, bkpData) {
  if (bkpData.length > 0) {
    return bkpData.filter(c => {
      var backupValidation = backupFiles.some(
        m =>
          c.institution.BackupFileName.replace(/\/.*\//, "") ===
          m.fileName.replace(/\/.*\//, "")
      );
      if (backupValidation) {
        return c;
      }
    });
  } else {
    return bkpData;
  }
}

function checkAndWrite(system) {
  getBackupData(system.settings).then(currentBackuped => {
    currentBackuped = backupValid(system.data, currentBackuped);
    var arr_filtered = system.data.filter(m => {
      if (currentBackuped.length > 0) {
        var backupStatus = currentBackuped.some(
          c =>
            c.institution.BackupFileName.replace(/\/.*\//, "") ===
            m.fileName.replace(/\/.*\//, "")
        );
        if (!backupStatus) {
          return m;
        }
      } else {
        return m;
      }
    });
    arr_filtered = arr_filtered.slice(0, 1);
    arr_filtered.map(async function(m) {
      try {
        var resData = await getBackupHeadInfo(system, m);
        resData.forEach(d => {
          currentBackuped.push(d);
        });
        writeDataFile(
          "backuped data",
          system.settings.institution.backupedFileName,
          currentBackuped
        );
      } catch (err) {
        console.log(err);
      }
    });
  });
}

function getBackupHeadInfo(system, data) {
  var cmd = [
    `PinnBackup -restore -source ${data.fileName} -dest /tmp Institution 2>&1;cat /tmp/Institution;rm /tmp/Institution 2>&1`
  ];
  return new Promise(function(resolve, reject) {
    execCommands(system.config, cmd)
      .then(result => {
        inst = result[0].replace(/\\\"\;/g, "").split(";\r\n");
        inst.pop();
        inst = inst
          .join(",")
          .replace(
            /[a-zA-Z0-9]*?\s=\s*/g,
            m => '"' + m.replace(/\s*\=\s*/, "").replace(/^\s*/, "") + '"' + ":"
          )
          .replace(/\r\n/g, "")
          .replace(/\,\s*\}/g, "}")
          .replace(/\"[a-zA-Z]*?List[a-zA-Z]*?\"\:\{.*?(\{.*?\})*\}/g, m => {
            return m
              .replace(/^\".*?\"\:\{/, n => n.replace(/\{$/, "["))
              .replace(/\}$/, "]")
              .replace(/\"[a-zA-Z]*?\"\:\{.*?\}/g, o => "{" + o + "}");
          });
        inst = "{" + inst + "}";
        var instJson = JSON.parse(inst);
        var backupHeadInfo = instJson.PatientLiteList.map(i => {
          var obj = {};
          obj.institution = JSON.parse(JSON.stringify(instJson));
          obj.institution.PatientLiteList = i;
          var description = i.PatientLite.FormattedDescription.split("&&");
          obj.LastName = description[0];
          obj.FirstName = description[1];
          obj.MiddleName = description[2];
          obj.MRN = description[3];
          obj.RadiationOncologist = description[4];
          obj.LastModified = description[5];
          obj.institution.BackupFileSize = data.fileSize;
          obj.institution.BackupFileName = data.fileName;
          return obj;
        });
        resolve(backupHeadInfo);
      })
      .catch(e => reject(e));
  });
}

//----------------------------------prosdb section-------------------------

//update database files
const updateDatabaseFile = () => {
  schedule.scheduleJob("0 */5 * * * *", () => {
    updateDatabase();
  });
};

let getProsData = function(pgConfig, tableName, params) {
  const pg = require("pg");
  var config = pgConfig;
  var pool = new pg.Pool(config);
  var _query = "SELECT * FROM " + tableName;
  var _queryTotal = "select count(*)  as totals from " + tableName;
  if (params.institutionid) {
    _queryTotal += " WHERE institutionid=" + params.institutionid;
    _query += " WHERE institutionid=" + params.institutionid;
  }
  if (params.patientid) {
    _queryTotal += " WHERE patientid=" + params.patientid;
    _query += " WHERE patientid=" + params.patientid;
  }
  if (params.filterName) {
    _queryTotal +=
      " AND (lastname ILIKE '%" +
      params.filterName +
      "%' OR FirstName ILIKE '%" +
      params.filterName +
      "%')";
    _query +=
      " AND (lastname ILIKE '%" +
      params.filterName +
      "%' OR FirstName ILIKE '%" +
      params.filterName +
      "%')";
  }
  if (params.filterId) {
    _queryTotal += " AND (medicalrecordnumber ~*'" + params.filterId + "')";
    _query += " AND (medicalrecordnumber ~*'" + params.filterId + "')";
  }
  if (params.sortBy) {
    _query += " ORDER BY " + params.sortBy;
  }
  if (params.sortAsc) {
    _query += " " + params.sortAsc;
  }
  if (params.size) {
    _query += " LIMIT " + params.size;
  }
  if (params.offset) {
    _query += " OFFSET " + params.offset;
  }
  _query += ";";
  _queryTotal += ";";
  var obj = {};
  //console.log(params,_query)
  return new Promise(function(resolve, reject) {
    pool.connect(function(err, client, done) {
      if (err) {
        return console.error("Connection Error:", err);
      }
      client.query(_queryTotal, function(err, result) {
        if (err) {
          reject(err);
        } else {
          obj["totals"] = result.rows[0].totals;
          client.query(_query, function(err, result) {
            done();
            if (err) {
              reject(err);
            } else {
              obj["data"] = result.rows;
              resolve(obj);
            }
          });
        }
      });
    });
  });
};

let getLockStatus = async function(settings) {
  var servers = await getServers(),
    server = servers.filter(s => {
      if (s.ip == settings.pgConfig.host) {
        return s;
      }
    })[0],
    config = {
      host: server.ip,
      username: server.loginName,
      password: server.password
    },
    cmd =
      "grep PlanLockStatus /usr/local/adacnew/Patients/Institution_*/Mount_*/Patient_*/Plan_*/plan.PlanInfo";
  return new Promise(function(resolve, reject) {
    execCommands(config, [cmd])
      .then(res => {
        var arr = res[0].split("\r\n");
        var result = arr.map(m => {
          var obj = {};
          obj.institutionid = m
            .match(/Institution_[0-9]+/g)[0]
            .match(/[0-9]+/)[0];
          obj.patientid = m.match(/Patient_[0-9]+/g)[0].match(/[0-9]+/)[0];
          obj.planid = m.match(/Plan_[0-9]+/g)[0].match(/[0-9]+/)[0];
          obj.lockStatus = m.match(/\".*\"/g)[0];
          return obj;
        });
        resolve(result);
      })
      .catch(e => reject(e));
  });
};

//read backuped file list and write to database json
function updateDatabase() {
  getSettings().then(settings => {
    var dbList = [
      {
        tbName: "backuped",
        fileName: settings.institution.backupedFileName
      },
      {
        tbName: "backupPending",
        fileName: settings.institution.backupPendingFileName
      },
      {
        tbName: "institution",
        fileName: settings.institution.institutionFileName
      },
      {
        tbName: "patient",
        fileName: settings.institution.patientFileName
      },
      {
        tbName: "plan",
        fileName: settings.institution.planFileName
      }
    ];
    return writeTable(settings, dbList);
  });
}

function writeTable(settings, dbList) {
  var pgConfig = settings.pgConfig;
  Promise.all([
    getProsData(pgConfig, dbList[2].tbName, {}),
    getProsData(pgConfig, dbList[3].tbName, {
      sort_lastmodifiedtimestamp: "ASC"
    }),
    getProsData(pgConfig, dbList[4].tbName, {}),
    readDataFile(settings.institution.backupedFileName),
    getLockStatus(settings)
  ])
    .then(dataSets => {
      var institutionData = dataSets[0],
        patientData = dataSets[1],
        planData = dataSets[2],
        backupData = dataSets[3],
        planLockStatus = dataSets[4];

      writeFile(dbList[2], institutionData);
      planData["data"] = planData["data"].map(p => {
        var lockStatus = planLockStatus.filter(pls =>
          p.patientid == pls.patientid && p.planid == pls.planid ? pls : null
        );
        var planLockTime = lockStatus[0].lockStatus.match(
          /\d{4}\-\d{2}\-\d{2}\s\d{2}\:\d{2}\:\d{2}/
        );
        p["planLockDate"] =
          planLockTime == null ? null : planLockTime[0].substr(0, 10);
        p["planLockTime"] =
          planLockTime == null ? null : planLockTime[0].substr(11);
        p.open = "open";
        return p;
      });
      writeFile(dbList[4], planData);
      patientData.data = patientData.data.map(p => {
        backupData.forEach(b => {
          if (
            b.LastName == p.lastname &&
            b.MRN == p.medicalrecordnumber &&
            b.LastModified == p.lastmodifiedtimestamp
          ) {
            //console.log(b.backupFileName)
            p["backupFileName"] = b.institution.BackupFileName;
            p["backupTimeStamp"] = b.institution.BackupTimeStamp;
          }
        });
        plansOfPatient = planData.data.filter(plan =>
          p.patientid == plan.patientid ? plan : null
        );
        plansOfPatient.map(pl => {
          if (p["planLockDate"] == undefined || p["planLockDate"] == null) {
            p["planLockDate"] = pl.planLockDate;
            p["planLockTime"] = pl.planLockTime;
          } else if (
            pl["planLockDate"] != undefined ||
            pl["planLockDate"] != null
          ) {
            var pldate = Number(p["planLockDate"].replace(/[^0-9]/g, ""));
            var plldate = Number(pl["planLockDate"].replace(/[^0-9]/g, ""));
            var pltime = Number(p["planLockTime"].replace(/[^0-9]/g, ""));
            var plltime = Number(pl["planLockTime"].replace(/[^0-9]/g, ""));
            if (pldate < plldate || (pldate == plldate && pltime < plltime)) {
              p["planLockDate"] = pl.planLockDate;
              p["planLockTime"] = pl.planLockTime;
            }
          }
        });
        p.action = "delete"; //add delete action field
        return p;
      });
      writeFile(dbList[3], patientData);
      var pending = [];
      sortList(patientData.data, "patientid", "ASC", patients => {
        for (var k = 0; k < patients.length; k++) {
          var p = patients[k];
          if (
            (p.backupFileName == null || p.backupFileName == undefined) &&
            (!settings.backup.backupLockedOnly || p.planLockDate != null) &&
            pending.length < settings.backup.backupNumberPerDay
          ) {
            pending.push(p);
          }
        }
        var pendingObj = {};
        pendingObj["totals"] = pending.length;
        pendingObj["data"] = JSON.parse(JSON.stringify(pending));
        writeFile(dbList[1], pendingObj);
      });
    })
    .catch(e => console.log(e));
}

//----------------------------------backup pending section-------------------------

async function updateBackupPendingList() {
  var settings = await getSettings();
  var minute = settings.backup.startTime.split(":")[0];
  var hour = settings.backup.startTime.split(":")[1];
  schedule.scheduleJob("0 " + minute + " " + hour + " * * *", () => {
    exportPendingList();
  });
}

async function exportPendingList() {
  var settings = await getSettings();
  var backupSettings = settings.backup;
  var pendingListFileName = settings.institution.backupPendingFileName,
    patientFileName = settings.institution.patientFileName;
  patientData = await readDataFile(patientFileName);
  pendingData = await readDataFile(pendingListFileName);
  sortList(patientData.data, "lastmodifiedtimestamp", true, sortedPl => {
    sortedPl.forEach(p => {
      if (
        (p.backupFileName == null || p.backupFileName == undefined) &&
        (p.planLockDate != null || p.planLockDate != undefined)
      ) {
        var matched = pendingData.data.some(d => {
          if (
            p.patientid == d.patientid &&
            p.backupFileName == d.backupFileName &&
            p.planLockDate == d.planLockDate &&
            p.planLockTime == d.planLockTime
          ) {
            return true;
          }
        });
        if (
          !matched &&
          pending.data.length < backupSettings.backupNumberPerDay
        ) {
          if (!backupSettings.backupLockedOnly || p.planLockDate != null) {
            pendingData.data.push(p);
            pendingData.totals++;
          }
        }
      }
    });
    if (pendingData.totals == backupSettings.backupNumberPerDay) {
      var ws = fs.createWriteStream(pendingListFileName, { start: 0 });
      var buffer = new Buffer.from(JSON.stringify(pendingData));
      ws.write(buffer, "utf8", function(err, buffer) {
        console.log(`Write backup pending list completely finished`);
      });
      ws.end("");
      transferPendingList(pendingData.data);
    }
  });
}

async function transferPendingList(data) {
  var settings = await getSettings();
  var servers = await getServers();
  var server = servers.filter(s => {
    if (s.ip == settings.pgConfig.host) {
      return s;
    }
  })[0];
  var config = {
    host: server.ip,
    username: server.loginName,
    password: server.password
  };
  var backupString = "";
  data.forEach(d => {
    var name = (
      d.lastname.replace(/(\srestored)*$/, "").replace(/\s/g, "-") +
      (d.firstname == undefined ? "" : "_" + d.firstname) +
      (d.middlename == undefined ? "" : "_" + d.middlename) +
      Array(27).join("_")
    ).slice(0, 27);
    var mrn = (d.medicalrecordnumber + Array(22).join("_")).slice(0, 22);
    var ldate = d.planLockDate.replace(/\-/g, "").substr(2, 6) + "_";
    var lmodify = d.lastmodifiedtimestamp.replace(/\-/g, "").substr(2, 6);
    var backupString = d.institutionid + " ";
    backupString += d.patientid + " ";
    backupString += server.backupDirectory;
    backupString += name;
    backupString += mrn;
    backupString += ldate;
    backupString += lmodify;
    backupString += "\r\n";
    console.log(backupString);
  });
  var cmdAdd = `echo '${backupString}' >/tmp/.rtms/backuplist`;
  execCommands(config, [cmdAdd])
    .then()
    .catch(e => e);
}

//----------------------------------plan section-------------------------

async function exportPlanInfo(plan) {
  var settings = await getSettings();
  var servers = await getServers();
  var server = servers.filter(s => {
    if (s.ip == settings.pgConfig.host) {
      return s;
    }
  })[0];
  var config = {
    host: server.ip,
    username: server.loginName,
    password: server.password
  };
  var instId = plan.planpath.match(/Institution_[0-9]+/g)[0].match(/[0-9]+/)[0];
  var patId = plan.planpath.match(/Patient_[0-9]+/g)[0].match(/[0-9]+/)[0];
  var planId = plan.planpath.match(/Plan_[0-9]+/g)[0].match(/[0-9]+/)[0];
  var planInfo = instId + " " + patId + " " + planId;
  console.log(planInfo);
  var cmd = `echo '${planInfo}' >/tmp/.rtms/plan`;
  execCommands(config, [cmd])
    .then()
    .catch(e => e);
}

function deletePatient(patients) {
  Promise.all([getSettings(), getServers()])
    .then(system => {
      const pg = require("pg");
      var delPool = new pg.Pool(settings.pgConfig);
      var settings = system[0],
        servers = system[1],
        server = servers.filter(s => {
          if (s.ip == settings.pgConfig.host) {
            return s;
          }
        })[0],
        config = {
          host: server.ip,
          username: server.loginName,
          password: server.password
        };
      Promise.all(
        patients.map(p => {
          //delete patient information from prosdb
          var _query = `DELETE FROM patient WHERE patientid =  ${patientId} ;`;
          delPool.connect(function(err, client, done) {
            if (err) {
              return console.error("Connection Error:", err);
            }
            client.query(_query, function(err, result) {
              done();
              if (err) {
                console.log(err);
                return err;
              }
              console.log(result);
              return result;
            });
          });
          //delete patient from hard disk
          var delCmd = `rm -rf /usr/local/adacnew/Patients/${p.patientpath}`;
          execCommands(config, [delCmd])
            .then(() => {
              setTimeout(() => {
                updateDatabase();
                console.log("删除已完成");
              }, 1000);
            })
            .catch(e => e);
        })
      )
        .then(res => res)
        .catch(e => e);
    })
    .catch(err => err);
}

//----------------------------------common function section-------------------------

function sumBigNumber(a, b) {
  var res = "",
    temp = 0;
  a = a.toString().split("");
  b = b.toString().split("");
  while (a.length || b.length || temp) {
    temp += ~~a.pop() + ~~b.pop();
    res = (temp % 10) + res;
    temp = temp > 9;
  }
  return res.replace(/^0+/, "");
}

function sortList(list, sortBy, sortAscent, cb) {
  function compare(sortBy) {
    return function(obj1, obj2) {
      var x1 = obj1[sortBy];
      var x2 = obj2[sortBy];
      var dateFmt1 = /^\d{4}\/\d{2}\/\d{2}$/,
        dateFmt2 = /^\d{4}\-\d{2}\-\d{2}\s\d{2}\:\d{2}\:\d{2}$/,
        numFmt = /^\d*$/,
        strFmt = /[^0-9]/;
      var reg1 = new RegExp(dateFmt1);
      var reg2 = new RegExp(dateFmt2);
      if (typeof x1 == "number" && typeof x2 == "number") {
        //console.log('number',x1,'/',x2)
        return sortAscent ? x1 - x2 : x2 - x1;
      } else if (x1 == undefined || x2 == undefined || x1 == "" || x2 == "") {
        return 0;
      } else if (reg1.test(x1)) {
        x1 = Number(x1.replace(/[^0-9]/g, ""));
        x2 = Number(x2.replace(/[^0-9]/g, ""));
        //console.log('format1',x1,'/',x2)
        return sortAscent ? x1 - x2 : x2 - x1;
      } else if (reg2.test(x2)) {
        x1 = Number(x1.replace(/[^0-9]/g, ""));
        x2 = Number(x2.replace(/[^0-9]/g, ""));
        //console.log('format2',x1,'/',x2)
        return sortAscent ? x1 - x2 : x2 - x1;
      } else if (
        (typeof x1 == "number" && typeof x2 != "number") ||
        (typeof x1 != "number" && typeof x2 == "number")
      ) {
        x1 = x1.toString().replace(/[a-z]*/g, m => m.toUpperCase());
        x2 = x2.toString().replace(/[a-z]*/g, m => m.toUpperCase());
        return sortAscent
          ? x1 > x2
            ? 1
            : x1 == x2
            ? 0
            : -1
          : x1 < x2
          ? 1
          : x1 == x2
          ? 0
          : -1;
      } else {
        x1 =
          x1 == null
            ? 0
            : x1
                .replace(/[^0-9a-zA-Z]*/g, "")
                .replace(/[a-z]*/g, m => m.toUpperCase());
        x2 =
          x2 == null
            ? 0
            : x2
                .replace(/[^0-9a-zA-Z]*/g, "")
                .replace(/[a-z]*/g, m => m.toUpperCase());
        //console.log('formatS',x1,'/',x2)
        return sortAscent
          ? x1 > x2
            ? 1
            : x1 == x2
            ? 0
            : -1
          : x1 < x2
          ? 1
          : x1 == x2
          ? 0
          : -1;
      }
    };
  }
  cb(list.sort(compare(sortBy)));
}

function identicalCheck(data1, data2) {
  var result = true;
  if (
    data1 &&
    data2 &&
    data1.constructor === Array &&
    data2.constructor === Array
  ) {
    if (data1.length !== data2.length) {
      result = false;
    } else {
      for (var i = 0; i < data1.length; i++) {
        if (data1[i].constructor === Array && data2[i].constructor === Array) {
          if (!identicalCheck(data1[i], data2[i])) {
            result = false;
            return result;
          }
        } else if (
          data1[i].constructor === Object &&
          data2[i].constructor === Object
        ) {
          if (!identicalCheck(data1[i], data2[i])) {
            result = false;
            return result;
          }
        } else {
          if (data1[i] !== data2[i]) {
            result = false;
            return result;
          }
        }
      }
    }
  } else if (
    data1 &&
    data2 &&
    data1.constructor === Object &&
    data2.constructor === Object
  ) {
    var key1 = Object.getOwnPropertyNames(data1);
    var key2 = Object.getOwnPropertyNames(data2);
    if (key1.length !== key2.length) {
      result = false;
    } else {
      for (var i = 0; i < key1.length; i++) {
        if (key2.indexOf(key1[i]) === -1) {
          result = false;
          return result;
        } else if (
          data1[key1[i]].constructor === Array &&
          data2[key1[i]].constructor === Array
        ) {
          if (!identicalCheck(data1[key1[i]], data2[key2[i]])) {
            result = false;
            return result;
          }
        } else if (
          data1[key1[i]].constructor === Object &&
          data2[key1[i]].constructor === Object
        ) {
          if (!identicalCheck(data1[key1[i]], data2[key1[i]])) {
            result = false;
            return result;
          }
        } else {
          if (data1[key1[i]] !== data2[key1[i]]) {
            result = false;
            return result;
          }
        }
      }
    }
  } else {
    result = "Input error!";
  }
  return result;
}

function convertSize(arr) {
  var str = "";
  var sum = 0;
  arr.forEach(b => {
    sum = sumBigNumber(sum, parseInt(b.size));
  });
  if (sum >= 1024 && sum < 1048576) {
    sum = parseInt(sum / 1024);
    str = sum.toString() + "kb";
  }
  if (sum >= 1048576 && sum < 1073741824) {
    sum = parseInt(sum / 1048576);
    str = sum.toString() + "mb";
  }
  if (sum >= 1073741824) {
    sum = parseInt(sum / 1073741824);
    str = sum.toString() + "gb";
  }
  return str;
}

function initAppServer() {
  updateBackupedFile();
  updateDatabaseFile();
  updateBackupPendingList();
}

module.exports = {
  readDataFile,
  sortList,
  updateBackupedFile,
  getBackupData,
  updateBackupData,
  getBackupHeadInfo,
  getProsData,
  updateDatabase,
  updateDatabaseFile,
  updateBackupPendingList,
  identicalCheck,
  exportPendingList,
  deletePatient,
  initServers,
  defaultSettings,
  writeDataFile,
  readBackupedFileList,
  execCommands,
  exportPlanInfo,
  getSettings,
  updateSettings,
  setSettings,
  getServers,
  updateServers,
  setServers,
  getUsers,
  updateUsers,
  setUsers,
  initAppServer,
  getSysInfo,
  getInstList
};
