/* Simple utility code providing a generic Timer class that emits an event */

var util = require("util");
var EventEmitter = require("events");

function Timer(timeout) { 
  this.timeout = timeout;
}
util.inherits(Timer, EventEmitter);

// Core

/* Clear timer if set. */
Timer.prototype.clear = function clear() {
  if (this.set) clearTimeout(this.set);
  this.set = null;
};

/* Schedule timer, clear first if set. */
Timer.prototype.reset = function reset(t) {
  this.clear();                        
  if (t === undefined) t = this.timeout;
  this.set = setTimeout(function callback() {
    this.set = null;
    this.emit("fire");
  }.bind(this), t);
};

// Others

/* Schedule timer if not set. */
Timer.prototype.set = function set(t) {
  if (!this.set) this.reset(t);
};

/* Reschedule timer if set. */
Timer.prototype.restart = function (t) {
  if (this.set) this.reset(t);
};

/* Fire (and clear) timer in the next tick. */
Timer.prototype.fire = function fire() {
  this.reset(0);
};

module.exports = Timer;
