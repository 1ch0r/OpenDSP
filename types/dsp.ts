export type BlockType = 'sine' | 'square' | 'sawtooth' | 'triangle' | 'pulse' | 'chirp' | 'noise' | 'lowpass' | 'highpass' | 'bandpass' | 'notch' | 'interpolate';

export interface BlockParameter {
  name: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
}

export interface Block {
  id: string;
  type: BlockType;
  parameters: Record<string, BlockParameter>;
  enabled: boolean;
}

export interface WaveformLine {
  id: string;
  name: string;
  blocks: Block[];
  color: string;
  muted: boolean;
  visible: boolean;
}

export interface SignalPoint {
  x: number;
  y: number;
}

export interface WaterfallData {
  frequencies: number[];
  magnitudes: number[];
  time: number;
}

export interface AudioSettings {
  sampleRate: number;
  duration: number;
  resolution: number;
  volume: number;
  isPlaying: boolean;
}

export interface GlobalSettings {
  sampleRate: number;
  duration: number;
  resolution: number;
  outputFormat: 'wav' | 'json';
  waterfallCenterFreq: number;
  waterfallBandwidth: number;
}
