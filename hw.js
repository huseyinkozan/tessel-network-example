/* eslint no-console: 0 */

const g_debug = require("./debug.json");
const hwjson = require("./hw.json");
const exec = require("child_process").exec;
const JsonDB = require("node-json-db");
const touch = require("touch");
let tessel = null;
try {
  tessel = require("tessel");
} catch (e) {
  //
}

let dbPath = null;
let d = { configuration : null };
let states = {
  button_counter : 0, led_toggle : false, is_wifi_connected : false, last_wifi_error : ""
};
let timers = { button : null, wifi : null, ap : null };

function Hw() {
  if (g_debug.fun) { console.log("Hw();"); }
}

Hw.prototype.setDBPath = function (path) {
  if (g_debug.fun) { console.log("setDBPath("+path+");"); }
  dbPath = path;
  loadData("configuration", "configuration.json");
  setupWireless(false);
  setupButtonsAndLeds();
};

Hw.prototype.last_wifi_error = function(clear) {
  clear = clear || false;
  if (g_debug.fun) { console.log("last_wifi_error();"); }
  if (tessel === null) { return ""; }
  let v = states.last_wifi_error;
  if (clear) { states.last_wifi_error = ""; }
  return v;
};

Hw.prototype.is_wifi_connected = function() {
  if (g_debug.fun) { console.log("is_wifi_connected();"); }
  if (tessel === null) { return false; }
  return states.is_wifi_connected;
};

Hw.prototype.wifi_list = function(cb) {
  if (g_debug.fun) { console.log("wifi_list(cb); cb:", cb); }
  wifiList(cb);
};

Hw.prototype.setup_wireless = function() {
  if (g_debug.fun) { console.log("setup_wireless();"); }
  if (tessel === null) { return; }
  setTimeout(function () {
    setupWireless(true);
  }, 1000);
};

Hw.prototype.configuration_changed = function(configuration) {
  if (g_debug.fun) { console.log("Hw::configuration_changed(config); config: ", configuration); }
  if (typeof configuration === "undefined") {
    if (loadData("configuration", "configuration.json") === false) { return; }
  }
  else { d.configuration = configuration; }
};


function wifiList(cb) {
  if (g_debug.fun) { console.log("wifiList();"); }
  let wifis = [
    {"ssid":"None security Network","quality":"10/70","security":"none"},
    {"ssid":"WPA2 Personal Network","quality":"60/70","security":"psk2"},
    {"ssid":"WPA Personal Network","quality":"40/70","security":"psk"},
    {"ssid":"WPA2 Ent Network","quality":"40/70","security":"wpa2"},
    {"ssid":"WPA Ent Network","quality":"40/70","security":"wpa"},
    {"ssid":"WEP Network","quality":"40/70","security":"wep"},
  ];
  if (tessel === null) { cb(null, wifis); return; }
  tessel.network.wifi.findAvailableNetworks(function (err, networks) {
    if (err) { cb(err, null); }
    else { cb(null, networks); }
  });
}

function setupWireless(user_command) {
  user_command = user_command || false;
  if (g_debug.fun) { console.log("setupWireless(user_command); user_command:", user_command); }
  if (d.configuration === null) { return; }
  if (tessel === null) { return; }
  states.is_wifi_connected = false;
  if (user_command) {
    if (timers.wifi !== null) { clearInterval(timers.wifi); timers.wifi = null; }
  }
  if (d.configuration.wifi.enabled) {
    if (d.configuration.wifi.ssid === "") {
      setupAP();
    }
    else {
      setupWifi(user_command);
    }
  }
  else {
    setupAP();
  }
}

function setupWifi(user_command) {
  user_command = user_command || false;
  if (g_debug.fun) { console.log("setupWifi();"); }
  if (d.configuration === null) { return; }
  if (tessel === null) { return; }
  disableAP(function(err) {
    if (err) { return; }
    setTimeout(function () {
      enableWifi(user_command, function(err) {
        if (err) { return; }
        states.is_wifi_connected = true;
        setupLeds(1, 1, 0); /* yellow */
        touchDBFile("configuration.json");
        setupWifiDisconnect();
        setTimeout(syncTime, 500);
      });
    }, 500);
  });
}

function disableAP(cb) {
  if (g_debug.fun) { console.log("disableAP();"); }
  if (tessel === null) { return; }
  tessel.network.ap.disable(function (error) {
    if (error) {
      if(g_debug.other) {console.log(error);}
      states.last_wifi_error = "Disable AP: " + error;
      touchDBFile("configuration.json");
      setupAP();
    }
    cb(error);
  });
}

