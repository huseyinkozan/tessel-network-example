/* global window $ */
/* eslint no-console: 0 */

var g_debug = { dispatcher : false, methods : false, other : false };
var g_url = "/api";
var g_handlers = {};

function internal_cb_setup(apiName, req, cb) {
  req.done(function( json ) {
    if (typeof json.error !== "undefined" && json.error !== "") {
      if (g_debug.dispatcher) {console.error(apiName, json.error);}
      if (typeof cb === "function") { cb(json.error, null, apiName); }
      if (typeof g_handlers[ "error" ] === "function") { g_handlers[ "error" ](json.err, null, apiName); }
    }
    else {
      if (g_debug.dispatcher) {console.log(apiName, json);}
      if (typeof cb === "function") { cb(null, json, apiName); }
      if (typeof g_handlers[ apiName ] === "function") { g_handlers[ apiName ](json, apiName); }
    }
  });
  req.fail(function( jqxhr, ts, error ) {
    var err = ts + ", " + error;
    if (g_debug.dispatcher) {console.error(apiName, err);}
    if (typeof cb === "function") { cb(err, null, apiName); }
    if (typeof g_handlers[ "error" ] === "function") { g_handlers[ "error" ](err, null, apiName); }
  });
}

window.get = function(apiName, url, opt, cb) {
  if (typeof opt === "function") { cb = opt; opt = {}; }
  var req = $.ajax(Object.assign({method:"GET", dataType:"json", url:g_url+url}, opt));
  internal_cb_setup(apiName, req, cb);
  if (g_debug.methods) {console.log("GET " + g_url+url);}
};

window.put = function(apiName, url, data, opt, cb) {
  if (typeof opt === "function") { cb = opt; opt = {}; }
  var req = $.ajax({method:"PUT", dataType:"json", contentType:"application/json", url:g_url+url, data:JSON.stringify(data)});
  internal_cb_setup(apiName, req, cb);
  if (g_debug.methods) {console.log("PUT " + g_url+url + "\n" + JSON.stringify(data));}
};

window.post = function(apiName, url, data, opt, cb) {
  if (typeof opt === "function") { cb = opt; opt = {}; }
  var req = $.ajax({method:"POST", dataType:"json", contentType:"application/json", url:g_url+url, data:JSON.stringify(data)});
  internal_cb_setup(apiName, req, cb);
  if (g_debug.methods) {console.log("POST " + g_url+url + "\n" + JSON.stringify(data));}
};

window.del = function(apiName, url, opt, cb) {
  if (typeof opt === "function") { cb = opt; opt = {}; }
  var req = $.ajax({method:"DELETE", dataType:"json", url:g_url+url});
  internal_cb_setup(apiName, req, cb);
  if (g_debug.methods) {console.log("DELETE " + g_url+url);}
};
