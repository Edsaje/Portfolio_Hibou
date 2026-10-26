/**
 * ====================================================================
 * NINTENDO DS NATIVE WEBASSEMBLY RUNNER (DESMUME-WASM)
 * 100% Auto-hébergé sur le portfolio (aucun service tiers, aucune iframe)
 * Rendu double écran natif + Stylet tactile interactif + Audio WebAudio
 * ====================================================================
 */
(function (root, factory) {
  if (typeof define === "function" && define.amd) {
    define([], factory);
  } else if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.DesmumePlayer = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  class DesmumePlayer {
    constructor() {
      this.isLoaded = false;
      this.isRunning = false;
      this.isPaused = false;
      this.animId = null;
      this.audioContext = null;
      this.scriptNode = null;
      this.audioFifoCap = 8192;
      this.audioFifoL = new Int16Array(8192);
      this.audioFifoR = new Int16Array(8192);
      this.audioFifoHead = 0;
      this.audioFifoLen = 0;
      this.keysState = new Uint8Array(16); // 16 bits
      this.touched = 0;
      this.touchX = 0;
      this.touchY = 0;
      this.topCanvas = null;
      this.bottomCanvas = null;
      this.topCtx = null;
      this.bottomCtx = null;
      this.boundKeyHandler = this.onKeyEvent.bind(this);
    }

    async initEngine() {
      if (window.Module && window.Module._loadROM) {
        this.isLoaded = true;
        return;
      }

      return new Promise((resolve, reject) => {
        window.Module = {
          locateFile: (path) => "js/desmume/" + path,
          print: (t) => console.log("[DeSmuME]", t),
          printErr: (e) => console.warn("[DeSmuME ERR]", e),
          onAbort: (msg) => reject(new Error("DeSmuME Wasm abort: " + msg))
        };

        window.wasmReady = () => {
          this.isLoaded = true;
          try {
            if (window.Module._setSampleRate) {
              window.Module._setSampleRate(48000);
            }
          } catch (e) {}
          resolve();
        };

        const script = document.createElement("script");
        script.src = "js/desmume/nds.js";
        script.onerror = () => reject(new Error("Impossible de charger js/desmume/nds.js"));
        document.head.appendChild(script);
      });
    }

    initAudio() {
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioCtx({ sampleRate: 48000 });
        this.scriptNode = this.audioContext.createScriptProcessor(2048, 0, 2);
        this.scriptNode.onaudioprocess = (e) => {
          if (this.isPaused || !this.isRunning) return;
          const chanL = e.outputBuffer.getChannelData(0);
          const chanR = e.outputBuffer.getChannelData(1);
          for (let i = 0; i < chanL.length; i++) {
            if (this.audioFifoLen <= 0) break;
            this.audioFifoLen--;
            chanL[i] = this.audioFifoL[this.audioFifoHead] / 32768.0;
            chanR[i] = this.audioFifoR[this.audioFifoHead] / 32768.0;
            this.audioFifoHead = (this.audioFifoHead + 1) % this.audioFifoCap;
          }
        };
        this.scriptNode.connect(this.audioContext.destination);
      }
      if (this.audioContext.state === "suspended") {
        this.audioContext.resume();
      }
    }

    feedAudio() {
      if (!window.Module || !window.Module._fillAudioBuffer) return;
      const samplesRead = window.Module._fillAudioBuffer(4096);
      const ptrAudio = window.Module._getSymbol(6);
      if (!ptrAudio) return;
      const audioBuffer = new Int16Array(window.Module.HEAPU8.buffer, ptrAudio, 16384 * 2);
      for (let i = 0; i < samplesRead; i++) {
        if (this.audioFifoLen >= this.audioFifoCap) break;
        const wpos = (this.audioFifoHead + this.audioFifoLen) % this.audioFifoCap;
        this.audioFifoL[wpos] = audioBuffer[i * 2];
        this.audioFifoR[wpos] = audioBuffer[i * 2 + 1];
        this.audioFifoLen++;
      }
    }

    async launch(fileOrBlob, containerEl) {
      this.exit(); // clean previous if any
      await this.initEngine();

      const romSize = fileOrBlob.size;
      const romBufPtr = window.Module._prepareRomBuffer(romSize);
      const arrayBuffer = await fileOrBlob.arrayBuffer();
      window.Module.HEAPU8.set(new Uint8Array(arrayBuffer), romBufPtr);

      const ret = window.Module._loadROM(romSize);
      if (ret !== 0) {
        throw new Error("Échec du chargement de la cartouche DS (code " + ret + ").");
      }

      // DOM : Double écran DS Dark Fantasy
      containerEl.innerHTML = `
        <div class="rv-nds-layout">
          <div class="rv-nds-screen-wrap rv-nds-top-wrap">
            <span class="rv-nds-badge">ÉCRAN SUPÉRIEUR</span>
            <canvas id="rv-nds-screen-top" width="256" height="192"></canvas>
          </div>
          <div class="rv-nds-hinge">
            <span class="rv-nds-led"></span>
          </div>
          <div class="rv-nds-screen-wrap rv-nds-bottom-wrap">
            <span class="rv-nds-badge">ÉCRAN TACTILE (STYLET)</span>
            <canvas id="rv-nds-screen-bottom" width="256" height="192"></canvas>
          </div>
        </div>
      `;

      this.topCanvas = document.getElementById("rv-nds-screen-top");
      this.bottomCanvas = document.getElementById("rv-nds-screen-bottom");
      this.topCtx = this.topCanvas.getContext("2d", { alpha: false });
      this.bottomCtx = this.bottomCanvas.getContext("2d", { alpha: false });

      this.bindTouchStylus();
      this.initAudio();

      window.addEventListener("keydown", this.boundKeyHandler);
      window.addEventListener("keyup", this.boundKeyHandler);

      this.isRunning = true;
      this.isPaused = false;
      this.startLoop();
    }

    bindTouchStylus() {
      const bottom = this.bottomCanvas;
      if (!bottom) return;

      const updatePos = (clientX, clientY) => {
        const rect = bottom.getBoundingClientRect();
        this.touchX = Math.max(0, Math.min(255, Math.floor(((clientX - rect.left) / rect.width) * 256)));
        this.touchY = Math.max(0, Math.min(191, Math.floor(((clientY - rect.top) / rect.height) * 192)));
      };

      bottom.addEventListener("mousedown", (e) => {
        this.touched = 1;
        updatePos(e.clientX, e.clientY);
      });
      window.addEventListener("mousemove", (e) => {
        if (this.touched) updatePos(e.clientX, e.clientY);
      });
      window.addEventListener("mouseup", () => {
        this.touched = 0;
      });

      bottom.addEventListener("touchstart", (e) => {
        e.preventDefault();
        this.touched = 1;
        if (e.touches && e.touches[0]) updatePos(e.touches[0].clientX, e.touches[0].clientY);
      }, { passive: false });
      bottom.addEventListener("touchmove", (e) => {
        e.preventDefault();
        if (this.touched && e.touches && e.touches[0]) updatePos(e.touches[0].clientX, e.touches[0].clientY);
      }, { passive: false });
      bottom.addEventListener("touchend", () => {
        this.touched = 0;
      });
    }

    setKeyBit(bit, isDown) {
      if (isDown) this.keysState[bit] = 1;
      else this.keysState[bit] = 0;
    }

    onKeyEvent(e) {
      if (!this.isRunning) return;
      const isDown = e.type === "keydown";

      // NDS Bit Mask:
      // 0: Right, 1: Left, 2: Down, 3: Up
      // 4: Select, 5: Start, 6: B, 7: A, 8: Y, 9: X, 10: L, 11: R
      let bit = -1;
      if (["KeyD", "ArrowRight"].includes(e.code)) bit = 0;
      else if (["KeyA", "KeyQ", "ArrowLeft"].includes(e.code)) bit = 1;
      else if (["KeyS", "ArrowDown"].includes(e.code)) bit = 2;
      else if (["KeyW", "KeyZ", "ArrowUp"].includes(e.code)) bit = 3;
      else if (["Digit0", "Numpad0", "Space"].includes(e.code)) bit = 4;
      else if (["Enter", "NumpadEnter"].includes(e.code)) bit = 5;
      else if (["Digit5", "Numpad5"].includes(e.code)) bit = 6; // B
      else if (["Digit6", "Numpad6"].includes(e.code)) bit = 7; // A
      else if (["Digit4", "Numpad4"].includes(e.code)) bit = 8; // Y
      else if (["Digit8", "Numpad8"].includes(e.code)) bit = 9; // X
      else if (["Digit7", "Numpad7"].includes(e.code)) bit = 10; // L
      else if (["Digit9", "Numpad9"].includes(e.code)) bit = 11; // R

      if (bit >= 0) {
        if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
          e.preventDefault();
        }
        this.setKeyBit(bit, isDown);
      }
    }

    startLoop() {
      const fb = window.Module._getSymbol(4);
      let topImg = new ImageData(new Uint8ClampedArray(window.Module.HEAPU8.buffer, fb, 256 * 192 * 4), 256, 192);
      let bottomImg = new ImageData(new Uint8ClampedArray(window.Module.HEAPU8.buffer, fb + 256 * 192 * 4, 256 * 192 * 4), 256, 192);

      const loop = () => {
        if (!this.isRunning) return;
        if (!this.isPaused) {
          let keyMask = 0;
          for (let i = 0; i < 14; i++) {
            if (this.keysState[i]) keyMask |= (1 << i);
          }

          window.Module._runFrame(1, keyMask, this.touched, this.touchX, this.touchY);
          this.feedAudio();

          // Vérifier si la mémoire WebAssembly s'est agrandie
          if (topImg.data.buffer.byteLength === 0) {
            const newFb = window.Module._getSymbol(4);
            topImg = new ImageData(new Uint8ClampedArray(window.Module.HEAPU8.buffer, newFb, 256 * 192 * 4), 256, 192);
            bottomImg = new ImageData(new Uint8ClampedArray(window.Module.HEAPU8.buffer, newFb + 256 * 192 * 4, 256 * 192 * 4), 256, 192);
          }

          this.topCtx.putImageData(topImg, 0, 0);
          this.bottomCtx.putImageData(bottomImg, 0, 0);
        }
        this.animId = requestAnimationFrame(loop);
      };

      this.animId = requestAnimationFrame(loop);
    }

    pause() {
      this.isPaused = true;
      if (this.audioContext && this.audioContext.state === "running") {
        this.audioContext.suspend();
      }
    }

    resume() {
      this.isPaused = false;
      if (this.audioContext && this.audioContext.state === "suspended") {
        this.audioContext.resume();
      }
    }

    restart() {
      if (window.Module && window.Module._reset) {
        window.Module._reset();
      }
    }

    saveState() {
      if (!window.Module || !window.Module._savGetSize) return null;
      const size = window.Module._savGetSize();
      if (size <= 0) return null;
      const ptr = window.Module._savGetPointer(0);
      return new Uint8Array(window.Module.HEAPU8.buffer, ptr, size).slice();
    }

    loadState(uint8Arr) {
      if (!window.Module || !window.Module._savGetPointer) return false;
      const ptr = window.Module._savGetPointer(uint8Arr.length);
      window.Module.HEAPU8.set(uint8Arr, ptr);
      window.Module._savUpdateChangeFlag();
      return true;
    }

    exit() {
      this.isRunning = false;
      this.isPaused = false;
      if (this.animId) {
        cancelAnimationFrame(this.animId);
        this.animId = null;
      }
      window.removeEventListener("keydown", this.boundKeyHandler);
      window.removeEventListener("keyup", this.boundKeyHandler);
      if (this.audioContext) {
        try { this.audioContext.close(); } catch (e) {}
        this.audioContext = null;
      }
      this.audioFifoHead = 0;
      this.audioFifoLen = 0;
      this.keysState.fill(0);
      this.touched = 0;
    }
  }

  return new DesmumePlayer();
});
