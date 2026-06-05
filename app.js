const API_KEY = 'AIzaSyCMUD8WFt0dCKhiTcH8FM_x4V0ksO6g-iY';
let player;
let currentPlaylist = [];
let currentIndex = 0;
let isSearching = false;
let isSeeking = false;
let pendingTrack = null;
let trendingTracks = [];

// Playlist Management System
function getPlaylists() {
    const stored = localStorage.getItem('user_playlists');
    return stored ? JSON.parse(stored) : [];
}

function savePlaylists(playlists) {
    localStorage.setItem('user_playlists', JSON.stringify(playlists));
    updatePlaylistCount();
}

function createPlaylist(name) {
    const playlists = getPlaylists();
    const newPlaylist = {
        id: Date.now().toString(),
        name: name,
        songs: []
    };
    playlists.push(newPlaylist);
    savePlaylists(playlists);
    return newPlaylist;
}

function addSongToPlaylist(playlistId, song) {
    const playlists = getPlaylists();
    const playlist = playlists.find(p => p.id === playlistId);
    if (playlist && !playlist.songs.some(s => s.id === song.id)) {
        playlist.songs.push(song);
        savePlaylists(playlists);
        return true;
    }
    return false;
}

function updatePlaylistCount() {
    const playlists = getPlaylists();
    const totalSongs = playlists.reduce((sum, p) => sum + p.songs.length, 0);
    document.getElementById('playlist-count').textContent = totalSongs;
}

function displayPlaylists() {
    const playlists = getPlaylists();
    const playlistView = document.getElementById('playlist-list');
    playlistView.innerHTML = '';
    
    if (playlists.length === 0) {
        playlistView.innerHTML = '<p class="empty-state">No playlists yet. Create one from search!</p>';
        return;
    }

    playlists.forEach(playlist => {
        const playlistSection = document.createElement('div');
        playlistSection.className = 'playlist-section';
        playlistSection.innerHTML = `
            <div class="playlist-section-header">
                <h3>${playlist.name}</h3>
                <span class="playlist-song-count">${playlist.songs.length} songs</span>
            </div>
        `;
        
        if (playlist.songs.length === 0) {
            playlistSection.innerHTML += '<p class="empty-playlist">No songs added yet</p>';
        } else {
            const songsList = document.createElement('div');
            songsList.className = 'playlist-songs';
            playlist.songs.forEach((song) => {
                const songItem = document.createElement('div');
                songItem.className = 'playlist-song-item';
                songItem.innerHTML = `
                    <img src="${song.thumbnail}" class="song-thumb" alt="cover" onclick="playPlaylistTrack('${playlist.id}', '${song.id}', event)" style="cursor:pointer;">
                    <div class="song-info" onclick="playPlaylistTrack('${playlist.id}', '${song.id}', event)">
                        <div class="song-title">${song.title}</div>
                        <div class="song-artist">${song.channel}</div>
                    </div>
                    <button class="remove-song-btn" onclick="removeSongFromPlaylist('${playlist.id}', '${song.id}')">✕</button>
                `;
                songsList.appendChild(songItem);
            });
            playlistSection.appendChild(songsList);
        }
        
        playlistView.appendChild(playlistSection);
    });
}

function removeSongFromPlaylist(playlistId, songId) {
    const playlists = getPlaylists();
    const playlist = playlists.find(p => p.id === playlistId);
    if (playlist) {
        playlist.songs = playlist.songs.filter(s => s.id !== songId);
        savePlaylists(playlists);
        displayPlaylists();
    }
}

function playPlaylistTrack(playlistId, songId, event) {
    if (event) event.stopPropagation();
    const playlists = getPlaylists();
    const playlist = playlists.find(p => p.id === playlistId);
    if (playlist && playlist.songs.length > 0) {
        currentPlaylist = [...playlist.songs];
        const index = currentPlaylist.findIndex(s => s.id === songId);
        if (index !== -1) {
            playTrack(index);
        }
    }
}

