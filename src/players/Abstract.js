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