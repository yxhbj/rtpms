var fs = require('fs'),
    execSync = require('child_process').execSync,
    express = require('express'),
    router = express.Router(),
    utils = require('../public/javascripts/utils'),
    getSettings=utils.getSettings,
    updateDatabase=utils.updateDatabase;

/* GET settings home page. */
router.get('/', function(req, res, next) {
  res.render('system', { title: 'iRT Service' });
});

/* POST settings. */
router.post('/settings', async function(req, res, next) {
    var settings = await getSettings()
    if (JSON.stringify(req.body)!='{}'){
        //Write to database file
        settings.institution.defaultInstitution=req.body.institution.defaultInstitution
        settings.pgConfig=req.body.pgConfig
        settings.backup=req.body.backup
        var ws = fs.createWriteStream('database/settings.json', {start: 0});
        var buffer = new Buffer.from(JSON.stringify(settings));
        ws.write(buffer, 'utf8', function (err, buffer) {
          console.log('Write settings completely finished')
        });
        ws.end('');
    }
    res.setHeader("Content-Type", "application/json;charset=utf-8" );
    res.write(JSON.stringify(settings));
    res.end();
});
/* POST data synchronization. */
router.post('/synchronization', async function(req, res, next) {
    var settings = await getSettings()
    var ws = fs.createWriteStream('database/settings.json', {start: 0});
    var buffer = new Buffer.from(JSON.stringify(settings));
    ws.write(buffer, 'utf8', function (err, buffer) {
      console.log('Settings have been written successfully')
    });
    ws.end('');
    updateDatabase(settings);
});

/* POST server list. */
router.post('/server', async function(req, res, next) {
    var type=["nodeServer","planningServer","standaloneServer","storageServer"]

    if (JSON.stringify(req.body)!='{}'){
        // var ws = fs.createWriteStream('database/servers.json', {start: 0});
        // var buffer = new Buffer.from(JSON.stringify(req.body));
        // ws.write(buffer, 'utf8', function (err, buffer) {
        //   console.log('Saving servers successfully')
        // });
        // ws.end('');
    }
    res.setHeader("Content-Type", "application/json;charset=utf-8" );    
    utils.getServers().then(servers=>{
        res.write(JSON.stringify({
                    'data':servers,
                    'totals':servers.length
                }));
        res.end();
    })
})

module.exports = router;
