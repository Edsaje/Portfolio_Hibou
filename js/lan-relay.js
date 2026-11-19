/**
 * Sanctuaire LAN & Netplay P2P Céleste (Portfolio Quentin Beaud)
 * Moteur WebRTC ultra-faible latence pour le jeu coopératif local à distance.
 * Compatible avec tous les émulateurs : RetroVault (SNES, NES, GBA, MD, PS1, Arcade),
 * Dolphin (GameCube & Wii), Play! (PS2), Flycast (Dreamcast), PPSSPP (PSP) et Desmond (DS).
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SanctuaireLAN = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' }
  ];

  // Intercepteur global AudioContext pour streamer le son du jeu sans altérer l'émulateur
  let globalAudioContext = null;
  let globalAudioDestNode = null;

  function initAudioInterceptor() {
    if (typeof window === 'undefined') return;
    const OriginalAudioContext = window.AudioContext || window.webkitAudioContext;
    if (!OriginalAudioContext || window._rvLanAudioHooked) return;

    window._rvLanAudioHooked = true;
    window._lastGameAudioContext = null;

    window.AudioContext = class extends OriginalAudioContext {
      constructor(...args) {
        super(...args);
        globalAudioContext = this;
        window._lastGameAudioContext = this;
      }
    };
    if (window.webkitAudioContext) {
      window.webkitAudioContext = window.AudioContext;
    }

    const origConnect = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (dest, ...args) {
      if (dest && dest === dest.context?.destination && window._rvLanAudioDest) {
        try {
          origConnect.call(this, window._rvLanAudioDest, ...args);
        } catch (e) {}
      }
      return origConnect.call(this, dest, ...args);
    };
  }

  initAudioInterceptor();

  // Boutons standards de manette rétro
  const STANDARD_GAMEPAD_BUTTONS = [
    'b',      // 0: A Nintendo / Croix PlayStation / B Xbox
    'a',      // 1: B Nintendo / Cercle PlayStation / A Xbox
    'y',      // 2: X Nintendo / Carré PlayStation / X Xbox
    'x',      // 3: Y Nintendo / Triangle PlayStation / Y Xbox
    'l',      // 4: L1 / LB
    'r',      // 5: R1 / RB
    'l2',     // 6: L2 / LT
    'r2',     // 7: R2 / RT
    'select', // 8: Select / Share / Back
    'start',  // 9: Start / Options
    'l3',     // 10: L3 Stick press
    'r3',     // 11: R3 Stick press
    'up',     // 12: D-Pad Haut
    'down',   // 13: D-Pad Bas
    'left',   // 14: D-Pad Gauche
    'right'   // 15: D-Pad Droite
  ];

  // ==========================================
  // CLASSE PRINCIPALE : SanctuaireLAN
  // ==========================================
  class SanctuaireLAN {
    constructor(options = {}) {
      this.apiBase = options.apiBase || '/api/lan.php';
      this.roomId = null;
      this.token = null;
      this.role = null; // 'host' ou 'guest'
      this.peerConnection = null;
      this.dataChannel = null;
      this.isConnected = false;
      this.isHost = false;
      this.pollingTimer = null;
      this.rtt = 0;
      this.lastPingSentAt = 0;
      this.callbacks = {
        onStatus: options.onStatus || (() => {}),
        onConnected: options.onConnected || (() => {}),
        onDisconnected: options.onDisconnected || (() => {}),
        onInput: options.onInput || (() => {}),
        onPing: options.onPing || (() => {}),
        onTrack: options.onTrack || (() => {})
      };

      this.gamepadLoopId = null;
      this.lastButtonStates = {};
      this.lastAxesStates = { up: false, down: false, left: false, right: false };
    }

    _setStatus(statusText, extra = {}) {
      this.callbacks.onStatus(statusText, extra);
    }

    // --- Requêtes HTTP vers l'API de signalisation ---
    async _request(action, body = null) {
      const url = `${this.apiBase}?action=${encodeURIComponent(action)}`;
      const headers = { 'Content-Type': 'application/json' };
      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }
      const response = await fetch(url, {
        method: body ? 'POST' : 'GET',
        headers,
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store'
      });
      const data = await response.json();
      if (!response.ok || data.ok === false) {
        throw new Error(data.error || `Erreur serveur (${response.status})`);
      }
      return data;
    }

    // --- Boucle de Polling pour l'échange de signaux WebRTC ---
    _startPolling() {
      this._stopPolling();
      const poll = async () => {
        if (!this.token) return;
        try {
          const res = await this._request('poll');
          if (res && Array.isArray(res.events)) {
            for (const ev of res.events) {
              await this._handleServerEvent(ev);
            }
          }
        } catch (e) {
          console.warn('[Sanctuaire LAN] Polling warning:', e);
        }
        if (this.token) {
          this.pollingTimer = setTimeout(poll, this.isConnected ? 3000 : 700);
        }
      };
      this.pollingTimer = setTimeout(poll, 200);
    }

    _stopPolling() {
      if (this.pollingTimer) {
        clearTimeout(this.pollingTimer);
        this.pollingTimer = null;
      }
    }

    async _handleServerEvent(event) {
      if (!event) return;
      if (event.type === 'peer-joined') {
        this._setStatus('Un joueur rejoint le sanctuaire ! Négociation WebRTC...', { role: event.role });
        if (this.isHost && this.peerConnection) {
          await this._createOffer();
        }
      } else if (event.type === 'signal') {
        const desc = event.description;
        if (!desc) return;
        if (desc.type === 'offer' && !this.isHost) {
          this._setStatus('Offre de liaison reçue de l\'hôte, préparation de la réponse...');
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(desc));
          if (this.pendingIceCandidates && this.pendingIceCandidates.length > 0) {
            for (const cand of this.pendingIceCandidates) {
              try { await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand)); } catch(e) {}
            }
            this.pendingIceCandidates = [];
          }
          const answer = await this.peerConnection.createAnswer();
          await this.peerConnection.setLocalDescription(answer);
          await this._request('signal', { description: this.peerConnection.localDescription });
          this._setStatus('Réponse envoyée. Finalisation P2P...');
        } else if (desc.type === 'answer' && this.isHost) {
          this._setStatus('Réponse de l\'invité acceptée. Connexion en cours...');
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(desc));
          if (this.pendingIceCandidates && this.pendingIceCandidates.length > 0) {
            for (const cand of this.pendingIceCandidates) {
              try { await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand)); } catch(e) {}
            }
            this.pendingIceCandidates = [];
          }
        } else if (desc.candidate) {
          if (this.peerConnection && this.peerConnection.remoteDescription) {
            try {
              await this.peerConnection.addIceCandidate(new RTCIceCandidate(desc.candidate));
            } catch (iceErr) {}
          } else {
            if (!this.pendingIceCandidates) this.pendingIceCandidates = [];
            this.pendingIceCandidates.push(desc.candidate);
          }
        }
      } else if (event.type === 'peer-left' || event.type === 'closed') {
        this._setStatus('Le partenaire a quitté le salon.');
        if (!this.isHost) {
          this.disconnect();
        }
      }
    }

    // ==========================================
    // CÔTÉ HÔTE (Joueur 1)
    // ==========================================
    async hostGame(canvasElement, options = {}) {
      this.disconnect(true);
      this.isHost = true;
      this.role = 'host';
      this.pendingIceCandidates = [];

      this._setStatus('Création du salon Céleste...');
      const res = await this._request('create', {
        name: options.name || 'Sanctuaire LAN',
        max_players: 2
      });

      this.roomId = res.room;
      this.token = res.token;

      // URL d'invitation précise vers la page actuelle
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('lan', this.roomId);
      const inviteUrl = currentUrl.toString();

      this._setStatus(`Salon ouvert : ${this.roomId}. En attente du Joueur 2...`, {
        room: this.roomId,
        invite: inviteUrl
      });

      this._initPeerConnection();

      // 1. Capture du Canvas Vidéo (60 FPS)
      if (canvasElement && typeof canvasElement.captureStream === 'function') {
        try {
          const videoStream = canvasElement.captureStream(60);
          videoStream.getVideoTracks().forEach((track) => {
            this.peerConnection.addTrack(track, videoStream);
          });
        } catch (err) {
          console.warn('[Sanctuaire LAN] Échec capture vidéo:', err);
        }
      }

      // 2. Capture Audio WebAudio
      try {
        const audioCtx = window._lastGameAudioContext || globalAudioContext;
        if (audioCtx && typeof audioCtx.createMediaStreamDestination === 'function') {
          if (audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {});
          }
          globalAudioDestNode = audioCtx.createMediaStreamDestination();
          window._rvLanAudioDest = globalAudioDestNode;
          const audioTrack = globalAudioDestNode.stream.getAudioTracks()[0];
          if (audioTrack) {
            this.peerConnection.addTrack(audioTrack, globalAudioDestNode.stream);
          }
        }
      } catch (err) {
        console.warn('[Sanctuaire LAN] Échec capture audio:', err);
      }

      // 3. Canal de données pour les entrées de l'invité
      this.dataChannel = this.peerConnection.createDataChannel('lan-inputs', {
        ordered: false,
        maxRetransmits: 0
      });
      this._wireDataChannel(this.dataChannel);

      this._startPolling();
      return { room: this.roomId, invite: inviteUrl };
    }

    async _createOffer() {
      try {
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        await this._request('signal', { description: this.peerConnection.localDescription });
        this._setStatus('Offre P2P transmise. En attente de la réponse de l\'invité...');
      } catch (e) {
        this._setStatus(`Erreur lors de la négociation P2P : ${e.message}`);
      }
    }

    // ==========================================
    // CÔTÉ INVITÉ (Joueur 2)
    // ==========================================
    async joinGame(roomCode) {
      this.disconnect(true);
      this.isHost = false;
      this.role = 'guest';
      this.pendingIceCandidates = [];

      const cleanCode = String(roomCode).trim().toUpperCase();
      this._setStatus(`Recherche du salon "${cleanCode}"...`);

      const res = await this._request('join', { code: cleanCode });
      this.roomId = res.room;
      this.token = res.token;
      this._setStatus(`Connecté au salon "${this.roomId}". Négociation du flux direct...`);

      this._initPeerConnection();
      this._startPolling();

      return { room: this.roomId, role: res.role };
    }

    _initPeerConnection() {
      this.peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      // Signalisation ICE Trickle immédiate
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.token) {
          this._request('signal', { description: { candidate: event.candidate } }).catch(() => {});
        }
      };

      this.peerConnection.ondatachannel = (e) => {
        this.dataChannel = e.channel;
        this._wireDataChannel(this.dataChannel);
      };

      this.peerConnection.ontrack = (event) => {
        const stream = (event.streams && event.streams[0]) ? event.streams[0] : null;
        if (typeof this.callbacks.onTrack === 'function') {
          this.callbacks.onTrack(stream, event.track);
        }
      };

      this.peerConnection.onconnectionstatechange = () => {
        const state = this.peerConnection?.connectionState;
        if (state === 'connected') {
          this.isConnected = true;
          this._setStatus('Liaison P2P établie ! Vous jouez en direct.', { connected: true });
          this.callbacks.onConnected();
          if (!this.isHost) {
            this._startGuestInputLoop();
            this._setupGuestKeyboard();
            this._startPingLoop();
          }
        } else if (state === 'disconnected' || state === 'failed') {
          this.isConnected = false;
          this._setStatus('Liaison P2P interrompue.', { connected: false });
          this.callbacks.onDisconnected();
        }
      };
    }

    // Mise à jour dynamique de la source canvas sans couper la liaison WebRTC
    updateCanvasStream(canvasElement) {
      if (!this.peerConnection || !canvasElement || typeof canvasElement.captureStream !== 'function') return;
      try {
        const newStream = canvasElement.captureStream(60);
        const newTrack = newStream.getVideoTracks()[0];
        if (!newTrack) return;

        const senders = this.peerConnection.getSenders ? this.peerConnection.getSenders() : [];
        const videoSender = senders.find(s => s.track && s.track.kind === 'video');
        if (videoSender && typeof videoSender.replaceTrack === 'function') {
          videoSender.replaceTrack(newTrack);
          console.log('[Sanctuaire LAN] Piste vidéo remplacée avec succès sur le nouveau canvas.');
        } else {
          this.peerConnection.addTrack(newTrack, newStream);
        }
      } catch (e) {
        console.warn('[Sanctuaire LAN] updateCanvasStream error:', e);
      }
    }

    _wireDataChannel(dc) {
      dc.binaryType = 'arraybuffer';
      dc.onopen = () => {
        console.log('[Sanctuaire LAN] DataChannel actif.');
      };
      dc.onclose = () => {
        console.log('[Sanctuaire LAN] DataChannel fermé.');
      };
      dc.onmessage = (event) => {
        try {
          if (typeof event.data === 'string') {
            const msg = JSON.parse(event.data);
            if (msg.t === 'input' && this.isHost) {
              this.callbacks.onInput(msg);
            } else if (msg.t === 'ping') {
              if (this.dataChannel && this.dataChannel.readyState === 'open') {
                this.dataChannel.send(JSON.stringify({ t: 'pong', ts: msg.ts }));
              }
            } else if (msg.t === 'pong') {
              this.rtt = Math.round(performance.now() - msg.ts);
              this.callbacks.onPing(this.rtt);
            }
          }
        } catch (e) {}
      };
    }

    _startPingLoop() {
      const pingInterval = setInterval(() => {
        if (!this.isConnected || !this.dataChannel || this.dataChannel.readyState !== 'open') {
          clearInterval(pingInterval);
          return;
        }
        this.lastPingSentAt = performance.now();
        this.dataChannel.send(JSON.stringify({ t: 'ping', ts: this.lastPingSentAt }));
      }, 1200);
    }

    // --- Boucle de lecture Gamepad pour l'Invité ---
    _startGuestInputLoop() {
      if (this.gamepadLoopId) cancelAnimationFrame(this.gamepadLoopId);

      const loop = () => {
        if (!this.isConnected) return;
        this._pollGuestGamepad();
        this.gamepadLoopId = requestAnimationFrame(loop);
      };
      this.gamepadLoopId = requestAnimationFrame(loop);
    }

    _pollGuestGamepad() {
      if (!navigator.getGamepads) return;
      const gamepads = navigator.getGamepads();
      let pad = null;
      for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i] && gamepads[i].connected) {
          pad = gamepads[i];
          break;
        }
      }
      if (!pad) return;

      // Touches boutons standards
      for (let i = 0; i < STANDARD_GAMEPAD_BUTTONS.length && i < pad.buttons.length; i++) {
        const btnName = STANDARD_GAMEPAD_BUTTONS[i];
        const isPressed = pad.buttons[i].pressed || pad.buttons[i].value > 0.45;
        if (this.lastButtonStates[btnName] !== isPressed) {
          this.lastButtonStates[btnName] = isPressed;
          this.sendInput(btnName, isPressed);
        }
      }

      // Sticks analogiques / D-pad stick
      const deadzone = 0.4;
      const axisX = pad.axes[0] || 0;
      const axisY = pad.axes[1] || 0;

      const left = axisX < -deadzone;
      const right = axisX > deadzone;
      const up = axisY < -deadzone;
      const down = axisY > deadzone;

      if (this.lastAxesStates.left !== left) {
        this.lastAxesStates.left = left;
        this.sendInput('left', left);
      }
      if (this.lastAxesStates.right !== right) {
        this.lastAxesStates.right = right;
        this.sendInput('right', right);
      }
      if (this.lastAxesStates.up !== up) {
        this.lastAxesStates.up = up;
        this.sendInput('up', up);
      }
      if (this.lastAxesStates.down !== down) {
        this.lastAxesStates.down = down;
        this.sendInput('down', down);
      }
    }

    _setupGuestKeyboard() {
      if (this.keyboardCleanup) {
        this.keyboardCleanup();
        this.keyboardCleanup = null;
      }

      const KEY_TO_BUTTON = {
        // Directions (Flèches, ZSQD, WASD)
        'ArrowUp': 'up', 'KeyW': 'up', 'KeyZ': 'up',
        'ArrowDown': 'down', 'KeyS': 'down',
        'ArrowLeft': 'left', 'KeyA': 'left', 'KeyQ': 'left',
        'ArrowRight': 'right', 'KeyD': 'right',

        // Touche A (Validation / Saut) : Numpad 6, Chiffre 6, K, X, L
        'Numpad6': 'a', 'Digit6': 'a', '6': 'a',
        'KeyK': 'a', 'KeyX': 'a', 'KeyL': 'a',

        // Touche B (Course / Action secondaire) : Numpad 5, Chiffre 5, J, C
        'Numpad5': 'b', 'Digit5': 'b', '5': 'b',
        'KeyJ': 'b', 'KeyC': 'b',

        // Touche X : Numpad 9, Chiffre 9, I, V, O
        'Numpad9': 'x', 'Digit9': 'x', '9': 'x',
        'KeyI': 'x', 'KeyV': 'x', 'KeyO': 'x',

        // Touche Y : Numpad 8, Chiffre 8, U, F
        'Numpad8': 'y', 'Digit8': 'y', '8': 'y',
        'KeyU': 'y', 'KeyF': 'y',

        // Gâchettes L / L2 : Numpad 7, Chiffre 7, E, ShiftLeft, Numpad 1, Chiffre 1
        'Numpad7': 'l', 'Digit7': 'l', '7': 'l',
        'KeyE': 'l', 'ShiftLeft': 'l',
        'Numpad1': 'l2', 'Digit1': 'l2', '1': 'l2',

        // Gâchettes R / R2 : Numpad 3, Chiffre 3, R, P, Numpad 2, Chiffre 2
        'Numpad3': 'r', 'Digit3': 'r', '3': 'r',
        'KeyR': 'r', 'KeyP': 'r',
        'Numpad2': 'r2', 'Digit2': 'r2', '2': 'r2',

        // Start & Select
        'Enter': 'start', 'NumpadEnter': 'start',
        'Space': 'select', 'Backspace': 'select', 'ShiftRight': 'select',
        'Numpad0': 'select', 'Digit0': 'select', '0': 'select'
      };

      const onKeyDown = (e) => {
        if (["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
        const btn = KEY_TO_BUTTON[e.code] || KEY_TO_BUTTON[e.key];
        this.sendInput(btn || e.code, true, 2, {
          code: e.code,
          key: e.key,
          keyCode: e.keyCode,
          type: 'keydown'
        });
        if (btn) e.preventDefault();
      };

      const onKeyUp = (e) => {
        if (["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
        const btn = KEY_TO_BUTTON[e.code] || KEY_TO_BUTTON[e.key];
        this.sendInput(btn || e.code, false, 2, {
          code: e.code,
          key: e.key,
          keyCode: e.keyCode,
          type: 'keyup'
        });
        if (btn) e.preventDefault();
      };

      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);

      this.keyboardCleanup = () => {
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
      };
    }

    // Envoi d'une touche joueur (par l'invité)
    sendInput(button, isDown, player = 2, extra = null) {
      if (!this.dataChannel || this.dataChannel.readyState !== 'open') return;
      try {
        const payload = JSON.stringify({
          t: 'input',
          p: player,
          b: button,
          d: isDown ? 1 : 0,
          ...(extra || {})
        });
        this.dataChannel.send(payload);
      } catch (e) {}
    }

    // Déconnexion propre
    disconnect(silent = false) {
      this._stopPolling();
      if (this.gamepadLoopId) {
        cancelAnimationFrame(this.gamepadLoopId);
        this.gamepadLoopId = null;
      }
      if (this.keyboardCleanup) {
        this.keyboardCleanup();
        this.keyboardCleanup = null;
      }
      if (this.token) {
        this._request('leave').catch(() => {});
      }
      if (this.dataChannel) {
        try { this.dataChannel.close(); } catch (e) {}
        this.dataChannel = null;
      }
      if (this.peerConnection) {
        try { this.peerConnection.close(); } catch (e) {}
        this.peerConnection = null;
      }
      window._rvLanAudioDest = null;
      this.isConnected = false;
      this.token = null;
      this.roomId = null;
      this.role = null;
      this.lastButtonStates = {};
      this.lastAxesStates = { up: false, down: false, left: false, right: false };
      this._setStatus('Déconnecté.');
      if (!silent) {
        this.callbacks.onDisconnected();
      }
    }

    // =========================================================================
    // MODAL UNIFIÉ DARK SANCTUARY (POUR TOUTES LES CONSOLES & PAGES DÉDIÉES)
    // =========================================================================
    static injectStyles() {
      if (document.getElementById("sanct-lan-styles")) return;
      const s = document.createElement("style");
      s.id = "sanct-lan-styles";
      s.textContent = `
        #sanct-lan-modal {
          position: fixed; inset: 0;
          z-index: 10000005 !important;
          display: flex; align-items: center; justify-content: center;
          padding: 16px; box-sizing: border-box;
        }
        .sanct-lan-backdrop {
          position: absolute; inset: 0;
          background: rgba(4, 8, 6, 0.88);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
        .sanct-lan-dialog {
          position: relative;
          background: #09140e;
          border: 1px solid rgba(212, 175, 55, 0.45);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.9), 0 0 30px rgba(212, 175, 55, 0.18);
          border-radius: 8px;
          width: 100%; max-width: 540px;
          padding: 24px; box-sizing: border-box;
          color: #e2e8f0;
          font-family: var(--font-body, 'Outfit', sans-serif);
          z-index: 1;
        }
        .sanct-lan-header {
          display: flex; align-items: center; justify-content: space-between;
          border-bottom: 1px solid rgba(212, 175, 55, 0.2);
          padding-bottom: 14px; margin-bottom: 18px;
        }
        .sanct-lan-title-wrap {
          display: flex; align-items: center; gap: 12px;
        }
        .sanct-lan-sigil {
          font-size: 1.8rem;
          filter: drop-shadow(0 0 8px rgba(212, 175, 55, 0.5));
        }
        .sanct-lan-title {
          font-family: var(--font-heading, 'Cinzel', serif);
          font-size: 1.25rem; color: #d4af37; margin: 0;
        }
        .sanct-lan-subtitle {
          font-size: 0.8rem; color: #a8b8ad;
        }
        .sanct-lan-close {
          background: none; border: none; color: #a8b8ad;
          font-size: 1.2rem; cursor: pointer; padding: 4px;
          transition: color 0.15s ease;
        }
        .sanct-lan-close:hover { color: #f87171; }
        .sanct-lan-tabs {
          display: flex; gap: 8px; margin-bottom: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding-bottom: 8px;
        }
        .sanct-lan-tab {
          background: rgba(20, 40, 28, 0.6);
          border: 1px solid rgba(212, 175, 55, 0.2);
          color: #a8b8ad; padding: 6px 14px;
          font-size: 0.82rem; font-family: var(--font-heading, 'Cinzel', serif);
          cursor: pointer; border-radius: 4px; transition: all 0.2s ease;
        }
        .sanct-lan-tab.active {
          background: #14281c; border-color: #d4af37; color: #d4af37;
          box-shadow: 0 0 10px rgba(212, 175, 55, 0.25);
        }
        .sanct-lan-status-box {
          background: rgba(5, 10, 7, 0.85);
          border: 1px solid rgba(212, 175, 55, 0.25);
          border-radius: 6px; padding: 12px 14px;
          margin-bottom: 16px; font-size: 0.84rem;
        }
        .sanct-lan-code-badge {
          display: inline-flex; align-items: center; gap: 8px;
          font-family: monospace; font-size: 1.3rem; font-weight: 700;
          color: #34d399; background: #040906;
          border: 1px dashed #34d399; padding: 6px 16px;
          border-radius: 4px; letter-spacing: 2px; margin: 8px 0;
        }
        .sanct-lan-btn {
          background: linear-gradient(135deg, #14281c 0%, #0e1d14 100%);
          border: 1px solid rgba(212, 175, 55, 0.4);
          color: #d4af37; padding: 6px 14px; font-weight: 600;
          border-radius: 4px; cursor: pointer; transition: all 0.2s ease;
          font-size: 0.8rem; font-family: var(--font-heading, 'Cinzel', serif);
          display: inline-flex; align-items: center; gap: 6px;
        }
        .sanct-lan-btn:hover {
          border-color: #d4af37; background: #1c3827;
          box-shadow: 0 0 10px rgba(212, 175, 55, 0.3);
        }
        .sanct-lan-btn-gold {
          background: linear-gradient(135deg, #d4af37 0%, #b89326 100%) !important;
          color: #050a07 !important; border-color: #d4af37 !important;
          font-weight: 700 !important;
        }
        .sanct-lan-btn-gold:hover {
          box-shadow: 0 0 14px rgba(212, 175, 55, 0.6) !important;
        }

        /* STAGE PLEIN ÉCRAN INVITÉ & EFFET CATHODIQUE CRT */
        .sanct-lan-video-overlay {
          position: fixed; inset: 0;
          background: #050a07;
          z-index: 10000003 !important;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          overflow: hidden;
          user-select: none; -webkit-user-select: none;
        }
        .sanct-guest-stage {
          position: relative;
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          background: #000;
          overflow: hidden;
        }
        .sanct-guest-stage video {
          width: 100%; height: 100%;
          object-fit: contain;
          background: #000;
        }
        .sanct-crt-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.35) 50%),
                      linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03));
          background-size: 100% 3px, 6px 100%;
          pointer-events: none;
          z-index: 5;
          transition: opacity 0.2s ease;
        }
        .sanct-crt-overlay.disabled {
          display: none !important;
        }

        /* BANDEAU HUD INVITÉ SUPÉRIEUR */
        .sanct-lan-guest-hud {
          position: fixed; top: 12px; left: 50%;
          transform: translateX(-50%);
          background: rgba(5, 10, 7, 0.92);
          border: 1px solid rgba(212, 175, 55, 0.45);
          border-radius: 20px; padding: 6px 14px;
          display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
          font-size: 0.8rem; color: #d4af37;
          z-index: 10000004 !important;
          backdrop-filter: blur(10px);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.85);
        }
        .sanct-lan-guest-hud span {
          white-space: nowrap;
        }

        /* MANETTE VIRTUELLE TACTILE (GAUCHE & DROITE) */
        .sanct-guest-gamepad {
          position: absolute; bottom: 18px; left: 0; right: 0;
          display: flex; justify-content: space-between; align-items: flex-end;
          padding: 0 32px;
          pointer-events: none;
          z-index: 20;
          box-sizing: border-box;
          transition: opacity 0.25s ease, transform 0.25s ease;
        }
        .sanct-guest-gamepad.disabled {
          display: none !important;
        }
        @media (max-width: 768px) {
          .sanct-guest-gamepad { padding: 0 10px; bottom: 10px; }
          .sanct-lan-guest-hud { padding: 4px 10px; font-size: 0.75rem; gap: 6px; }
        }
        .sanct-pad-wing {
          pointer-events: auto;
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          background: rgba(9, 19, 13, 0.88);
          border: 1px solid rgba(212, 175, 55, 0.45);
          border-radius: 12px; padding: 10px 14px;
          backdrop-filter: blur(10px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.85);
          touch-action: none;
          user-select: none; -webkit-user-select: none;
        }
        .sanct-pad-shoulder-row {
          display: flex; gap: 8px; width: 100%; justify-content: center;
        }
        .sanct-pad-btn {
          background: #14281c;
          border: 1px solid rgba(212, 175, 55, 0.4);
          color: #d4af37;
          font-family: var(--font-heading, 'Cinzel', serif);
          font-weight: 700;
          border-radius: 4px;
          cursor: pointer;
          touch-action: none;
          user-select: none; -webkit-user-select: none;
          transition: all 0.08s ease;
          display: inline-flex; align-items: center; justify-content: center;
        }
        .sanct-pad-btn:active, .sanct-pad-btn.pressed {
          background: #d4af37 !important;
          color: #050a07 !important;
          box-shadow: 0 0 14px rgba(212, 175, 55, 0.8) !important;
          transform: scale(0.94);
        }
        .sanct-pad-shoulder {
          font-size: 0.78rem; padding: 5px 12px; min-width: 50px;
        }
        .sanct-pad-menu-row {
          display: flex; justify-content: center; width: 100%;
        }
        .sanct-pad-pill {
          background: #0e1d14; border: 1px solid rgba(255, 255, 255, 0.2);
          color: #a8b8ad; font-size: 0.72rem; font-weight: 700;
          padding: 4px 16px; border-radius: 14px;
        }

        /* D-PAD DIRECTIONNEL (GAUCHE) */
        .sanct-dpad {
          display: grid;
          grid-template-columns: 42px 42px 42px;
          grid-template-rows: 42px 42px 42px;
          grid-template-areas:
            ".    up    ."
            "left core  right"
            ".    down  .";
          width: 126px; height: 126px;
          box-sizing: border-box;
        }
        .sanct-dpad-u { grid-area: up; border-radius: 8px 8px 0 0; }
        .sanct-dpad-d { grid-area: down; border-radius: 0 0 8px 8px; }
        .sanct-dpad-l { grid-area: left; border-radius: 8px 0 0 8px; }
        .sanct-dpad-r { grid-area: right; border-radius: 0 8px 8px 0; }
        .sanct-dpad-core { grid-area: core; background: #0e1d14; border: none; }

        /* ACTIONS EN LOSANGE (DROITE) */
        .sanct-actions {
          display: grid;
          grid-template-columns: 42px 42px 42px;
          grid-template-rows: 42px 42px 42px;
          grid-template-areas:
            ".    top   ."
            "left .     right"
            ".    bottom .";
          width: 126px; height: 126px;
          box-sizing: border-box;
        }
        .sanct-act-btn {
          border-radius: 50% !important;
          width: 40px !important; height: 40px !important;
          font-size: 1rem !important; font-weight: 800 !important;
          box-shadow: 0 4px 10px rgba(0,0,0,0.6);
        }
        .sanct-act-x { grid-area: top; color: #38bdf8; border-color: rgba(56, 189, 248, 0.6) !important; }
        .sanct-act-y { grid-area: left; color: #fbbf24; border-color: rgba(251, 191, 36, 0.6) !important; }
        .sanct-act-a { grid-area: right; color: #34d399; border-color: rgba(52, 211, 153, 0.6) !important; }
        .sanct-act-b { grid-area: bottom; color: #f87171; border-color: rgba(248, 113, 113, 0.6) !important; }

        .sanct-act-a:active, .sanct-act-a.pressed { background: #34d399 !important; color: #050a07 !important; }
        .sanct-act-b:active, .sanct-act-b.pressed { background: #f87171 !important; color: #050a07 !important; }
        .sanct-act-x:active, .sanct-act-x.pressed { background: #38bdf8 !important; color: #050a07 !important; }
        .sanct-act-y:active, .sanct-act-y.pressed { background: #fbbf24 !important; color: #050a07 !important; }

        @keyframes sanctSpin {
          to { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(s);
    }

    static openModal(options = {}) {
      const title = options.title || "Sanctuaire LAN — Multijoueur P2P";
      const getCanvas = options.getCanvas || (() => document.querySelector("canvas"));
      const onInput = options.onInput || (() => {});
      const initialTab = options.initialTab || "host";

      SanctuaireLAN.injectStyles();

      // 2. Gestion de l'instance SanctuaireLAN
      if (!SanctuaireLAN.activeSession) {
        SanctuaireLAN.activeSession = new SanctuaireLAN({
          onInput: onInput
        });
      }
      const session = SanctuaireLAN.activeSession;
      session.callbacks.onInput = onInput;

      let modal = document.getElementById("sanct-lan-modal");
      if (!modal) {
        modal = document.createElement("div");
        modal.id = "sanct-lan-modal";
        document.body.appendChild(modal);
      }

      const isHosting = session.isHost && session.roomId;
      const isGuest = !session.isHost && session.roomId;

      modal.innerHTML = `
        <div class="sanct-lan-backdrop" id="sanct-lan-backdrop"></div>
        <div class="sanct-lan-dialog">
          <div class="sanct-lan-header">
            <div class="sanct-lan-title-wrap">
              <span class="sanct-lan-sigil">⚔️</span>
              <div>
                <h3 class="sanct-lan-title">${title}</h3>
                <div class="sanct-lan-subtitle">Salon Multijoueur Coop &amp; Versus P2P</div>
              </div>
            </div>
            <button class="sanct-lan-close" id="sanct-lan-close-btn" title="Fermer">✖</button>
          </div>

          <div class="sanct-lan-tabs">
            <button type="button" class="sanct-lan-tab ${initialTab === 'host' ? 'active' : ''}" id="sanct-tab-host">👑 Héberger (Joueur 1)</button>
            <button type="button" class="sanct-lan-tab ${initialTab === 'join' ? 'active' : ''}" id="sanct-tab-join">🎮 Rejoindre (Joueur 2)</button>
          </div>

          <div class="sanct-lan-body">
            <!-- ONGLET HÉBERGER -->
            <div id="sanct-view-host" style="display: ${initialTab === 'host' ? 'block' : 'none'};">
              ${isHosting ? `
                <div class="sanct-lan-status-box">
                  <div style="color: #34d399; font-weight: 700; font-size: 0.95rem; margin-bottom: 6px;">
                    🟢 Salon Coop Ouvert — En direct
                  </div>
                  <div style="font-size: 0.82rem; color: #a8b8ad;">Code du salon à partager :</div>
                  <div class="sanct-lan-code-badge">${session.roomId}</div>
                  <div style="font-size: 0.82rem; color: #a8b8ad; margin-top: 6px;">
                    Partagez ce code ou ce lien avec votre ami pour qu'il prenne la manette du <strong>Joueur 2</strong> :
                  </div>
                  <div style="display: flex; gap: 8px; margin-top: 10px;">
                    <input type="text" readonly value="${window.location.origin + window.location.pathname + '?lan=' + session.roomId}" style="flex: 1; background: #050a07; border: 1px solid rgba(212,175,55,0.3); border-radius: 4px; padding: 6px 10px; color: #d4af37; font-size: 0.78rem;" id="sanct-invite-input">
                    <button type="button" class="sanct-lan-btn sanct-lan-btn-gold" id="sanct-btn-copy-link">📋 Copier le lien</button>
                  </div>
                  <div id="sanct-host-peer-status" style="margin-top: 10px; font-size: 0.8rem; color: #34d399;">
                    ${session.isConnected ? `⚡ Joueur 2 connecté ! Ping: ${session.rtt || 20} ms` : `⏳ En attente de l'ami invité...`}
                  </div>
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 8px;">
                  <button type="button" class="sanct-lan-btn" id="sanct-btn-stop-host" style="color: #f87171; border-color: rgba(248,113,113,0.4);">Fermer le salon</button>
                </div>
              ` : `
                <p style="font-size: 0.85rem; color: #c4d4c8; line-height: 1.5; margin-bottom: 14px;">
                  Ouvrez un salon P2P pour diffuser votre écran à 60 FPS avec le son du jeu, et permettre à un ami de jouer le rôle de <strong>Joueur 2</strong>.
                </p>
                <div class="sanct-lan-status-box">
                  <div style="color: #d4af37; font-weight: 600;">Console &amp; Rendu Actifs</div>
                  <div style="font-size: 0.78rem; color: #a8b8ad; margin-top: 4px;">Le flux vidéo 60 FPS et le son seront transmis directement de navigateur à navigateur (zéro latence serveur).</div>
                </div>
                <button type="button" class="sanct-lan-btn sanct-lan-btn-gold" id="sanct-btn-start-host" style="width: 100%; padding: 10px; font-size: 0.9rem;">
                  ⚔️ Créer le Salon Coop (Joueur 1)
                </button>
              `}
            </div>

            <!-- ONGLET REJOINDRE -->
            <div id="sanct-view-join" style="display: ${initialTab === 'join' ? 'block' : 'none'};">
              ${isGuest ? `
                <div class="sanct-lan-status-box">
                  <div style="color: #34d399; font-weight: 700;">🟢 Connecté en tant que Joueur 2</div>
                  <div style="font-size: 0.8rem; color: #a8b8ad; margin-top: 4px;">Salon : <strong>${session.roomId}</strong> | Ping: ${session.rtt || 20} ms</div>
                  <div style="font-size: 0.78rem; color: #c4d4c8; margin-top: 6px;">Votre manette ou clavier contrôle directement le Joueur 2 sur la partie de l'hôte.</div>
                </div>
                <button type="button" class="sanct-lan-btn" id="sanct-btn-leave-guest" style="color: #f87171; border-color: rgba(248,113,113,0.4); width: 100%;">Quitter la partie</button>
              ` : `
                <p style="font-size: 0.85rem; color: #c4d4c8; line-height: 1.5; margin-bottom: 14px;">
                  Entrez le code fourni par l'hôte pour vous connecter directement à son flux et prendre la manette du <strong>Joueur 2</strong>.
                </p>
                <div style="margin-bottom: 14px;">
                  <label style="display: block; font-size: 0.78rem; color: #d4af37; margin-bottom: 6px; font-weight: 600;">Code du Salon :</label>
                  <input type="text" id="sanct-join-code-input" placeholder="Ex: SANCT-42" maxlength="12" style="width: 100%; box-sizing: border-box; background: #050a07; border: 1px solid rgba(212,175,55,0.4); border-radius: 4px; padding: 10px 12px; color: #34d399; font-size: 1.1rem; font-family: monospace; letter-spacing: 2px; text-transform: uppercase;">
                </div>
                <div id="sanct-join-feedback" style="font-size: 0.8rem; min-height: 20px; margin-bottom: 10px;"></div>
                <button type="button" class="sanct-lan-btn sanct-lan-btn-gold" id="sanct-btn-start-join" style="width: 100%; padding: 10px; font-size: 0.9rem;">
                  🎮 Rejoindre la Partie
                </button>
              `}
            </div>
          </div>
        </div>
      `;

      // Écouteurs de base
      const close = () => { if (modal) modal.remove(); };
      const closeBtn = document.getElementById("sanct-lan-close-btn");
      const backdrop = document.getElementById("sanct-lan-backdrop");
      if (closeBtn) closeBtn.onclick = close;
      if (backdrop) backdrop.onclick = close;

      const tabHost = document.getElementById("sanct-tab-host");
      const tabJoin = document.getElementById("sanct-tab-join");
      const viewHost = document.getElementById("sanct-view-host");
      const viewJoin = document.getElementById("sanct-view-join");

      if (tabHost && tabJoin && viewHost && viewJoin) {
        tabHost.onclick = () => {
          tabHost.classList.add("active"); tabJoin.classList.remove("active");
          viewHost.style.display = "block"; viewJoin.style.display = "none";
        };
        tabJoin.onclick = () => {
          tabJoin.classList.add("active"); tabHost.classList.remove("active");
          viewJoin.style.display = "block"; viewHost.style.display = "none";
        };
      }

      // Action Héberger
      const btnStartHost = document.getElementById("sanct-btn-start-host");
      if (btnStartHost) {
        btnStartHost.onclick = async () => {
          btnStartHost.disabled = true;
          btnStartHost.textContent = "⏳ Création du salon...";
          try {
            const canvasEl = getCanvas();
            if (!canvasEl) throw new Error("Canvas graphique introuvable sur cette console.");
            session.callbacks.onPing = (rtt) => {
              const el = document.getElementById("sanct-host-peer-status");
              if (el) el.textContent = `⚡ Joueur 2 connecté ! Ping: ${rtt} ms`;
            };
            session.callbacks.onConnected = () => {
              const el = document.getElementById("sanct-host-peer-status");
              if (el) el.textContent = "⚡ Joueur 2 connecté en direct !";
            };
            session.callbacks.onDisconnected = () => {
              const el = document.getElementById("sanct-host-peer-status");
              if (el) el.textContent = "⏳ En attente de l'ami invité...";
            };
            await session.hostGame(canvasEl, { name: title });
            SanctuaireLAN.openModal({ ...options, initialTab: "host" });
          } catch(err) {
            alert("Erreur de création de salon : " + err.message);
            btnStartHost.disabled = false;
            btnStartHost.textContent = "⚔️ Créer le Salon Coop (Joueur 1)";
          }
        };
      }

      // Action Copier
      const btnCopy = document.getElementById("sanct-btn-copy-link");
      if (btnCopy) {
        btnCopy.onclick = () => {
          const inp = document.getElementById("sanct-invite-input");
          if (inp) {
            inp.select();
            navigator.clipboard.writeText(inp.value).then(() => {
              btnCopy.textContent = "✅ Copié !";
              setTimeout(() => { btnCopy.textContent = "📋 Copier le lien"; }, 2000);
            });
          }
        };
      }

      const btnStopHost = document.getElementById("sanct-btn-stop-host");
      if (btnStopHost) {
        btnStopHost.onclick = () => {
          session.disconnect();
          SanctuaireLAN.openModal({ ...options, initialTab: "host" });
        };
      }

      // Action Rejoindre
      const btnStartJoin = document.getElementById("sanct-btn-start-join");
      if (btnStartJoin) {
        btnStartJoin.onclick = async () => {
          const codeInp = document.getElementById("sanct-join-code-input");
          const fb = document.getElementById("sanct-join-feedback");
          const code = (codeInp?.value || "").trim().toUpperCase();
          if (!code) {
            if (fb) { fb.textContent = "⚠️ Veuillez indiquer un code de salon."; fb.style.color = "#f87171"; }
            return;
          }
          btnStartJoin.disabled = true;
          btnStartJoin.textContent = "⏳ Connexion à l'Hôte...";
          if (fb) { fb.textContent = "Négociation P2P en cours..."; fb.style.color = "#d4af37"; }

          try {
            close();
            SanctuaireLAN.mountGuestView(session, code);
            await session.joinGame(code);
          } catch (err) {
            alert("Échec de connexion : " + err.message);
            SanctuaireLAN.unmountGuestView();
            SanctuaireLAN.openModal({ ...options, initialTab: "join" });
          }
        };
      }

      // Pré-remplissage automatique si code fourni
      const prefill = options.prefillCode || "";
      if (prefill) {
        const inp = document.getElementById("sanct-join-code-input");
        if (inp) inp.value = prefill;
      }

      const btnLeaveGuest = document.getElementById("sanct-btn-leave-guest");
      if (btnLeaveGuest) {
        btnLeaveGuest.onclick = () => {
          session.disconnect();
          SanctuaireLAN.unmountGuestView();
          SanctuaireLAN.openModal({ ...options, initialTab: "join" });
        };
      }
    }

    // Montage de l'affichage vidéo plein écran pour l'invité (avec CRT & Manette Virtuelle)
    static mountGuestView(session, roomCode) {
      SanctuaireLAN.unmountGuestView();
      SanctuaireLAN.injectStyles();

      const overlay = document.createElement("div");
      overlay.id = "sanct-lan-guest-overlay";
      overlay.className = "sanct-lan-video-overlay";

      // Stage conteneur vidéo avec overlay cathodique CRT
      const stage = document.createElement("div");
      stage.id = "sanct-guest-stage";
      stage.className = "sanct-guest-stage";

      const crtOverlay = document.createElement("div");
      crtOverlay.id = "sanct-guest-crt";
      crtOverlay.className = "sanct-crt-overlay";

      const loadingBox = document.createElement("div");
      loadingBox.id = "sanct-guest-loading";
      loadingBox.style.cssText = "position: absolute; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; color: #d4af37; font-family: var(--font-heading, 'Cinzel', serif); text-align: center; padding: 24px; z-index: 10;";
      loadingBox.innerHTML = `
        <div style="width: 46px; height: 46px; border: 3px solid rgba(212,175,55,0.25); border-top-color: #d4af37; border-radius: 50%; animation: sanctSpin 0.9s linear infinite;"></div>
        <div style="font-size: 1.2rem; font-weight: 700; letter-spacing: 1px;">⚔️ Connexion au Sanctuaire...</div>
        <div id="sanct-guest-loading-sub" style="font-size: 0.85rem; color: #a8b8ad; font-family: sans-serif; max-width: 380px;">Négociation de la liaison directe P2P (60 FPS)...</div>
      `;

      const video = document.createElement("video");
      video.id = "sanct-lan-guest-video";
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true; // Démarrer en sourdine pour contourner le blocage autoplay des navigateurs
      video.style.cssText = "display: none; width: 100%; height: 100%; object-fit: contain; background: #000;";

      stage.appendChild(crtOverlay);
      stage.appendChild(loadingBox);
      stage.appendChild(video);
      overlay.appendChild(stage);

      // Manette virtuelle tactile (D-Pad, Actions X/Y/B/A, L1/L2, R1/R2, Start, Select)
      const gamepad = document.createElement("div");
      gamepad.id = "sanct-guest-gamepad";
      gamepad.className = "sanct-guest-gamepad";
      gamepad.innerHTML = `
        <!-- Aile Gauche : L1/L2, D-Pad, Select -->
        <div class="sanct-pad-wing sanct-pad-left">
          <div class="sanct-pad-shoulder-row">
            <button type="button" class="sanct-pad-btn sanct-pad-shoulder" data-btn="l">L1</button>
            <button type="button" class="sanct-pad-btn sanct-pad-shoulder" data-btn="l2">L2</button>
          </div>
          <div class="sanct-dpad">
            <button type="button" class="sanct-pad-btn sanct-dpad-u" data-btn="up" aria-label="Haut">▲</button>
            <button type="button" class="sanct-pad-btn sanct-dpad-l" data-btn="left" aria-label="Gauche">◀</button>
            <div class="sanct-dpad-core"></div>
            <button type="button" class="sanct-pad-btn sanct-dpad-r" data-btn="right" aria-label="Droite">▶</button>
            <button type="button" class="sanct-pad-btn sanct-dpad-d" data-btn="down" aria-label="Bas">▼</button>
          </div>
          <div class="sanct-pad-menu-row">
            <button type="button" class="sanct-pad-btn sanct-pad-pill" data-btn="select">SELECT</button>
          </div>
        </div>

        <!-- Aile Droite : R1/R2, Actions X/Y/A/B, Start -->
        <div class="sanct-pad-wing sanct-pad-right">
          <div class="sanct-pad-shoulder-row">
            <button type="button" class="sanct-pad-btn sanct-pad-shoulder" data-btn="r">R1</button>
            <button type="button" class="sanct-pad-btn sanct-pad-shoulder" data-btn="r2">R2</button>
          </div>
          <div class="sanct-actions">
            <button type="button" class="sanct-pad-btn sanct-act-btn sanct-act-x" data-btn="x" aria-label="Touche X">X</button>
            <button type="button" class="sanct-pad-btn sanct-act-btn sanct-act-y" data-btn="y" aria-label="Touche Y">Y</button>
            <button type="button" class="sanct-pad-btn sanct-act-btn sanct-act-a" data-btn="a" aria-label="Touche A">A</button>
            <button type="button" class="sanct-pad-btn sanct-act-btn sanct-act-b" data-btn="b" aria-label="Touche B">B</button>
          </div>
          <div class="sanct-pad-menu-row">
            <button type="button" class="sanct-pad-btn sanct-pad-pill" data-btn="start">START</button>
          </div>
        </div>
      `;
      overlay.appendChild(gamepad);

      // Bandeau d'options supérieur HUD
      const hud = document.createElement("div");
      hud.className = "sanct-lan-guest-hud";
      hud.innerHTML = `
        <span>⚔️ SALON : <strong style="color: #34d399;">${roomCode}</strong></span>
        <span style="color: #a8b8ad;">|</span>
        <span>🎮 Joueur 2</span>
        <span style="color: #a8b8ad;">|</span>
        <span id="sanct-guest-ping">🟢 Ping : -- ms</span>
        <button type="button" class="sanct-lan-btn" id="sanct-guest-crt-btn" title="Activer ou désactiver l'effet cathodique CRT">📺 CRT : ON</button>
        <button type="button" class="sanct-lan-btn" id="sanct-guest-pad-btn" title="Afficher ou masquer la manette virtuelle tactile">📱 Manette : ON</button>
        <button type="button" class="sanct-lan-btn" id="sanct-guest-unmute" title="Activer ou couper le son">🔊 Activer le Son</button>
        <button type="button" class="sanct-lan-btn" id="sanct-guest-fullscreen" title="Basculer en plein écran">⛶ Plein Écran</button>
        <button type="button" class="sanct-lan-btn" id="sanct-guest-leave" style="color: #f87171;" title="Quitter la partie">✕ Quitter</button>
      `;

      document.body.appendChild(overlay);
      document.body.appendChild(hud);

      // Écouteurs de la manette tactile (Multi-touch et souris sans blocage)
      gamepad.querySelectorAll(".sanct-pad-btn[data-btn]").forEach((btnEl) => {
        const btnName = btnEl.getAttribute("data-btn");
        if (!btnName) return;

        const onDown = (e) => {
          e.preventDefault();
          e.stopPropagation();
          btnEl.classList.add("pressed");
          session.sendInput(btnName, true, 2);
        };

        const onUp = (e) => {
          e.preventDefault();
          e.stopPropagation();
          btnEl.classList.remove("pressed");
          session.sendInput(btnName, false, 2);
        };

        btnEl.addEventListener("pointerdown", onDown);
        btnEl.addEventListener("pointerup", onUp);
        btnEl.addEventListener("pointercancel", onUp);
        btnEl.addEventListener("pointerleave", onUp);
      });

      // Contrôle de l'effet CRT
      const btnCrt = document.getElementById("sanct-guest-crt-btn");
      if (btnCrt) {
        btnCrt.onclick = () => {
          crtOverlay.classList.toggle("disabled");
          btnCrt.textContent = crtOverlay.classList.contains("disabled") ? "📺 CRT : OFF" : "📺 CRT : ON";
        };
      }

      // Contrôle de la Manette Virtuelle
      const btnPad = document.getElementById("sanct-guest-pad-btn");
      if (btnPad) {
        btnPad.onclick = () => {
          gamepad.classList.toggle("disabled");
          btnPad.textContent = gamepad.classList.contains("disabled") ? "📱 Manette : OFF" : "📱 Manette : ON";
        };
      }

      // Plein Écran
      const btnFs = document.getElementById("sanct-guest-fullscreen");
      if (btnFs) {
        btnFs.onclick = () => {
          if (!document.fullscreenElement) {
            overlay.requestFullscreen?.().catch(() => {});
          } else {
            document.exitFullscreen?.().catch(() => {});
          }
        };
      }

      const btnUnmute = document.getElementById("sanct-guest-unmute");
      if (btnUnmute) {
        btnUnmute.onclick = () => {
          video.muted = !video.muted;
          btnUnmute.textContent = video.muted ? "🔊 Activer le Son" : "🔇 Couper le Son";
          video.play().catch(() => {});
        };
      }

      const btnLeave = document.getElementById("sanct-guest-leave");
      if (btnLeave) {
        btnLeave.onclick = () => {
          session.disconnect();
          SanctuaireLAN.unmountGuestView();
        };
      }

      // Configuration de la réception des flux vidéo et audio
      session.callbacks.onTrack = (stream, track) => {
        const incomingStream = stream || (track ? new MediaStream([track]) : null);
        if (!incomingStream) return;

        if (!video.srcObject) {
          video.srcObject = incomingStream;
        } else {
          const currentStream = video.srcObject;
          const hasVideo = currentStream.getVideoTracks().length > 0;
          const incomingHasVideo = incomingStream.getVideoTracks().length > 0;

          if (!hasVideo && incomingHasVideo) {
            video.srcObject = new MediaStream([...currentStream.getTracks(), ...incomingStream.getVideoTracks()]);
          } else {
            incomingStream.getTracks().forEach(t => {
              if (!currentStream.getTracks().some(existing => existing.id === t.id)) {
                currentStream.addTrack(t);
              }
            });
          }
        }

        loadingBox.style.display = "none";
        video.style.display = "block";
        video.play().catch(e => console.warn("[Sanctuaire LAN] Video play:", e));
      };

      video.onloadedmetadata = () => {
        loadingBox.style.display = "none";
        video.style.display = "block";
        video.play().catch(() => {});
      };

      session.callbacks.onConnected = () => {
        const sub = document.getElementById("sanct-guest-loading-sub");
        if (sub) sub.textContent = "⚡ P2P connecté ! Attente de la première trame 60 FPS...";
      };

      session.callbacks.onPing = (rtt) => {
        const pingEl = document.getElementById("sanct-guest-ping");
        if (pingEl) pingEl.textContent = `🟢 Ping : ${rtt} ms`;
      };

      session.callbacks.onDisconnected = () => {
        SanctuaireLAN.unmountGuestView();
      };
    }

    static unmountGuestView() {
      const overlay = document.getElementById("sanct-lan-guest-overlay");
      if (overlay) overlay.remove();
      const hud = document.querySelector(".sanct-lan-guest-hud");
      if (hud) hud.remove();
    }

    // Vérification automatique des liens d'invitation ?lan=SANCT-XXXX
    static checkAutoJoin(options = {}) {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("lan");
        if (code) {
          setTimeout(() => {
            SanctuaireLAN.openModal({
              ...options,
              initialTab: "join",
              prefillCode: code.trim().toUpperCase()
            });
          }, 350);
        }
      } catch(e) {}
    }
  }

  SanctuaireLAN.activeSession = null;
  return SanctuaireLAN;
});
