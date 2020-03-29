const pg = require("pg"),
  fs = require("fs"),
  schedule = require("node-schedule"),
  node_ssh = require("node-ssh");
  var lpgConfig={
    host: "localhost",
    user: "postgres",
    database: "rtms",
    password: "postgres",
    port: 5432,
    max: 20,
    idleTimeoutMillis: 1000 // 1s
  }

//----------------------------------ssh section-------------------------

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
    getRecords("setting").then((rows)=>{
      resolve(rows[0])
    }).catch(e=>reject(e))
  })
}

function setSettings(settings) {
  for(var f in settings){
    settings[f]=JSON.stringify(settings[f]);
  }
  updateRecord("setting",settings,"id",1).then((res)=>{
    console.log("res:",res)
  }).catch(e=>console.log("err:",e))
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

//update database files
const updateServerInfo = () => {
  schedule.scheduleJob("0 * * * * *", () => {
    updateServers();
  });
};

//read server list
function getServers() {
  return new Promise((resolve, reject) => {
    getRecords("server").then((rows)=>resolve(rows)).catch(e=>reject(e))
  })
}

function setServers(servers) {
  saveTable("server",servers)
}

function updateServers() {
  getServers()
    .then(data => {
      console.log(data)
      Promise.all(
        data.map(s => {
          return getSysInfo(s)
            .then(sysInfo => {
              // s.logs = sysInfo.logs.toString();
              s.disk = JSON.stringify(sysInfo.disk);
              return s;
            })
            .catch(e => s);
        })
      )
      .then(res => {
        setServers(res);
      })
      .catch(e=>console.log(e));
    })
    .catch(e=>console.log(e));
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
      diskCmd = `df -h | grep ${volume}`,
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
        //console.log(sysInfo)
        resolve(sysInfo);
      })
      .catch(e => reject(e));
  });
}

function defaultServers() {
  return [
    {
      id: 0,
      host: "dell",
      ip: "220.194.46.182",
      backupDirectory: "/autoDataSets/NFSarchive/",
      storageVolume: "/PrimaryPatientData",
      loginName: "p3rtp",
      password: "p3rtp123",
      type: "BackupServer",
      os: "Solaris",
      logs:"",
      disk:{}
    },
    {
      id: 1,
      host: "synology",
      ip: "220.194.46.182",
      backupDirectory: "/autoDataSets/NFSarchive/",
      storageVolume: "/PrimaryPatientData",
      loginName: "p3rtp",
      password: "p3rtp123",
      type: "BackupServer",
      os: "Solaris",
      logs:"",
      disk:{}
    },
    {
      id: 2,
      host: "oracle x6-2",
      ip: "220.194.46.182",
      backupDirectory: "/autoDataSets/NFSarchive/",
      storageVolume: "/PrimaryPatientData",
      loginName: "p3rtp",
      password: "p3rtp123",
      type: "StandaloneServer",
      os: "Solaris",
      logs:"",
      disk:{}
    },
    {
      id: 3,
      host: "oracle x3-2",
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
      role: "",
      siteCode:""
    }
  ]
}
//read user list
function getUsers() {
  return new Promise((resolve, reject) => {
    getRecords("userinfo").then((rows)=>resolve(rows)).catch(e=>reject(e))
  });
}

function setUsers(users) {
  saveTable("userinfo",users)
}

function updateUsers(users) {
  setUsers(users);
}

//----------------------------------backup section-------------------------

function updateBackupedFile() {
  schedule.scheduleJob("0 * * * * *", () => {
    updateBackupData();
  });
}

//get backup data from backuped pg
function getBackupData() {
  return new Promise((resolve, reject) => {
    getRecords("backup").then((rows)=>resolve(rows)).catch(e=>reject(e))
  });
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
        var settings = system[0],
          servers = system[1],
          server = servers.filter(s => s.ip == settings.pgConfig.host)[0],
          backupServer = servers.filter(s => s.type == "BackupServer"),
          searchVolume=backupServer.map(v=>v.backupDirectory).join(" ");

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
                fileSize: (fileInfo[6] / 1024 / 1024).toFixed(0)+"MB"
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
    return bkpData.filter(c => backupFiles.some(m =>
          c.institution.BackupFileName.replace(/\/.*\//, "") ===
          m.fileName.replace(/\/.*\//, ""
        )
      )
    );
  } else {
    return bkpData;
  }
}

