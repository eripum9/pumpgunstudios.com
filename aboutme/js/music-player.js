(function () {
  'use strict';

  var TRANSPARENT_1x1 = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
  var IS_GERMAN = document.documentElement.lang.toLowerCase().indexOf('de') === 0;
  function localized(english, german) {
    return IS_GERMAN ? german : english;
  }
  var MUSIC_DIR = document.getElementById('music-player').dataset.musicDir || 'assets/music/';

  var audio = new Audio();
  audio.preload = 'none';

  var preloadAudio = new Audio();
  preloadAudio.preload = 'metadata';
  var preloadedSrc = '';

  var albums = [];
  var allTracks = [];
  var playQueue = [];
  var currentIndex = -1;
  var selectedAlbumId = '';
  var isPlaying = false;
  var hasStartedPlayback = false;
  var pendingAudioSrc = '';
  var coverCache = Object.create(null);
  var thumbRequestId = 0;

  var elPlayer        = document.getElementById('music-player');
  var elThumb         = document.getElementById('mp-thumb');
  var elTitle         = document.getElementById('mp-title');
  var elArtist        = document.getElementById('mp-artist');
  var elPlay          = document.getElementById('mp-play');
  var elPrev          = document.getElementById('mp-prev');
  var elNext          = document.getElementById('mp-next');
  var elStop          = document.getElementById('mp-stop');
  var elBar           = document.getElementById('mp-progress-bar');
  var elProgress      = document.getElementById('mp-progress');
  var elLibrary       = document.getElementById('mp-library');
  var elLibraryToggle = document.getElementById('mp-library-toggle');
  var elAlbumStrip    = document.getElementById('mp-album-strip');
  var elSongList      = document.getElementById('mp-song-list');
  var elLibraryAlbum  = document.getElementById('mp-library-album');
  var elLibrarySpotify = document.getElementById('mp-library-spotify');
  var iconPlay        = elPlay && elPlay.querySelector('.mp-icon-play');
  var iconPause       = elPlay && elPlay.querySelector('.mp-icon-pause');

  if (elThumb) {
    elThumb.decoding = 'async';
    var existing = elThumb.getAttribute('src');
    if (!existing) {
      try {
        elThumb.src = TRANSPARENT_1x1;
        elThumb.width = 56;
        elThumb.height = 56;
      } catch (e) {}
    }
  }

  function isExternalAsset(src) {
    return /^(?:https?:|\/|data:|blob:)/.test(src);
  }

  function mediaSrc(file) {
    return isExternalAsset(file) ? file : MUSIC_DIR + file;
  }

  function slugify(value) {
    return String(value || 'album')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'album';
  }

  function normalizeData(data) {
    if (data && Array.isArray(data.albums)) {
      albums = data.albums.map(function (album, albumIndex) {
        return normalizeAlbum(album, albumIndex);
      }).filter(function (album) {
        return album.tracks.length > 0;
      });
    } else {
      var tracks = Array.isArray(data) ? data : (data && Array.isArray(data.tracks) ? data.tracks : []);
      albums = [normalizeAlbum({
        id: 'favorites',
        name: localized('Favorites', 'Favoriten'),
        artist: '',
        cover: tracks[0] && tracks[0].thumbnail,
        tracks: tracks
      }, 0)].filter(function (album) {
        return album.tracks.length > 0;
      });
    }

    allTracks = [];
    albums.forEach(function (album) {
      allTracks = allTracks.concat(album.tracks);
    });
  }

  function spotifyUrl(value) {
    if (typeof value !== 'string') return '';
    value = value.trim();
    if (/^open\.spotify\.com\//i.test(value)) value = 'https://' + value;
    try {
      var url = new URL(value);
      if (url.hostname !== 'open.spotify.com' || !/^https?:$/.test(url.protocol)) return '';
      url.protocol = 'https:';
      return url.href;
    } catch (error) {
      return '';
    }
  }

  function normalizeAlbum(album, albumIndex) {
    var name = album.name || album.title || (localized('Album ', 'Album ') + (albumIndex + 1));
    var artist = album.artist || '';
    var cover = album.cover || album.thumbnail || '';
    var spotify = spotifyUrl(album.spotify || album.link || '');
    var id = album.id || slugify(name);

    var normalizedAlbum = {
      id: id,
      name: name,
      artist: artist,
      cover: cover,
      spotify: spotify,
      tracks: []
    };

    normalizedAlbum.tracks = (album.tracks || []).map(function (track, trackIndex) {
      var trackSpotify = spotifyUrl(track.spotify || track.link || '');
      return {
        id: track.id || (id + '-' + (track.track || trackIndex + 1) + '-' + slugify(track.title || track.file || trackIndex)),
        track: track.track || trackIndex + 1,
        file: track.file,
        title: track.title || track.name || localized('Unknown', 'Unbekannt'),
        artist: track.artist || artist,
        spotify: trackSpotify,
        link: trackSpotify,
        thumbnail: track.thumbnail || cover,
        albumId: id,
        albumName: name,
        albumArtist: artist,
        albumCover: cover,
        albumSpotify: spotify
      };
    }).filter(function (track) {
      return !!track.file;
    });

    return normalizedAlbum;
  }

  function getAlbumById(albumId) {
    for (var i = 0; i < albums.length; i++) {
      if (albums[i].id === albumId) return albums[i];
    }
    return albums[0] || null;
  }

  function getTrackAlbum(track) {
    return track ? getAlbumById(track.albumId) : null;
  }

  function queueForAlbum(albumId) {
    var album = getAlbumById(albumId);
    return album ? album.tracks.slice() : allTracks.slice();
  }

  function setQueue(queue) {
    playQueue = Array.isArray(queue) && queue.length > 0 ? queue.slice() : allTracks.slice();
    preloadedSrc = '';
  }

  function thumbCandidates(track) {
    var baseName = track.file.replace(/\.[^.]+$/, '');
    var candidates = [];
    if (track.thumbnail) candidates.push(track.thumbnail);
    if (track.albumCover && track.albumCover !== track.thumbnail) candidates.push(track.albumCover);
    candidates.push(baseName + '.webp', baseName + '.png', baseName + '.jpg', baseName + '.jpeg');
    return candidates;
  }

  function preloadCover(src) {
    if (!src) return Promise.reject(new Error('Missing cover'));
    if (coverCache[src]) return coverCache[src];

    coverCache[src] = new Promise(function (resolve, reject) {
      var img = new Image();
      var settled = false;

      function finish() {
        if (settled) return;
        settled = true;
        var decoded = img.decode ? img.decode().catch(function () {}) : Promise.resolve();
        decoded.then(function () { resolve(src); });
      }

      img.decoding = 'async';
      img.onload = finish;
      img.onerror = function () { reject(new Error('Cover failed: ' + src)); };
      img.src = src;
      if (img.complete && img.naturalWidth > 0) finish();
    }).catch(function (err) {
      delete coverCache[src];
      throw err;
    });

    return coverCache[src];
  }

  function setAudioSource(src, preloadMode) {
    audio.preload = preloadMode;
    if (audio.getAttribute('src') !== src) {
      audio.src = src;
    }
  }

  function prepareAudioForPlayback() {
    if (!pendingAudioSrc) return;
    setAudioSource(pendingAudioSrc, 'auto');
  }

  function preloadPlaylistCovers() {
    var seen = Object.create(null);
    albums.forEach(function (album) {
      if (album.cover) {
        var albumCover = mediaSrc(album.cover);
        if (!seen[albumCover]) {
          seen[albumCover] = true;
          preloadCover(albumCover).catch(function () {});
        }
      }
      album.tracks.forEach(function (track) {
        var candidate = thumbCandidates(track)[0];
        if (!candidate) return;
        var src = mediaSrc(candidate);
        if (seen[src]) return;
        seen[src] = true;
        preloadCover(src).catch(function () {});
      });
    });
  }

  function setThumb(track) {
    if (!elThumb) return;

    var candidates = thumbCandidates(track);
    var requestId = ++thumbRequestId;

    function tryCandidate(index) {
      if (requestId !== thumbRequestId) return;
      if (index >= candidates.length) {
        elThumb.src = TRANSPARENT_1x1;
        return;
      }

      var src = mediaSrc(candidates[index]);
      preloadCover(src)
        .then(function () {
          if (requestId === thumbRequestId && elThumb.src !== src) {
            elThumb.src = src;
          }
        })
        .catch(function () {
          tryCandidate(index + 1);
        });
    }

    tryCandidate(0);
  }

  function preloadTrack(index) {
    if (!hasStartedPlayback || playQueue.length === 0) return;
    var idx = ((index % playQueue.length) + playQueue.length) % playQueue.length;
    var track = playQueue[idx];
    if (!track || !track.file) return;
    var src = mediaSrc(track.file);
    if (preloadedSrc === src) return;
    try {
      preloadAudio.src = src;
      preloadAudio.preload = 'metadata';
      preloadAudio.load();
      preloadedSrc = src;
    } catch (e) {}
  }

  function setLibraryOpen(open) {
    if (!elPlayer || !elLibrary || !elLibraryToggle) return;
    elPlayer.classList.toggle('library-open', open);
    elLibrary.setAttribute('aria-hidden', open ? 'false' : 'true');
    elLibrary.inert = !open;
    elLibraryToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (elLibrarySpotify) elLibrarySpotify.tabIndex = open && elLibrarySpotify.classList.contains('visible') ? 0 : -1;
  }

  function renderLibrary() {
    renderAlbums();
    selectAlbum(selectedAlbumId || (albums[0] && albums[0].id), false);
  }

  function renderAlbums() {
    if (!elAlbumStrip) return;
    elAlbumStrip.innerHTML = '';

    albums.forEach(function (album) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'mp-album-card';
      button.setAttribute('data-album-id', album.id);
      button.setAttribute('aria-label', album.name);

      var img = document.createElement('img');
      img.src = album.cover ? mediaSrc(album.cover) : TRANSPARENT_1x1;
      img.alt = '';
      img.decoding = 'async';

      var meta = document.createElement('span');
      meta.className = 'mp-album-meta';

      var name = document.createElement('span');
      name.className = 'mp-album-name';
      name.textContent = album.name;

      var artist = document.createElement('span');
      artist.className = 'mp-album-artist';
      artist.textContent = album.artist || (album.tracks.length + localized(' tracks', ' Titel'));

      meta.appendChild(name);
      meta.appendChild(artist);
      button.appendChild(img);
      button.appendChild(meta);
      button.addEventListener('click', function () {
        selectAlbum(album.id, true);
      });

      elAlbumStrip.appendChild(button);
    });
  }

  function selectAlbum(albumId, focusSongs) {
    var album = getAlbumById(albumId);
    if (!album) return;
    selectedAlbumId = album.id;

    if (elLibraryAlbum) elLibraryAlbum.textContent = album.name;
    if (elLibrarySpotify) {
      if (album.spotify) {
        elLibrarySpotify.href = album.spotify;
        elLibrarySpotify.setAttribute('aria-label', IS_GERMAN
          ? album.name + ' auf Spotify öffnen'
          : 'Open ' + album.name + ' on Spotify');
        elLibrarySpotify.classList.add('visible');
        elLibrarySpotify.tabIndex = elPlayer && elPlayer.classList.contains('library-open') ? 0 : -1;
      } else {
        elLibrarySpotify.removeAttribute('href');
        elLibrarySpotify.classList.remove('visible');
        elLibrarySpotify.tabIndex = -1;
      }
    }

    if (elAlbumStrip) {
      var albumCards = elAlbumStrip.querySelectorAll('.mp-album-card');
      albumCards.forEach(function (card) {
        card.classList.toggle('active', card.getAttribute('data-album-id') === album.id);
      });
    }

    renderSongs(album);
    if (focusSongs && elSongList) elSongList.focus && elSongList.focus();
  }

  function renderSongs(album) {
    if (!elSongList) return;
    elSongList.innerHTML = '';

    album.tracks.forEach(function (track, index) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'mp-song-row';
      button.setAttribute('data-track-id', track.id);
      button.setAttribute('aria-label', track.title);

      var number = document.createElement('span');
      number.className = 'mp-song-number';
      number.textContent = String(track.track || index + 1).padStart(2, '0');

      var text = document.createElement('span');
      text.className = 'mp-song-text';

      var title = document.createElement('span');
      title.className = 'mp-song-title';
      title.textContent = track.title || localized('Unknown', 'Unbekannt');

      var artist = document.createElement('span');
      artist.className = 'mp-song-artist';
      artist.textContent = track.artist || album.artist || '';

      text.appendChild(title);
      text.appendChild(artist);
      button.appendChild(number);
      button.appendChild(text);
      button.addEventListener('click', function () {
        setQueue(album.tracks);
        loadQueueTrack(index, true);
        setLibraryOpen(false);
      });

      elSongList.appendChild(button);
    });

    updateActiveSong();
  }

  function updateActiveSong() {
    if (!elSongList) return;
    var currentTrack = playQueue[currentIndex];
    var rows = elSongList.querySelectorAll('.mp-song-row');
    rows.forEach(function (row) {
      row.classList.toggle('active', !!currentTrack && row.getAttribute('data-track-id') === currentTrack.id);
    });
  }

  function updateSelectedAlbumFromTrack(track) {
    if (!track) return;
    selectedAlbumId = track.albumId || selectedAlbumId;
    selectAlbum(selectedAlbumId, false);
  }

  function loadPlaylist() {
    fetch(MUSIC_DIR + 'playlist.json')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        normalizeData(data);

        if (allTracks.length > 0 && elPlayer) {
          elPlayer.style.display = '';
          preloadPlaylistCovers();
          renderLibrary();

          var randomStartIndex = Math.floor(Math.random() * allTracks.length);
          var randomTrack = allTracks[randomStartIndex];
          var album = getTrackAlbum(randomTrack);
          setQueue(album ? album.tracks : allTracks);
          var queueIndex = playQueue.indexOf(randomTrack);
          loadQueueTrack(queueIndex >= 0 ? queueIndex : 0, false);
        } else if (elPlayer) {
          elPlayer.style.display = 'none';
        }
      })
      .catch(function () {
        if (elPlayer) elPlayer.style.display = 'none';
      });
  }

  function loadQueueTrack(index, autoplay) {
    if (!Array.isArray(playQueue) || playQueue.length === 0) return;
    index = ((index % playQueue.length) + playQueue.length) % playQueue.length;
    currentIndex = index;
    var track = playQueue[currentIndex];
    if (!track || !track.file) return;

    pendingAudioSrc = mediaSrc(track.file);
    if (autoplay) {
      prepareAudioForPlayback();
    } else {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      audio.preload = 'none';
    }

    if (elTitle) {
      elTitle.innerHTML = '';
      var link = track.spotify || track.link || track.albumSpotify || '';
      if (link) {
        var a = document.createElement('a');
        a.href = link;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = track.title || localized('Unknown', 'Unbekannt');
        a.style.color = 'inherit';
        elTitle.appendChild(a);
      } else {
        elTitle.textContent = track.title || localized('Unknown', 'Unbekannt');
      }
    }

    if (elArtist) {
      elArtist.textContent = track.artist || track.albumArtist || '';
    }
    updateSeekProgress(0);

    setThumb(track);
    updateSelectedAlbumFromTrack(track);
    updateActiveSong();
    updateMediaSession(track);

    if (autoplay) {
      hasStartedPlayback = true;
      audio.play().catch(function () { setPlaying(false); });
    } else {
      setPlaying(false);
    }

    preloadTrack(index + 1);
  }

  function setPlaying(state) {
    isPlaying = state;
    if (iconPlay) iconPlay.style.display = state ? 'none' : '';
    if (iconPause) iconPause.style.display = state ? '' : 'none';
    if (elPlay) {
      elPlay.setAttribute('aria-label', state
        ? localized('Pause', 'Pausieren')
        : localized('Play', 'Wiedergabe starten'));
    }
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = state ? 'playing' : 'paused';
    }
  }

  audio.addEventListener('play', function () { setPlaying(true); });
  audio.addEventListener('pause', function () { setPlaying(false); });
  audio.addEventListener('error', function () { setPlaying(false); });

  function mimeFromExt(filename) {
    var ext = (filename.match(/\.([^.]+)$/) || [])[1];
    if (ext) ext = ext.toLowerCase();
    if (ext === 'png') return 'image/png';
    if (ext === 'webp') return 'image/webp';
    if (ext === 'gif') return 'image/gif';
    return 'image/jpeg';
  }

  function updateMediaSession(track) {
    if (!('mediaSession' in navigator)) return;
    var thumbFile = track.thumbnail || track.albumCover || '';
    var thumbSrc = thumbFile ? mediaSrc(thumbFile) : TRANSPARENT_1x1;
    var artworkUrl = new URL(thumbSrc, window.location.href).href;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title || localized('Unknown', 'Unbekannt'),
      artist: track.artist || track.albumArtist || '',
      album: track.albumName || '',
      artwork: [
        { src: artworkUrl, sizes: '160x160', type: mimeFromExt(thumbFile || 'cover.webp') }
      ]
    });
  }

  function setupMediaSessionHandlers() {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.setActionHandler('play', function () {
      if (!Array.isArray(playQueue) || playQueue.length === 0) return;
      if (currentIndex < 0) { loadQueueTrack(0, true); return; }
      prepareAudioForPlayback();
      hasStartedPlayback = true;
      audio.play().catch(function () { setPlaying(false); });
      preloadTrack(currentIndex + 1);
    });

    navigator.mediaSession.setActionHandler('pause', function () {
      audio.pause();
      setPlaying(false);
    });

    navigator.mediaSession.setActionHandler('previoustrack', function () {
      if (!Array.isArray(playQueue) || playQueue.length === 0) return;
      if (audio.currentTime > 3) {
        audio.currentTime = 0;
      } else {
        loadQueueTrack(currentIndex - 1, true);
      }
    });

    navigator.mediaSession.setActionHandler('nexttrack', function () {
      if (!Array.isArray(playQueue) || playQueue.length === 0) return;
      loadQueueTrack(currentIndex + 1, true);
    });

    navigator.mediaSession.setActionHandler('stop', function () {
      audio.pause();
      audio.currentTime = 0;
      setPlaying(false);
      updateSeekProgress(0);
    });

    try {
      navigator.mediaSession.setActionHandler('seekto', function (details) {
        if (!audio.duration) return;
        if (details.fastSeek && 'fastSeek' in audio) {
          audio.fastSeek(details.seekTime);
        } else {
          audio.currentTime = details.seekTime;
        }
      });
    } catch (e) {}
  }

  setupMediaSessionHandlers();

  if (elLibraryToggle) {
    elLibraryToggle.addEventListener('click', function () {
      setLibraryOpen(!(elPlayer && elPlayer.classList.contains('library-open')));
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setLibraryOpen(false);
  });

  document.addEventListener('click', function (e) {
    if (!elPlayer || !elPlayer.classList.contains('library-open')) return;
    if (!elPlayer.contains(e.target)) setLibraryOpen(false);
  });

  if (elPlay) {
    elPlay.addEventListener('click', function () {
      if (!Array.isArray(playQueue) || playQueue.length === 0) return;
      if (isPlaying) {
        audio.pause();
        setPlaying(false);
      } else {
        if (currentIndex < 0) loadQueueTrack(0, true);
        else {
          prepareAudioForPlayback();
          hasStartedPlayback = true;
          audio.play().catch(function () { setPlaying(false); });
          preloadTrack(currentIndex + 1);
        }
      }
    });
  }

  if (elStop) {
    elStop.addEventListener('click', function () {
      audio.pause();
      audio.currentTime = 0;
      setPlaying(false);
      updateSeekProgress(0);
    });
  }

  if (elNext) {
    elNext.addEventListener('click', function () {
      if (!Array.isArray(playQueue) || playQueue.length === 0) return;
      loadQueueTrack(currentIndex + 1, true);
    });
  }

  if (elPrev) {
    elPrev.addEventListener('click', function () {
      if (!Array.isArray(playQueue) || playQueue.length === 0) return;
      if (audio.currentTime > 3) {
        audio.currentTime = 0;
      } else {
        loadQueueTrack(currentIndex - 1, true);
      }
    });
  }

  var hasPositionState = 'mediaSession' in navigator && 'setPositionState' in navigator.mediaSession;

  audio.addEventListener('timeupdate', function () {
    if (audio.duration && elProgress) {
      updateSeekProgress(audio.currentTime / audio.duration * 100);
    }
    if (hasPositionState && audio.duration) {
      try {
        navigator.mediaSession.setPositionState({
          duration: audio.duration,
          playbackRate: audio.playbackRate,
          position: audio.currentTime
        });
      } catch (e) {}
    }
  });

  audio.addEventListener('ended', function () {
    if (!Array.isArray(playQueue) || playQueue.length === 0) return;
    loadQueueTrack(currentIndex + 1, true);
  });

  function updateSeekProgress(percent) {
    percent = Math.max(0, Math.min(100, percent || 0));
    if (elProgress) elProgress.style.width = percent + '%';
    if (elBar) {
      var roundedPercent = Math.round(percent);
      elBar.setAttribute('aria-valuenow', String(roundedPercent));
      elBar.setAttribute('aria-valuetext', IS_GERMAN
        ? roundedPercent + ' % abgespielt'
        : roundedPercent + '% played');
    }
  }

  function seekToPercent(percent) {
    if (!audio.duration) return;
    audio.currentTime = Math.max(0, Math.min(100, percent)) / 100 * audio.duration;
    updateSeekProgress(percent);
  }

  if (elBar) {
    elBar.addEventListener('click', function (e) {
      if (!audio.duration) return;
      var rect = elBar.getBoundingClientRect();
      var ratio = (e.clientX - rect.left) / rect.width;
      seekToPercent(ratio * 100);
    });
    elBar.addEventListener('keydown', function (e) {
      if (!audio.duration) return;
      var currentPercent = audio.currentTime / audio.duration * 100;
      var step = e.shiftKey || e.key === 'PageUp' || e.key === 'PageDown' ? 10 : 2;
      var nextPercent;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'PageUp') nextPercent = currentPercent + step;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown' || e.key === 'PageDown') nextPercent = currentPercent - step;
      else if (e.key === 'Home') nextPercent = 0;
      else if (e.key === 'End') nextPercent = 100;
      else return;
      e.preventDefault();
      seekToPercent(nextPercent);
    });
  }

  if (elPlayer) elPlayer.style.display = 'none';
  loadPlaylist();

})();