function enableWifi(user_command, cb) {
  if (g_debug.fun) { console.log("enableWifi(user_command); user_command:"+user_command); }
  if (tessel === null) { return; }
  let options = {
    ssid: d.configuration.wifi.ssid,
    password: d.configuration.wifi.password,
    security: d.configuration.wifi.security
  };
  tessel.network.wifi.connect(options, function (error, settings) {
    if (error) {
      if(g_debug.other) {console.log(error);}
      states.last_wifi_error = "Enable Wifi: " + error;
      touchDBFile("configuration.json");
      if (user_command) {
        setupAP();
      }
      else {
        timers.wifi = setInterval(function(user_command) {
          return function() {
            enableWifi(user_command, function(){});
          };
        }(user_command), hwjson.wifi_retry_timeout);
      }
      cb(error);
      return;
    }
    if (timers.wifi !== null) { clearInterval(timers.wifi); timers.wifi = null; }
    cb(error);
  });
}

function setupWifiDisconnect() {
  if (g_debug.fun) { console.log("setupWifiDisconnect();"); }
  if (tessel === null) { return; }
  tessel.network.wifi.on("disconnect", function (settings) {
    states.is_wifi_connected = false;
  });
  tessel.network.wifi.on("error", function (settings) {
    states.is_wifi_connected = false;
  });
}

function syncTime() {
  if (g_debug.fun) { console.log("syncTime();"); }
  if (tessel === null) return;
  exec("ntpd -q -p 0.pool.ntp.org");
}

function setupAP() {
  if (g_debug.fun) { console.log("setupAP();"); }
  if (d.configuration === null) { return; }
  if (tessel === null) { return; }
  if (d.configuration.wifi.enabled) {
    d.configuration.wifi.enabled = false;
    if (writeData("configuration", "configuration.json") === false) {
      if(g_debug.other) {console.log("Cannot set wifi enabled!");}
    }
  }
  tessel.network.wifi.disable(function (error) {
    if (error) {
      if(g_debug.other) {console.log(error);}
      setTimeout(setupAP, hwjson.ap_retry_timeout);
      return;
    }
    tessel.network.ap.create({
      ssid: d.configuration.ap.ssid
    }, function (error, settings) {
      if (error) {
        if(g_debug.other) {console.log(error);}
        setTimeout(setupAP, hwjson.ap_retry_timeout);
        return;
      }
    });
  });
}

function setupButtonsAndLeds() {
  if (g_debug.fun) { console.log("setupButtonsAndLeds();"); }
  if (d.configuration === null) { return; }
  if (tessel === null) { return; }
  let btn = tessel.port[hwjson.button_port].pin[hwjson.button_pin];
  btn.output(1);
  setupLeds(0, 0, 0); /* black */
  timers.button = setInterval(function () {
    btn.read(function(error, value) {
      if (error) {
        if(g_debug.other) {console.log(error);}
        states.button_counter = 0;
        return;
      }
      if (value === 0) {
        states.button_counter++;
        if (states.button_counter >= 20) {
          buttonPress("reboot");
        }
        else if (states.button_counter >= 6) {
          buttonPress("switch");
        }
        else {
          buttonPress("none");
        }
      }
      else {
        if (states.button_counter >= 20) {
          buttonReleased("reboot");
        }
        else if (states.button_counter >= 6) {
          buttonReleased("switch");
        }
        else if (states.button_counter > 0 && states.button_counter < 6) {
          buttonReleased("none");
        }
        states.button_counter = 0;
      }
    });
    if (states.button_counter <= 0) {
      if (d.configuration.wifi.enabled) {
        if (states.is_wifi_connected) {
          setupLeds(1, 1, 0); /* yellow */
        }
        else {
          if (states.led_toggle) {
            setupLeds(1, 1, 0); /* yellow */
          }
          else {
            setupLeds(0, 0, 0); /* black */
          }
          states.led_toggle = ! states.led_toggle;
        }
      }
      else {
        setupLeds(0, 1, 0); /* green */
      }
    }
  }, 500 /* states.button_counter depends! */);
}

