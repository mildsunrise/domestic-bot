var botgram = require("botgram");
var mqtt = require("mqtt");
var bot = botgram("243637402:AAGnwv4qt2qAntMmaSXC6pcHJIHPdNa5eG4");
var Timer = require("./timer");
var EditedMessage = require("./edited-message");
var UPS = require("./ups");

var reply = bot.reply(-207667727);
var secReply = bot.reply(97438879);

var client = mqtt.connect("mqtt://local:711f462fba54@localhost");
client.on("connect", function () {
  client.subscribe("vocore-timbre/ring-time");
  client.subscribe("vocore-timbre/online");
  ignore = true;
  setTimeout(() => { ignore = false; }, 1000);
});

var mainUps = new UPS({
  hostname: "192.168.100.1",
  name: "main_ups",
  interval: 2 * 1000,
});

/* Error handling */

var errorMessageSending = false;
var lastError;

bot.on("error", (err) => {
  console.error("At %s -> %s", new Date().toISOString(), err.stack);
  lastError = err;
  if (errorMessageSending) return;
  errorMessageSending = true;
  function sendMsg() {
    secReply.text("Internal error! Last:\n\n" + lastError.toString());
    secReply.then((err, msg) => {
      if (err)
        setTimeout(sendMsg, 60000);
      else
        errorMessageSending = false;
    });
  }
  sendMsg();
});



/** TIMBRE CASA **/

var currentOnline = true;
var ignore = true;

function setCurrentOnline(online) {
  if (online == currentOnline) return; 
  if (online) secReply.silent().markdown("Vocore online again.");
  else secReply.markdown("Vocore offline!");
  currentOnline = online;
}

var onlineTimer = new Timer(1000);
onlineTimer.on("fire", () => {
  setCurrentOnline(false);
});

client.on("message", function (topic, msg) {
  try {
    msg = msg.toString("utf-8");
  } catch (e) {
    return;
  }

  if (topic === "vocore-timbre/ring-time") {
    if (ignore) return;
    var n = parseInt(msg, 10);
    if (isNaN(n) || n < Date.now()/1000 - 5)
      reply.markdown("Llaman al timbre, fuera de rango: " + n + " (" + (Math.floor(Date.now()/1000)-n) + ")");
    else
      reply.markdown("🛎 Llaman al timbre");
  }
  if (topic === "vocore-timbre/online") {
    if (msg !== "true" && msg !== "false") return;
    var online = JSON.parse(msg);
    if (!online) onlineTimer.reset();
    else {
      onlineTimer.clear();
      setCurrentOnline(true);
    }
  }
});



/** UPS **/

var reachable = true;

function setReachable(r, e) {
  if (reachable === r) return;
  reachable = r;
  if (r)
    secReply.silent().markdown("UPS reachable again.");
  else
    secReply.markdown("UPS unreachable!\n" + e.toString());
}


var batteryCharge;
var batteryMessage;
var batteryUpdateTimer = new Timer(30 * 1000);

function renderBatteryMessage() {
  return "🔋 Carga de las baterías: <strong>" + batteryCharge + "%</strong>";
}

function publishBatteryMessage() {
  batteryMessage = new EditedMessage(reply.silent(), renderBatteryMessage(), "HTML");
  batteryUpdateTimer.reset();
}

batteryUpdateTimer.on("fire", () => {
  batteryMessage.edit(renderBatteryMessage());
  batteryUpdateTimer.reset();
});

function deactivateBatteryMessage() {
  batteryUpdateTimer.clear();
  batteryMessage = null;
}


var upsOnline = true;

var batteryPublishTimer = new Timer(5 * 1000);
batteryPublishTimer.on("fire", () => {
  publishBatteryMessage();
});

function setUpsOnline(ol) {
  if (upsOnline === ol) return;
  upsOnline = ol;
  if (ol) {
    reply.markdown("🔌✅ Electricidad restablecida");
    batteryPublishTimer.clear();
    deactivateBatteryMessage();
  } else {
    reply.markdown("🔌❌ ¡No hay electricidad!");
    batteryPublishTimer.reset();
  }
}


var fsdSeen = false;
mainUps.on("state", () => {
  if (mainUps.lastError)
    setReachable(false, mainUps.lastError);
  else if (mainUps.lastResults)
    setReachable(true);

  if (!mainUps.lastResults) return;
  var r = mainUps.lastResults;
  batteryCharge = parseInt(r["battery.charge"]);
  var status = r["ups.status"].split(/\s+/g);

  if (status.indexOf("OL")!==-1)
    setUpsOnline(true);
  else
    setUpsOnline(false);

  if ((status.indexOf("OB")!==-1 && status.indexOf("LB")!==-1) || status.indexOf("FSD")!==-1) {
    if (!fsdSeen) {
      fsdSeen = true;
      reply.markdown("❗️ **Carga critica, petición de apagado general** ❗️");
    }
  }
});
