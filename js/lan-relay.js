/**
 * Sanctuaire LAN & Netplay P2P Céleste (Portfolio Quentin Beaud)
 * Moteur WebRTC ultra-faible latence pour le jeu coopératif local à distance.
 * Capture vidéo 60 FPS + audio WebAudio + transmission manette Joueur 2.
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

  // Intercepteur global AudioContext pour capturer le son du jeu sans altérer l'émulateur
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
        // Continuer le polling si non connecté ou en maintien de session
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
          const answer = await this.peerConnection.createAnswer();
          await this.peerConnection.setLocalDescription(answer);
          await this._waitForIceComplete();
          await this._request('signal', { description: this.peerConnection.localDescription });
          this._setStatus('Réponse envoyée. Finalisation P2P...');
        } else if (desc.type === 'answer' && this.isHost) {
          this._setStatus('Réponse de l\'invité acceptée. Connexion en cours...');
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(desc));
        } else if (desc.candidate) {
          try {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(desc.candidate));
          } catch (iceErr) {}
        }
      } else if (event.type === 'peer-left' || event.type === 'closed') {
        this._setStatus('Le partenaire a quitté le salon.');
        if (!this.isHost) {
          this.disconnect();
        }
      }
    }

    _waitForIceComplete(timeoutMs = 5000) {
      return new Promise((resolve) => {
        if (!this.peerConnection || this.peerConnection.iceGatheringState === 'complete') {
          return resolve();
        }
        const timer = setTimeout(() => {
          if (this.peerConnection) this.peerConnection.removeEventListener('icegatheringstatechange', check);
          resolve();
        }, timeoutMs);

        const check = () => {
          if (this.peerConnection?.iceGatheringState === 'complete') {
            clearTimeout(timer);
            this.peerConnection.removeEventListener('icegatheringstatechange', check);
            resolve();
          }
        };
        this.peerConnection.addEventListener('icegatheringstatechange', check);
      });
    }

    // ==========================================
    // CÔTÉ HÔTE (Joueur 1)
    // ==========================================
    async hostGame(canvasElement, options = {}) {
      this.disconnect();
      this.isHost = true;
      this.role = 'host';

      this._setStatus('Création du salon Céleste...');
      const res = await this._request('create', {
        name: options.name || 'Sanctuaire LAN',
        max_players: 2
      });

      this.roomId = res.room;
      this.token = res.token;
      this._setStatus(`Salon ouvert : ${this.roomId}. En attente du Joueur 2...`, {
        room: this.roomId,
        invite: res.invite
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
      return { room: this.roomId, invite: res.invite };
    }

    async _createOffer() {
      try {
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        await this._waitForIceComplete();
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
      this.disconnect();
      this.isHost = false;
      this.role = 'guest';

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

      this.peerConnection.ondatachannel = (e) => {
        this.dataChannel = e.channel;
        this._wireDataChannel(this.dataChannel);
      };

      this.peerConnection.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          this.callbacks.onTrack(event.streams[0]);
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
            this._startPingLoop();
          }
        } else if (state === 'disconnected' || state === 'failed') {
          this.isConnected = false;
          this._setStatus('Liaison P2P interrompue.', { connected: false });
          this.callbacks.onDisconnected();
        }
      };
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
              // Réponse immédiate pour calcul du ping
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

    // Envoi d'une touche joueur (par l'invité)
    sendInput(button, isDown, player = 2) {
      if (!this.dataChannel || this.dataChannel.readyState !== 'open') return;
      try {
        const payload = JSON.stringify({
          t: 'input',
          p: player,
          b: button,
          d: isDown ? 1 : 0
        });
        this.dataChannel.send(payload);
      } catch (e) {}
    }

    // Déconnexion propre
    disconnect() {
      this._stopPolling();
      if (this.gamepadLoopId) {
        cancelAnimationFrame(this.gamepadLoopId);
        this.gamepadLoopId = null;
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
      this.callbacks.onDisconnected();
    }
  }

  return SanctuaireLAN;
});