function checkAndWrite(system) {
  getBackupData().then(currentBackuped => {
    currentBackuped = backupValid(system.data, currentBackuped);
    var arr_filtered = system.data.filter(m => {
      if (currentBackuped.length > 0) {
        var backupStatus = currentBackuped.some(
          c =>
            c.institution.BackupFileName.replace(/\/.*\//, "") ===
            m.fileName.replace(/\/.*\//, "")
        );
        console.log(backupStatus)
        if (!backupStatus) {
          return m;
        }
      } else {
        return m;
      }
    });
    // arr_filtered = arr_filtered.slice(0, 1);
    arr_filtered.map(async function(m) {
      getBackupHeadInfo(system, m).then(resData=>{
        try{
        resData.forEach(d=> {
          currentBackuped.push(d);
          d.institution=JSON.stringify(d.institution)
          //console.log(d)
          insertRecord("backup",d).then((res)=>console.log(res)).catch(e=>console.log(e))
        });
      }catch(err){return err}
      }).catch (err=>console.log(err));
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
        var backupHeadInfo=[];
        if(JSON.stringify(instJson.PatientLiteList)!=undefined){
          backupHeadInfo = instJson.PatientLiteList.map(i => {
            var obj = {};
            obj.institution = JSON.parse(JSON.stringify(instJson));
            obj.institution.PatientLiteList = i;
            var description = i.PatientLite.FormattedDescription.split("&&");
            obj.lastname = description[0];
            obj.firstname = description[1];
            obj.middlename = description[2];
            obj.mrn = description[3];
            obj.radiationoncologist = description[4];
            obj.lastmodified = description[5];
            obj.institution.BackupFileSize = data.fileSize;
            obj.institution.BackupFileName = data.fileName;
            return obj;
          });
        }
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
  var pool = new pg.Pool(pgConfig);
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
    return writeTable(settings);
  }).catch(e=>console.log(e));
}

function writeTable(settings) {
  var pgConfig = settings.pgConfig;
  Promise.all([
    getProsData(pgConfig, "patient", {
      sort_lastmodifiedtimestamp: "ASC"
    }),
    getProsData(pgConfig, "plan", {}),
    getLockStatus(settings)
  ])
    .then(dataSets => {
      var patientData = dataSets[0],
        planData = dataSets[1],
        planLockStatus = dataSets[2],
        backupData = dataSets[2];

      planLockStatus.forEach(pls =>{
        var planlockdate='',planlocktime='';
        var planLockTime = pls.lockStatus.match(
          /\d{4}\-\d{2}\-\d{2}\s\d{2}\:\d{2}\:\d{2}/
        );
        if(planLockTime != null){
          planlockdate = planLockTime[0].substr(0, 10);
          planlocktime = planLockTime[0].substr(11);
        }
        executePgSql("plan",`SELECT * FROM plan WHERE patientid = ${pls.patientid} AND planid = ${pls.planid}`).then(np=>{
          if(np.length>0){
            if(np[0].planlockdate!=p.planlockdate||np[0].planlocktime!=p.planlocktime){
              executePgSql("plan",`UPDATE plan SET (planlockdate,planlocktime) = (${planlockdate},${planlocktime}) WHERE patientid = ${pls.patientid} AND planid = ${pls.planid}`).then((res)=>console.log(res)).catch(e=>console.log(e))
            }
          }else{
            planRecord=planData.filter(plr=>plr.patientid==pls.patientid&&plr.planid==pls.planid)[0]
            planRecord.planlockdate=planlockdate
            planRecord.planlocktime=planlocktime
            insertRecord("plan",planRecord).then((res)=>console.log(res)).catch(e=>console.log(e))
          }
        }).catch(e=>console.log(e));
        executePgSql("patient",`SELECT * FROM patient WHERE patientid = ${pls.patientid} AND institutionid = ${pls.institutionid}`).then(res=>{
          if(res.length>0){
            var p=res[0]
            var br=backupData.filter(b=>
              b.LastName == p.lastname &&
              b.MRN == p.medicalrecordnumber &&
              b.LastModified == p.lastmodifiedtimestamp)
            if( br.length>0 ){
              var b=br[0]
              p.backupfilename = b.institution.BackupFileName;
              p.backuptimestamp = b.institution.BackupTimeStamp;
            }
            executePgSql("plan",`SELECT * FROM plan WHERE patientid = ${p.patientid} AND planlockdate !='' AND planlockdate IS NOT NULL ORDER BY planlockdate DESC`).then(npa=>{
              if(npa.length>0){
                p.planlockdate=npa[0].planlockdate
                p.planlocktime=npm[0].planlocktime
              }
            }).catch(e=>console.log(e))
          }else{
            var or= patientData.data.fileter(p=>{p.patientid==pl.patientid})
            if( or.length>0 ){
              var p=or[0]
              var br=backupData.filter(b=>
                b.LastName == p.lastname &&
                b.MRN == p.medicalrecordnumber &&
                b.LastModified == p.lastmodifiedtimestamp)
              if( br.length>0 ){
                var b=br[0]
                p.backupfilename = b.institution.BackupFileName;
                p.backuptimestamp = b.institution.BackupTimeStamp;
              }
              insertRecord("patient",p).then((res)=>console.log(res)).catch(e=>console.log(e))
            }
          }
        }).catch(e=>console.log(e));
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
        (p.backupfilename == null || p.backupfilename == undefined) &&
        (p.planlockdate != null || p.planlockdate != undefined)
      ) {
        var matched = pendingData.data.some(d => {
          if (
            p.patientid == d.patientid &&
            p.backupfilename == d.backupfilename &&
            p.planlockdate == d.planlockdate &&
            p.planLockTime == d.planLockTime
          ) {
            return true;
          }
        });
        if (
          !matched &&
          pending.data.length < backupSettings.backupNumberPerDay
        ) {
          if (!backupSettings.backupLockedOnly || p.planlockdate != null) {
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
    var ldate = d.planlockdate.replace(/\-/g, "").substr(2, 6) + "_";
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

//----------------------------------image function section-------------------------

function getImageData() {
  Promise.all([getSettings(), getServers()])
    .then(system => {
      var settings =  system[0];
      var servers = system[1];
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
      var cmd = "sh /home/p3rtp/listDicom.sh";
      execCommands(config, [cmd])
        .then(data=>{
          data = JSON.parse('['+data[0].replace(/'/g,'"').replace(/\r\n/g,",")+']')
          console.log(data)
          return(data)
        })
        .catch(e => e);
    })
    .catch(err => err);
}

//----------------------------------pgsql function section-------------------------

//Insert record
function insertRecord(table,record) {
  for(let k in record){
    if(!record[k]) {
      delete record[k]
    }
  }
  var keys=Object.keys(record);
  var values=keys.map(key=>`'${record[key]}'`).join();
  keys=keys.map(key=>`"${key}"`).join();
  
  const pg = require("pg");
  var pool = new pg.Pool(lpgConfig);
  var _query = `INSERT INTO ${table} (${keys}) VALUES (${values})`;
  console.log(_query)
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
            resolve(result);
          }
        });
      }
    });
  })
}
//read records
function getRecords(table,filterField,filterVal) {
  var pool = new pg.Pool(lpgConfig);
  var whereWord = (filterField!=null&&filterVal!=null)?`WHERE ${filterField} = ${filterVal}`:''
  var _query = `SELECT * FROM ${table} ${whereWord};`;
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
  })
}

let getPgData = function(table,params,pgConfig) {
  var config=pgConfig?pgConfig:lpgConfig;
  var pool = new pg.Pool(config);
  var _query = `SELECT * FROM ${table} `;
  var _queryTotal = `SELECT count(*)  AS totals FROM ${table} `;
  var whereQuery = " WHERE ",
    sortQuery = "",
    pageSizeQuery = "",
    cPageQuery = "";
  var selectFieldQuery = 
      `SELECT 
        A.attname
      FROM
        pg_class AS C,
        pg_attribute AS A
      WHERE
        C.relname='${table}'
        AND A.attrelid=C.oid
        AND A.attnum >0
        AND A.attname !~ 'pg.dropped'
        AND format_type(A.atttypid,A.atttypmod) = 'text'`
  return new Promise(function(resolve, reject) {
    executePgSql(selectFieldQuery,config).then(tableFields=>{
      tableFields=tableFields.map(m=>m.attname)
      for (var key in params) {
        if(key.substr(0, 5) == "sort_"){          
          params.sort_by=params[key]
          var sortKey=key.replace(/^sort\_/, "");
          delete params[key];
          key="sort_by";
        }
        switch(key){
          case "institutionid":{
            whereQuery +=
              params.institutionid == "All"
                ? ""
                : `institutionid = ${params.institutionid} `;
          }
          break
          case "searchString":{
            if(params.searchString){
              whereQuery += whereQuery === " WHERE " ? "" : "AND ";
              var strtf="";
              tableFields.forEach((tf,i)=>{
                strtf+=i==0?`${tf} ~* '${params.searchString}' `:`OR ${tf} ~* '${params.searchString}' `
              })
              whereQuery += `(${strtf})`
            }
          }
          break
          case "backuptimestamp":{
            if(params.backuptimestamp==1){
              whereQuery += whereQuery === " WHERE " ? "" : "AND ";
              whereQuery += ` (backuptimestamp IS NULL) `
            }else if(params.backuptimestamp==2){
              whereQuery += whereQuery === " WHERE " ? "" : "AND ";
              whereQuery += ` (backuptimestamp IS NOT NULL) `
            }
          }
          break
          case "sort_by":{
            sortQuery = ` ORDER BY ${sortKey} ${params[key]} `;
          }
          break
          case "pSize":{
            pageSizeQuery = ` LIMIT ${params.pSize} `;
          }
          break
          case "cPage":{
            cPageQuery = ` OFFSET ${params.cPage} `;
          }
          break
          default:{
            whereQuery += whereQuery === " WHERE " ? "" : "AND ";
            whereQuery += `${key} = ${params[key]}`;
          }
        } 
      }
      _queryTotal += whereQuery === " WHERE " ? "" : whereQuery + ";";
      _query += whereQuery === " WHERE " ? "" : whereQuery;
      _query += sortQuery + pageSizeQuery + cPageQuery + ";";
      var obj = {};
      console.log(_query)
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
  }).catch(e=>console.log(e))
};

//update record
function updateRecord(table,record,filterField,filterVal) {
  for(let k in record){
    if(!record[k]) {
      delete record[k]
    }
  }
  var keys=Object.keys(record);
  var values=keys.map(key=>`'${record[key]}'`).join();
  keys=keys.map(key=>`"${key}"`).join();
  var pool = new pg.Pool(lpgConfig); 
  var _query = `UPDATE ${table} SET (${keys}) = (${values}) WHERE ${filterField} = ${filterVal};`;
  console.log(_query)
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
            resolve(result);
          }
        });
      }
    });
  })
}

