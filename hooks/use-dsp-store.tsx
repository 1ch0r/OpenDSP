import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WaveformLine, Block, BlockType, GlobalSettings, WaterfallData } from '@/types/dsp';
import { COLORS, BLOCK_TEMPLATES, DEFAULT_GLOBAL_SETTINGS, ANIMATION_FPS } from '@/constants/dsp-config';
import { processWaveformLine, generateWaterfallData, generateAudioBuffer } from '@/utils/dsp-processing';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const STORAGE_KEY = 'dsp-waveforms';

export const [DSPProvider, useDSP] = createContextHook(() => {
  const [waveformLines, setWaveformLines] = useState<WaveformLine[]>([]);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>(DEFAULT_GLOBAL_SETTINGS);
  const [volume, setVolume] = useState(0.7);
  const [waterfallHistory, setWaterfallHistory] = useState<WaterfallData[][]>([]);
  const animationRef = useRef<number | undefined>(undefined);

  // Load saved waveforms
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((data) => {
      if (data) {
        try {
          // Validate that data is actually JSON before parsing
          if (typeof data !== 'string' || data.trim().length === 0) {
            throw new Error('Invalid data format');
          }
          
          // Check if data starts with valid JSON characters
          const trimmedData = data.trim();
          if (!trimmedData.startsWith('[') && !trimmedData.startsWith('{')) {
            throw new Error('Data does not appear to be JSON');
          }
          
          const parsed = JSON.parse(data);
          
          // Validate parsed data structure
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Validate each waveform line has required properties
            const validWaveforms = parsed.filter(line => 
              line && 
              typeof line.id === 'string' && 
              typeof line.name === 'string' && 
              Array.isArray(line.blocks) &&
              typeof line.color === 'string'
            );
            
            if (validWaveforms.length > 0) {
              setWaveformLines(validWaveforms);
              setSelectedLineId(validWaveforms[0].id);
            } else {
              throw new Error('No valid waveforms found');
            }
          } else {
            // Start completely fresh with no waveforms
            setWaveformLines([]);
            setSelectedLineId(null);
          }
        } catch (e) {
          console.error('Failed to load waveforms:', e);
          console.log('Corrupted data:', data?.substring(0, 100) + '...');
          
          // Clear corrupted data
          AsyncStorage.removeItem(STORAGE_KEY).catch(clearError => {
            console.error('Failed to clear corrupted storage:', clearError);
          });
          
          // Start completely fresh with no waveforms
          setWaveformLines([]);
          setSelectedLineId(null);
        }
      } else {
        // Start completely fresh with no waveforms
        setWaveformLines([]);
        setSelectedLineId(null);
      }
    }).catch((error) => {
      console.error('AsyncStorage error:', error);
      // Start completely fresh with no waveforms
      setWaveformLines([]);
      setSelectedLineId(null);
    });
  }, []);

  const initializeDefaultLines = () => {
    // Start completely blank
    setWaveformLines([]);
    setSelectedLineId(null);
  };

  // Save waveforms when they change
  useEffect(() => {
    if (waveformLines.length > 0) {
      try {
        const dataToSave = JSON.stringify(waveformLines);
        AsyncStorage.setItem(STORAGE_KEY, dataToSave).catch((error) => {
          console.error('Failed to save waveforms:', error);
        });
      } catch (error) {
        console.error('Failed to serialize waveforms:', error);
      }
    }
  }, [waveformLines]);

  // Optimized animation loop with better performance
  useEffect(() => {
    if (isPlaying) {
      const frameTime = 1000 / ANIMATION_FPS;
      let lastTime = performance.now();
      
      const animate = (currentTime: number) => {
        const deltaTime = currentTime - lastTime;
        if (deltaTime >= frameTime) {
          setCurrentTime((prev) => prev + (deltaTime / 1000 * playbackSpeed));
          lastTime = currentTime;
        }
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, playbackSpeed]);

  const addWaveformLine = useCallback(() => {
    if (waveformLines.length >= 5) return;

    const newLine: WaveformLine = {
      id: Date.now().toString(),
      name: `Line ${waveformLines.length + 1}`,
      blocks: [],
      color: COLORS.waveforms[waveformLines.length % COLORS.waveforms.length],
      muted: false,
      visible: true,
    };

    setWaveformLines((prev) => [...prev, newLine]);
    setSelectedLineId(newLine.id);

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [waveformLines]);

  const removeWaveformLine = useCallback((lineId: string) => {
    setWaveformLines((prev) => {
      const filtered = prev.filter((line) => line.id !== lineId);
      if (selectedLineId === lineId) {
        if (filtered.length > 0) {
          setSelectedLineId(filtered[0].id);
        } else {
          setSelectedLineId(null);
        }
      }
      return filtered;
    });
    
    // Clear waterfall history when removing waveforms to prevent stale data
    setWaterfallHistory([]);

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [selectedLineId]);

  const addBlock = useCallback((lineId: string, blockType: BlockType) => {
    const newBlock: Block = {
      id: Date.now().toString(),
      type: blockType,
      parameters: JSON.parse(JSON.stringify(BLOCK_TEMPLATES[blockType])), // Deep clone
      enabled: true,
    };

    setWaveformLines((prev) =>
      prev.map((line) =>
        line.id === lineId
          ? { ...line, blocks: [...line.blocks, newBlock] }
          : line
      )
    );

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const removeBlock = useCallback((lineId: string, blockId: string) => {
    setWaveformLines((prev) =>
      prev.map((line) =>
        line.id === lineId
          ? { ...line, blocks: line.blocks.filter((b) => b.id !== blockId) }
          : line
      )
    );

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, []);

  const updateBlockParameter = useCallback((lineId: string, blockId: string, paramName: string, value: number) => {
    setWaveformLines((prev) =>
      prev.map((line) => {
        if (line.id !== lineId) return line;
        
        return {
          ...line,
          blocks: line.blocks.map((block) => {
            if (block.id !== blockId) return block;
            
            const param = block.parameters[paramName];
            if (!param) return block;
            
            // Clamp value to parameter bounds
            const clampedValue = Math.max(param.min, Math.min(param.max, value));
            
            return {
              ...block,
              parameters: {
                ...block.parameters,
                [paramName]: {
                  ...param,
                  value: clampedValue,
                },
              },
            };
          }),
        };
      })
    );
  }, []);

  const toggleBlock = useCallback((lineId: string, blockId: string) => {
    setWaveformLines((prev) =>
      prev.map((line) =>
        line.id === lineId
          ? {
              ...line,
              blocks: line.blocks.map((block) =>
                block.id === blockId
                  ? { ...block, enabled: !block.enabled }
                  : block
              ),
            }
          : line
      )
    );

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const toggleMute = useCallback((lineId: string) => {
    setWaveformLines((prev) =>
      prev.map((line) =>
        line.id === lineId ? { ...line, muted: !line.muted } : line
      )
    );

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const toggleVisible = useCallback((lineId: string) => {
    setWaveformLines((prev) =>
      prev.map((line) =>
        line.id === lineId ? { ...line, visible: !line.visible } : line
      )
    );

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const toggleSolo = useCallback((lineId: string) => {
    setWaveformLines((prev) => {
      const targetLine = prev.find((l) => l.id === lineId);
      if (!targetLine) return prev;

      const isCurrentlySolo = !targetLine.muted && prev.filter((l) => l.id !== lineId).every((l) => l.muted);

      if (isCurrentlySolo) {
        // Unmute all
        return prev.map((line) => ({ ...line, muted: false }));
      } else {
        // Solo this line
        return prev.map((line) => ({
          ...line,
          muted: line.id !== lineId,
        }));
      }
    });

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const processWaveforms = useCallback(() => {
    const processed = waveformLines.map((line) => ({
      ...line,
      points: processWaveformLine(line, currentTime),
      blocks: line.blocks, // Include blocks for waterfall and audio processing
    }));
    
    return processed;
  }, [waveformLines, currentTime]);
  
  // Separate waterfall processing with better throttling
  const processWaterfall = useCallback(() => {
    if (!isPlaying) return;
    
    const processed = waveformLines.map((line) => ({
      ...line,
      points: processWaveformLine(line, currentTime),
      blocks: line.blocks, // Include blocks for proper frequency mapping
    }));
    
    const waterfallData = generateWaterfallData(
      processed, 
      currentTime, 
      globalSettings.waterfallCenterFreq, 
      globalSettings.waterfallBandwidth
    );
    setWaterfallHistory(prev => [...prev.slice(-49), waterfallData]); // Increased history for smoother waterfall
  }, [waveformLines, currentTime, isPlaying, globalSettings.waterfallCenterFreq, globalSettings.waterfallBandwidth]);

  const clearAll = useCallback(() => {
    initializeDefaultLines();
    setWaterfallHistory([]);
    setCurrentTime(0);
    setIsPlaying(false);
    // Clear any persisted data
    AsyncStorage.removeItem(STORAGE_KEY);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  }, []);

  const updateGlobalSettings = useCallback((settings: GlobalSettings) => {
    setGlobalSettings(settings);
  }, []);

  const updateWaterfallCenter = useCallback((centerFreq: number, bandwidth: number) => {
    const validBandwidth = Math.max(1, Math.min(2000000000, bandwidth)); // Max 2GHz bandwidth
    const validCenterFreq = Math.max(validBandwidth / 2, Math.min(10000000000 - validBandwidth / 2, centerFreq)); // Max 10GHz center
    
    setGlobalSettings(prev => ({
      ...prev,
      waterfallCenterFreq: validCenterFreq,
      waterfallBandwidth: validBandwidth,
    }));
  }, []);

  const exportWaveformData = useCallback(() => {
    const processedWaveforms = processWaveforms();
    const audioBuffer = generateAudioBuffer(processedWaveforms, globalSettings.duration);
    
    // Create export data
    const exportData = {
      settings: globalSettings,
      waveforms: waveformLines.map(line => ({
        ...line,
        blocks: line.blocks.map(block => ({
          ...block,
          parameters: Object.fromEntries(
            Object.entries(block.parameters).map(([key, param]) => [key, param.value])
          )
        }))
      })),
      audioBuffer: Array.from(audioBuffer),
      timestamp: new Date().toISOString(),
    };
    
    // For web, create download
    if (Platform.OS === 'web') {
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dsp-waveforms-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    
    console.log('Export data:', exportData);
  }, [processWaveforms, globalSettings, waveformLines]);

  return {
    waveformLines,
    selectedLineId,
    setSelectedLineId,
    isPlaying,
    setIsPlaying,
    playbackSpeed,
    setPlaybackSpeed,
    currentTime,
    setCurrentTime,
    addWaveformLine,
    removeWaveformLine,
    addBlock,
    removeBlock,
    updateBlockParameter,
    toggleBlock,
    toggleMute,
    toggleVisible,
    toggleSolo,
    processWaveforms,
    clearAll,
    globalSettings,
    updateGlobalSettings,
    updateWaterfallCenter,
    volume,
    setVolume,
    waterfallHistory,
    processWaterfall,
    exportWaveformData,
  };
});
