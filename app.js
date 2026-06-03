const API_KEY = 'AIzaSyCMUD8WFt0dCKhiTcH8FM_x4V0ksO6g-iY'; 
let player;
let currentPlaylist = [];
let currentIndex = 0;
let isSearching = false; 
let isSeeking = false; 

function onYouTubeIframeAPIReady() {
    player = new YT.Player('yt-core-player', {
        height: '1',
        width: '1',
        videoId: '',
        playerVars: {
            'playsinline': 1,
            'controls': 0,
            'disablekb': 1
        },
        events: {
            'onStateChange': onPlayerStateChange,
            'onError': onPlayerError
        }
    });
    
    initProgressBar();
    setupImmersiveModal();
}

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function initProgressBar() {
    // Sync both regular and fullscreen immersive progress lines
    const progressBars = [
        document.getElementById('progress-bar'),
        document.getElementById('imm-progress-bar')
    ];
    
    progressBars.forEach(bar => {
        if (!bar) return;
        bar.parentElement.addEventListener('click', (e) => {
            if (!player || !currentPlaylist.length) return;
            isSeeking = true;
            const rect = bar.getBoundingClientRect();
            const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            const duration = player.getDuration();
            if (duration > 0) {
                player.seekTo(percent * duration);
            }
            setTimeout(() => { isSeeking = false; }, 400);
        });
    });
}

function updateProgressBar() {
    if (!player || !currentPlaylist.length || isSeeking) return;
    
    // Safety verification check that player initialization state is stable
    if (typeof player.getCurrentTime !== 'function') return;

    const current = player.getCurrentTime();
    const duration = player.getDuration();
    
    if (duration > 0) {
        const percent = (current / duration) * 100;
        
        // Sync Mini Player View Node Elements
        document.getElementById('progress-fill').style.width = percent + '%';
        if(document.getElementById('progress-slider')) {
            document.getElementById('progress-slider').style.left = percent + '%';
        }
        document.getElementById('current-time').textContent = formatTime(current);
        document.getElementById('total-time').textContent = formatTime(duration);

        // Sync Fullscreen Immersive Canvas View Elements
        const immFill = document.getElementById('imm-progress-fill');
        if (immFill) {
            immFill.style.width = percent + '%';
            document.getElementById('imm-current-time').textContent = formatTime(current);
            document.getElementById('imm-total-time').textContent = formatTime(duration);
        }
    }
}

setInterval(updateProgressBar, 250);

// Tab Navigation Controls 
const navSearch = document.getElementById('nav-search');
const navPlaylist = document.getElementById('nav-playlist');
const searchView = document.getElementById('search-view');
const playlistView = document.getElementById('playlist-view');

navSearch.addEventListener('click', () => {
    navSearch.classList.add('active');
    navPlaylist.classList.remove('active');
    searchView.classList.remove('hidden');
    playlistView.classList.add('hidden');
});

navPlaylist.addEventListener('click', () => {
    navPlaylist.classList.add('active');
    navSearch.classList.remove('active');
    playlistView.classList.remove('hidden');
    searchView.classList.add('hidden');
    updatePlaylistUI();
});

// Smart Quota Search Algorithm
document.getElementById('search-btn').addEventListener('click', async () => {
    const query = document.getElementById('search-input').value.trim().toLowerCase();
    if (!query || isSearching) return;

    isSearching = true;
    const searchBtn = document.getElementById('search-btn');
    searchBtn.textContent = '...';

    const cachedData = localStorage.getItem(`yt_search_${query}`);
    if (cachedData) {
        displayResults(JSON.parse(cachedData));
        resetSearchButton();
        return;
    }

    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=${encodeURIComponent(query)}&type=video&videoCategoryId=10&key=${API_KEY}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('API Out of bound errors');
        const data = await response.json();
        
        const tracks = data.items.map(item => ({
            id: item.id.videoId,
            title: item.snippet.title,
            channel: item.snippet.channelTitle,
            thumbnail: item.snippet.thumbnails.medium.url
        }));

        localStorage.setItem(`yt_search_${query}`, JSON.stringify(tracks));
        displayResults(tracks);
    } catch (error) {
        console.error(error);
        alert("Verification Exception or Quota bounds exhausted.");
    } finally {
        resetSearchButton();
    }
});

function resetSearchButton() {
    isSearching = false;
    document.getElementById('search-btn').textContent = 'Search';
}

function displayResults(tracks) {
    const resultsList = document.getElementById('results-list');
    resultsList.innerHTML = '';

    tracks.forEach(track => {
        const card = document.createElement('div');
        card.className = 'track-card track-row';
        card.innerHTML = `
            <img src="${track.thumbnail}" alt="cover" class="track-thumb">
            <div class="track-meta">
                <span class="title">${track.title}</span>
                <span class="channel">${track.channel}</span>
            </div>
            <div class="row-actions-group">
                <button class="action-btn" onclick="playSearchTrack('${track.id}', '${btoa(encodeURIComponent(track.title))}', '${btoa(encodeURIComponent(track.thumbnail))}', '${btoa(encodeURIComponent(track.channel))}', event)">▶ Play</button>
                <button class="action-btn" onclick="addToPlaylist('${track.id}', '${btoa(encodeURIComponent(track.title))}', '${btoa(encodeURIComponent(track.thumbnail))}', '${btoa(encodeURIComponent(track.channel))}')">＋ Add</button>
            </div>
        `;
        resultsList.appendChild(card);
    });
}

