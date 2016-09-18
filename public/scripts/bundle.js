/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(1);


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	var $ = __webpack_require__(2);
	var GameProtocols = __webpack_require__(3);
	var game_stage_1 = __webpack_require__(4);
	var Main = (function () {
	    function Main() {
	        var $countRatio = this._initializeCountRatio();
	        this._initializeGameStage($countRatio);
	    }
	    Main.prototype._initializeCountRatio = function () {
	        var $countRatio = $('#count-ratio input[type="range"]');
	        $countRatio.rangeslider({
	            polyfill: false
	        });
	        var $rangesliderHandle = $('.rangeslider__handle');
	        $rangesliderHandle.text($countRatio.val() + "%");
	        $(document).on('input', $countRatio, function () {
	            $rangesliderHandle.text($countRatio.val() + "%");
	        });
	        return $countRatio;
	    };
	    Main.prototype._initializeGameStage = function ($countRatio) {
	        var _this = this;
	        var $gameStageCanvas = $('#game-stage');
	        var gameStageCanvas = $gameStageCanvas[0];
	        gameStageCanvas.height = $(window).innerHeight();
	        gameStageCanvas.width = $(window).innerWidth();
	        this._gameStage = new game_stage_1.default($gameStageCanvas, $countRatio);
	        this._gameStage.on('protocolSend', function (protocol) {
	            _this._ws.send(JSON.stringify(protocol));
	        });
	        $(window).on('resize', function () {
	            gameStageCanvas.height = $(window).innerHeight();
	            gameStageCanvas.width = $(window).innerWidth();
	            _this._gameStage.redrawStage();
	        });
	        this._connect();
	    };
	    Main.prototype._connect = function () {
	        var _this = this;
	        this._ws = new WebSocket('ws://localhost:8080');
	        this._ws.onopen = function () {
	            console.log("WebSocket Connected");
	            var playerName = prompt("请输入名字", "Default Player");
	            var protocol = {
	                type: GameProtocols.GameProtocolType.requestAddPlayer,
	                name: playerName,
	            };
	            _this._ws.send(JSON.stringify(protocol));
	        };
	        this._ws.onmessage = function (e) {
	            var protocol = JSON.parse(e.data);
	            switch (protocol.type) {
	                case GameProtocols.GameProtocolType.responseAddPlayer:
	                    _this._onResponseAddPlayer(protocol);
	                    break;
	                case GameProtocols.GameProtocolType.gameStatus:
	                    _this._onGameStatusChange(protocol);
	                    break;
	                case GameProtocols.GameProtocolType.gameOver:
	                    _this._onGameOver(protocol);
	                    break;
	            }
	        };
	        this._ws.onclose = function (e) {
	            onClose();
	        };
	        this._ws.onerror = function (e) {
	            onClose();
	        };
	        function onClose() {
	            console.log('WebSocket Disconnected');
	        }
	    };
	    Main.prototype._onResponseAddPlayer = function (protocol) {
	        this._gameStage.refreshCurrPlayerId(protocol.id);
	    };
	    Main.prototype._onGameStatusChange = function (protocol) {
	        this._gameStage.stageChange(protocol);
	    };
	    Main.prototype._onGameOver = function (protocol) {
	        alert('Game Over');
	    };
	    return Main;
	}());
	$(document).ready(function () {
	    new Main();
	});


