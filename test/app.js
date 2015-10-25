var MashPlayer = require('../src/player.js');

var player = new MashPlayer('.player');

document.querySelector('.play').onclick = function() { player.play(); }
document.querySelector('.pause').onclick = function() { player.pause(); }

var links = document.querySelectorAll('.link');
[].forEach.call(links, function(a) {
  a.onclick = function(e) {
    try {
      var url = a.dataset.href;
      console.log('url', url);
      player.load(url);
    } catch(err) {
      console.error('load error', err)
    }

    e.preventDefault();
    return false;
  }
});