function showPlaylistModal(track) {
    pendingTrack = track;
    const modal = document.getElementById('playlist-modal');
    const existingPlaylistsContainer = document.getElementById('existing-playlists');
    const playlists = getPlaylists();
    
    existingPlaylistsContainer.innerHTML = '';
    
    if (playlists.length > 0) {
        playlists.forEach(playlist => {
            const item = document.createElement('div');
            item.className = 'playlist-item';
            item.textContent = `${playlist.name} (${playlist.songs.length})`;
            item.onclick = () => {
                addSongToPlaylist(playlist.id, track);
                closePlaylistModal();
                showNotification(`Added to "${playlist.name}"`);
            };
            existingPlaylistsContainer.appendChild(item);
        });
    } else {
        existingPlaylistsContainer.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 10px;">No playlists yet. Create one below!</p>';
    }
    
    modal.classList.remove('hidden');
}

function closePlaylistModal() {
    document.getElementById('playlist-modal').classList.add('hidden');
    document.getElementById('new-playlist-input').value = '';
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        bottom: 120px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--apple-accent);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 999;
        font-size: 0.95rem;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// Fetch trending songs from YouTube
async function fetchTrendingMusic() {
    try {
        const queries = ['trending music 2024', 'best songs', 'new releases', 'popular music'];
        const query = queries[Math.floor(Math.random() * queries.length)];
        
        const cachedData = localStorage.getItem(`yt_trending_${query}`);
        if (cachedData) {
            trendingTracks = JSON.parse(cachedData);
            displayTrendingMusic();
            return;
        }

        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(query)}&type=video&videoCategoryId=10&key=${API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        
        trendingTracks = data.items.map(item => ({
            id: item.id.videoId,
            title: item.snippet.title,
            channel: item.snippet.channelTitle,
            thumbnail: item.snippet.thumbnails.medium.url
        }));

        localStorage.setItem(`yt_trending_${query}`, JSON.stringify(trendingTracks));
        displayTrendingMusic();
    } catch (error) {
        console.error('Error fetching trending music:', error);
    }
}

// Fetch new/popular albums
async function fetchNewAlbums() {
    try {
        const queries = ['new albums', 'album releases', 'top albums'];
        const query = queries[Math.floor(Math.random() * queries.length)];
        
        const cachedData = localStorage.getItem(`yt_albums_${query}`);
        if (cachedData) {
            displayNewAlbums(JSON.parse(cachedData));
            return;
        }

        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=6&q=${encodeURIComponent(query)}&type=video&videoCategoryId=10&key=${API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        
        const albums = data.items.map(item => ({
            id: item.id.videoId,
            title: item.snippet.title,
            channel: item.snippet.channelTitle,
            thumbnail: item.snippet.thumbnails.medium.url
        }));

        localStorage.setItem(`yt_albums_${query}`, JSON.stringify(albums));
        displayNewAlbums(albums);
    } catch (error) {
        console.error('Error fetching new albums:', error);
    }
}

function displayNewAlbums(albums) {
    const container = document.getElementById('new-albums');
    container.innerHTML = '';
    
    albums.forEach(album => {
        const card = document.createElement('div');
        card.className = 'album-card';
        card.innerHTML = `
            <img src="${album.thumbnail}" class="album-card-image" alt="album">
            <div class="album-card-info">
                <p class="album-card-title">${album.title}</p>
                <p class="album-card-artist">${album.channel}</p>
            </div>
        `;
        card.addEventListener('click', () => playNewAlbumTrack(album));
        container.appendChild(card);
    });
}

function displayTrendingMusic() {
    const container = document.getElementById('trending-songs');
    container.innerHTML = '';
    
    trendingTracks.forEach(track => {
        const row = document.createElement('div');
        row.className = 'trending-song-row';
        row.innerHTML = `
            <img src="${track.thumbnail}" class="trending-song-thumb" alt="cover">
            <div class="trending-song-info">
                <div class="trending-song-title">${track.title}</div>
                <div class="trending-song-artist">${track.channel}</div>
            </div>
            <div class="trending-song-actions">
                <button class="trending-song-btn" onclick="playTrendingTrack('${track.id}', event)">▶</button>
                <button class="trending-song-btn" onclick="addTrendingToPlaylist('${track.id}', event)">＋</button>
            </div>
        `;
        container.appendChild(row);
    });
}

function playNewAlbumTrack(album) {
    const existingIndex = currentPlaylist.findIndex(item => item.id === album.id);
    if (existingIndex !== -1) {
        playTrack(existingIndex);
    } else {
        currentPlaylist.unshift(album);
        playTrack(0);
    }
}

function playTrendingTrack(trackId, event) {
    if (event) event.stopPropagation();
    const track = trendingTracks.find(t => t.id === trackId);
    if (track) {
        const existingIndex = currentPlaylist.findIndex(item => item.id === trackId);
        if (existingIndex !== -1) {
            playTrack(existingIndex);
        } else {
            currentPlaylist.unshift(track);
            playTrack(0);
        }
    }
}

function addTrendingToPlaylist(trackId, event) {
    if (event) event.stopPropagation();
    const track = trendingTracks.find(t => t.id === trackId);
    if (track) {
        showPlaylistModal(track);
    }
}

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
    setupMobileNavigation();
    setupPlaylistModal();
    setupAuthenticationDrawer();
    updatePlaylistCount();
    fetchNewAlbums();
    fetchTrendingMusic();
}