/***/ },
/* 2 */
/***/ function(module, exports) {

	module.exports = window.$;

/***/ },
/* 3 */
/***/ function(module, exports) {

	"use strict";
	(function (GameProtocolType) {
	    GameProtocolType[GameProtocolType["requestAddPlayer"] = 0] = "requestAddPlayer";
	    GameProtocolType[GameProtocolType["responseAddPlayer"] = 1] = "responseAddPlayer";
	    GameProtocolType[GameProtocolType["movingShips"] = 2] = "movingShips";
	    GameProtocolType[GameProtocolType["gameStatus"] = 3] = "gameStatus";
	    GameProtocolType[GameProtocolType["gameOver"] = 4] = "gameOver";
	})(exports.GameProtocolType || (exports.GameProtocolType = {}));
	var GameProtocolType = exports.GameProtocolType;
	(function (PlanetStatus) {
	    PlanetStatus[PlanetStatus["none"] = 0] = "none";
	    PlanetStatus[PlanetStatus["occupying"] = 1] = "occupying";
	    PlanetStatus[PlanetStatus["occupied"] = 2] = "occupied";
	})(exports.PlanetStatus || (exports.PlanetStatus = {}));
	var PlanetStatus = exports.PlanetStatus;


/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	var __extends = (this && this.__extends) || function (d, b) {
	    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
	    function __() { this.constructor = d; }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	};
	var events = __webpack_require__(5);
	var $ = __webpack_require__(2);
	var GameProtocols = __webpack_require__(3);
	var GameStage = (function (_super) {
	    __extends(GameStage, _super);
	    function GameStage($canvas, $countRatio) {
	        _super.call(this);
	        this._canvas = $canvas[0];
	        this._ctx = this._canvas.getContext("2d");
	        this._$countRatio = $countRatio;
	        this._handleMovingShips(this._canvas);
	    }
	    GameStage.prototype.refreshCurrPlayerId = function (id) {
	        this._currPlayerId = id;
	    };
	    GameStage.prototype._handleMovingShips = function (canvas) {
	        var _this = this;
	        var $canvas = $(canvas);
	        $canvas.on('mousedown', function (e) {
	            throw '1';
	            var startPoint, endPoint;
	            startPoint = {
	                x: e.pageX - $canvas.offset().left,
	                y: e.pageY - $canvas.offset().top
	            };
	            $canvas.on('mousemove', function (e) {
	                endPoint = {
	                    x: e.pageX - $canvas.offset().left,
	                    y: e.pageY - $canvas.offset().top
	                };
	                _this.redrawStage();
	                _this._ctx.beginPath();
	                _this._ctx.moveTo(startPoint.x, startPoint.y);
	                _this._ctx.lineTo(endPoint.x, endPoint.y);
	                _this._ctx.stroke();
	                _this._ctx.closePath();
	            });
	            $canvas.one('mouseup', function (e) {
	                endPoint = {
	                    x: e.pageX - $canvas.offset().left,
	                    y: e.pageY - $canvas.offset().top
	                };
	                var planetFrom = _this._getPointedPlanet(startPoint.x, startPoint.y);
	                var planetTo = _this._getPointedPlanet(endPoint.x, endPoint.y);
	                if (planetFrom != null && planetTo != null) {
	                    var protocol = {
	                        type: GameProtocols.GameProtocolType.movingShips,
	                        planetFromId: planetFrom.id,
	                        planetToId: planetTo.id,
	                        countRatio: _this._$countRatio.val() / 100,
	                    };
	                    _this.emit('protocolSend', protocol);
	                }
	                _this.redrawStage();
	                $canvas.off('mousemove');
	            });
	        });
	    };
	    GameStage.prototype._getPointedPlanet = function (x, y) {
	        for (var _i = 0, _a = this._lastGameStatusProtocol.planets; _i < _a.length; _i++) {
	            var planet = _a[_i];
	            if (Math.sqrt(Math.pow(x - planet.position.x, 2) + Math.pow(y - planet.position.y, 2)) < planet.size / 2 + 20) {
	                return planet;
	            }
	        }
	        return null;
	    };
	    GameStage.prototype.redrawStage = function () {
	        if (this._lastGameStatusProtocol != undefined) {
	            this.stageChange(this._lastGameStatusProtocol);
	        }
	    };
	    GameStage.prototype.stageChange = function (status) {
	        this._lastGameStatusProtocol = status;
	        var ctx = this._ctx;
	        ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
	        ctx.font = '14px Arial,Microsoft YaHei';
	        status.movingShipsQueue.forEach(function (movingShips) {
	            var planetFrom = status.planets.filter(function (p) { return p.id == movingShips.planetFromId; })[0];
	            var planetTo = status.planets.filter(function (p) { return p.id == movingShips.planetToId; })[0];
	            var x = planetTo.position.x - movingShips.distanceLeft * (planetTo.position.x - planetFrom.position.x) / movingShips.distance;
	            var y = planetTo.position.y - movingShips.distanceLeft * (planetTo.position.y - planetFrom.position.y) / movingShips.distance;
	            var color = status.players.filter(function (player) { return player.id == movingShips.playerId; })[0].color;
	            ctx.fillStyle = color;
	            ctx.fillText(movingShips.count.toString(), x, y);
	        });
	        status.planets.forEach(function (planet) {
	            ctx.beginPath();
	            ctx.arc(planet.position.x, planet.position.y, planet.size / 2, 0, Math.PI * 2);
	            ctx.closePath();
	            if (planet.occupiedPlayerId != null) {
	                var color = status.players.filter(function (player) { return player.id == planet.occupiedPlayerId; })[0].color;
	                ctx.fillStyle = color;
	            }
	            else {
	                ctx.fillStyle = '#ddd';
	            }
	            ctx.fill();
	            ctx.fillStyle = 'black';
	            ctx.textBaseline = 'middle';
	            ctx.fillText(planet.id.toString(), planet.position.x, planet.position.y);
	            ctx.textAlign = 'center';
	            ctx.textBaseline = 'alphabetic';
	            var currY = 0;
	            planet.allShips.forEach(function (s) {
	                var player = status.players.filter(function (player) { return player.id == s.playerId; })[0];
	                ctx.fillStyle = player.color;
	                ctx.fillText(player.name + " " + s.count, planet.position.x, planet.position.y + planet.size / 2 + 15 + currY);
	                currY += 20;
	            });
	            if (planet.occupyingStatus != null) {
	                var player = status.players.filter(function (player) { return player.id == planet.occupyingStatus.playerId; })[0];
	                ctx.fillStyle = player.color;
	                ctx.fillText(player.name + " " + planet.occupyingStatus.percent + "%", planet.position.x, planet.position.y - planet.size / 2 - 10);
	            }
	        });
	    };
	    return GameStage;
	}(events.EventEmitter));
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.default = GameStage;


/***/ },
/* 5 */
/***/ function(module, exports) {

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
	      } else {
	        // At least give some kind of context to the user
	        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
	        err.context = er;
	        throw err;
	      }
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
	        args = Array.prototype.slice.call(arguments, 1);
	        handler.apply(this, args);
	    }
	  } else if (isObject(handler)) {
	    args = Array.prototype.slice.call(arguments, 1);
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
	  } else if (listeners) {
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
	
	EventEmitter.prototype.listenerCount = function(type) {
	  if (this._events) {
	    var evlistener = this._events[type];
	
	    if (isFunction(evlistener))
	      return 1;
	    else if (evlistener)
	      return evlistener.length;
	  }
	  return 0;
	};
	
	EventEmitter.listenerCount = function(emitter, type) {
	  return emitter.listenerCount(type);
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


/***/ }
/******/ ]);
//# sourceMappingURL=bundle.js.map