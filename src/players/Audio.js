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