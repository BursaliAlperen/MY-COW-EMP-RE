// A simple audio manager to handle sound effects

class AudioManager {
    constructor() {
        this.audioContext = null;
        this.soundBuffers = {};
        this.initAudioContext();
    }

    // Initialize the AudioContext on user interaction
    initAudioContext() {
        if (this.audioContext) return;
        
        const init = () => {
            if (this.audioContext) return;
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.preloadSounds();
            } catch (e) {
                console.error("Web Audio API is not supported in this browser");
            }
            // Remove event listeners once initialized
            document.removeEventListener('click', init);
            document.removeEventListener('touchstart', init);
        };

        // Audio context can only be started by user gesture
        document.addEventListener('click', init);
        document.addEventListener('touchstart', init);
    }

    async loadSound(name, url) {
        if (!this.audioContext) {
            console.warn("AudioContext not ready, sound loading deferred.");
            return;
        }
        if (this.soundBuffers[name]) return this.soundBuffers[name];
        
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.soundBuffers[name] = audioBuffer;
            return audioBuffer;
        } catch (error) {
            console.error(`Error loading sound: ${name}`, error);
        }
    }
    
    preloadSounds() {
        this.loadSound('upgrade', 'upgrade.mp3');
        this.loadSound('moo', 'moo.mp3');
    }

    playSound(name) {
        if (!this.audioContext || !this.soundBuffers[name]) {
            // console.warn(`Sound not played: ${name}. AudioContext/buffer not ready.`);
            return;
        }

        const source = this.audioContext.createBufferSource();
        source.buffer = this.soundBuffers[name];
        source.connect(this.audioContext.destination);
        source.start(0);
    }
}

export const audioManager = new AudioManager();

