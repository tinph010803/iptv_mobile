import { Channel } from '@/types/iptv';

export function createIptvPlayerHtml(channel: Channel): string {
  const { url, drm, userAgent } = channel;
  const channelName = channel.name;

  const isDrm = !!drm;
  const isDrmMpd = isDrm && drm!.manifestType === 'mpd';
  const urlLower = url.toLowerCase();
  const isMpd = isDrmMpd || urlLower.endsWith('.mpd') || urlLower.includes('.mpd');
  const isM3u8 = urlLower.includes('.m3u8') || urlLower.includes('m3u8');
  const isMpegTs = urlLower.endsWith('.ts') || urlLower.includes('extension=ts');

  const drmJson = drm?.licenseKey || '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
    <style>
    * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; user-select: none; }
    html, body { background: #000; overflow: hidden; height: 100%; width: 100%; }
    #stage { position: relative; width: 100%; height: 100%; }
    video { width: 100%; height: 100%; object-fit: contain; background: #000; display: block; }
    #playerHeader { position: absolute; top: 0; left: 0; right: 0; height: 58px; z-index: 28; display: flex; align-items: center; gap: 10px; padding: 0 16px; background: linear-gradient(to bottom, rgba(0,0,0,0.65), rgba(0,0,0,0)); opacity: 0; pointer-events: none; transition: opacity 0.2s ease; }
    #playerHeader.show { opacity: 1; pointer-events: auto; }
    #backBtn { width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; padding: 0; border: 0; background: transparent; color: #fff; }
    #backBtn svg { width: 24px; height: 24px; fill: none; stroke: #fff; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
    #channelName { color: #fff; font: 700 17px -apple-system, sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    #error {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      color: #fff; font-family: -apple-system, sans-serif; font-size: 14px; text-align: center;
      display: none; flex-direction: column; align-items: center; gap: 14px;
      padding: 20px; max-width: 90%; z-index: 30;
    }
    #retryBtn {
      padding: 10px 22px; border-radius: 8px; background: #1e88e5; color: #fff;
      font: 700 13px -apple-system, sans-serif; border: 0;
    }
    #loadingWrap {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      display: flex; flex-direction: column; align-items: center; gap: 14px; z-index: 20;
    }
    .loading {
      width: 40px; height: 40px; border: 3px solid rgba(255,255,255,0.2);
      border-top-color: #1e88e5; border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    #loadingText {
      color: #fff; font: 13px -apple-system, sans-serif; opacity: 0.85;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    #tapLayer { position: absolute; inset: 0; z-index: 10; }

    #centerPlay {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      width: 64px; height: 64px; border-radius: 50%; background: rgba(0,0,0,0.5);
      display: flex; align-items: center; justify-content: center; z-index: 15;
      opacity: 0; pointer-events: none; transition: opacity 0.15s ease;
    }
    #centerPlay.show { opacity: 1; }
    #centerPlay svg { width: 28px; height: 28px; }

      #controls {
      position: absolute; left: 0; right: 0; bottom: 0; z-index: 25;
      padding: 28px calc(12px + env(safe-area-inset-right)) calc(10px + env(safe-area-inset-bottom)) calc(12px + env(safe-area-inset-left));
      background: linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0));
      opacity: 0; transform: translateY(8px);
      transition: opacity 0.2s ease, transform 0.2s ease;
      pointer-events: none;
    }
    #controls.show { opacity: 1; transform: translateY(0); pointer-events: auto; }

    #controlsRow { display: flex; align-items: center; gap: 14px; }
    .ctlBtn {
      background: none; border: none; padding: 6px; display: flex; align-items: center;
      justify-content: center; cursor: pointer;
    }
    .ctlBtn svg { width: 22px; height: 22px; fill: #fff; }

    #liveBadge {
      display: flex; align-items: center; gap: 5px; background: rgba(255,255,255,0.12);
      padding: 4px 9px; border-radius: 5px; margin-left: 2px;
    }
    #liveBadge .dot { width: 6px; height: 6px; border-radius: 50%; background: #ff3b3b; }
    #liveBadge span { color: #fff; font-size: 11px; font-family: -apple-system, sans-serif; font-weight: 700; letter-spacing: 0.5px; }

    .spacer { flex: 1; }

    #qualityBtn { position: relative; }
    #qualityToggle {
      border: none; border-radius: 5px; padding: 4px 8px !important;
    }
    #qualityLabel {
      color: #fff; font-size: 11px; font-family: -apple-system, sans-serif; font-weight: 600;
      margin-left: 3px;
    }

    #qualityMenu {
      position: absolute; bottom: 46px; right: 8px; background: rgba(20,20,28,0.97);
      border-radius: 12px; padding: 6px 0; min-width: 130px; z-index: 30;
      border: 1px solid rgba(255,255,255,0.08); display: none;
    }
    #qualityMenu.show { display: block; }
    #aspectBtn { position: relative; }
    #aspectToggle { min-width: 58px; color: #fff; font: 600 11px -apple-system, sans-serif; }
    #aspectMenu { position: absolute; bottom: 46px; right: 0; background: rgba(20,20,28,0.97); border-radius: 12px; padding: 6px 0; min-width: 118px; z-index: 30; border: 1px solid rgba(255,255,255,0.08); display: none; }
    #aspectMenu.show { display: block; }
    .qHeading {
      padding: 6px 14px 8px; color: #9a9a9a; font: 11px -apple-system, sans-serif;
    }
    .qOpt {
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
      padding: 9px 14px; font-family: -apple-system, sans-serif; font-size: 13px; color: #e0e0e0;
      border-radius: 6px;
    }
    .qOpt.active { color: #1e88e5; font-weight: 700; background: rgba(30,136,229,0.12); }

    #volWrap { display: flex; align-items: center; gap: 6px; }
    #volSlider {
      -webkit-appearance: none; width: 60px; height: 3px; border-radius: 2px;
      background: rgba(255,255,255,0.3); outline: none;
    }
    #volSlider::-webkit-slider-thumb {
      -webkit-appearance: none; width: 11px; height: 11px; border-radius: 50%; background: #fff;
    }
  </style>
