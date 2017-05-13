var botgram = require("botgram");
var mqtt = require("mqtt");
var bot = botgram("243637402:AAGnwv4qt2qAntMmaSXC6pcHJIHPdNa5eG4");
var Timer = require("./timer");

var reply = bot.reply(-207667727);
var secReply = bot.reply(97438879);

var client = mqtt.connect("mqtt://local:711f462fba54@localhost");
client.on("connect", function () {
  client.subscribe("vocore-timbre/ring-time");
  client.subscribe("vocore-timbre/online");
  ignore = true;
  setTimeout(() => { ignore = false; }, 1000);
});

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