function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function initProgressBar() {
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
    if (typeof player.getCurrentTime !== 'function') return;

    const current = player.getCurrentTime();
    const duration = player.getDuration();
    
    if (duration > 0) {
        const percent = (current / duration) * 100;
        
        const mainFill = document.getElementById('progress-fill');
        if (mainFill) mainFill.style.width = percent + '%';
        
        const mainSlider = document.getElementById('progress-slider');
        if (mainSlider) mainSlider.style.left = percent + '%';
        
        document.getElementById('current-time').textContent = formatTime(current);
        document.getElementById('total-time').textContent = formatTime(duration);

        const immFill = document.getElementById('imm-progress-fill');
        if (immFill) {
            immFill.style.width = percent + '%';
            document.getElementById('imm-current-time').textContent = formatTime(current);
            document.getElementById('imm-total-time').textContent = formatTime(duration);
        }
    }
}

setInterval(updateProgressBar, 250);

// Core Navigation Routing
const navHome = document.getElementById('nav-home');
const navSearch = document.getElementById('nav-search');
const navPlaylist = document.getElementById('nav-playlist');
const homeView = document.getElementById('home-view');
const searchView = document.getElementById('search-view');
const playlistView = document.getElementById('playlist-view');

function triggerRouteSwitch(view) {
    // Hide all views
    homeView.classList.add('hidden');
    searchView.classList.add('hidden');
    playlistView.classList.add('hidden');
    navHome.classList.remove('active');
    navSearch.classList.remove('active');
    navPlaylist.classList.remove('active');
    
    // Show selected view
    if (view === 'home') {
        homeView.classList.remove('hidden');
        navHome.classList.add('active');
    } else if (view === 'search') {
        searchView.classList.remove('hidden');
        navSearch.classList.add('active');
    } else if (view === 'playlist') {
        playlistView.classList.remove('hidden');
        navPlaylist.classList.add('active');
        displayPlaylists();
    }
    
    const sidebar = document.getElementById('app-sidebar-drawer');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.classList.remove('drawer-open');
    if (backdrop) backdrop.style.display = 'none';
}

navHome.addEventListener('click', () => triggerRouteSwitch('home'));
navSearch.addEventListener('click', () => triggerRouteSwitch('search'));
navPlaylist.addEventListener('click', () => triggerRouteSwitch('playlist'));

// Home branding to home page
document.getElementById('mobile-branding').addEventListener('click', () => triggerRouteSwitch('home'));
document.getElementById('sidebar-branding').addEventListener('click', () => triggerRouteSwitch('home'));