</head>
<body>
  <div id="stage">
    <video id="video" playsinline webkit-playsinline autoplay></video>
    <div id="playerHeader">
      <button id="backBtn" aria-label="Quay lại"><svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg></button>
      <div id="channelName"></div>
    </div>
    <div id="loadingWrap">
      <div class="loading" id="loading"></div>
      <div id="loadingText">Đang kết nối đến kênh...</div>
    </div>
    <div id="error">
      <span id="errorText"></span>
      <button id="retryBtn">Thử lại</button>
    </div>

    <div id="tapLayer"></div>

    <div id="centerPlay">
      <svg id="centerPlayIcon" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg>
    </div>

    <div id="controls">
      <div id="controlsRow">
        <button class="ctlBtn" id="playBtn">
          <svg id="playIcon" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        </button>

        <div id="volWrap">
          <button class="ctlBtn" id="muteBtn">
            <svg id="volIcon" viewBox="0 0 24 24"><path d="M3 10v4h4l5 5V5L7 10H3z"/></svg>
          </button>
          <input type="range" id="volSlider" min="0" max="1" step="0.05" value="1">
        </div>

        <div id="liveBadge"><div class="dot"></div><span>LIVE</span></div>

        <div class="spacer"></div>

        <div id="qualityBtn">
          <button class="ctlBtn" id="qualityToggle" style="display:none;">
            <svg viewBox="0 0 24 24"><path d="M12 15.5A3.5 3.5 0 1 1 15.5 12 3.5 3.5 0 0 1 12 15.5zm7.43-2.53c.04-.32.07-.65.07-.97s-.03-.65-.07-.97l2.11-1.65a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.6-.22l-2.49 1a7.3 7.3 0 0 0-1.69-.98l-.38-2.65A.49.49 0 0 0 14 1h-4a.49.49 0 0 0-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1a.5.5 0 0 0-.6.22l-2 3.46a.5.5 0 0 0 .12.64l2.11 1.65c-.04.32-.07.65-.07.97s.03.65.07.97l-2.11 1.65a.5.5 0 0 0-.12.64l2 3.46c.14.24.4.32.6.22l2.49-1c.52.39 1.08.73 1.69.98l.38 2.65c.05.28.29.42.49.42h4c.2 0 .44-.14.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.2.1.46.02.6-.22l2-3.46a.5.5 0 0 0-.12-.64z"/></svg>
            <span id="qualityLabel">Auto</span>
          </button>
          <div id="qualityMenu"></div>
        </div>

        <div id="aspectBtn">
          <button class="ctlBtn" id="aspectToggle" aria-label="Tỷ lệ khung hình">
            <svg viewBox="0 0 24 24"><path d="M4 9V6a2 2 0 0 1 2-2h3M15 4h3a2 2 0 0 1 2 2v3M20 15v3a2 2 0 0 1-2 2h-3M9 20H6a2 2 0 0 1-2-2v-3M8 8h3v3H8zM13 13h3v3h-3z"/></svg>
          </button>
          <div id="aspectMenu">
            <div class="qHeading">Tỷ lệ khung hình</div>
            <div class="qOpt active" data-fit="contain">Fit</div>
            <div class="qOpt" data-fit="fill">Resize</div>
            <div class="qOpt" data-fit="cover">Fill</div>
          </div>
        </div>

      </div>
    </div>
  </div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/shaka-player/4.11.2/shaka-player.compiled.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/hls.js@1.5.13/dist/hls.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/mpegts.js@1.7.3/dist/mpegts.js"></script>

  <script>
    var video = document.getElementById('video');
    var loadingWrap = document.getElementById('loadingWrap');
    var loading = document.getElementById('loading');
    var errorEl = document.getElementById('error');
    var errorText = document.getElementById('errorText');
    var retryBtn = document.getElementById('retryBtn');
    retryBtn.addEventListener('click', function() { location.reload(); });
    var controls = document.getElementById('controls');
    var centerPlay = document.getElementById('centerPlay');
    var centerPlayIcon = document.getElementById('centerPlayIcon');
    var playBtn = document.getElementById('playBtn');
    var playIcon = document.getElementById('playIcon');
    var muteBtn = document.getElementById('muteBtn');
    var volIcon = document.getElementById('volIcon');
    var volSlider = document.getElementById('volSlider');
    var qualityToggle = document.getElementById('qualityToggle');
    var qualityMenu = document.getElementById('qualityMenu');
    var qualityLabel = document.getElementById('qualityLabel');
    var aspectToggle = document.getElementById('aspectToggle');
    var aspectMenu = document.getElementById('aspectMenu');
    var tapLayer = document.getElementById('tapLayer');
    var backBtn = document.getElementById('backBtn');
    var playerHeader = document.getElementById('playerHeader');
    document.getElementById('channelName').textContent = ${JSON.stringify(channelName)};

    var streamUrl = ${JSON.stringify(url)};
    var isDrm = ${isDrm ? 'true' : 'false'};
    var isMpd = ${isMpd ? 'true' : 'false'};
    var isM3u8 = ${isM3u8 ? 'true' : 'false'};
    var isMpegTs = ${isMpegTs ? 'true' : 'false'};
    var drmKey = ${JSON.stringify(drmJson)};
    var customUA = ${JSON.stringify(userAgent || null)};

    var shakaPlayerInstance = null;
    var hlsInstance = null;
    var currentQuality = 'auto';
    var hideTimer = null;

    function sendMsg(obj) {
      try {
        window.parent && window.parent.postMessage(Object.assign({__vmttv:true}, obj), '*');
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(obj));
      } catch(e) {}
    }

    // ---------- UI helpers ----------
    var PLAY_D = 'M8 5v14l11-7z';
    var PAUSE_D = 'M6 5h4v14H6zm8 0h4v14h-4z';
    var VOL_ON_D = 'M3 10v4h4l5 5V5L7 10H3zm13.5 2A4.5 4.5 0 0 0 14 7.97v8.05A4.5 4.5 0 0 0 16.5 12z';
    var VOL_OFF_D = 'M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.42.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.94 8.94 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z';

    function updatePlayIcon() {
      var d = video.paused ? PLAY_D : PAUSE_D;
      playIcon.querySelector('path')?.remove();
      var p = document.createElementNS('http://www.w3.org/2000/svg','path');
      p.setAttribute('d', d); p.setAttribute('fill', '#fff');
      playIcon.appendChild(p);
      centerPlay.classList.toggle('show', video.paused);
    }

    function updateVolIcon() {
      var d = (video.muted || video.volume === 0) ? VOL_OFF_D : VOL_ON_D;
      volIcon.querySelector('path')?.remove();
      var p = document.createElementNS('http://www.w3.org/2000/svg','path');
      p.setAttribute('d', d); p.setAttribute('fill', '#fff');
      volIcon.appendChild(p);
    }

    function showControls() {
      controls.classList.add('show');
      playerHeader.classList.add('show');
      clearTimeout(hideTimer);
      hideTimer = setTimeout(function() {
        if (!video.paused) { controls.classList.remove('show'); playerHeader.classList.remove('show'); qualityMenu.classList.remove('show'); aspectMenu.classList.remove('show'); }
      }, 3000);
    }

    tapLayer.addEventListener('click', function() {
      if (controls.classList.contains('show')) {
        controls.classList.remove('show');
        playerHeader.classList.remove('show');
        qualityMenu.classList.remove('show');
        aspectMenu.classList.remove('show');
        clearTimeout(hideTimer);
      } else {
        showControls();
      }
    });

    playBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (video.paused) video.play().catch(function(){}); else video.pause();
      showControls();
    });
    centerPlay.addEventListener('click', function(e) {
      e.stopPropagation();
      video.play().catch(function(){});
      showControls();
    });

    muteBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      video.muted = !video.muted;
      volSlider.value = video.muted ? 0 : video.volume;
      updateVolIcon();
      showControls();
    });
    volSlider.addEventListener('input', function() {
      video.volume = parseFloat(volSlider.value);
      video.muted = video.volume === 0;
      updateVolIcon();
      showControls();
    });

    backBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      sendMsg({type: 'close_player'});
    });

    qualityToggle.addEventListener('click', function(e) {
      e.stopPropagation();
      aspectMenu.classList.remove('show');
      qualityMenu.classList.toggle('show');
      showControls();
    });

    aspectToggle.addEventListener('click', function(e) {
      e.stopPropagation();
      qualityMenu.classList.remove('show');
      aspectMenu.classList.toggle('show');
      showControls();
    });
    Array.prototype.forEach.call(aspectMenu.querySelectorAll('[data-fit]'), function(option) {
      option.addEventListener('click', function(e) {
        e.stopPropagation();
        video.style.objectFit = option.getAttribute('data-fit');
        Array.prototype.forEach.call(aspectMenu.querySelectorAll('[data-fit]'), function(item) {
          item.classList.toggle('active', item === option);
        });
        aspectMenu.classList.remove('show');
        showControls();
      });
    });

    video.addEventListener('play', updatePlayIcon);
    video.addEventListener('pause', function() { updatePlayIcon(); showControls(); });
    video.addEventListener('volumechange', updateVolIcon);

    // ---------- quality menu ----------
    function buildQualityMenu(list) {
      qualityMenu.innerHTML = '<div class="qHeading">Chất lượng hình ảnh</div>';
      var autoOpt = document.createElement('div');
      autoOpt.className = 'qOpt active';
      autoOpt.textContent = 'Tự động';
      autoOpt.onclick = function(e) { e.stopPropagation(); selectQuality('auto'); };
      qualityMenu.appendChild(autoOpt);

      list.forEach(function(h) {
        var opt = document.createElement('div');
        opt.className = 'qOpt';
        opt.textContent = h + 'p' + (h >= 2160 ? ' (4K)' : '');
        opt.onclick = function(e) { e.stopPropagation(); selectQuality(h); };
        qualityMenu.appendChild(opt);
      });

      qualityToggle.style.display = list.length > 1 ? 'flex' : 'none';
    }

    function markActiveQuality(value) {
      Array.prototype.forEach.call(qualityMenu.children, function(el, i) {
        if (el.classList.contains('qHeading')) return;
        el.classList.toggle('active', (value === 'auto' && i === 1));
      });
      var label = value === 'auto' ? 'Auto' : value + 'p';
      qualityLabel.textContent = label;
    }

    function selectQuality(value) {
      currentQuality = value;
      qualityMenu.classList.remove('show');
      markActiveQuality(value);
      try {
        if (shakaPlayerInstance) {
          if (value === 'auto') {
            shakaPlayerInstance.configure({ abr: { enabled: true } });
          } else {
            shakaPlayerInstance.configure({ abr: { enabled: false } });
            var tracks = shakaPlayerInstance.getVariantTracks();
            var match = tracks.filter(function(t){ return t.height === value; });
            if (match.length) shakaPlayerInstance.selectVariantTrack(match[0], true);
          }
        } else if (hlsInstance) {
          if (value === 'auto') {
            hlsInstance.currentLevel = -1;
          } else {
            var idx = hlsInstance.levels.findIndex(function(l){ return l.height === value; });
            if (idx >= 0) hlsInstance.currentLevel = idx;
          }
        }
      } catch(e) {}
    }

    // ---------- playback ----------
    function showError(msg) {
      loadingWrap.style.display = 'none';
      errorEl.style.display = 'flex';
      errorText.textContent = msg;
      controls.classList.remove('show');
      sendMsg({type:'error', msg: msg});
    }

    function hideLoading() {
      loadingWrap.style.display = 'none';
      sendMsg({type:'ready'});
    }

    function onPlaying() {
      hideLoading();
      updatePlayIcon();
      sendMsg({type:'playing'});
    }

    video.addEventListener('error', function() {
      var code = video.error ? video.error.code : 'unknown';
      showError('Lỗi video (code ' + code + ')');
    });

    function parseClearKey(keyStr) {
      keyStr = keyStr.trim();
      if (keyStr.indexOf('{') === 0) {
        try {
          var parsed = JSON.parse(keyStr);
          if (parsed.keys && parsed.keys.length > 0) {
            var k = parsed.keys[0];
            if (k.kid && k.k) return { kid: base64ToHex(k.kid), key: base64ToHex(k.k) };
          }
        } catch(e) {}
        return null;
      }
      var parts = keyStr.split(':');
      if (parts.length === 2) return { kid: parts[0].trim(), key: parts[1].trim() };
      return null;
    }

    function base64ToHex(b64) {
      try {
        var raw = atob(b64.replace(/-/g,'+').replace(/_/g,'/'));
        var hex = '';
        for (var i = 0; i < raw.length; i++) {
          var h = raw.charCodeAt(i).toString(16);
          hex += h.length === 1 ? '0' + h : h;
        }
        return hex;
      } catch(e) { return b64; }
    }

    function initShaka() {
      if (typeof shaka === 'undefined') {
        showError('Shaka Player không tải được. Kiểm tra kết nối mạng.');
        return;
      }
      shaka.polyfill.installAll();
      if (!shaka.Player.isBrowserSupported()) {
        showError('Trình duyệt không hỗ trợ phát DASH/DRM');
        return;
      }
      var player = new shaka.Player();
      shakaPlayerInstance = player;
      player.attach(video);

      player.configure({
        streaming: { rebufferingGoal: 2, bufferingGoal: 10 },
        manifest: { dash: { ignoreMinBufferTime: true } },
      });

      if (customUA) {
        try {
          player.getNetworkingEngine().registerRequestFilter(function(type, request) {
            request.headers['User-Agent'] = customUA;
          });
        } catch(e) {}
      }

      if (isDrm && drmKey) {
        var ck = parseClearKey(drmKey);
        if (ck) {
          var clearKeys = {};
          clearKeys[ck.kid] = ck.key;
          player.configure({ drm: { clearKeys: clearKeys } });
        } else {
          showError('ClearKey không hợp lệ');
          return;
        }
      }

      player.addEventListener('error', function(e) {
        showError('Lỗi Shaka: ' + (e.detail && e.detail.message ? e.detail.message : 'không xác định'));
      });

      video.addEventListener('playing', onPlaying);

      player.load(streamUrl).then(function() {
        video.play().catch(function(){});
        try {
          var seen = {};
          var qualities = [];
          player.getVariantTracks().forEach(function(t) {
            if (t.height && !seen[t.height]) { seen[t.height] = true; qualities.push(t.height); }
          });
          qualities.sort(function(a,b){ return b - a; });
          buildQualityMenu(qualities);
          markActiveQuality('auto');
        } catch(e) {}
      }).catch(function(err) {
        showError('Không thể tải: ' + (err.message || err.code || 'lỗi'));
      });
    }

    function initHls() {
      if (window.Hls && Hls.isSupported()) {
        var hls = new Hls({ enableWorker: true, lowLatencyMode: false });
        hlsInstance = hls;
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, function(event, data) {
          video.play().catch(function(){});
          try {
            var heights = (data.levels || hls.levels)
              .map(function(l){ return l.height; })
              .filter(function(h, i, arr){ return h && arr.indexOf(h) === i; });
            heights.sort(function(a,b){ return b - a; });
            buildQualityMenu(heights);
            markActiveQuality('auto');
          } catch(e) {}
        });
        hls.on(Hls.Events.ERROR, function(event, data) {
          if (data.fatal) showError('Lỗi HLS: ' + (data.details || data.type));
        });
        video.addEventListener('playing', onPlaying);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl;
        video.addEventListener('loadedmetadata', function() { video.play().catch(function(){}); });
        video.addEventListener('playing', onPlaying);
      } else if (typeof Hls === 'undefined') {
        showError('hls.js không tải được. Kiểm tra kết nối mạng.');
      } else {
        showError('Trình duyệt không hỗ trợ HLS');
      }
    }

    function initMpegTs() {
      if (window.mpegts && mpegts.isSupported()) {
        var player = mpegts.createPlayer({ type: 'mpegts', isLive: true, url: streamUrl });
        player.attachMediaElement(video);
        player.load();
        player.play();
        video.addEventListener('playing', onPlaying);
        player.on(mpegts.Events.ERROR, function() { showError('Lỗi phát MPEG-TS'); });
      } else if (typeof mpegts === 'undefined') {
        showError('mpegts.js không tải được. Kiểm tra kết nối mạng.');
      } else {
        showError('Trình duyệt không hỗ trợ MPEG-TS');
      }
    }

    function initNative() {
      video.src = streamUrl;
      video.addEventListener('playing', onPlaying);
      video.play().catch(function(){
        showError('Không thể phát luồng này (có thể do CORS hoặc định dạng không hỗ trợ)');
      });
    }

    function startPlayback() {
      try {
        if (isMpd || isDrm) initShaka();
        else if (isM3u8) initHls();
        else if (isMpegTs) initMpegTs();
        else initNative();
      } catch(e) {
        showError('Lỗi khởi tạo: ' + e.message);
      }
    }

    startPlayback();
    updatePlayIcon();
    updateVolIcon();
    showControls();

    setTimeout(function() {
      if (loadingWrap.style.display !== 'none') sendMsg({type:'loading_timeout'});
    }, 15000);
  </script>
</body>
</html>`;
}