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