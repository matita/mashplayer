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