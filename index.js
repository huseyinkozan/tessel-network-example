/* eslint no-console:0 */

const express = require("express");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const JsonDB = require("node-json-db");
const fs = require("fs");
const hw = require("./hw");
const g_debug = require("./debug.json");
let tessel = null;
try {
  tessel = require("tessel");
} catch (e) {
  //
}
const app = express();

app.locals.dbPath = process.env.API_DB || __dirname + "/database";
hw.setDBPath(app.locals.dbPath);
app.set("port", process.env.PORT || 80);

app.use(morgan("dev", {
  skip: function (req, res) {
    if (req.path.trim() === "/api/timestamps") return ! g_debug.req_timestamps;
    return ! g_debug.req;
  }
}));


app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

app.use(express.static(__dirname + "/public", {"index":"index.html", "cacheControl":false}));
app.use("/assets", express.static(__dirname + "/bower_components", {"cacheControl":false}));

app.get("/api/timestamps", function(req, res) {
  try {
    res.send({
      "configuration" : get_timestamp_sync(req, "configuration"),
    });
  } catch (e) {
    res.status(500).send({"error":"" + e});
  }
});

app.get("/api/configuration", function(req, res) {
  try {
    var jsonDB = new JsonDB(req.app.locals.dbPath+"/configuration.json", false, true);
    var config = jsonDB.getData("/");
    config["timestamp"] = get_timestamp_sync(req, "configuration");
    config["wifi"]["is_connected"] = hw.is_wifi_connected();
    config["wifi"]["last_error"] = hw.last_wifi_error(true);
    res.send(config);
  } catch (e) {
    res.status(500).send({"error":"" + e});
  }
});

app.get("/api/wifi_list", function(req, res) {
  try {
    hw.wifi_list(function(err, networks) {
      if (err) { res.status(500).send({"error":"" + err}); return; }
      res.send(networks);
    });
  } catch (e) {
    res.status(500).send({"error":"" + e});
  }
});

app.put("/api/wifi", function(req, res) {
  try {
    if (isEmptyObject(req.body) === true) {
      res.status(500).send({"error":"Not an object:" + req.body});
      return;
    }
    if (typeof req.body.enabled === "undefined") {
      res.status(500).send({"error":"Missing required field enabled : " + req.body});
      return;
    }
    if (typeof req.body.ssid === "undefined") {
      res.status(500).send({"error":"Missing required field ssid : " + req.body});
      return;
    }
    if (typeof req.body.password === "undefined") {
      res.status(500).send({"error":"Missing required field password : " + req.body});
      return;
    }
    if (typeof req.body.security === "undefined") {
      res.status(500).send({"error":"Missing required field security : " + req.body});
      return;
    }
    var jsonDB = new JsonDB(req.app.locals.dbPath+"/configuration.json", false, true);
    jsonDB.push("/wifi", req.body);
    jsonDB.push("/wifi/enabled", true);
    jsonDB.save();
    var config = jsonDB.getData("/");
    hw.configuration_changed(config);
    hw.setup_wireless();
    res.send(config.wifi);
  } catch (e) {
    res.status(500).send({"error":"" + e});
  }
});

app.put("/api/ap", function(req, res) {
  try {
    if (isEmptyObject(req.body) === true) {
      res.status(500).send({"error":"Not an object:" + req.body});
      return;
    }
    if (typeof req.body.ssid === "undefined") {
      res.status(500).send({"error":"Missing required field ssid : " + req.body});
      return;
    }
    if (req.body.ssid === "") {
      res.status(500).send({"error":"Ssid is empty."});
      return;
    }
    var jsonDB = new JsonDB(req.app.locals.dbPath+"/configuration.json", false, true);
    jsonDB.push("/ap", req.body);
    jsonDB.push("/wifi/enabled", false);
    jsonDB.save();
    var config = jsonDB.getData("/");
    hw.configuration_changed(config);
    hw.setup_wireless();
    res.send(config.ap);
  } catch (e) {
    res.status(500).send({"error":"" + e});
  }
});

app.listen(app.get("port"), function () {
  console.log("Listening port " + app.get("port"));
  if (tessel === null) console.log("Open http://localhost:" + app.get("port"));
});



function get_timestamp_sync(req, f) {
  var stats = fs.statSync(req.app.locals.dbPath+"/"+f+".json");
  return parseInt(stats.mtime.getTime() / 1000);
}

function isEmptyObject(obj) {
  return !Object.keys(obj).length;
}