// Mobile Navigation
function setupMobileNavigation() {
    const menuBtn = document.getElementById('mobile-menu-trigger');
    const closeBtn = document.getElementById('sidebar-close-trigger');
    const sidebar = document.getElementById('app-sidebar-drawer');
    const backdrop = document.getElementById('sidebar-backdrop');

    if(menuBtn && sidebar && backdrop) {
        menuBtn.addEventListener('click', () => {
            sidebar.classList.add('drawer-open');
            backdrop.style.display = 'block';
        });
        
        const closeMenu = () => {
            sidebar.classList.remove('drawer-open');
            backdrop.style.display = 'none';
        };

        if(closeBtn) closeBtn.addEventListener('click', closeMenu);
        backdrop.addEventListener('click', closeMenu);
    }
}

function setupPlaylistModal() {
    const modal = document.getElementById('playlist-modal');
    const closeBtn = document.getElementById('playlist-modal-close');
    const backdrop = document.querySelector('.playlist-modal-backdrop');
    const createBtn = document.getElementById('create-playlist-btn');
    const input = document.getElementById('new-playlist-input');

    if (closeBtn) {
        closeBtn.addEventListener('click', closePlaylistModal);
    }

    if (backdrop) {
        backdrop.addEventListener('click', closePlaylistModal);
    }

    if (createBtn) {
        createBtn.addEventListener('click', () => {
            const name = input.value.trim();
            if (name) {
                const playlist = createPlaylist(name);
                if (pendingTrack) {
                    addSongToPlaylist(playlist.id, pendingTrack);
                    showNotification(`Created "${name}" and added song!`);
                }
                closePlaylistModal();
            }
        });

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                createBtn.click();
            }
        });
    }
}

function setupAuthenticationDrawer() {
    const openBtn = document.getElementById('mobile-profile-trigger');
    const closeBtn = document.getElementById('auth-close-trigger');
    const drawer = document.getElementById('auth-drawer');
    const loginAction = document.getElementById('google-login-action');

    if(openBtn && drawer) {
        openBtn.addEventListener('click', () => drawer.classList.remove('hidden'));
        if(closeBtn) closeBtn.addEventListener('click', () => drawer.classList.add('hidden'));
        
        drawer.addEventListener('click', (e) => {
            if(e.target === drawer) drawer.classList.add('hidden');
        });

        if(loginAction) {
            loginAction.addEventListener('click', () => {
                alert("Gmail Sign-In system simulated successfully!");
                drawer.classList.add('hidden');
            });
        }
    }
}

// Search Execution
document.getElementById('search-btn').addEventListener('click', async () => {
    const query = document.getElementById('search-input').value.trim().toLowerCase();
    if (!query || isSearching) return;

    isSearching = true;
    document.getElementById('search-btn').textContent = '...';

    const cachedData = localStorage.getItem(`yt_search_${query}`);
    if (cachedData) {
        displaySearchResults(JSON.parse(cachedData));
        resetSearchButton();
        return;
    }

    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=${encodeURIComponent(query)}&type=video&videoCategoryId=10&key=${API_KEY}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        const tracks = data.items.map(item => ({
            id: item.id.videoId,
            title: item.snippet.title,
            channel: item.snippet.channelTitle,
            thumbnail: item.snippet.thumbnails.medium.url
        }));

        localStorage.setItem(`yt_search_${query}`, JSON.stringify(tracks));
        displaySearchResults(tracks);
    } catch (error) {
        console.error(error);
    } finally {
        resetSearchButton();
    }
});

document.getElementById('search-input').addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        document.getElementById('search-btn').click();
    }
});

function resetSearchButton() {
    isSearching = false;
    document.getElementById('search-btn').textContent = 'Search';
}

function displaySearchResults(tracks) {
    const resultsList = document.getElementById('results-list');
    resultsList.innerHTML = '';

    tracks.forEach(track => {
        const row = document.createElement('div');
        row.className = 'search-result-row';
        row.innerHTML = `
            <img src="${track.thumbnail}" class="search-result-thumb" alt="cover">
            <div class="search-result-info">
                <div class="search-result-title">${track.title}</div>
                <div class="search-result-artist">${track.channel}</div>
            </div>
            <div class="search-result-actions">
                <button class="search-result-btn" onclick="playSearchTrack('${track.id}', event)">▶</button>
                <button class="search-result-btn" onclick="addSearchToPlaylist('${track.id}', event)">＋</button>
            </div>
        `;
        resultsList.appendChild(row);
    });
}

