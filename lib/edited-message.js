/* Simple botgram utility code exposing an EditedMessage class, which simplifies, well, editing messages */

var util = require("util");

function EditedMessage(reply, text, mode) {
  this.reply = reply;
  this.mode = mode;

  this.lastText = text;
  this.markup = reply.parameters["reply_markup"];
  this.disablePreview = reply.parameters["disable_web_page_preview"];
  this.text = text;
  this.callbacks = [];
  this.pendingText = null;
  this.pendingCallbacks = [];

  this.idPromise = new Promise(function (resolve, reject) {
    reply.text(this.text, this.mode).then(function (err, msg) {
      if (err) reject(err);
      else resolve(msg.id);
      this._whenEdited(err, msg);
    }.bind(this));
  }.bind(this));
}
util.inherits(EditedMessage, require("events").EventEmitter);

EditedMessage.prototype.refresh = function refresh(callback) {
  if (callback) this.pendingCallbacks.push(callback);
  this.pendingText = this.lastText;
  if (this.callbacks === undefined) this._flushEdit();
};

EditedMessage.prototype.edit = function edit(text, callback) {
  this.lastText = text;
  var idle = this.callbacks === undefined;
  if (callback) this.pendingCallbacks.push(callback);

  if (text === this.text) {
    this.callbacks = (this.callbacks || []).concat(this.pendingCallbacks);
    this.pendingText = null;
    this.pendingCallbacks = [];
    if (idle) this._whenEdited();
  } else {
    this.pendingText = text;
    if (idle) this._flushEdit();
  }
};

EditedMessage.prototype._flushEdit = function _flushEdit() {
  this.text = this.pendingText;
  this.callbacks = this.pendingCallbacks;
  this.pendingText = null;
  this.pendingCallbacks = [];
  this.reply.parameters["reply_markup"] = this.markup;
  this.reply.parameters["disable_web_page_preview"] = this.disablePreview;
  this.reply.editText(this.id, this.text, this.mode).then(this._whenEdited.bind(this));
};

EditedMessage.prototype._whenEdited = function _whenEdited(err, msg) {
  if (err) this.emit(this.id === undefined ? "error" : "editError", err);
  if (this.id === undefined) this.id = msg.id;
  var callbacks = this.callbacks;
  delete this.callbacks;
  callbacks.forEach(function (callback) { callback(); });
  if (this.pendingText !== null) this._flushEdit();
};

module.exports = EditedMessage;
