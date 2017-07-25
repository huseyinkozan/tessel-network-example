/* global window $ toastr g_handlers get put g_debug */
/* eslint no-console: 0 */

var g_timestamps = { configuration:0 };
var g_scan_counter = 0;
g_debug.configuration = true;
g_debug.wifi_list = true;

$(function() {
  $("form").submit(function(e){e.preventDefault();});
  $("#settings-wifi-help").click(function () {
    $("#wifi-desc-dialog").modal("show");
  });
  $("#settings-wifi-enabled-div").checkbox({
    onChange : function () {
      toggle_wifi_settings( ! $("#settings-wifi-enabled").is(":checked"));
    }
  });
  $("#settings-reset").click(function () {
    get("GetConfiguration", "/configuration");
  });
  $("#settings-save").click(function () {
    $("#segment").addClass("loading");
    if ($("#settings-wifi-enabled").is(":checked"))
      set_wifi(function (err) {
        $("#segment").removeClass("loading");
        if (err) return toastr.error(err);
        toastr.success("Saved");
      });
    else
      set_ap(function (err) {
        $("#segment").removeClass("loading");
        if (err) return toastr.error(err);
        toastr.success("Saved");
      });
  });
  g_handlers["error"] = handle_error;
  g_handlers["GetTimestamps"] = handle_timestamps;
  g_handlers["GetConfiguration"] = handle_configuration;
  g_handlers["GetWifiList"] = handle_wifi_list;
  setInterval(function () {
    get("GetTimestamps", "/timestamps", {timeout:2000}, setup_loading);
  }, 2000);
  get("GetTimestamps", "/timestamps", {timeout:2000}, setup_loading);
});

function handle_error(err, d, apiName) {
  if (apiName === "GetTimestamps") return;
  console.error(err);
  toastr.error(err);
}

function setup_loading(err) {
  if (err) {
    if (--g_scan_counter > 0) return;
    $("#loading-dialog").addClass("active");
    return;
  }
  if ($("#loading-dialog").hasClass("active"))
    $("#loading-dialog").removeClass("active");
}

function handle_timestamps(ts) {
  if (g_timestamps.configuration !== ts.configuration)
    get("GetConfiguration", "/configuration");
}

function handle_configuration(conf) {
  if (g_debug.configuration) console.log("configuration:", conf);
  if ( ! conf.hasOwnProperty("timestamp")) return toastr.error("No conf.ap");
  if ( ! conf.hasOwnProperty("ap")) return toastr.error("No conf.ap");
  if ( ! conf.hasOwnProperty("wifi")) return toastr.error("No conf.wifi");
  g_timestamps.configuration = conf.timestamp;
  if (conf.wifi.last_error != "") {
    console.error(conf.wifi.last_error);
    toastr.error(conf.wifi.last_error);
  }
  $("#settings-ap-ssid").val(conf.ap.ssid);
  $("#settings-wifi-enabled").prop("checked", conf.wifi.enabled);
  if (conf.wifi.ssid !== "") {
    $("#settings-wifi-ssid-dd-menu")
    .html("<div class=\"item\" data-value=\""+conf.wifi.ssid+"\" >"+conf.wifi.ssid+"</div>");
  }
  else {
    $("#settings-wifi-ssid-dd-menu").html("");
  }
  $("#settings-wifi-ssid-dd").dropdown({
    allowReselection: true,
    allowAdditions: true,
    onChange: function(value, text, $selectedItem) {
      $("#settings-wifi-security").dropdown("set selected", $selectedItem.data("security"));
    }
  });
  $("#settings-wifi-ssid-dd").dropdown("set selected", conf.wifi.ssid);
  $("#settings-wifi-password").val(conf.wifi.password);
  $("#settings-wifi-security").dropdown("set value", conf.wifi.security);
  toggle_wifi_settings( ! conf.wifi.enabled);
}

function toggle_wifi_settings(disabled) {
  $("#settings-ap-ssid-div").toggleClass("disabled", ! disabled);
  $("#settings-wifi-ssid-div").toggleClass("disabled", disabled);
  $("#settings-wifi-password-div").toggleClass("disabled", disabled);
  $("#settings-wifi-security-div").toggleClass("disabled", disabled);
  $("#settings-wifi-scan").toggleClass("disabled", disabled);
}

window.settings_wifi_password_unhide = function() {
  var field = $("#settings-wifi-password");
  if (field.attr("type") === "text") {
    field.attr("type", "password");
    $("#settings-wifi-password-div > div > i").removeClass("hide").addClass("unhide");
  }
  else {
    field.attr("type", "text");
    $("#settings-wifi-password-div > div > i").removeClass("unhide").addClass("hide");
  }
};

window.scan_wifi = function() {
  $("#settings-wifi-ssid-dd").addClass("loading");
  $("#settings-wifi-scan").toggleClass("disabled", true);
  $("#settings-wifi-ssid-dd-menu").html("");
  g_scan_counter = 5;
  get("GetWifiList", "/wifi_list");
  return false;
};

function handle_wifi_list(networks) {
  g_scan_counter = 0;
  if (g_debug.wifi_list) console.log("wifi_list:", networks);
  $("#settings-wifi-ssid-dd").removeClass("loading");
  $("#settings-wifi-scan").toggleClass("disabled", false);
  if (networks.length === 0) { toastr.success("No wifi network"); return; }
  var rows = "";
  for (var i = 0; i < networks.length; i++) {
    var n = networks[i];
    rows += [
      "<div class=\"item\" data-value=\""+n.ssid+"\" data-security=\""+n.security+"\">",
      "  <span class=\"description\">Quality:"+n.quality+"</span>",
      "  <span class=\"text\">"+n.ssid+"</span>",
      "</div>",
    ].join("");
  }
  $("#settings-wifi-ssid-dd-menu").html(rows);
  setTimeout(function () {
    $("#settings-wifi-ssid-dd").dropdown("show");
  }, 100);
}

function set_ap(cb) {
  cb = cb || function() {};
  put("SaveAP", "/ap", { "ssid"  : $("#settings-ap-ssid").val() }, cb);
}

function set_wifi(cb) {
  cb = cb || function() {};
  put("SaveWifi", "/wifi", {
    "enabled"   : true,
    "ssid"      : $("#settings-wifi-ssid-dd-input").val(),
    "password"  : $("#settings-wifi-password").val(),
    "security"  : $("#settings-wifi-security").val(),
  }, cb);
}
