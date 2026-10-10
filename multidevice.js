(function () {
  'use strict';
  var container = document.getElementById('container');
  var mobileControls = document.getElementById('dv-mobile-controls');
  var settings = document.getElementById('dv-settings');
  var keys = {left:'ArrowLeft',right:'ArrowRight',up:'ArrowUp',down:'ArrowDown',interact:'e',inventory:'i',reload:'r',flashlight:'f',headlights:'h'};
  var pressed = Object.create(null), rebinding = false, gamepadActive = false;
  var defaults = Object.assign({}, keys);
  try { Object.assign(keys, JSON.parse(localStorage.getItem('dv-control-bindings') || '{}')); } catch(e) {}
  var actionToGameEvent = {interact:'dude enter/exit',inventory:'toggle inventory',reload:'reload',flashlight:'toggle framerate',headlights:'dude toggle headlights'};
  function isTouchDevice(){return window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;}
  function gameRunning(){return !document.getElementById('main-screen').offsetParent && !settings.classList.contains('open');}
  function setDirection(dir, on) {
    if (pressed[dir] === !!on) return;
    pressed[dir] = !!on;
    var codes = {left:37,right:39,up:38,down:40};
    if (window.jQuery) {
      var ev = jQuery.Event(on ? 'keydown' : 'keyup');
      ev.keyCode = codes[dir]; ev.which = codes[dir];
      jQuery(window).trigger(ev);
    }
  }
  function fireAction(action) {
    var keyByAction = {interact:69,inventory:73,reload:82,flashlight:70,headlights:72};
    var code = keyByAction[action];
    if (code && window.jQuery) {
      var ev = jQuery.Event('keydown'); ev.keyCode = code; ev.which = code;
      jQuery(window).trigger(ev);
    }
  }
  function setControlVisibility() {
    var pad = navigator.getGamepads && Array.from(navigator.getGamepads()).some(function(p){return p && p.connected;});
    gamepadActive = !!pad;
    mobileControls.style.display = isTouchDevice() && !gamepadActive ? 'block' : 'none';
  }
  function showSettings() { settings.classList.add('open'); settings.setAttribute('aria-hidden','false'); }
  function hideSettings() { settings.classList.remove('open'); settings.setAttribute('aria-hidden','true'); }
  document.getElementById('settings-menu').addEventListener('click', showSettings);
  document.getElementById('dv-settings-close').addEventListener('click', hideSettings);
  document.getElementById('dv-resolution').value = localStorage.getItem('dv-resolution') || 'medium';
  function applyResolution(value) {
    localStorage.setItem('dv-resolution', value);
    container.classList.remove('dv-low','dv-medium','dv-high');
    container.classList.add('dv-' + value);
  }
  document.getElementById('dv-resolution').addEventListener('change', function(){applyResolution(this.value);});
  applyResolution(document.getElementById('dv-resolution').value);
  document.getElementById('dv-rebind').addEventListener('click', function(){
    rebinding = true;
    document.getElementById('dv-rebind-status').textContent = 'Press a key now…';
  });
  document.addEventListener('keydown', function(e) {
    if (rebinding) {
      e.preventDefault(); e.stopImmediatePropagation();
      var action = document.getElementById('dv-action').value;
      keys[action] = e.key;
      localStorage.setItem('dv-control-bindings', JSON.stringify(keys));
      document.getElementById('dv-rebind-status').textContent = action + ' = ' + e.key;
      rebinding = false; return;
    }
    Object.keys(keys).forEach(function(action) {
      if (e.key.toLowerCase() === String(keys[action]).toLowerCase()) {
        if (['left','right','up','down'].indexOf(action) >= 0) setDirection(action, true);
        else if (!e.repeat && String(keys[action]).toLowerCase() !== String(defaults[action]).toLowerCase()) fireAction(action);
      }
    });
  }, true);
  document.addEventListener('keyup', function(e) {
    Object.keys(keys).forEach(function(action) {
      if (e.key.toLowerCase() === String(keys[action]).toLowerCase() && ['left','right','up','down'].indexOf(action) >= 0) setDirection(action, false);
    });
  }, true);
  function bindHold(button, start, end) {
    button.addEventListener('pointerdown', function(e){e.preventDefault();button.setPointerCapture && button.setPointerCapture(e.pointerId);start();});
    ['pointerup','pointercancel','lostpointercapture'].forEach(function(name){button.addEventListener(name,function(e){e.preventDefault();end();});});
  }
  document.querySelectorAll('.dv-dir').forEach(function(b){var d=b.dataset.dir;bindHold(b,function(){setDirection(d,true);},function(){setDirection(d,false);});});
  document.querySelectorAll('.dv-action-buttons button').forEach(function(b){
    b.addEventListener('pointerdown',function(e){e.preventDefault();b.classList.add('active');});
    ['pointerup','pointercancel','pointerleave'].forEach(function(n){b.addEventListener(n,function(){b.classList.remove('active');});});
    b.addEventListener('click',function(){fireAction(b.dataset.action);});
  });
  var fs = document.getElementById('dv-fullscreen');
  fs.addEventListener('click', function(){
    var target = document.documentElement;
    if (!document.fullscreenElement) {
      var req = target.requestFullscreen || target.webkitRequestFullscreen;
      if (req) { var p = req.call(target); if (p && p.catch) p.catch(function(){}); }
    } else {
      var exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) exit.call(document);
    }
  });
  function updateFs(){fs.innerHTML = document.fullscreenElement ? '<span class="dv-shrink">⛶</span>' : '<span class="dv-expand">⛶</span>';fs.title=document.fullscreenElement?'Exit fullscreen':'Fullscreen';}
  document.addEventListener('fullscreenchange',updateFs);
  // Poll standard Gamepad API and map left stick / D-pad to the same movement state.
  function pollGamepad(){
    var pads = navigator.getGamepads ? navigator.getGamepads() : [];
    var pad = null;
    for(var i=0;i<pads.length;i++){if(pads[i] && pads[i].connected){pad=pads[i];break;}}
    gamepadActive = !!pad;
    if (pad) {
      var x = pad.axes && pad.axes.length ? pad.axes[0] : 0;
      var y = pad.axes && pad.axes.length > 1 ? pad.axes[1] : 0;
      setDirection('left',x < -0.35 || !!(pad.buttons[14] && pad.buttons[14].pressed));
      setDirection('right',x > 0.35 || !!(pad.buttons[15] && pad.buttons[15].pressed));
      setDirection('up',y < -0.35 || !!(pad.buttons[12] && pad.buttons[12].pressed));
      setDirection('down',y > 0.35 || !!(pad.buttons[13] && pad.buttons[13].pressed));
      if (pad.buttons[0] && pad.buttons[0].pressed && !pressed.padA) {fireAction('interact');pressed.padA=true;}
      if (!(pad.buttons[0] && pad.buttons[0].pressed)) pressed.padA=false;
      if (pad.buttons[2] && pad.buttons[2].pressed && !pressed.padX) {fireAction('inventory');pressed.padX=true;}
      if (!(pad.buttons[2] && pad.buttons[2].pressed)) pressed.padX=false;
    } else ['left','right','up','down'].forEach(function(d){setDirection(d,false);});
    mobileControls.style.display = isTouchDevice() && !pad ? 'block' : 'none';
    requestAnimationFrame(pollGamepad);
  }
  window.addEventListener('gamepadconnected',setControlVisibility);
  window.addEventListener('gamepaddisconnected',setControlVisibility);
  setControlVisibility(); requestAnimationFrame(pollGamepad);
  window.addEventListener('blur',function(){['left','right','up','down'].forEach(function(d){setDirection(d,false);});});
  // Preserve the original 3:2 game viewport while fitting the screen in landscape.
  function fitGame(){
    var w=window.innerWidth,h=window.innerHeight;
    if (w < h && isTouchDevice()) document.body.classList.add('dv-portrait');
    else document.body.classList.remove('dv-portrait');
    if (document.fullscreenElement) {
      container.style.margin='0 auto';
      container.style.maxWidth='100vw';container.style.maxHeight='100vh';
    } else {container.style.margin='20px auto 0';}
  }
  window.addEventListener('resize',fitGame);fitGame();
})();
