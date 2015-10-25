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