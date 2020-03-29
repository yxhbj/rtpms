'use strict';
var express = require('express');
var router = express.Router();
var utils = require("../public/js/utils");

/* GET users listenning. */
router.post('/', async  function (req, res) {
  var role=["administrator","planner","physicist","user"]
  var users = await utils.getUsers();
  //console.log(Users)
  if (JSON.stringify(req.body)!='{}'){
    users=req.body
    utils.setUsers(users);
  }
  res.setHeader("Content-Type", "application/json;charset=utf-8" ); 
  res.write(JSON.stringify(users));
  res.end();
});

module.exports = router;
