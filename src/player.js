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




