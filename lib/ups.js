/* Handles the burden of (re)connecting to a UPS and polling it constantly */

var Timer = require("./timer");
var EventEmitter = require("events");
var Nut = require("node-nut");

// Persistent nut client
class UPSClient extends EventEmitter {
  constructor(hostname, port) {
    super();
    this.clientState = "connecting";
    this.clientError = null;

    this.client = new Nut(port, hostname);
    this.client.on("ready", () => {
      this.clientState = "connected";
      this.clientError = null;
      this.emit("state", this.clientState);
    });
    this.client.on("error", (err) => {
      this.clientState = "error";
      this.clientError = err;
      this.emit("state", this.clientState);
    });
    this.client.on("close", () => {
      this.clientState = "error";
      this.emit("state", this.clientState);
      setTimeout(() => { this.client.start(); }, 5000);
    });

    process.nextTick(() => {
      this.client.start();
    });
  }
}

// Repeatedly polls a nut client
class UPSPoller extends EventEmitter {
  constructor(name, interval) {
    super();
    this.pollState = "stopped";
    this.pollError = null;
    this.pollResults = null;

    this.name = name;
    this.timer = new Timer(interval);
    this.timer.on("fire", () => {
      if (this.pollState === "stopped") return;
      if (this.pollState === "requesting") {
        this.pollResults = null;
        this.pollError = "timeout";
        this.emit("state");
      }
      this.pollState = "requesting";
      this.client.GetUPSVars(name, (vars, err) => callback(err, vars));
      this.timer.reset();
    });

    var callback = (err, vars) => {
      if (this.pollState === "stopped") return;
      this.pollState = "waiting";
      this.pollError = err;
      this.pollResults = vars;
      this.emit("state");
    };
  }

  start(client) {
    this.client = client;
    if (this.pollState !== "stopped") return;
    this.pollState = "waiting";
    this.pollError = null;
    this.pollResults = null;
    this.emit("state");
    this.timer.reset(0);
  }

  stop() {
    this.pollState = "stopped";
    this.timer.clear();
  }
}

// Combines UPSClient and UPSPoller into an easy-to-use interface
class UPS extends EventEmitter {
  constructor(options) {
    super();
    if (!options) options = {};

    this.lastError = null;
    this.lastResults = null;

    this.upsClient = new UPSClient(options.hostname, options.port || 3493);
    this.upsClient.on("state", () => updateState());
    this.poller = new UPSPoller(options.name, options.interval || 5000);
    this.poller.on("state", () => updateState());

    var updateState = () => {
      if (this.upsClient.clientState === "connected")
        this.poller.start(this.upsClient.client);
      else
        this.poller.stop();
      if (this.upsClient.clientState === "error" || this.poller.pollError !== null) {
        this.lastError = this.upsClient.clientError || this.poller.pollError || true;
        this.lastResults = null;
      } else if (this.poller.pollResults !== null) {
        this.lastError = null;
        this.lastResults = this.poller.pollResults;
      }
      this.emit("state");
    };
  }
}

module.exports = UPS;
