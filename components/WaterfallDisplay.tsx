import React, { useMemo, memo, useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import Svg, { Rect, Defs, LinearGradient, Stop, Text as SvgText, Path, Line } from 'react-native-svg';
import { COLORS, WATERFALL_HEIGHT, formatFrequency } from '@/constants/dsp-config';
import { WaterfallData } from '@/types/dsp';

interface WaterfallDisplayProps {
  waterfallData: WaterfallData[];
  history: WaterfallData[][];
  centerFreq: number;
  bandwidth: number;
  squelchLevel?: number; // dB squelch level
  isPlaying?: boolean;
}

// Optimized constants for better performance
const FREQUENCY_LABELS = 5;
const MARGIN = 60;
const SPECTRUM_HEIGHT = 100;
const LINE_HEIGHT = 60;
const NOISE_FLOOR = -120;
const MAX_WATERFALL_LINES = 200; // Limit waterfall lines for performance
const WATERFALL_LINE_HEIGHT = 2; // Height of each waterfall line
const UPDATE_THROTTLE = 50; // ms between updates

const WaterfallDisplay = memo(function WaterfallDisplay({ 
  waterfallData, 
  history, 
  centerFreq, 
  bandwidth, 
  squelchLevel = 0,
  isPlaying = false 
}: WaterfallDisplayProps) {
  const lineDataRef = useRef<number[]>([]);
  const animationRef = useRef<number | undefined>(undefined);
  const lastUpdateRef = useRef<number>(0);
  const [isInitialized, setIsInitialized] = useState(false);

  const waterfallLinesRef = useRef<{x: number, y: number, intensity: number, color: string, sourceId: string, timestamp: number}[]>([]);
  // Initialize component
  useEffect(() => {
    setIsInitialized(true);
    return () => {
      setIsInitialized(false);
      // Clear waterfall lines on unmount
      waterfallLinesRef.current = [];
      activeWaveformIds.current.clear();
    };
  }, []);
  
  // Clear waterfall when no data is available
  useEffect(() => {
    if (!waterfallData.length) {
      waterfallLinesRef.current = [];
      activeWaveformIds.current.clear();
    }
  }, [waterfallData.length]);

  // Track active waveform IDs to properly handle line removal
  const activeWaveformIds = useRef<Set<string>>(new Set());
  
  // Optimized waterfall line processing with proper source tracking
  const processWaterfallData = useCallback(() => {
    if (!waterfallData.length) {
      // Clear active waveforms when no data
      activeWaveformIds.current.clear();
      waterfallLinesRef.current = [];
      return;
    }
    
    const screenWidth = Dimensions.get('window').width;
    const minFreq = Math.max(0, centerFreq - bandwidth / 2);
    const maxFreq = centerFreq + bandwidth / 2;
    const freqRange = maxFreq - minFreq;
    
    if (freqRange <= 0) return;
    
    const currentTimestamp = Date.now();
    const newLines: {x: number, y: number, intensity: number, color: string, sourceId: string, timestamp: number}[] = [];
    const currentActiveIds = new Set<string>();
    
    waterfallData.forEach((data, waveformIndex) => {
      if (!data?.frequencies?.length || !data?.magnitudes?.length) return;
      
      const { frequencies, magnitudes } = data;
      const color = COLORS.waveforms[waveformIndex % COLORS.waveforms.length];
      const sourceId = `waveform-${waveformIndex}`;
      currentActiveIds.add(sourceId);
      
      // Optimized frequency sampling - create frequency bins like GQRX
      const binCount = 64; // Number of frequency bins
      const binWidth = freqRange / binCount;
      
      for (let binIndex = 0; binIndex < binCount; binIndex++) {
        const binStartFreq = minFreq + binIndex * binWidth;
        const binEndFreq = minFreq + (binIndex + 1) * binWidth;
        
        // Find all frequency samples within this bin
        let maxMagnitude = 0;
        let sampleCount = 0;
        
        for (let i = 0; i < frequencies.length; i++) {
          const freq = frequencies[i];
          if (freq >= binStartFreq && freq < binEndFreq) {
            const magnitude = magnitudes[i] || 0;
            maxMagnitude = Math.max(maxMagnitude, magnitude);
            sampleCount++;
          }
        }
        
        if (sampleCount > 0 && maxMagnitude > 0) {
          const x = (binIndex / binCount) * (screenWidth - MARGIN) + MARGIN/2;
          const scaledMag = maxMagnitude * 2; // Reduced scaling to lower background
          const dbValue = scaledMag > 0 ? 20 * Math.log10(Math.max(scaledMag, 0.001)) : NOISE_FLOOR;
          const intensity = Math.max(0, Math.min(1, (dbValue - NOISE_FLOOR) / 100)); // Increased dynamic range
          
          if (intensity > 0.01 && dbValue > squelchLevel) { // Lower threshold for better sensitivity
            newLines.push({ 
              x, 
              y: 0, 
              intensity, 
              color, 
              sourceId,
              timestamp: currentTimestamp
            });
          }
        }
      }
    });
    
    // Remove lines from inactive sources (sources that are no longer present)
    const inactiveIds = new Set([...activeWaveformIds.current].filter(id => !currentActiveIds.has(id)));
    if (inactiveIds.size > 0) {
      // Remove lines from inactive sources immediately
      waterfallLinesRef.current = waterfallLinesRef.current.filter(line => !inactiveIds.has(line.sourceId));
    }
    
    // Update active waveform tracking
    activeWaveformIds.current = currentActiveIds;
    
    // Always shift existing lines down (like GQRX waterfall behavior)
    waterfallLinesRef.current = waterfallLinesRef.current.map(line => ({
      ...line,
      y: line.y + WATERFALL_LINE_HEIGHT
    })).filter(line => line.y < WATERFALL_HEIGHT);
    
    // Add new lines at the top only if we have active sources
    if (newLines.length > 0) {
      waterfallLinesRef.current.unshift(...newLines);
    }
    
    // Limit total lines for performance
    if (waterfallLinesRef.current.length > MAX_WATERFALL_LINES) {
      waterfallLinesRef.current = waterfallLinesRef.current.slice(0, MAX_WATERFALL_LINES);
    }
  }, [waterfallData, centerFreq, bandwidth, squelchLevel]);

  // Optimized animation loop
  useEffect(() => {
    if (!isInitialized) return;
    
    if (isPlaying) {
      const updateData = (timestamp: number) => {
        // Throttle updates for better performance
        if (timestamp - lastUpdateRef.current < UPDATE_THROTTLE) {
          if (isPlaying) {
            animationRef.current = requestAnimationFrame(updateData);
          }
          return;
        }
        lastUpdateRef.current = timestamp;
        
        try {
          // Process new waterfall data
          processWaterfallData();
          
          // Update line spectrum data - combine all waveforms for FFT peaks
          if (waterfallData.length > 0) {
            // Create combined magnitude array from all waveforms
            const combinedMagnitudes = new Array(64).fill(0);
            
            waterfallData.forEach(data => {
              if (data?.magnitudes?.length) {
                data.magnitudes.slice(0, 64).forEach((mag, index) => {
                  const validMag = typeof mag === 'number' && !isNaN(mag) && isFinite(mag) && mag >= 0 ? mag : 0.001;
                  const scaledMag = validMag * 2; // Reduced scaling to lower background
                  const dbValue = scaledMag > 0 ? 20 * Math.log10(Math.max(scaledMag, 0.001)) : NOISE_FLOOR;
                  // Add magnitudes from all waveforms (energy combining)
                  combinedMagnitudes[index] += Math.max(dbValue, NOISE_FLOOR);
                });
              }
            });
            
            lineDataRef.current = combinedMagnitudes.map(db => db > squelchLevel ? db : NOISE_FLOOR);
          }
          

        } catch (error) {
          console.warn('Error updating waterfall:', error);
        }
        
        if (isPlaying) {
          animationRef.current = requestAnimationFrame(updateData);
        }
      };
      
      animationRef.current = requestAnimationFrame(updateData);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
      }
    };
  }, [isPlaying, isInitialized, processWaterfallData, waterfallData, squelchLevel]);

  const { frequencyLabels, spectrumPath, peakPath, lineSpectrumPath } = useMemo(() => {
    if (!isInitialized) {
      return { frequencyLabels: [], spectrumPath: '', peakPath: '', lineSpectrumPath: '' };
    }
    
    try {
      const screenWidth = Dimensions.get('window').width;
      const minFreq = Math.max(0, centerFreq - bandwidth / 2);
      const maxFreq = centerFreq + bandwidth / 2;
      const freqRange = maxFreq - minFreq;
      
      if (freqRange <= 0 || bandwidth <= 0 || !waterfallData?.length) {
        return { frequencyLabels: [], spectrumPath: '', peakPath: '', lineSpectrumPath: '' };
      }
    
    // Generate frequency labels with proper spacing to prevent cutoff
    const labels: { x: number; frequency: number; text: string }[] = [];
    for (let i = 0; i <= FREQUENCY_LABELS; i++) {
      const freq = minFreq + (i / FREQUENCY_LABELS) * freqRange;
      const x = MARGIN/2 + (i / FREQUENCY_LABELS) * (screenWidth - MARGIN);
      labels.push({
        x,
        frequency: freq,
        text: formatFrequency(freq)
      });
    }
    
    // Generate spectrum display (current frame) - combine all waveforms
    let spectrumPathData = '';
    let peakPathData = '';
    let lineSpectrumPathData = '';
    
    if (waterfallData.length > 0) {
      // Combine data from all waveforms for comprehensive spectrum display
      let combinedFrequencies: number[] = [];
      let combinedMagnitudes: number[] = [];
      
      if (waterfallData[0]?.frequencies?.length) {
        combinedFrequencies = [...waterfallData[0].frequencies];
        combinedMagnitudes = new Array(combinedFrequencies.length).fill(0);
        
        // Combine magnitudes from all waveforms
        waterfallData.forEach(data => {
          if (data?.magnitudes?.length) {
            data.magnitudes.forEach((mag, index) => {
              if (index < combinedMagnitudes.length) {
                const validMag = typeof mag === 'number' && !isNaN(mag) && isFinite(mag) && mag >= 0 ? mag : 0.001;
                const scaledMag = validMag * 3; // Reduced scaling to lower background
                const dbValue = scaledMag > 0 ? 20 * Math.log10(Math.max(scaledMag, 0.001)) : NOISE_FLOOR;
                // Add energy from all waveforms (only if above noise floor)
                if (dbValue > NOISE_FLOOR + 10) { // Only add signals significantly above noise floor
                  combinedMagnitudes[index] += Math.max(dbValue, NOISE_FLOOR);
                }
              }
            });
          }
        });
      }
      
      // Apply squelch - zero out signals below squelch level
      const squelchedMagnitudes = combinedMagnitudes.map(db => db > squelchLevel ? db : NOISE_FLOOR);
      
      // Normalize dB values to display height (0 to SPECTRUM_HEIGHT)
      const dbRange = 60; // 60dB dynamic range
      const normalizedMags = squelchedMagnitudes.map(db => {
        const normalized = (db - NOISE_FLOOR) / dbRange;
        return SPECTRUM_HEIGHT - (Math.max(0, Math.min(1, normalized)) * SPECTRUM_HEIGHT);
      });
      
      // Create spectrum path (waterfall overview) using combined data
      if (combinedFrequencies.length > 0) {
        spectrumPathData = `M ${MARGIN/2} ${SPECTRUM_HEIGHT}`;
        
        combinedFrequencies.forEach((freq, index) => {
          if (freq >= minFreq && freq <= maxFreq && index < normalizedMags.length) {
            const x = MARGIN/2 + ((freq - minFreq) / freqRange) * (screenWidth - MARGIN);
            const y = normalizedMags[index];
            spectrumPathData += ` L ${x} ${y}`;
          }
        });
        
        spectrumPathData += ` L ${screenWidth - MARGIN/2} ${SPECTRUM_HEIGHT} Z`;
        
        // Create peak hold path (simplified - just the top line)
        peakPathData = `M ${MARGIN/2} ${Math.min(...normalizedMags)}`;
        combinedFrequencies.forEach((freq, index) => {
          if (freq >= minFreq && freq <= maxFreq && index < normalizedMags.length) {
            const x = MARGIN/2 + ((freq - minFreq) / freqRange) * (screenWidth - MARGIN);
            const y = normalizedMags[index] - 5; // Peak hold slightly above
            peakPathData += ` L ${x} ${y}`;
          }
        });
      }
      
      // Create line spectrum path (real-time line display like GQRX) using combined data
      const lineStartY = SPECTRUM_HEIGHT + 20;
      const lineNormalizedMags = (lineDataRef.current.length > 0 ? lineDataRef.current : squelchedMagnitudes).map(db => {
        const normalized = (db - NOISE_FLOOR) / dbRange;
        return lineStartY + LINE_HEIGHT - (Math.max(0, Math.min(1, normalized)) * LINE_HEIGHT);
      });
      
      if (combinedFrequencies.length > 0 && lineNormalizedMags.length > 0) {
        lineSpectrumPathData = `M ${MARGIN/2} ${lineStartY + LINE_HEIGHT}`;
        
        combinedFrequencies.forEach((freq, index) => {
          if (freq >= minFreq && freq <= maxFreq && index < lineNormalizedMags.length) {
            const x = MARGIN/2 + ((freq - minFreq) / freqRange) * (screenWidth - MARGIN);
            const y = lineNormalizedMags[index];
            lineSpectrumPathData += ` L ${x} ${y}`;
          }
        });
        
        lineSpectrumPathData += ` L ${screenWidth - MARGIN/2} ${lineStartY + LINE_HEIGHT} Z`;
      }
    }
    
      return { 
        frequencyLabels: labels,
        spectrumPath: spectrumPathData,
        peakPath: peakPathData,
        lineSpectrumPath: lineSpectrumPathData
      };
    } catch (error) {
      console.warn('Error processing waterfall data:', error);
      return { frequencyLabels: [], spectrumPath: '', peakPath: '', lineSpectrumPath: '' };
    }
  }, [waterfallData, centerFreq, bandwidth, squelchLevel, isInitialized]);

  if (!isInitialized) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading waterfall display...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Svg width={Dimensions.get('window').width} height={SPECTRUM_HEIGHT + LINE_HEIGHT + WATERFALL_HEIGHT + 60} style={styles.svg}>
        <Defs>
          {COLORS.waveforms.map((color, index) => (
            <LinearGradient key={`waveform-gradient-${color}-${index}`} id={`waterfallGradient${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={color} stopOpacity="0" />
              <Stop offset="50%" stopColor={color} stopOpacity="0.6" />
              <Stop offset="100%" stopColor={color} stopOpacity="1" />
            </LinearGradient>
          ))}
          {/* Spectrum gradient */}
          <LinearGradient id="spectrumGradient" x1="0%" y1="100%" x2="0%" y2="0%">
            <Stop offset="0%" stopColor={COLORS.background.card} stopOpacity="0.3" />
            <Stop offset="50%" stopColor={COLORS.primary.mint} stopOpacity="0.6" />
            <Stop offset="100%" stopColor={COLORS.primary.mint} stopOpacity="0.9" />
          </LinearGradient>
        </Defs>
        
        {/* Spectrum background */}
        <Rect 
          x={MARGIN/2} 
          y="0" 
          width={Dimensions.get('window').width - MARGIN} 
          height={SPECTRUM_HEIGHT} 
          fill={COLORS.background.card}
        />
        
        {/* Line spectrum background */}
        <Rect 
          x={MARGIN/2} 
          y={SPECTRUM_HEIGHT + 20} 
          width={Dimensions.get('window').width - MARGIN} 
          height={LINE_HEIGHT} 
          fill={COLORS.background.card}
        />
        
        {/* Waterfall background */}
        <Rect 
          x={MARGIN/2} 
          y={SPECTRUM_HEIGHT + LINE_HEIGHT + 30} 
          width={Dimensions.get('window').width - MARGIN} 
          height={WATERFALL_HEIGHT} 
          fill={COLORS.background.dark}
        />
        
        {/* Spectrum display */}
        {spectrumPath && (
          <Path
            d={spectrumPath}
            fill={`url(#spectrumGradient)`}
            stroke={COLORS.primary.mint}
            strokeWidth="1"
          />
        )}
        
        {/* Peak hold line */}
        {peakPath && (
          <Path
            d={peakPath}
            fill="none"
            stroke={COLORS.primary.purple}
            strokeWidth="1"
            strokeOpacity="0.8"
          />
        )}
        
        {/* Line spectrum display */}
        {lineSpectrumPath && (
          <Path
            d={lineSpectrumPath}
            fill={COLORS.primary.mint + '40'}
            stroke={COLORS.primary.mint}
            strokeWidth="1"
          />
        )}
        
        {/* Squelch line indicator */}
        <Line
          x1={MARGIN/2}
          y1={SPECTRUM_HEIGHT + 20 + LINE_HEIGHT - ((squelchLevel - NOISE_FLOOR) / 60) * LINE_HEIGHT}
          x2={Dimensions.get('window').width - MARGIN/2}
          y2={SPECTRUM_HEIGHT + 20 + LINE_HEIGHT - ((squelchLevel - NOISE_FLOOR) / 60) * LINE_HEIGHT}
          stroke={COLORS.primary.purple}
          strokeWidth="1"
          strokeDasharray="5,5"
          strokeOpacity="0.8"
        />
        
        {/* Spectrum grid lines */}
        {[0, 20, 40, 60].map((db, index) => {
          const y = SPECTRUM_HEIGHT - (db / 60) * SPECTRUM_HEIGHT;
          return (
            <React.Fragment key={`spectrum-grid-${index}`}>
              <Rect
                x={MARGIN/2}
                y={y - 0.5}
                width={Dimensions.get('window').width - MARGIN}
                height="1"
                fill={COLORS.text.secondary}
                fillOpacity="0.3"
              />
              <SvgText
                x={MARGIN/2 - 5}
                y={y + 3}
                fontSize="8"
                fill={COLORS.text.secondary}
                textAnchor="end"
              >
                {`${-60 + db}dB`}
              </SvgText>
            </React.Fragment>
          );
        })}
        
        {/* Optimized flowing waterfall display - GQRX style */}
        {waterfallLinesRef.current.map((line, index) => {
          // Fade lines as they move down (older = more transparent)
          const ageFactor = Math.max(0.1, 1 - (line.y / WATERFALL_HEIGHT));
          const opacity = ageFactor * line.intensity * 0.9;
          
          return (
            <Rect
              key={`waterfall-${line.sourceId}-${line.timestamp}-${index}`}
              x={line.x - 1}
              y={SPECTRUM_HEIGHT + LINE_HEIGHT + 30 + line.y}
              width={3}
              height={WATERFALL_LINE_HEIGHT}
              fill={line.color}
              fillOpacity={opacity}
            />
          );
        })}
        

        
        {/* Frequency labels - centered and properly spaced */}
        {frequencyLabels.map((label, index) => {
          // Center all labels properly within the display area
          const centerX = MARGIN/2 + (index / FREQUENCY_LABELS) * (Dimensions.get('window').width - MARGIN);
          
          return (
            <SvgText
              key={`freq-label-${label.frequency}-${index}`}
              x={centerX}
              y={SPECTRUM_HEIGHT + LINE_HEIGHT + WATERFALL_HEIGHT + 50}
              fontSize="10"
              fill={COLORS.text.secondary}
              textAnchor="middle"
            >
              {formatFrequency(label.frequency).replace(/Hz$/, '')}
            </SvgText>
          );
        })}
        
        {/* Frequency grid lines */}
        {frequencyLabels.map((label, index) => (
          <React.Fragment key={`grid-${index}`}>
            {/* Spectrum grid line */}
            <Rect
              x={label.x - 0.5}
              y="0"
              width="1"
              height={SPECTRUM_HEIGHT}
              fill={COLORS.text.secondary}
              fillOpacity="0.3"
            />
            {/* Line spectrum grid line */}
            <Rect
              x={label.x - 0.5}
              y={SPECTRUM_HEIGHT + 20}
              width="1"
              height={LINE_HEIGHT}
              fill={COLORS.text.secondary}
              fillOpacity="0.3"
            />
            {/* Waterfall grid line */}
            <Rect
              x={label.x - 0.5}
              y={SPECTRUM_HEIGHT + LINE_HEIGHT + 30}
              width="1"
              height={WATERFALL_HEIGHT}
              fill={COLORS.text.secondary}
              fillOpacity="0.2"
            />
          </React.Fragment>
        ))}
      </Svg>
      

    </View>
  );
});

export default WaterfallDisplay;

const styles = StyleSheet.create({
  container: {
    height: SPECTRUM_HEIGHT + LINE_HEIGHT + WATERFALL_HEIGHT + 80, // Extra space for labels and spectrum
    backgroundColor: COLORS.background.dark,
    borderRadius: 0, // Square off rounded corners
    overflow: 'hidden',
    marginHorizontal: 16,
    marginVertical: 8,
    position: 'relative',
    alignSelf: 'center',
    width: '100%',
  },
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  loadingText: {
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
  },
});
