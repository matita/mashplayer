module.exports = function(url) {
    if (!url)
        return null;
    var m = url.match(/https?:\/\/vimeo\.com\/(\d+)/i);
    return m && m[1];
};