import { Block, SignalPoint, WaveformLine, WaterfallData } from '@/types/dsp';
import { SAMPLE_RATE, DISPLAY_SAMPLES, FFT_SIZE } from '@/constants/dsp-config';

class NoiseGenerator {
  private pinkNoiseb0 = 0;
  private pinkNoiseb1 = 0;
  private pinkNoiseb2 = 0;

  generateWhite(): number {
    return (Math.random() * 2 - 1) * 0.01; // Reduced noise amplitude
  }

  generatePink(): number {
    const white = this.generateWhite();
    this.pinkNoiseb0 = 0.99886 * this.pinkNoiseb0 + white * 0.0555179;
    this.pinkNoiseb1 = 0.99332 * this.pinkNoiseb1 + white * 0.0750759;
    this.pinkNoiseb2 = 0.96900 * this.pinkNoiseb2 + white * 0.1538520;
    return (this.pinkNoiseb0 + this.pinkNoiseb1 + this.pinkNoiseb2 + white * 0.5362) * 0.01; // Reduced noise amplitude
  }
}

const noiseGen = new NoiseGenerator();

// Realistic radio frequency aliasing with proper logarithmic falloff
function applyAliasing(frequency: number, sampleRate: number): { frequency: number; powerLoss: number } {
  const nyquist = sampleRate / 2;
  if (frequency <= nyquist) {
    return { frequency, powerLoss: 1.0 }; // No aliasing for frequencies below Nyquist
  }
  
  // Calculate aliased frequency using proper folding
  const foldedFreq = frequency % (2 * nyquist);
  const aliasedFreq = foldedFreq > nyquist ? (2 * nyquist - foldedFreq) : foldedFreq;
  
  // Calculate realistic power loss that mimics real radio aliasing behavior
  // In real radio systems, aliasing power falls off logarithmically from the transmitting band
  const aliasOrder = Math.floor(frequency / nyquist);
  
  // Realistic logarithmic power falloff: each octave above Nyquist reduces power by ~6dB
  // This mimics how real anti-aliasing filters and ADCs behave
  const octavesAboveNyquist = Math.log2(frequency / nyquist);
  const powerLossDb = -6 * octavesAboveNyquist; // -6dB per octave
  const powerLoss = Math.pow(10, powerLossDb / 20); // Convert dB to linear
  
  // Clamp to reasonable bounds (-80dB minimum, which is very realistic)
  const clampedPowerLoss = Math.max(0.0001, Math.min(1.0, powerLoss)); // -80dB to 0dB
  
  return { frequency: aliasedFreq, powerLoss: clampedPowerLoss };
}

