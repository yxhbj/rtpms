var fs = require('fs')
var express = require('express');
var router = express.Router();
var URL = require('url');
var utils = require('../public/javascripts/utils');
var sortList = utils.sortList;
var getProsData = utils.getProsData;
var getSettings = utils.getSettings;

/* POST institution data list. */
router.post('/institution', async function(req, res, next) {
    var settings = await getSettings()
    try{
        let reqData = "";
        req.on( "data", function ( dataChunk ) {
            reqData += decodeURIComponent( dataChunk );
        } )
        req.on( "end", function () {
            res.setHeader("Content-Type", "application/json;charset=utf-8" );
            res.setHeader( "Access-Control-Allow-Origin", "*" );
            var objPage={}, sortBy='',sortAscent=true,pageData=[];
            var arr=reqData.split('&').map(m=>{
                var item=m.split('=')
                objPage[item[0]]=item[1]
            })
            for(var a in objPage){
                if(a.substr(0,5)=='sort_'){
                    sortBy=a
                    sortAscent=objPage[a]=='ASC'?true:false
                }
            }
            fs.readFile(settings.institution.institutionFileName, (err, data) => {
                if (err) {
                    console.log(err.stack);
                    return;
                }
                var resBl=JSON.parse(data.toString()).data
                if(sortBy!=''){
                    sortList(resBl,sortBy.replace(/^sort_/,''),sortAscent,sortedBl=>{
                        resBl=sortedBl
                    })
                }
                res.write( JSON.stringify({
                    'data':resBl,
                    'totals':resBl.length,
                    'settings':settings
                }));
                res.end();
            })
        })
    }catch( e ){
        console.log( e );
    }
});

/* POST patient data list. */
router.post('/patient', async function(req, res, next) {
    var settings = await getSettings()
    try{
        let reqData = "";
        req.on( "data", function ( dataChunk ) {
            reqData += decodeURIComponent( dataChunk );
        } )
        req.on( "end", function () {
            res.setHeader("Content-Type", "application/json;charset=utf-8" );
            res.setHeader( "Access-Control-Allow-Origin", "*" );
            var objPage={}, sortBy='',sortAscent=true,pageData=[];
            var arr=reqData.split('&').map(m=>{
                var item=m.split('=')
                objPage[item[0]]=item[1]
            })
            for(var a in objPage){
                if(a.substr(0,5)=='sort_'){
                    sortBy=a
                    sortAscent=objPage[a]=='ASC'?true:false
                }
            }
            var searchStr=objPage['searchString'];
            console.log(objPage)
            utils.readDataFile(settings.institution.patientFileName).then(data => {
                var resBl=data.data
                if(sortBy!=''){
                    sortList(resBl,sortBy.replace(/^sort_/,''),sortAscent,sortedBl=>{
                        resBl=sortedBl
                    })
                }
                //筛选institutionid
                if(objPage.institutionid!='All'){
                    resBl=resBl.filter(m=>m.institutionid==objPage.institutionid?m:null)
                }
                //按照名字和病历号搜索病人
                if(searchStr!=''&&searchStr!=undefined){
                    var reg = new RegExp(searchStr, 'ig');
                    resBl=resBl.filter(m=>{
                        if(m.firstname.match(reg)||m.lastname.match(reg)||m.middlename.match(reg)||m.medicalrecordnumber.match(reg)){
                            return m;
                        }
                    })
                }
                //分页显示
                pageData = resBl.slice((+objPage.cPage<1?0:+objPage.cPage-1)*(+objPage.pSize),(+objPage.cPage<1?1:+objPage.cPage)*(+objPage.pSize));
                res.write( JSON.stringify({
                    'data':pageData,
                    'totals':resBl.length,
                    'settings':settings
                }));
                res.end();
            }).catch(err=>console.log(err))
        })
    }catch( e ){
        console.log( e );
    }
});

/* POST plan data list. */
router.post('/plan', async function(req, res, next) {
    var settings = await getSettings()
    try{
        let reqData = "";
        req.on( "data", function ( dataChunk ) {
            reqData += decodeURIComponent( dataChunk );
        } )
        req.on( "end", function () {
            res.setHeader("Content-Type", "application/json;charset=utf-8" );
            res.setHeader( "Access-Control-Allow-Origin", "*" );
            var objPage={}, sortBy='',sortAscent=true,pageData=[];
            var arr=reqData.split('&').map(m=>{
                var item=m.split('=')
                objPage[item[0]]=item[1]
            })
            for(var a in objPage){
                if(a.substr(0,5)=='sort_'){
                    sortBy=a
                    sortAscent=objPage[a]=='ASC'?true:false
                }
            }
            //console.log(objPage)
            fs.readFile(settings.institution.planFileName, (err, data) => {
                if (err) {
                    console.log(err.stack);
                    return;
                }
                var resBl=JSON.parse(data.toString()).data
                //筛选patientid
                resBl=resBl.filter(m=>m.patientid==objPage.patientid?m:null)
                //处理排序
                if(sortBy!=''){
                    sortList(resBl,sortBy.replace(/^sort_/,''),sortAscent,sortedBl=>{
                        resBl=sortedBl
                    })
                }
                //写入返回客户端的数据
                res.write( JSON.stringify({'data':resBl,'totals':resBl.length}));
                res.end();
            })
        } )
    }catch( e ){
        console.log( e );
    }
});

/* POST patient data list. */
router.post('/deletePatient', async function(req, res, next) {
    if (JSON.stringify(req.body)!='{}'){
        var patients=req.body
        utils.deletePatient(patients)
    }
});

module.exports = router;
