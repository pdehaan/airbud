// Generated by CoffeeScript 1.7.1
(function() {
  var Airbud, fs, request, retry,
    __slice = [].slice;

  request = require("request");

  fs = require("fs");

  retry = require("retry");

  Airbud = (function() {
    Airbud._defaults = {
      operationTimeout: 30000,
      retries: 4,
      factor: 2.99294,
      minInterval: 5 * 1000,
      maxInterval: Infinity,
      randomize: true,
      parseJson: null,
      expectedKey: null,
      expectedStatus: "20x"
    };

    Airbud.getDefaults = function() {
      return Airbud._defaults;
    };

    Airbud.setDefaults = function(options) {
      var key, val, _results;
      _results = [];
      for (key in options) {
        val = options[key];
        _results.push(Airbud._defaults[key] = val);
      }
      return _results;
    };

    Airbud.json = function(options, cb) {
      var airbud;
      airbud = new Airbud(options, {
        parseJson: true
      });
      return Airbud.retrieve(airbud, cb);
    };

    Airbud.retrieve = function(options, cb) {
      var airbud, err;
      if (options instanceof Airbud) {
        airbud = options;
      } else {
        airbud = new Airbud(options);
      }
      try {
        return airbud.fetch(cb);
      } catch (_error) {
        err = _error;
        err.message = "Got an error while retrieving " + airbud.url + ". " + err;
        return cb(err);
      }
    };

    function Airbud() {
      var key, optionSets, options, val, _i, _len;
      optionSets = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      optionSets.unshift(Airbud.getDefaults());
      for (_i = 0, _len = optionSets.length; _i < _len; _i++) {
        options = optionSets[_i];
        if (typeof options === "string") {
          options = {
            url: options
          };
        }
        for (key in options) {
          val = options[key];
          this[key] = val;
        }
      }
      if ((this.expectedStatus != null) && !(this.expectedStatus instanceof RegExp)) {
        if (!(this.expectedStatus instanceof Array)) {
          this.expectedStatus = [this.expectedStatus];
        }
        this.expectedStatus = this.expectedStatus.join("|").replace(/x/g, "\\d");
        this.expectedStatus = new RegExp("^" + this.expectedStatus + "$");
      }
    }

    Airbud.prototype.fetch = function(mainCb) {
      var cbOperationTimeout, operation, operationDurations, totalStart;
      operation = retry.operation({
        retries: this.retries,
        factor: this.factor,
        minTimeout: this.minInterval,
        maxTimeout: this.maxInterval,
        randomize: this.randomize
      });
      cbOperationTimeout = null;
      if (this.operationTimeout != null) {
        cbOperationTimeout = {
          timeout: this.operationTimeout,
          cb: (function(_this) {
            return function() {
              var err, msg;
              msg = "Operation timeout of " + _this.operationTimeout + "ms reached.";
              err = new Error(msg);
              return operation.retry(err);
            };
          })(this)
        };
      }
      totalStart = +(new Date);
      operationDurations = 0;
      return operation.attempt((function(_this) {
        return function(currentAttempt) {
          var operationStart;
          operationStart = +(new Date);
          return _this._execute(function(err, data, res) {
            var meta, returnErr, totalDuration;
            operationDurations += +(new Date) - operationStart;
            if (operation.retry(err)) {
              return;
            }
            totalDuration = +(new Date) - totalStart;
            meta = {
              statusCode: res != null ? res.statusCode : void 0,
              errors: operation.errors(),
              attempts: operation.attempts(),
              totalDuration: totalDuration,
              operationDuration: operationDurations / operation.attempts()
            };
            returnErr = err ? operation.mainError() : null;
            return mainCb(returnErr, data, meta);
          });
        };
      })(this), cbOperationTimeout);
    };

    Airbud.prototype._execute = function(cb) {
      var err, path;
      if (!this.url) {
        err = new Error("You did not specify a url to fetch");
        return cb(err);
      }
      if (this.url.indexOf("file://") === 0) {
        path = this.url.substr(7, this.url.length).split("?")[0];
        fs.readFile(path, "utf8", (function(_this) {
          return function(err, buf) {
            var returnErr;
            if (err) {
              returnErr = new Error("Cannot open '" + path + "'. " + err.message);
              return cb(returnErr);
            }
            return _this._handleData(buf, {}, cb);
          };
        })(this));
        return;
      }
      return request.get(this.url, (function(_this) {
        return function(err, res, buf) {
          var msg;
          if (err) {
            return cb(err, buf, res);
          }
          if (_this.expectedStatus != null) {
            if (!_this.expectedStatus.test(res.statusCode + "")) {
              msg = "HTTP Status " + res.statusCode + " received when fetching '" + _this.url + "'. ";
              msg += "Expected: " + _this.expectedStatus + ". " + ((buf + "").substr(0, 30)) + "..";
              err = new Error(msg);
              return cb(err, buf, res);
            }
          }
          return _this._handleData(buf, res, cb);
        };
      })(this));
    };

    Airbud.prototype._handleData = function(buf, res, cb) {
      var data, err, msg;
      data = buf;
      if (!this.parseJson) {
        return cb(null, data, res);
      }
      try {
        data = JSON.parse(data);
      } catch (_error) {
        err = _error;
        err.message = "Got an error while parsing json for " + this.url + ". " + err;
        return cb(err, data, res);
      }
      if ((this.expectedKey != null) && (data[this.expectedKey] == null)) {
        msg = "Invalid body received when fetching '" + this.url + "'. \n";
        msg += "No key: " + this.expectedKey + ". " + buf;
        err = new Error(msg);
        return cb(err, data, res);
      }
      return cb(null, data, res);
    };

    return Airbud;

  })();

  module.exports = Airbud;

}).call(this);