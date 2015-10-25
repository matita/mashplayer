(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],2:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],3:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;

function drainQueue() {
    if (draining) {
        return;
    }
    draining = true;
    var currentQueue;
    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        var i = -1;
        while (++i < len) {
            currentQueue[i]();
        }
        len = queue.length;
    }
    draining = false;
}
process.nextTick = function (fun) {
    queue.push(fun);
    if (!draining) {
        setTimeout(drainQueue, 0);
    }
};

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],4:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],5:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":4,"_process":3,"inherits":2}],6:[function(require,module,exports){
var util = require('util');
var events = require('events');

function MashPlayer(selector) {
    var me = this,
        players = [],
        currentPlayer, errorTimeout = 5000,
        dom, currentUrl, currentTrack, volume = 1,
        errorTimeoutId;

    
    initPlayers();

    function initPlayers() {
        players = MashPlayer.players.map(function(fn) {
            var player = new fn();
            return player;
        });
        var html = players.map(function(player) {
            return player.getHTML();
        }).join('');
        dom = document.querySelector(selector);
        dom.innerHTML = html;
        players.forEach(function(player) {
            player.hide();
        });
    }

    me.canPlay = function(url) {
        for (var i = 0; i < players.length; i++) {
            var player = players[i];
            if (player.canPlay(url)) {
                return true;
            }
        }
        return false;
    }

    function load(url) {
        for (var i = 0; i < players.length; i++) {
            var player = players[i];
            if (player.canPlay(url)) {
                setCurrentPlayer(player);
                player.load(url);
                return true;
            }
        }
        me.emit('urltypeunknown', url);
        return false;
    }

    function onTrackSelected(track) {
        if (track)
            load(track);
    }

    function startErrorTimeout() {
        stopErrorTimeout();
        errorTimeoutId = setTimeout(onError, errorTimeout);
    }

    function stopErrorTimeout() {
        if (errorTimeoutId)
            clearTimeout(errorTimeoutId);
        errorTimeoutId = 0;
    }

    function setCurrentPlayer(player) {
        if (player !== currentPlayer) {
            if (currentPlayer) {
                currentPlayer.pause();
                currentPlayer.hide();
                for (var l in listeners)
                    currentPlayer.removeListener(l, listeners[l]);
            }
            currentPlayer = player;
            currentPlayer.show();
            for (var l in listeners)
                currentPlayer.on(l, listeners[l]);
            currentPlayer.setVolume(volume);
            me.emit('changeplayer', currentPlayer.type);
        }
    }
    me.load = load;
    me.getUrl = function() {
        return currentUrl;
    }
    me.getTrack = function() {
        return currentTrack;
    }
    me.getDuration = function() {
        return currentPlayer && currentPlayer.getDuration() || 0;
    }
    me.getCurrentTime = function() {
        return currentPlayer && currentPlayer.getCurrentTime() || 0;
    }
    me.isPlaying = function() {
        return currentPlayer && currentPlayer.isPlaying() || false;
    }
    me.play = function() {
        if (currentPlayer) currentPlayer.play();
    }
    me.pause = function() {
        if (currentPlayer) currentPlayer.pause();
    }
    me.getLoaded = function() {
        return currentPlayer && currentPlayer.getLoaded() || 0;
    }
    me.seekTo = function(sec) {
        if (currentPlayer) currentPlayer.seekTo(sec);
    }
    me.getVolume = function() {
        return currentPlayer && currentPlayer.getVolume() || volume;
    }
    me.setVolume = function(value) {
        value = Math.max(0, Math.min(1, value));
        volume = value;
        if (currentPlayer)
            currentPlayer.setVolume(value);
    }
    me.getCurrentType = function() {
        return currentPlayer && currentPlayer.type;
    }

    function onLoadStart() {
        console.debug('onLoadStart', currentUrl);
        startErrorTimeout();
    }

    function onLoadMetadata() {
        stopErrorTimeout();
        me.emit('loadedmetadata');
    }

    function onError() {
        console.debug('onError', currentUrl, currentTrack);
        stopErrorTimeout();
        if (currentTrack && (currentTrack.sources && currentTrack.sources.length)) {
            delete currentTrack.url;
            load(currentTrack);
        } else {
            me.emit('error', currentTrack);
        }
    }

    function onPlay() {
        me.emit('play');
    }

    function onPause() {
        me.emit('pause');
    }

    function onProgress() {
        me.emit('progress');
    }

    function onLoadEnd() {
        me.emit('loadend');
    }

    function onSeeking() {
        me.emit('seeking');
    }

    function onSeeked() {
        me.emit('seeked');
    }

    function onEnded() {
        console.debug('ended');
        me.emit('ended');
    }

    function onVolumeChange(value) {
        me.emit('volumechange', value);
    }

    function onPlaylistEnded() {
        currentTrack = currentUrl = null;
        me.emit('playlistended');
    }
    var listeners = {
        'loadedmetadata': onLoadMetadata,
        'error': onError,
        'play': onPlay,
        'pause': onPause,
        'progress': onProgress,
        'load': onLoadEnd,
        'loadstart': onLoadStart,
        'seeking': onSeeking,
        'seeked': onSeeked,
        'ended': onEnded,
        'volumechange': onVolumeChange
    };
    me.destroy = function() {
        audioPlayer.destroy();
        ytPlayer.destroy();
    }
}