function buttonPress(e) {
  if (g_debug.fun) { console.log("buttonPress("+e+");"); }
  switch (e) {
    case "reboot": setupLeds(1, 1, 1); /* white */ break;
    case "switch": {
      if (d.configuration.wifi.enabled) { setupLeds(0, 1, 0); /* green */ }
      else { setupLeds(1, 1, 0); /* yellow */ }
      break;
    }
    case "none": {
      setupLeds(0, 0, 0); /* black */
      break;
    }
    default:
  }
}

function buttonReleased(e) {
  if (g_debug.fun) { console.log("buttonReleased("+e+");"); }
  switch (e) {
    case "reboot": {
      if(g_debug.button) {console.log("Btn released for reboot");}
      setupLeds(0, 0, 0); /* black */
      d.configuration.wifi = { "enabled" : false, "ssid" : "", "password" : "", "security" : "" };
      d.configuration.ap = { "ssid" : "Tessel" };
      if (writeData("configuration", "configuration.json") === false) {
        if(g_debug.other) {console.log("Cannot reset wireless!");}
        return;
      }
      try {
        let jsonDB = new JsonDB(dbPath + "/auth.json", false, true);
        jsonDB.push("/password", "1234");
        jsonDB.save();
      } catch (e) {
        if(g_debug.other) {console.log("Cannot reset password!");}
        return;
      }
      setTimeout(reboot, 500);
      break;
    }
    case "switch": {
      if(g_debug.button) {console.log("Btn released for AP/Wifi switch");}
      d.configuration.wifi.enabled = ! d.configuration.wifi.enabled;
      if (writeData("configuration", "configuration.json") === false) {
        if(g_debug.other) {console.log("Cannot set wifi enabled!");}
        return;
      }
      loadData("configuration", "configuration.json");
      setupWireless(true);
      break;
    }
    case "none": {
      if(g_debug.button) {console.log("Btn released for none");}
      break;
    }
    default:
  }
}

function setupLeds(r, g, b) {
  if (g_debug.fun_leds) { console.log("setupLeds(r,g,b); rgb:",r,g,b); }
  if (tessel === null) { return; }
  let p = hwjson.rgb_port
  , pr = tessel.port[p].pin[ hwjson.rgb_pins[0] ]
  , pg = tessel.port[p].pin[ hwjson.rgb_pins[1] ]
  , pb = tessel.port[p].pin[ hwjson.rgb_pins[2] ];
  let tr = tessel.led[0]
  , tg = tessel.led[2]
  , tb = tessel.led[3];
  if (r>0) {tr.on();} else {tr.off();}
  if (g>0) {tg.on();} else {tg.off();}
  if (b>0) {tb.on();} else {tb.off();}
  pr.output(r); pg.output(g); pb.output(b);
}

function reboot() {
  if (g_debug.fun) { console.log("reboot();"); }
  if (tessel === null) { return; }
  if ( ! isRoot()) { return; }
  exec("reboot", function (msg) { if(g_debug.other) {console.log(msg);} });
}

function isRoot() {
  if (g_debug.fun) { console.log("isRoot();"); }
  return process.getuid && process.getuid() === 0;
}

function loadData(property, file) {
  if (g_debug.fun) { console.log("loadData("+property+","+file+")"); }
  if (dbPath === null) {
    if (g_debug.other) {console.log("dbPath is null");} return false;
  }
  if ( ! d.hasOwnProperty(property)) {
    if(g_debug.other) {console.error("Property " + property + " is not in d!");} return false;
  }
  try {
    let jsonDB = new JsonDB(dbPath + "/" + file, false, true);
    d[property] = jsonDB.getData("/");
  }  catch (e) { if(g_debug.other) {console.error("loadData db error : " + e);} return false; }
  return true;
}

function writeData(property, file) {
  if (g_debug.fun) { console.log("writeData("+property+","+file+")"); }
  if (dbPath === null) {
    if (g_debug.other) {console.log("dbPath is null");} return false;
  }
  if ( ! d.hasOwnProperty(property)) {
    if(g_debug.other) {console.error("Property " + property + " is not in d!");} return false;
  }
  try {
    let jsonDB = new JsonDB(dbPath + "/" + file, false, true);
    jsonDB.push("/", d[property]);
    jsonDB.save();
  }  catch (e) { if(g_debug.other) {console.error("writeData db error : " + e);} return false; }
  return true;
}

function touchDBFile(file) {
  if (g_debug.fun) { console.log("touchDBFile("+file+")"); }
  if (dbPath === null) { if (g_debug.other) {console.log("dbPath is null");} return false; }
  touch(dbPath + "/" + file);
}

module.exports = new Hw();
