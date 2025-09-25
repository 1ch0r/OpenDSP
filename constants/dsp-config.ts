import { BlockType, BlockParameter } from '@/types/dsp';

export const COLORS = {
  primary: {
    mint: '#00D9B1',
    purple: '#8B5CF6',
    darkPurple: '#6D28D9',
  },
  background: {
    dark: '#0F0F1A',
    card: '#1A1A2E',
    cardLight: '#252540',
  },
  waveforms: ['#00FFE0', '#FF00FF', '#FFE500', '#00FF88', '#FF6B6B', '#00BFFF', '#FF8C00', '#9370DB'],
  text: {
    primary: '#FFFFFF',
    secondary: '#A0A0B8',
  },
};

export const BLOCK_TEMPLATES: Record<BlockType, Record<string, BlockParameter>> = {
  sine: {
    frequency: { name: 'Frequency', value: 440, min: 0.001, max: 10000000000, step: 0.001, unit: 'Hz' }, // Up to 10GHz
    amplitude: { name: 'Amplitude', value: 0.5, min: 0, max: 10000, step: 0.01 },
    phase: { name: 'Phase', value: 0, min: 0, max: 360, step: 1, unit: '°' },
    gain: { name: 'Gain', value: 0, min: -60, max: 20, step: 0.1, unit: 'dB' }, // dB gain
  },
  square: {
    frequency: { name: 'Frequency', value: 220, min: 0.001, max: 10000000000, step: 0.001, unit: 'Hz' }, // Up to 10GHz
    dutyCycle: { name: 'Duty Cycle', value: 0.5, min: 0.1, max: 0.9, step: 0.01 },
    gain: { name: 'Gain', value: -10, min: -60, max: 20, step: 0.1, unit: 'dB' }, // dB gain
  },
  sawtooth: {
    frequency: { name: 'Frequency', value: 330, min: 0.001, max: 10000000000, step: 0.001, unit: 'Hz' },
    amplitude: { name: 'Amplitude', value: 0.4, min: 0, max: 10000, step: 0.01 },
    phase: { name: 'Phase', value: 0, min: 0, max: 360, step: 1, unit: '°' },
    gain: { name: 'Gain', value: -2, min: -60, max: 20, step: 0.1, unit: 'dB' }, // dB gain
  },
  triangle: {
    frequency: { name: 'Frequency', value: 550, min: 0.001, max: 10000000000, step: 0.001, unit: 'Hz' },
    amplitude: { name: 'Amplitude', value: 0.6, min: 0, max: 10000, step: 0.01 },
    phase: { name: 'Phase', value: 0, min: 0, max: 360, step: 1, unit: '°' },
    gain: { name: 'Gain', value: -3, min: -60, max: 20, step: 0.1, unit: 'dB' }, // dB gain
  },
  pulse: {
    frequency: { name: 'Frequency', value: 1000, min: 0.001, max: 10000000000, step: 0.001, unit: 'Hz' },
    width: { name: 'Pulse Width', value: 0.1, min: 0.01, max: 0.5, step: 0.01 },
    amplitude: { name: 'Amplitude', value: 0.8, min: 0, max: 10000, step: 0.01 },
    gain: { name: 'Gain', value: -6, min: -60, max: 20, step: 0.1, unit: 'dB' }, // dB gain
  },
  chirp: {
    startFreq: { name: 'Start Freq', value: 100, min: 0.001, max: 10000000000, step: 0.001, unit: 'Hz' },
    endFreq: { name: 'End Freq', value: 2000, min: 0.001, max: 10000000000, step: 0.001, unit: 'Hz' },
    duration: { name: 'Sweep Time', value: 1.0, min: 0.1, max: 10, step: 0.1, unit: 's' },
    amplitude: { name: 'Amplitude', value: 0.5, min: 0, max: 10000, step: 0.01 },
    gain: { name: 'Gain', value: -4, min: -60, max: 20, step: 0.1, unit: 'dB' }, // dB gain
  },
  noise: {
    intensity: { name: 'Intensity', value: 0.2, min: 0, max: 10000, step: 0.01 },
    type: { name: 'Type', value: 0, min: 0, max: 1, step: 1 }, // 0: white, 1: pink
  },
  lowpass: {
    cutoff: { name: 'Cutoff', value: 1000, min: 0.001, max: 10000000000, step: 0.001, unit: 'Hz' }, // Up to 10GHz
    resonance: { name: 'Q', value: 1, min: 0.5, max: 10, step: 0.1 },
  },
  highpass: {
    cutoff: { name: 'Cutoff', value: 500, min: 0.001, max: 10000000000, step: 0.001, unit: 'Hz' }, // Up to 10GHz
    resonance: { name: 'Q', value: 1, min: 0.5, max: 10, step: 0.1 },
  },
  bandpass: {
    centerFreq: { name: 'Center Freq', value: 1000, min: 0.001, max: 10000000000, step: 0.001, unit: 'Hz' }, // Up to 10GHz
    bandwidth: { name: 'Bandwidth', value: 200, min: 0.001, max: 1000000000, step: 0.001, unit: 'Hz' }, // Up to 1GHz bandwidth
    resonance: { name: 'Q', value: 1, min: 0.5, max: 10, step: 0.1 },
  },
  notch: {
    centerFreq: { name: 'Center Freq', value: 1000, min: 0.001, max: 10000000000, step: 0.001, unit: 'Hz' }, // Up to 10GHz
    bandwidth: { name: 'Bandwidth', value: 100, min: 0.001, max: 1000000000, step: 0.001, unit: 'Hz' }, // Up to 1GHz bandwidth
    depth: { name: 'Depth', value: 0.9, min: 0.1, max: 1, step: 0.01 },
  },
  interpolate: {
    method: { name: 'Method', value: 0, min: 0, max: 2, step: 1 }, // 0: linear, 1: spline, 2: polynomial
    resolution: { name: 'Resolution', value: 2, min: 1, max: 8, step: 1 },
    smoothing: { name: 'Smoothing', value: 0.5, min: 0, max: 1, step: 0.01 },
  },
};

export const SAMPLE_RATE = 44100;
export const BUFFER_SIZE = 2048;
export const DISPLAY_SAMPLES = 512; // Increased for better resolution
export const WATERFALL_HEIGHT = 200;
export const FFT_SIZE = 256; // Increased for better frequency resolution
export const ANIMATION_FPS = 60; // Restored to 60fps for smoother animation
export const MAX_FREQUENCY = 10000000000; // 10GHz maximum frequency

export const DEFAULT_GLOBAL_SETTINGS = {
  sampleRate: 44100,
  duration: 2.0,
  resolution: 512,
  outputFormat: 'wav' as const,
  waterfallCenterFreq: 1000000, // Default 1MHz center
  waterfallBandwidth: 1000000, // Default 1MHz bandwidth
};

// Helper function to format frequency display
export function formatFrequency(freq: number): string {
  if (freq >= 1e9) {
    return `${(freq / 1e9).toFixed(2)} GHz`;
  } else if (freq >= 1e6) {
    return `${(freq / 1e6).toFixed(2)} MHz`;
  } else if (freq >= 1e3) {
    return `${(freq / 1e3).toFixed(2)} kHz`;
  } else {
    return `${freq.toFixed(2)} Hz`;
  }
}
