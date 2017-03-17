var botgram = require("botgram");
var dgram = require("dgram");
var bot = botgram("243637402:AAGnwv4qt2qAntMmaSXC6pcHJIHPdNa5eG4");
var Timer = require("./timer");

var reply = bot.reply(-207667727);
var secReply = bot.reply(97438879);

var backend = dgram.createSocket("udp4");
backend.bind(5897);
backend.on("message", (msg, rinfo) => {
  try {
    msg = JSON.parse(msg.toString("utf-8"));
  } catch (e) {return console.error(e);}
  if (typeof msg.from === "string" && Object.hasOwnProperty.call(handlers, msg.from))
    handlers[msg.from](msg);
});

var vocoreHeartbeat = new Timer(210 * 1000); // 3:30
var vocoreOnline = true;
function setVocoreOnline(online) {
  if (online === vocoreOnline) return;
  vocoreOnline = online;
  if (online) {
    secReply.silent().markdown("Vocore online again");
  } else {
    secReply.markdown("Vocore **offline**!");
  }
}

vocoreHeartbeat.on("fire", () => setVocoreOnline(false));
vocoreHeartbeat.reset();

var vocoreRepeat = new Timer(4 * 1000);
var vocoreRepeating = false;
vocoreRepeat.on("fire", () => { vocoreRepeating = false; });

var handlers = {
  "vocore": (msg) => {
    setVocoreOnline(true);
    vocoreHeartbeat.reset();
    if (msg.type === "hit" && !vocoreRepeating) {
      reply.markdown("🛎 Llaman al timbre");
      vocoreRepeating = true;
      vocoreRepeat.reset();
    }
  },
};