util.inherits(MashPlayer, events.EventEmitter);

MashPlayer.players = [
  require('./players/Youtube.js'),
  require('./players/Vimeo.js'),
  require('./players/Audio.js')
];

module.exports = MashPlayer;





},{"./players/Audio.js":8,"./players/Vimeo.js":9,"./players/Youtube.js":10,"events":1,"util":5}],7:[function(require,module,exports){
var util = require('util');
var events = require('events');

function AbstractPlayer() {
    var me = this;
    
    me.type = undefined;
    me.init = function() {
        throw 'Method init has to be implemented';
    }
    me.canPlay = function(url) {
        throw 'Method canPlay has to be implemented';
    }
    me.getHTML = function() {
        throw 'Method getHTML has to be implemented';
    }
    me.hide = function() {
        throw 'Method hide has to be implemented';
    }
    me.show = function() {
        throw 'Method show has to be implemented';
    }
    me.load = function(url) {
        throw 'Method load has to be implemented';
    }
    me.getDuration = function() {
        throw 'Method getDuration has to be implemented';
    }
    me.getCurrentTime = function() {
        throw 'Method getCurrentTime has to be implemented';
    }
    me.isPlaying = function() {
        throw 'Method isPlaying has to be implemented';
    }
    me.play = function() {
        throw 'Method play has to be implemented';
    }
    me.pause = function() {
        throw 'Method pause has to be implemented';
    }
    me.getLoaded = function() {
        throw 'Method getLoaded has to be implemented';
    }
    me.getVolume = function() {
        throw 'Method getVolume has to be implemented';
    }
    me.setVolume = function(value) {
        throw 'Method setVolume has to be implemented';
    }
    me.seekTo = function(sec) {
        throw 'Method seekTo has to be implemented';
    }
    me.destroy = function() {
        throw 'Method destroy has to be implemented';
    }

    function onLoadMetadata() {
        me.emit('loadedmetadata');
    }

    function onError() {
        me.emit('error');
    }

    function onPlay() {
        me.emit('play');
    }

    function onPause() {
        me.emit('pause');
    }

    function onProgress() {
        me.emit('progress');
    }

    function onLoadEnd() {
        me.emit('load');
    }

    function onLoadStart() {
        me.emit('loadstart');
    }

    function onSeeking() {
        me.emit('seeking');
    }

    function onSeeked() {
        me.emit('seeked');
    }

    function onEnded() {
        me.emit('ended');
    }
    var listeners = {
        'loadedmetadata': onLoadMetadata,
        'error': onError,
        'play': onPlay,
        'pause': onPause,
        'progress': onProgress,
        'load': onLoadEnd,
        'loadstart': onLoadStart,
        'seeking': onSeeking,
        'seeked': onSeeked,
        'ended': onEnded
    };
}

util.inherits(AbstractPlayer, events.EventEmitter);

module.exports = AbstractPlayer;
},{"events":1,"util":5}],8:[function(require,module,exports){
var AbstractPlayer = require('./Abstract.js');
var util = require('util');

function AudioPlayer() {
    var me = this,
        audio = document.createElement('audio');
    me.type = 'audio';

    me.canPlay = function(url) {
        return !!url.match(/\.mp3(\?|$|#)/i);
    }
    me.getHTML = function() {
        return '';
    }
    me.hide = function() {}
    me.show = function() {}
    me.load = function(url) {
        if (audio)
            audio.src = url;
    }
    me.getDuration = function() {
        return audio.duration;
    }
    me.getCurrentTime = function() {
        return audio.currentTime;
    }
    me.isPlaying = function() {
        return !audio.paused;
    }
    me.play = function() {
        audio.play();
    }
    me.pause = function() {
        audio.pause();
    }
    me.getLoaded = function() {
        if (!audio.duration || !audio.buffered.length)
            return 0;
        return audio.buffered.end(audio.buffered.length - 1) / audio.duration;
    }
    me.getVolume = function() {
        return audio.volume;
    }
    me.setVolume = function(value) {
        value = Math.max(0, Math.min(1, value));
        audio.volume = value;
        me.emit('volumechange', value);
    }
    me.seekTo = function(sec) {
        audio.currentTime = sec;
    }
    me.init = function() {
        for (var l in listeners)
            audio.addEventListener(l, listeners[l], true);
        audio.autoplay = true;
    }
    me.unbindEvents = function() {
        for (var l in listeners)
            audio.removeEventListener(l, listeners[l], true);
        me.pause();
        audio.src = '';
    }
    me.destroy = function() {
        me.unbindEvents();
        if (audio.parentNode)
            audio.parentNode.removeChild(audio);
        audio = null;
    }

    function onLoadMetadata() {
        me.emit('loadedmetadata');
    }

    function onError() {
        me.emit('error');
    }

    function onPlay() {
        me.emit('play');
    }

    function onPause() {
        me.emit('pause');
    }

    function onProgress() {
        me.emit('progress');
    }

    function onLoadEnd() {
        me.emit('load');
    }

    function onLoadStart() {
        me.emit('loadstart');
    }

    function onSeeking() {
        me.emit('seeking');
    }

    function onSeeked() {
        me.emit('seeked');
    }

    function onEnded() {
        me.emit('ended');
    }
    var listeners = {
        'loadedmetadata': onLoadMetadata,
        'error': onError,
        'play': onPlay,
        'pause': onPause,
        'progress': onProgress,
        'load': onLoadEnd,
        'loadstart': onLoadStart,
        'seeking': onSeeking,
        'seeked': onSeeked,
        'ended': onEnded
    };
    me.init();
}

util.inherits(AudioPlayer, AbstractPlayer);

module.exports = AudioPlayer;
},{"./Abstract.js":7,"util":5}],9:[function(require,module,exports){
var AbstractPlayer = require('./Abstract.js');
var util = require('util');
var getVimeoIdFromUrl = require('../util/getVimeoIdFromUrl.js');

function VimeoPlayer() {
    var me = this,
        domId = 'msh-vimeo-' + (VimeoPlayer.count++),
        playerId = domId + '-player',
        playerUrl, player, volume = 1,
        vimeoId, needsMetadata, _currentTime = 0,
        _duration = 0,
        _isPlaying = false,
        _loaded;
    me.type = 'vimeo';
    
    me.canPlay = function(url) {
        return !!VimeoPlayer.getIdFromUrl(url);
    }
    me.getHTML = function() {
        return '<div class="msh-player msh-vimeo" id="' + domId + '" style="width:100%;height:100%;"></div>';
    }
    me.hide = function() {
        var dom = document.getElementById(domId);
        if (!dom)
            return;
        dom.style.position = 'absolute';
        dom.style.left = '-9999px';
        dom.style.top = '-9999px';
    }
    me.show = function() {
        var dom = document.getElementById(domId);
        if (!dom)
            return;
        dom.style.position = 'relative';
        dom.style.left = '0';
        dom.style.top = '0';
    }
    me.load = function(url) {
        var id = VimeoPlayer.getIdFromUrl(url);
        createPlayer(id);
        onLoadStart();
    }
    me.getDuration = function() {
        return _duration;
    }
    me.getCurrentTime = function() {
        return _currentTime;
    }
    me.isPlaying = function() {
        return _isPlaying;
    }
    me.play = function() {
        post('play');
    }
    me.pause = function() {
        post('pause');
    }
    me.getLoaded = function() {
        return _loaded;
    }
    me.getVolume = function() {
        return volume;
    }
    me.setVolume = function(value) {
        volume = value;
        post('setVolume', volume);
    }
    me.seekTo = function(sec) {
        post('seekTo', sec);
        onSeeking();
    }
    me.destroy = function() {
        throw 'Method destroy has to be implemented';
    }

    function onLoadMetadata() {
        me.emit('loadedmetadata');
    }

    function onError() {
        me.emit('error');
    }

    function onLoadEnd() {
        me.emit('load');
    }

    function onLoadStart() {
        me.emit('loadstart');
    }

    function onEnded() {
        me.emit('ended');
    }

    function onPlay() {
        _isPlaying = true;
        me.emit('play');
    }

    function onPause() {
        _isPlaying = false;
        me.emit('pause');
    }

    function onSeeking() {
        me.emit('seeking');
    }

    function onSeeked() {
        me.emit('seeked');
    }

    function onPlayProgress(data) {
        _currentTime = data.seconds;
        _duration = data.duration;
    }

    function onLoadProgress(data) {
        _loaded = data.percent;
        me.emit('progress');
    }

    function onReady() {
        console.log('player ready', playerId);
        post('setColor', '#ffc70a');
        me.setVolume(volume);
        post('getDuration');
        var events = ['play', 'pause', 'playProgress', 'loadProgress', 'seek', 'finish'];
        for (var i = 0; i < events.length; i++)
            post('addEventListener', events[i]);
        onLoadMetadata();
        me.play();
    }

    function onGetDuration(value) {
        console.log('onGetDuration', value);
        _duration = value;
    }
    var listeners = {
        'ready': onReady,
        'getDuration': onGetDuration,
        'playProgress': onPlayProgress,
        'play': onPlay,
        'pause': onPause,
        'loadProgress': onLoadProgress,
        'seek': onSeeked,
        'finish': onEnded
    };
    if (window.addEventListener) {
        window.addEventListener('message', onMessageReceived, false);
    } else {
        window.attachEvent('onmessage', onMessageReceived, false);
    }

    function onMessageReceived(e) {
        var data = JSON.parse(e.data);
        if (data.player_id == playerId) {
            var method = data.event || data.method;
            if (listeners[method])
                listeners[method](data.value || data.data);
        }
    }

    function createPlayer(id) {
        var dom = document.getElementById(domId),
            url = 'https://player.vimeo.com/video/' + id,
            html = '<iframe id="' + playerId + '" src="' + url + '?api=1&player_id=' + playerId + '&badge=0&byline=0&portrait=0&title=0&color=ffc70a" width="100%" height="100%" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>';
        dom.innerHTML = html;
        player = document.getElementById(playerId);
        playerUrl = url;
    }

    function post(action, value) {
        if (!player)
            return;
        var data = {
            method: action
        };
        if (arguments.length == 2)
            data.value = value;
        var message = JSON.stringify(data);
        player.contentWindow.postMessage(data, playerUrl);
    }
}

VimeoPlayer.count = 0;

VimeoPlayer.getIdFromUrl = getVimeoIdFromUrl;

util.inherits(VimeoPlayer, AbstractPlayer);

module.exports = VimeoPlayer;
},{"../util/getVimeoIdFromUrl.js":11,"./Abstract.js":7,"util":5}],10:[function(require,module,exports){
var AbstractPlayer = require('./Abstract.js');
var util = require('util');
var getYTIdFromUrl = require('../util/getYTIdFromUrl.js');

function YTPlayer() {
    var me = this,
        domId = 'msh-yt-' + (YTPlayer.count++),
        player, volume = 1,
        ytId, needsMetadata;
    me.type = 'youtube';

    me.canPlay = function(url) {
        return !!YTPlayer.getIdFromUrl(url);
    }
    me.getHTML = function() {
        return '<div class="msh-player msh-yt" id="' + domId + '"></div>';
    }
    me.hide = function() {
        var dom = document.getElementById(domId);
        if (!dom)
            return;
        dom.style.position = 'absolute';
        dom.style.left = '-9999px';
        dom.style.top = '-9999px';
    }
    me.show = function() {
        var dom = document.getElementById(domId);
        if (!dom)
            return;
        dom.style.position = 'relative';
        dom.style.left = '0';
        dom.style.top = '0';
    }
    me.load = function(url) {
        var id = YTPlayer.getIdFromUrl(url);
        onLoadStart();
        if (player) {
            needsMetadata = true;
            player.loadVideoById({
                videoId: id,
                suggestedQuality: 'large'
            });
        } else
            ytId = id;
    }
    me.getDuration = function() {
        return player && player.getDuration() || 0;
    }
    me.getCurrentTime = function() {
        return player && player.getCurrentTime() || 0;
    }
    me.isPlaying = function() {
        return player && player.getPlayerState() == 1 || false;
    }
    me.play = function() {
        if (player) player.playVideo();
    }
    me.pause = function() {
        if (player) player.pauseVideo();
    }
    me.getLoaded = function() {
        return player && player.getVideoLoadedFraction() || 0;
    }
    me.getVolume = function() {
        return player && player.getVolume() / 100 || volume;
    }
    me.setVolume = function(value) {
        value = Math.max(0, Math.min(1, value));
        volume = value;
        if (player)
            player.setVolume(value * 100);
        me.emit('volumechange', value);
    }
    me.seekTo = function(sec) {
        if (player) player.seekTo(sec, true);
    }
    me.init = function() {
        var s = document.createElement('script');
        s.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(s);
        window.onYouTubeIframeAPIReady = function() {
            delete window.onYouTubeIframeAPIReady;
            player = new YT.Player(domId, {
                height: '100%',
                width: '100%',
                videoId: 'M7lc1UVf-VE',
                playerVars: {
                    controls: 0
                },
                events: {
                    'onReady': onPlayerReady,
                    'onStateChange': onPlayerStateChange,
                    'onError': onError
                }
            });
        }
    }
    me.destroy = function() {
        me.pause();
        var dom = document.getElementById(domId);
        if (dom && dom.parentNode)
            dom.parentNode.removeChild(dom);
        player = null;
    }

    function onLoadMetadata() {
        me.emit('loadedmetadata');
    }

    function onError() {
        me.emit('error');
    }

    function onPlay() {
        me.emit('play');
    }

    function onPause() {
        me.emit('pause');
    }

    function onProgress() {
        me.emit('progress');
    }

    function onLoadEnd() {
        me.emit('load');
    }

    function onLoadStart() {
        me.emit('loadstart');
    }

    function onSeeking() {
        me.emit('seeking');
    }

    function onSeeked() {
        me.emit('seeked');
    }

    function onEnded() {
        me.emit('ended');
    }

    function onPlayerReady() {
        me.setVolume(volume);
        if (ytId)
            me.load(ytId);
        else
            me.hide();
    }

    function onPlayerStateChange(event) {
        console.debug('player state', event.data);
        switch (event.data) {
            case YT.PlayerState.ENDED:
                onEnded();
                break;
            case YT.PlayerState.PLAYING:
                onPlay();
                if (needsMetadata) {
                    onLoadMetadata();
                    needsMetadata = false;
                }
                break;
            case YT.PlayerState.PAUSED:
                onPause();
                break;
            case YT.PlayerState.BUFFERING:
                break;
            case YT.PlayerState.CUED:
                onLoadMetadata();
                break;
        }
    }
    me.init();
}

YTPlayer.count = 0;

YTPlayer.getIdFromUrl = getYTIdFromUrl;

util.inherits(YTPlayer, AbstractPlayer);

module.exports = YTPlayer;
},{"../util/getYTIdFromUrl.js":12,"./Abstract.js":7,"util":5}],11:[function(require,module,exports){
module.exports = function(url) {
    if (!url)
        return null;
    var m = url.match(/https?:\/\/vimeo\.com\/(\d+)/i);
    return m && m[1];
};
},{}],12:[function(require,module,exports){
module.exports = function(ytUrl) {
    var m;
    return ytUrl &&
        (m = ytUrl.match(/(?:(?:https?:)?\/\/)?(?:www\.)?youtu(?:be\.com\/(?:watch\?(?:.*?&(?:amp;)?)*v=|v\/|embed\/)|\.be\/)([\w‌​\-]+)(?:(?:&(?:amp;)?|\?)[\w\?=]*)*/)) != null &&
        m[1];

    if (!ytUrl) return null;
    if (ytUrl.indexOf('youtube.com/embed/') != -1) {
        return ytUrl.replace(/.*youtube\.com\/embed\/((\w|-)*).*/, '$1');
    } else if (ytUrl.indexOf('gdata.youtube.com/feeds/api/videos/') != -1) {
        return ytUrl.replace(/.*gdata.youtube\.com\/feeds\/api\/videos\/((\w|-)*).*/, '$1');
    } else if (ytUrl.indexOf('youtube.com/v/') != -1) {
        return ytUrl.replace(/.*youtube\.com\/v\/((\w|-)*).*/, '$1');
    } else if (ytUrl.indexOf('youtube.com/watch') != -1) {
        var params = decodeUrlParameters(ytUrl.split('?')[1]);
        return params.v && params.v.split('#')[0];
    } else if (ytUrl.indexOf('youtu.be/') != -1) {
        return ytUrl.replace(/.*youtu\.be\/((\w|-)*).*/, '$1');
    } else if (ytUrl.match(/^(\w|-)*$/)) {
        return ytUrl;
    }
    return null;

    function decodeUrlParameters(urlString) {
        return urlString.split('&').reduce(function(p, e) {
            e = e.split('=');
            p[e[0]] = decodeURIComponent(e[1]);
            return p;
        }, {});
    }
}
},{}]},{},[6]);