function addToPlaylist(id, encodedTitle, encodedThumb, encodedChannel) {
    const title = decodeURIComponent(atob(encodedTitle));
    const thumbnail = decodeURIComponent(atob(encodedThumb));
    const channel = decodeURIComponent(atob(encodedChannel));
    
    if (currentPlaylist.some(item => item.id === id)) return;

    currentPlaylist.push({ id, title, thumbnail, channel });
    document.getElementById('playlist-count').textContent = currentPlaylist.length;
    updatePlaylistUI();
}

function playSearchTrack(id, encodedTitle, encodedThumb, encodedChannel, event) {
    if (event) event.stopPropagation();
    const title = decodeURIComponent(atob(encodedTitle));
    const thumbnail = decodeURIComponent(atob(encodedThumb));
    const channel = decodeURIComponent(atob(encodedChannel));
    
    const existingIndex = currentPlaylist.findIndex(item => item.id === id);
    
    if (existingIndex !== -1) {
        playTrack(existingIndex);
    } else {
        currentPlaylist.unshift({ id, title, thumbnail, channel });
        document.getElementById('playlist-count').textContent = currentPlaylist.length;
        playTrack(0);
    }
}

function updatePlaylistUI() {
    const playlistList = document.getElementById('playlist-list');
    playlistList.innerHTML = '';

    if (currentPlaylist.length === 0) {
        playlistList.innerHTML = `<p class="empty-state">Playlist queue is blank.</p>`;
        return;
    }

    currentPlaylist.forEach((track, index) => {
        const card = document.createElement('div');
        card.className = `track-row ${index === currentIndex ? 'playing-active' : ''}`;
        card.innerHTML = `
            <img src="${track.thumbnail}" alt="cover" class="track-thumb">
            <div class="track-meta" onclick="playTrack(${index})">
                <span class="title">${track.title}</span>
                <span class="channel">${track.channel}</span>
            </div>
            <button class="action-btn delete" onclick="removeFromPlaylist(${index}, event)">✕ Remove</button>
        `;
        playlistList.appendChild(card);
    });
}

function removeFromPlaylist(index, event) {
    event.stopPropagation();
    currentPlaylist.splice(index, 1);
    document.getElementById('playlist-count').textContent = currentPlaylist.length;
    updatePlaylistUI();
}

// Master Core Playback Triggers
function playTrack(index) {
    if (index < 0 || index >= currentPlaylist.length || !player) return;
    currentIndex = index;
    const track = currentPlaylist[currentIndex];
    
    // Update active UI details across layouts
    document.getElementById('current-title').textContent = track.title;
    document.getElementById('mini-cover').src = track.thumbnail;
    
    // Sync Immersive Overlay Modal DOM references
    document.getElementById('large-cover').src = track.thumbnail;
    document.getElementById('modal-blur-bg').style.backgroundImage = `url(${track.thumbnail})`;
    document.getElementById('immersive-title').textContent = track.title;
    document.getElementById('immersive-artist').textContent = track.channel;

    player.loadVideoById(track.id);
    togglePlayButtonLook(true);
}

function togglePlayButtonLook(isPlaying) {
    const symbols = isPlaying ? '⏸' : '▶';
    document.getElementById('play-btn').textContent = symbols;
    const immPlay = document.getElementById('imm-play-btn');
    if(immPlay) immPlay.textContent = symbols;
}

// Dual Event Connectors for standard buttons and overlay buttons
document.getElementById('play-btn').addEventListener('click', handleTogglePlay);
document.getElementById('next-btn').addEventListener('click', () => playTrack(currentIndex + 1));
document.getElementById('prev-btn').addEventListener('click', () => playTrack(currentIndex - 1));

function handleTogglePlay() {
    if (!player || currentPlaylist.length === 0) return;
    const state = player.getPlayerState();
    if (state === YT.PlayerState.PLAYING) {
        player.pauseVideo();
        togglePlayButtonLook(false);
    } else {
        player.playVideo();
        togglePlayButtonLook(true);
    }
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
        document.getElementById('current-status').textContent = 'Streaming';
        togglePlayButtonLook(true);
    } else if (event.data === YT.PlayerState.PAUSED) {
        document.getElementById('current-status').textContent = 'Paused';
        togglePlayButtonLook(false);
    } else if (event.data === YT.PlayerState.ENDED) {
        playTrack(currentIndex + 1);
    }
}

function onPlayerError(e) {
    document.getElementById('current-status').textContent = 'Link broken, skipping...';
    setTimeout(() => playTrack(currentIndex + 1), 1500);
}

// Fullscreen Apple Immersive Panel Interactions
function setupImmersiveModal() {
    const modal = document.getElementById('immersive-modal');
    const openBtn = document.getElementById('toggle-immersive-view');
    const closeBtn = document.getElementById('close-modal');
    
    if(!modal || !openBtn) return;

    openBtn.addEventListener('click', () => modal.classList.remove('hidden'));
    closeBtn.addEventListener('click', () => modal.classList.add('hidden'));

    // Synchronize secondary controls inside modal view
    document.getElementById('imm-play-btn').addEventListener('click', handleTogglePlay);
    document.getElementById('imm-next-btn').addEventListener('click', () => playTrack(currentIndex + 1));
    document.getElementById('imm-prev-btn').addEventListener('click', () => playTrack(currentIndex - 1));
}