//delete record
function deleteRecord(table,filterField,filterVal,pgConfig) {
  var config=pgConfig?pgConfig:lpgConfig;
  var pool = new pg.Pool(config);
  var _query = `DELETE FROM ${table} WHERE ${filterField} = ${filterVal} `;
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
            resolve(result);
          }
        });
      }
    });
  })
}

//execute a pgsql select
function executePgSql(_query,pgConfig){
  var config=pgConfig?pgConfig:lpgConfig;
  var pool = new pg.Pool(config);
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
            console.log(result.rows)
            resolve(result.rows);
          }
        });
      }
    });
  });
}

function saveTable(tableName,records) {
  getRecords(tableName).then(oldRecords=>{
    records.forEach(record=>{
      matchedRecords=oldRecords.filter(oldRecord=>oldRecord.id==record.id)
      if(matchedRecords.length>0){
        updateRecord(tableName,record,"id",matchedRecords[0].id).then((res)=>{
          //console.log(res)
          return (res)
        }).catch(e=>(e))
      }else{
        insertRecord(tableName,record).then((res)=>console.log(res)).catch(e=>console.log(e))
      }
    })
    toDel=oldRecords.filter(os=>!(records.some(ns=>ns.id==os.id)))
    toDel.forEach(ds=>deleteRecord(tableName,"id",ds.id))
  }).catch(e=>(e))
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

function updateDBInfo() {
  updateServerInfo();
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
  updateDBInfo,
  getSysInfo,
  getInstList,
  getImageData,
  getRecords,
  updateRecord,
  deleteRecord,
  insertRecord,
  saveTable,
  getPgData,
  executePgSql

};