function playSearchTrack(id, event) {
    if (event) event.stopPropagation();
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${id}&key=${API_KEY}`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.items && data.items.length > 0) {
                const item = data.items[0];
                const track = {
                    id: id,
                    title: item.snippet.title,
                    channel: item.snippet.channelTitle,
                    thumbnail: item.snippet.thumbnails.medium.url
                };
                
                const existingIndex = currentPlaylist.findIndex(item => item.id === id);
                if (existingIndex !== -1) {
                    playTrack(existingIndex);
                } else {
                    currentPlaylist.unshift(track);
                    playTrack(0);
                }
            }
        })
        .catch(error => console.error('Error fetching track details:', error));
}

function addSearchToPlaylist(id, event) {
    if (event) event.stopPropagation();
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${id}&key=${API_KEY}`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.items && data.items.length > 0) {
                const item = data.items[0];
                const track = {
                    id: id,
                    title: item.snippet.title,
                    channel: item.snippet.channelTitle,
                    thumbnail: item.snippet.thumbnails.medium.url
                };
                showPlaylistModal(track);
            }
        })
        .catch(error => console.error('Error fetching track details:', error));
}

function playTrack(index) {
    if (index < 0 || index >= currentPlaylist.length || !player) return;
    currentIndex = index;
    const track = currentPlaylist[currentIndex];
    
    document.getElementById('current-title').textContent = track.title;
    const miniArt = document.getElementById('mini-cover');
    if(miniArt) {
        miniArt.src = track.thumbnail;
        miniArt.style.display = 'block';
    }
    document.getElementById('current-status').textContent = 'Loading...';
    
    const largeCover = document.getElementById('large-cover');
    const blurBg = document.getElementById('modal-blur-bg');
    if (largeCover) largeCover.src = track.thumbnail;
    if (blurBg) blurBg.style.backgroundImage = `url(${track.thumbnail})`;
    
    const immTitle = document.getElementById('immersive-title');
    const immArtist = document.getElementById('immersive-artist');
    if (immTitle) immTitle.textContent = track.title;
    if (immArtist) immArtist.textContent = track.channel;

    if (typeof player.loadVideoById === 'function') {
        player.loadVideoById(track.id);
        togglePlayButtonLook(true);
    }
}

function togglePlayButtonLook(isPlaying) {
    const symbols = isPlaying ? '⏸' : '▶';
    document.getElementById('play-btn').textContent = symbols;
    const immPlay = document.getElementById('imm-play-btn');
    if(immPlay) immPlay.textContent = symbols;
}

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
    document.getElementById('current-status').textContent = 'Error loading track';
}

// Modal Toggle Management
function setupImmersiveModal() {
    const modal = document.getElementById('immersive-modal');
    const desktopOpenBtn = document.getElementById('toggle-immersive-view');
    const mobileOpenTriggerZone = document.getElementById('mini-player-click-zone');
    const closeBtn = document.getElementById('close-modal');
    
    if(!modal) return;

    const showModal = () => modal.classList.remove('hidden');
    const hideModal = () => modal.classList.add('hidden');

    if(desktopOpenBtn) desktopOpenBtn.addEventListener('click', showModal);
    
    if(mobileOpenTriggerZone) {
        mobileOpenTriggerZone.addEventListener('click', (e) => {
            if(window.innerWidth <= 768 && currentPlaylist.length > 0) {
                showModal();
            }
        });
    }
    
    if (closeBtn) closeBtn.addEventListener('click', hideModal);

    const immPlay = document.getElementById('imm-play-btn');
    const immNext = document.getElementById('imm-next-btn');
    const immPrev = document.getElementById('imm-prev-btn');

    if(immPlay) immPlay.addEventListener('click', handleTogglePlay);
    if(immNext) immNext.addEventListener('click', () => playTrack(currentIndex + 1));
    if(immPrev) immPrev.addEventListener('click', () => playTrack(currentIndex - 1));
}