export function processBlock(block: Block, input: number[], time: number): number[] {
  if (!block.enabled) return input;

  const output: number[] = new Array(input.length);

  switch (block.type) {
    case 'sine': {
      const originalFreq = block.parameters.frequency.value;
      // For realistic behavior, disable aliasing for most applications
      // Real radio systems use proper anti-aliasing filters
      const freq = originalFreq;
      const powerLoss = 1.0; // No artificial aliasing
      const amp = block.parameters.amplitude.value;
      const phase = (block.parameters.phase.value * Math.PI) / 180;
      const gainDb = block.parameters.gain.value;
      const gain = Math.pow(10, gainDb / 20); // Convert dB to linear gain

      for (let i = 0; i < input.length; i++) {
        const t = (time + i / SAMPLE_RATE);
        const sine = amp * Math.sin(2 * Math.PI * freq * t + phase) * gain * powerLoss;
        output[i] = input[i] + sine;
      }
      break;
    }

    case 'square': {
      const originalFreq = block.parameters.frequency.value;
      // For realistic behavior, disable aliasing for most applications
      // Real radio systems use proper anti-aliasing filters
      const freq = originalFreq;
      const powerLoss = 1.0; // No artificial aliasing
      const duty = block.parameters.dutyCycle.value;
      const gainDb = block.parameters.gain.value;
      const gain = Math.pow(10, gainDb / 20); // Convert dB to linear gain

      for (let i = 0; i < input.length; i++) {
        const t = (time + i / SAMPLE_RATE);
        const phase = (freq * t) % 1;
        const square = (phase < duty ? gain : -gain) * powerLoss;
        output[i] = input[i] + square;
      }
      break;
    }

    case 'sawtooth': {
      const originalFreq = block.parameters.frequency.value;
      const { frequency: freq, powerLoss } = applyAliasing(originalFreq, SAMPLE_RATE);
      const amp = block.parameters.amplitude.value;
      const phase = (block.parameters.phase.value * Math.PI) / 180;
      const gainDb = block.parameters.gain.value;
      const gain = Math.pow(10, gainDb / 20); // Convert dB to linear gain

      for (let i = 0; i < input.length; i++) {
        const t = (time + i / SAMPLE_RATE);
        const sawPhase = ((freq * t + phase / (2 * Math.PI)) % 1);
        const sawtooth = amp * (2 * sawPhase - 1) * gain * powerLoss;
        output[i] = input[i] + sawtooth;
      }
      break;
    }

    case 'triangle': {
      const originalFreq = block.parameters.frequency.value;
      const { frequency: freq, powerLoss } = applyAliasing(originalFreq, SAMPLE_RATE);
      const amp = block.parameters.amplitude.value;
      const phase = (block.parameters.phase.value * Math.PI) / 180;
      const gainDb = block.parameters.gain.value;
      const gain = Math.pow(10, gainDb / 20); // Convert dB to linear gain

      for (let i = 0; i < input.length; i++) {
        const t = (time + i / SAMPLE_RATE);
        const triPhase = ((freq * t + phase / (2 * Math.PI)) % 1);
        const triangle = amp * (triPhase < 0.5 ? 4 * triPhase - 1 : 3 - 4 * triPhase) * gain * powerLoss;
        output[i] = input[i] + triangle;
      }
      break;
    }

    case 'pulse': {
      const originalFreq = block.parameters.frequency.value;
      const { frequency: freq, powerLoss } = applyAliasing(originalFreq, SAMPLE_RATE);
      const width = block.parameters.width.value;
      const amp = block.parameters.amplitude.value;
      const gainDb = block.parameters.gain.value;
      const gain = Math.pow(10, gainDb / 20); // Convert dB to linear gain

      for (let i = 0; i < input.length; i++) {
        const t = (time + i / SAMPLE_RATE);
        const phase = (freq * t) % 1;
        const pulse = (phase < width ? amp * gain : 0) * powerLoss;
        output[i] = input[i] + pulse;
      }
      break;
    }

    case 'chirp': {
      const startFreq = block.parameters.startFreq.value;
      const endFreq = block.parameters.endFreq.value;
      const duration = block.parameters.duration.value;
      const amp = block.parameters.amplitude.value;
      const gainDb = block.parameters.gain.value;
      const gain = Math.pow(10, gainDb / 20); // Convert dB to linear gain

      for (let i = 0; i < input.length; i++) {
        const t = (time + i / SAMPLE_RATE);
        const sweepProgress = (t % duration) / duration;
        const currentFreq = startFreq + (endFreq - startFreq) * sweepProgress;
        const { frequency: aliasedFreq, powerLoss } = applyAliasing(currentFreq, SAMPLE_RATE);
        const chirp = amp * Math.sin(2 * Math.PI * aliasedFreq * t) * gain * powerLoss;
        output[i] = input[i] + chirp;
      }
      break;
    }

    case 'noise': {
      const intensity = block.parameters.intensity.value;
      const noiseType = block.parameters.type.value;

      for (let i = 0; i < input.length; i++) {
        const noise = noiseType === 0 
          ? noiseGen.generateWhite() 
          : noiseGen.generatePink();
        output[i] = input[i] + noise * intensity;
      }
      break;
    }

    case 'lowpass': {
      const originalCutoff = block.parameters.cutoff.value;
      const cutoff = Math.min(originalCutoff, SAMPLE_RATE / 2.1); // Prevent instability
      const q = block.parameters.resonance.value;
      const omega = (2 * Math.PI * cutoff) / SAMPLE_RATE;
      const sin = Math.sin(omega);
      const cos = Math.cos(omega);
      const alpha = sin / (2 * q);

      const b0 = (1 - cos) / 2;
      const b1 = 1 - cos;
      const b2 = (1 - cos) / 2;
      const a0 = 1 + alpha;
      const a1 = -2 * cos;
      const a2 = 1 - alpha;

      let x1 = 0, x2 = 0, y1 = 0, y2 = 0;

      for (let i = 0; i < input.length; i++) {
        const x0 = input[i];
        const y0 = (b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
        
        x2 = x1;
        x1 = x0;
        y2 = y1;
        y1 = y0;
        
        output[i] = y0;
      }
      break;
    }

    case 'highpass': {
      const originalCutoff = block.parameters.cutoff.value;
      const cutoff = Math.min(originalCutoff, SAMPLE_RATE / 2.1); // Prevent instability
      const q = block.parameters.resonance.value;
      const omega = (2 * Math.PI * cutoff) / SAMPLE_RATE;
      const sin = Math.sin(omega);
      const cos = Math.cos(omega);
      const alpha = sin / (2 * q);

      const b0 = (1 + cos) / 2;
      const b1 = -(1 + cos);
      const b2 = (1 + cos) / 2;
      const a0 = 1 + alpha;
      const a1 = -2 * cos;
      const a2 = 1 - alpha;

      let x1 = 0, x2 = 0, y1 = 0, y2 = 0;

      for (let i = 0; i < input.length; i++) {
        const x0 = input[i];
        const y0 = (b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
        
        x2 = x1;
        x1 = x0;
        y2 = y1;
        y1 = y0;
        
        output[i] = y0;
      }
      break;
    }

    case 'bandpass': {
      const originalCenterFreq = block.parameters.centerFreq.value;
      const centerFreq = Math.min(originalCenterFreq, SAMPLE_RATE / 2.1); // Prevent instability
      const bandwidth = block.parameters.bandwidth.value;
      // const q = block.parameters.resonance.value; // Not used in this filter implementation
      const omega = (2 * Math.PI * centerFreq) / SAMPLE_RATE;
      const sin = Math.sin(omega);
      const cos = Math.cos(omega);
      const alpha = sin * Math.sinh((Math.log(2) / 2) * bandwidth * omega / sin);

      const b0 = alpha;
      const b1 = 0;
      const b2 = -alpha;
      const a0 = 1 + alpha;
      const a1 = -2 * cos;
      const a2 = 1 - alpha;

      let x1 = 0, x2 = 0, y1 = 0, y2 = 0;

      for (let i = 0; i < input.length; i++) {
        const x0 = input[i];
        const y0 = (b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
        
        x2 = x1;
        x1 = x0;
        y2 = y1;
        y1 = y0;
        
        output[i] = y0;
      }
      break;
    }

    case 'notch': {
      const originalCenterFreq = block.parameters.centerFreq.value;
      const centerFreq = Math.min(originalCenterFreq, SAMPLE_RATE / 2.1); // Prevent instability
      const bandwidth = block.parameters.bandwidth.value;
      const depth = block.parameters.depth.value;
      const omega = (2 * Math.PI * centerFreq) / SAMPLE_RATE;
      const sin = Math.sin(omega);
      const cos = Math.cos(omega);
      const alpha = sin * Math.sinh((Math.log(2) / 2) * bandwidth * omega / sin);

      const b0 = 1;
      const b1 = -2 * cos;
      const b2 = 1;
      const a0 = 1 + alpha * depth;
      const a1 = -2 * cos;
      const a2 = 1 - alpha * depth;

      let x1 = 0, x2 = 0, y1 = 0, y2 = 0;

      for (let i = 0; i < input.length; i++) {
        const x0 = input[i];
        const y0 = (b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
        
        x2 = x1;
        x1 = x0;
        y2 = y1;
        y1 = y0;
        
        output[i] = y0;
      }
      break;
    }

    case 'interpolate': {
      const method = Math.round(block.parameters.method.value);
      const resolution = Math.round(block.parameters.resolution.value);
      const smoothing = block.parameters.smoothing.value;

      if (method === 0) {
        // Linear interpolation
        for (let i = 0; i < input.length; i++) {
          const scaledIndex = (i * resolution) / input.length;
          const baseIndex = Math.floor(scaledIndex);
          const fraction = scaledIndex - baseIndex;
          
          if (baseIndex + 1 < input.length) {
            output[i] = input[baseIndex] * (1 - fraction) + input[baseIndex + 1] * fraction;
          } else {
            output[i] = input[baseIndex] || 0;
          }
        }
      } else if (method === 1) {
        // Spline interpolation (simplified)
        for (let i = 0; i < input.length; i++) {
          const t = i / (input.length - 1);
          const smoothedT = t * smoothing + (1 - smoothing) * Math.sin(t * Math.PI) / Math.PI;
          const index = Math.floor(smoothedT * (input.length - 1));
          output[i] = input[Math.min(index, input.length - 1)] || 0;
        }
      } else {
        // Polynomial interpolation (simplified)
        for (let i = 0; i < input.length; i++) {
          const t = i / (input.length - 1);
          const polyT = Math.pow(t, 1 + smoothing);
          const index = Math.floor(polyT * (input.length - 1));
          output[i] = input[Math.min(index, input.length - 1)] || 0;
        }
      }
      break;
    }

    default:
      return input;
  }

  return output;
}

// Cache for processed waveforms to avoid recalculation
const waveformCache = new Map<string, { time: number; points: SignalPoint[] }>();

export function processWaveformLine(line: WaveformLine, time: number): SignalPoint[] {
  if (line.muted) {
    return Array(DISPLAY_SAMPLES).fill(null).map((_, i) => ({ 
      x: i / DISPLAY_SAMPLES, 
      y: 0.5 
    }));
  }

  // Create cache key based on line configuration and time (rounded for stability)
  const roundedTime = Math.floor(time * 20) / 20; // Round to 0.05s precision for smoother updates
  const cacheKey = `${line.id}-${JSON.stringify(line.blocks.map(b => ({ type: b.type, params: b.parameters, enabled: b.enabled })))}-${roundedTime}`;
  
  // Check cache first
  const cached = waveformCache.get(cacheKey);
  if (cached && Math.abs(cached.time - time) < 0.025) { // 25ms tolerance for smoother updates
    return cached.points;
  }

  let signal = new Array(DISPLAY_SAMPLES).fill(0);

  for (const block of line.blocks) {
    signal = processBlock(block, signal, time);
  }

  // Normalize and convert to display points with better amplitude handling
  const points: SignalPoint[] = [];
  let maxAmp = 0.001;
  
  // Find max amplitude more efficiently
  for (let i = 0; i < signal.length; i++) {
    const abs = Math.abs(signal[i]);
    if (abs > maxAmp) maxAmp = abs;
  }

  // Generate points with proper amplitude scaling that shows parameter changes clearly
  // Use adaptive scaling based on actual signal amplitude, handling higher amplitude values
  const adaptiveScale = maxAmp > 0.001 ? Math.min(0.4, 0.4 / Math.min(maxAmp, 100)) : 0.4; // Cap at 100 for display scaling
  for (let i = 0; i < signal.length; i++) {
    points.push({
      x: i / DISPLAY_SAMPLES,
      y: 0.5 - (signal[i] * adaptiveScale),
    });
  }

  // Cache the result (limit cache size)
  if (waveformCache.size > 100) { // Increased cache size for better performance
    const firstKey = waveformCache.keys().next().value;
    if (firstKey) {
      waveformCache.delete(firstKey);
    }
  }
  waveformCache.set(cacheKey, { time, points });

  return points;
}

// Optimized FFT implementation with reduced precision for better performance
function fft(signal: number[]): { real: number[]; imag: number[] } {
  const N = signal.length;
  const real = new Float32Array(signal); // Use typed arrays for better performance
  const imag = new Float32Array(N);

  // Bit-reversal permutation (optimized)
  let j = 0;
  for (let i = 1; i < N; i++) {
    let bit = N >> 1;
    while (j & bit) {
      j ^= bit;
      bit >>= 1;
    }
    j ^= bit;
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
    }
  }

  // Cooley-Tukey FFT (optimized with precomputed twiddle factors)
  for (let len = 2; len <= N; len <<= 1) {
    const wlen = -2 * Math.PI / len;
    const wlen_real = Math.cos(wlen);
    const wlen_imag = Math.sin(wlen);
    
    for (let i = 0; i < N; i += len) {
      let w_real = 1;
      let w_imag = 0;
      
      for (let j = 0; j < len / 2; j++) {
        const u_real = real[i + j];
        const u_imag = imag[i + j];
        const v_real = real[i + j + len / 2] * w_real - imag[i + j + len / 2] * w_imag;
        const v_imag = real[i + j + len / 2] * w_imag + imag[i + j + len / 2] * w_real;
        
        real[i + j] = u_real + v_real;
        imag[i + j] = u_imag + v_imag;
        real[i + j + len / 2] = u_real - v_real;
        imag[i + j + len / 2] = u_imag - v_imag;
        
        const next_w_real = w_real * wlen_real - w_imag * wlen_imag;
        const next_w_imag = w_real * wlen_imag + w_imag * wlen_real;
        w_real = next_w_real;
        w_imag = next_w_imag;
      }
    }
  }

  return { real: Array.from(real), imag: Array.from(imag) };
}

// Cache for FFT computations
const fftCache = new Map<string, WaterfallData>();

// Generate frequency bins that match actual signal frequencies
function generateFrequencyBins(centerFreq: number, bandwidth: number, numBins: number): number[] {
  const minFreq = Math.max(0, centerFreq - bandwidth / 2);
  const maxFreq = centerFreq + bandwidth / 2;
  const freqStep = (maxFreq - minFreq) / numBins;
  
  const frequencies: number[] = [];
  for (let i = 0; i < numBins; i++) {
    frequencies.push(minFreq + i * freqStep);
  }
  
  return frequencies;
}

export function generateWaterfallData(
  waveforms: { points: SignalPoint[]; color: string; visible: boolean; muted: boolean; blocks?: Block[] }[], 
  time: number,
  centerFreq: number = 1000000, // 1MHz default
  bandwidth: number = 2000000 // 2MHz default
): WaterfallData[] {
  try {
    if (!waveforms || waveforms.length === 0) {
      return [];
    }
    
    // Validate waveforms input
    if (!Array.isArray(waveforms) || waveforms.length > 100) {
      return [];
    }
    
    // Validate parameters
    if (typeof centerFreq !== 'number' || typeof bandwidth !== 'number' || 
        centerFreq <= 0 || bandwidth <= 0 || !isFinite(centerFreq) || !isFinite(bandwidth)) {
      console.warn('Invalid frequency parameters:', { centerFreq, bandwidth });
      return [];
    }
  
  // Additional validation for waveforms array
  const validatedWaveforms = waveforms.filter(w => 
    w && typeof w === 'object' && 
    Array.isArray(w.points) && 
    w.points.length <= 10000 && // Limit points array size
    w.visible && !w.muted
  );
  
  return validatedWaveforms
    .map((waveform, index) => {
      // Create cache key for this waveform state
      const pointsHash = waveform.points.slice(0, 10).map(p => Math.round(p.y * 100)).join(',');
      const cacheKey = `${index}-${pointsHash}-${Math.floor(time * 10)}`; // 100ms precision for smoother updates
      
      // Check cache
      const cached = fftCache.get(cacheKey);
      if (cached) {
        return { ...cached, time };
      }
      
      // Generate frequency spectrum based on actual waveform blocks
      const minFreq = Math.max(0, centerFreq - bandwidth / 2);
      const maxFreq = centerFreq + bandwidth / 2;
      const numBins = FFT_SIZE / 2;
      const freqStep = bandwidth / numBins;
      
      const frequencies: number[] = [];
      const magnitudes: number[] = [];
      
      // Generate frequency bins
      for (let i = 0; i < numBins; i++) {
        const freq = minFreq + i * freqStep;
        frequencies.push(freq);
        
        // Calculate magnitude based on actual signal frequencies from blocks
        let magnitude = 0;
        
        // Check if this waveform has blocks with frequency information
        if (waveform.blocks) {
          for (const block of waveform.blocks) {
            if (!block.enabled) continue;
            
            let blockFreq = 0;
            let blockAmp = 0;
            
            // Extract frequency and amplitude from different block types with proper scaling
            if (block.type === 'sine' || block.type === 'square' || block.type === 'sawtooth' || block.type === 'triangle') {
              blockFreq = block.parameters.frequency?.value || 0;
              const gainDb = block.parameters.gain?.value || 0;
              const gain = Math.pow(10, gainDb / 20); // Convert dB to linear gain
              const baseAmp = block.parameters.amplitude?.value || 0.5;
              // Scale amplitude to better match actual wave output power
              blockAmp = baseAmp * gain * 5; // Increased scaling for better signal visibility
            } else if (block.type === 'pulse') {
              blockFreq = block.parameters.frequency?.value || 0;
              const gainDb = block.parameters.gain?.value || -6;
              const gain = Math.pow(10, gainDb / 20); // Convert dB to linear gain
              const baseAmp = block.parameters.amplitude?.value || 0.8;
              blockAmp = baseAmp * gain * 5; // Increased scaling for better signal visibility
            } else if (block.type === 'chirp') {
              // For chirp, use the center frequency
              const startFreq = block.parameters.startFreq?.value || 100;
              const endFreq = block.parameters.endFreq?.value || 2000;
              blockFreq = (startFreq + endFreq) / 2;
              const gainDb = block.parameters.gain?.value || -4;
              const gain = Math.pow(10, gainDb / 20); // Convert dB to linear gain
              const baseAmp = block.parameters.amplitude?.value || 0.5;
              blockAmp = baseAmp * gain * 5; // Increased scaling for better signal visibility
            } else if (block.type === 'bandpass' || block.type === 'notch') {
              blockFreq = block.parameters.centerFreq?.value || 0;
              blockAmp = 1.5; // Increased amplitude for filters
            } else if (block.type === 'lowpass' || block.type === 'highpass') {
              blockFreq = block.parameters.cutoff?.value || 0;
              blockAmp = 1.0; // Increased amplitude for filters
            } else if (block.type === 'noise') {
              // Noise contributes across all frequencies
              const intensity = block.parameters.intensity?.value || 0.2;
              blockAmp = intensity * 0.05; // Reduced noise contribution
            }
            
            // Check if block frequency is within the current bin range
            if (blockFreq > 0 && blockFreq >= freq - freqStep/2 && blockFreq < freq + freqStep/2) {
              // Apply realistic frequency response - closer frequencies have higher magnitude
              const freqDiff = Math.abs(freq - blockFreq);
              const response = Math.exp(-freqDiff / (freqStep * 0.5)); // Gaussian response
              magnitude += blockAmp * response * 10; // Increased scaling for better signal visibility
            }
            
            // Add noise contribution across all frequencies (reduced)
            if (block.type === 'noise') {
              magnitude += blockAmp * 0.1; // Significantly reduced noise contribution
            }
          }
        }
        
        // Add minimal baseline from the time-domain signal for fallback
        if (magnitude === 0 && waveform.points.length > 0) {
          // Simple spectral estimation from time domain (reduced)
          const binIndex = Math.floor((i / numBins) * waveform.points.length);
          if (binIndex < waveform.points.length) {
            const sample = (waveform.points[binIndex].y - 0.5) * 2;
            magnitude = Math.abs(sample) * 0.01; // Significantly reduced baseline
          }
        }
        
        magnitudes.push(magnitude);
      }
      
      const result: WaterfallData = {
        frequencies,
        magnitudes,
        time,
      };
      
      // Cache result (limit cache size)
      if (fftCache.size > 50) { // Increased cache size
        const firstKey = fftCache.keys().next().value;
        if (firstKey) {
          fftCache.delete(firstKey);
        }
      }
      fftCache.set(cacheKey, result);
      
      return result;
    })
    .filter(result => result && Array.isArray(result.frequencies) && Array.isArray(result.magnitudes));
  } catch (error) {
    console.warn('Error in generateWaterfallData:', error);
    return [];
  }
}

// Audio buffer generation for playback - improved to use actual signal processing
export function generateAudioBuffer(waveforms: { points: SignalPoint[]; color: string; visible: boolean; muted: boolean; blocks?: Block[] }[], duration: number = 2.0): Float32Array {
  const sampleCount = Math.floor(SAMPLE_RATE * duration);
  const buffer = new Float32Array(sampleCount);
  
  const activeWaveforms = waveforms.filter(w => w.visible && !w.muted);
  if (activeWaveforms.length === 0) return buffer;
  
  // Generate time-domain signal using actual block processing for better audio quality
  for (let i = 0; i < sampleCount; i++) {
    let sample = 0;
    const t = i / SAMPLE_RATE;
    
    for (const waveform of activeWaveforms) {
      // If waveform has blocks, generate audio from blocks for better quality
      if (waveform.blocks && waveform.blocks.length > 0) {
        let waveformSample = 0;
        
        for (const block of waveform.blocks) {
          if (!block.enabled) continue;
          
          // Generate audio sample based on block type
          switch (block.type) {
            case 'sine': {
              const freq = block.parameters.frequency?.value || 440;
              const amp = block.parameters.amplitude?.value || 0.5;
              const gainDb = block.parameters.gain?.value || 0;
              const gain = Math.pow(10, gainDb / 20); // Convert dB to linear gain
              const phase = ((block.parameters.phase?.value || 0) * Math.PI) / 180;
              
              // Apply aliasing for frequencies above Nyquist
              const { frequency: aliasedFreq, powerLoss } = applyAliasing(freq, SAMPLE_RATE);
              waveformSample += amp * Math.sin(2 * Math.PI * aliasedFreq * t + phase) * gain * powerLoss;
              break;
            }
            case 'square': {
              const freq = block.parameters.frequency?.value || 220;
              const duty = block.parameters.dutyCycle?.value || 0.5;
              const gainDb = block.parameters.gain?.value || -10;
              const gain = Math.pow(10, gainDb / 20); // Convert dB to linear gain
              
              // Apply aliasing for frequencies above Nyquist
              const { frequency: aliasedFreq, powerLoss } = applyAliasing(freq, SAMPLE_RATE);
              const phase = (aliasedFreq * t) % 1;
              waveformSample += (phase < duty ? gain : -gain) * powerLoss;
              break;
            }
            case 'sawtooth': {
              const freq = block.parameters.frequency?.value || 330;
              const amp = block.parameters.amplitude?.value || 0.4;
              const phase = ((block.parameters.phase?.value || 0) * Math.PI) / 180;
              const gainDb = block.parameters.gain?.value || -2;
              const gain = Math.pow(10, gainDb / 20); // Convert dB to linear gain
              
              const { frequency: aliasedFreq, powerLoss } = applyAliasing(freq, SAMPLE_RATE);
              const sawPhase = ((aliasedFreq * t + phase / (2 * Math.PI)) % 1);
              waveformSample += amp * (2 * sawPhase - 1) * gain * powerLoss;
              break;
            }
            case 'triangle': {
              const freq = block.parameters.frequency?.value || 550;
              const amp = block.parameters.amplitude?.value || 0.6;
              const phase = ((block.parameters.phase?.value || 0) * Math.PI) / 180;
              const gainDb = block.parameters.gain?.value || -3;
              const gain = Math.pow(10, gainDb / 20); // Convert dB to linear gain
              
              const { frequency: aliasedFreq, powerLoss } = applyAliasing(freq, SAMPLE_RATE);
              const triPhase = ((aliasedFreq * t + phase / (2 * Math.PI)) % 1);
              const triangle = triPhase < 0.5 ? 4 * triPhase - 1 : 3 - 4 * triPhase;
              waveformSample += amp * triangle * gain * powerLoss;
              break;
            }
            case 'pulse': {
              const freq = block.parameters.frequency?.value || 1000;
              const width = block.parameters.width?.value || 0.1;
              const amp = block.parameters.amplitude?.value || 0.8;
              const gainDb = block.parameters.gain?.value || -6;
              const gain = Math.pow(10, gainDb / 20); // Convert dB to linear gain
              
              const { frequency: aliasedFreq, powerLoss } = applyAliasing(freq, SAMPLE_RATE);
              const phase = (aliasedFreq * t) % 1;
              waveformSample += (phase < width ? amp * gain : 0) * powerLoss;
              break;
            }
            case 'chirp': {
              const startFreq = block.parameters.startFreq?.value || 100;
              const endFreq = block.parameters.endFreq?.value || 2000;
              const duration = block.parameters.duration?.value || 1.0;
              const amp = block.parameters.amplitude?.value || 0.5;
              const gainDb = block.parameters.gain?.value || -4;
              const gain = Math.pow(10, gainDb / 20); // Convert dB to linear gain
              
              const sweepProgress = (t % duration) / duration;
              const currentFreq = startFreq + (endFreq - startFreq) * sweepProgress;
              const { frequency: aliasedFreq, powerLoss } = applyAliasing(currentFreq, SAMPLE_RATE);
              waveformSample += amp * Math.sin(2 * Math.PI * aliasedFreq * t) * gain * powerLoss;
              break;
            }
            case 'noise': {
              const intensity = block.parameters.intensity?.value || 0.2;
              const noiseType = block.parameters.type?.value || 0;
              
              const noise = noiseType === 0 
                ? noiseGen.generateWhite() 
                : noiseGen.generatePink();
              waveformSample += noise * intensity;
              break;
            }
          }
        }
        
        sample += waveformSample;
      } else {
        // Fallback to interpolation from display points
        const pointIndex = (i / sampleCount) * waveform.points.length;
        const baseIndex = Math.floor(pointIndex);
        const fraction = pointIndex - baseIndex;
        
        if (baseIndex < waveform.points.length - 1) {
          const y1 = (waveform.points[baseIndex].y - 0.5) * 2;
          const y2 = (waveform.points[baseIndex + 1].y - 0.5) * 2;
          sample += y1 * (1 - fraction) + y2 * fraction;
        } else if (baseIndex < waveform.points.length) {
          sample += (waveform.points[baseIndex].y - 0.5) * 2;
        }
      }
    }
    
    // Normalize by number of active waveforms and apply soft limiting
    sample /= Math.max(1, activeWaveforms.length);
    buffer[i] = Math.tanh(sample * 0.8); // Soft limiting
  }
  
  return buffer;
}
