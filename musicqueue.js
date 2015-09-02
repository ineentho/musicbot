Songs = new Mongo.Collection('songs');
ShowPlayer = new ReactiveVar(false);

var volume;
var playing = false;
var waitingForSong = false;

if (Meteor.isClient) {
    var allSongs = Songs.find({}); 
    allSongs.observe({
        added: function() {
            playNext();
        }
    });

   if (location.hash) {
        var opts = location.hash.split('|');
        var autoplay = opts[0];
        volume = opts[1];

        if (autoplay) {
            ShowPlayer.set(true);
            waitingForSong = true;
            setTimeout(playNext, 2000);
        }
    }

    function loadYT() {
        var tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    } loadYT();

  Template.songs.helpers({
    songs: function () {
        return Songs.find({});
    }
  });

  Template.addsong.events({
    'submit .add-song': function (e) {
        e.preventDefault();
        var url = event.target.url.value;
        getSongDetails(url, function(details) {
            if (details.items.length == 0) {
                return alert('Song not found');
            } else {
                var song = details.items[0];
                var title = song.snippet.title;

                Songs.insert({
                    id: song.id,
                    title: title
                });
            }
        });
    }
  });

  Template.songs.events({
    'click #remove': function(song) {
        var id = song.target.getAttribute('songid');
        Songs.remove({_id: id});
    }
  });

  Template.player.helpers({
    showPlayer: function () {
        return ShowPlayer.get();
    }
  });

  Template.player.events({
    'click #start': function() {
        waitingForSong = true;
        playNext();
      },

    'click #skip': function() {
        console.log('skip');
        waitingForSong = true;
        playing = false;
        document.querySelector('#songplayer').innerHTML = '';
        playNext();
    }
    });
}

function playYT(song) {
    document.querySelector('#songplayer').innerHTML = '<div id="ytsong"></div>';
    var player = new YT.Player('ytsong', {
          height: '390',
          width: '640',
          videoId: song.id ,
          playerVars: { 'autoplay': 1, 'controls': 0 },
          events: {
            'onStateChange': onPlayerStateChange,
            'onReady': onPlayerReady
          }
        });

    function onPlayerStateChange(e) {
        if (e.data === YT.PlayerState.ENDED) {
            waitingForSong = true;
            playing = false;
            playNext();
        }
    }

    function onPlayerReady(e) {
        console.log('ready', volume);
      e.target.setVolume(volume);
    }

}

function playNext() {
    if (!waitingForSong) {
        return console.log('Play next was called but not waiting for song');
    }

    if (playing) {
        return console.log('Play next was called but song is already playing');
    }
    var song = Songs.findOne();
    if (song) {
        playing = true;
        Songs.remove({_id: song._id});
        playYT(song);
    } else {
        waitingForSong = true;
    }
    
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}


function getSongDetails(url, cb) {
    var baseUrl = "https://www.googleapis.com/youtube/v3/videos?key=AIzaSyCh2_imw964VyHFRD_SW_vm1coEzmiwOQk&part=snippet&id=";
    var id;

    if (url.indexOf('youtube') === -1) {
        id = url;
    } else {
        id = url.split('?v=')[1];
    }

    var fullUrl = baseUrl + id;

    var ajax = new XMLHttpRequest();

    ajax.addEventListener('readystatechange', function() {
        if (ajax.readyState == 4) {
            var resp = JSON.parse(ajax.responseText);
            cb(resp);
        }
    });

    ajax.open('GET', fullUrl);
    ajax.send();
}
