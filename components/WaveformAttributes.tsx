import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Modal } from 'react-native';
import { Settings, X, Save, Download } from 'lucide-react-native';
import { COLORS, DEFAULT_GLOBAL_SETTINGS } from '@/constants/dsp-config';
import { GlobalSettings } from '@/types/dsp';

interface WaveformAttributesProps {
  globalSettings: GlobalSettings;
  onSettingsChange: (settings: GlobalSettings) => void;
  onExportData: () => void;
}

export default function WaveformAttributes({ 
  globalSettings, 
  onSettingsChange, 
  onExportData 
}: WaveformAttributesProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tempSettings, setTempSettings] = useState(globalSettings);

  const handleSave = () => {
    onSettingsChange(tempSettings);
    setIsVisible(false);
  };

  const handleReset = () => {
    setTempSettings(DEFAULT_GLOBAL_SETTINGS);
  };

  const updateSetting = (key: keyof GlobalSettings, value: number | string) => {
    setTempSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <>
      <TouchableOpacity 
        style={styles.triggerButton} 
        onPress={() => setIsVisible(true)}
      >
        <Settings size={20} color={COLORS.primary.mint} />
        <Text style={styles.triggerText}>Attributes</Text>
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setIsVisible(false)}>
              <X size={24} color={COLORS.text.primary} />
            </TouchableOpacity>
            <Text style={styles.title}>Waveform Attributes</Text>
            <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
              <Save size={20} color={COLORS.primary.mint} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Global Settings</Text>
              
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Sample Rate</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={tempSettings.sampleRate.toString()}
                    onChangeText={(text) => {
                      const value = parseInt(text) || DEFAULT_GLOBAL_SETTINGS.sampleRate;
                      updateSetting('sampleRate', Math.max(8000, Math.min(96000, value)));
                    }}
                    keyboardType="numeric"
                    placeholder="44100"
                  />
                  <Text style={styles.unit}>Hz</Text>
                </View>
              </View>

              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Duration</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={tempSettings.duration.toString()}
                    onChangeText={(text) => {
                      const value = parseFloat(text) || DEFAULT_GLOBAL_SETTINGS.duration;
                      updateSetting('duration', Math.max(0.1, Math.min(10, value)));
                    }}
                    keyboardType="numeric"
                    placeholder="2.0"
                  />
                  <Text style={styles.unit}>sec</Text>
                </View>
              </View>

              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Resolution</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={tempSettings.resolution.toString()}
                    onChangeText={(text) => {
                      const value = parseInt(text) || DEFAULT_GLOBAL_SETTINGS.resolution;
                      updateSetting('resolution', Math.max(64, Math.min(4096, value)));
                    }}
                    keyboardType="numeric"
                    placeholder="512"
                  />
                  <Text style={styles.unit}>samples</Text>
                </View>
              </View>

              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Output Format</Text>
                <View style={styles.formatButtons}>
                  <TouchableOpacity
                    style={[
                      styles.formatButton,
                      tempSettings.outputFormat === 'wav' && styles.formatButtonActive,
                    ]}
                    onPress={() => updateSetting('outputFormat', 'wav')}
                  >
                    <Text style={[
                      styles.formatButtonText,
                      tempSettings.outputFormat === 'wav' && styles.formatButtonTextActive,
                    ]}>
                      WAV
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.formatButton,
                      tempSettings.outputFormat === 'json' && styles.formatButtonActive,
                    ]}
                    onPress={() => updateSetting('outputFormat', 'json')}
                  >
                    <Text style={[
                      styles.formatButtonText,
                      tempSettings.outputFormat === 'json' && styles.formatButtonTextActive,
                    ]}>
                      JSON
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Actions</Text>
              
              <TouchableOpacity style={styles.actionButton} onPress={onExportData}>
                <Download size={20} color={COLORS.primary.mint} />
                <Text style={styles.actionButtonText}>Export Waveform Data</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
                <Text style={styles.resetButtonText}>Reset to Defaults</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Information</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Nyquist Frequency:</Text>
                <Text style={styles.infoValue}>{(tempSettings.sampleRate / 2).toLocaleString()} Hz</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Total Samples:</Text>
                <Text style={styles.infoValue}>{Math.floor(tempSettings.sampleRate * tempSettings.duration).toLocaleString()}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>File Size (approx):</Text>
                <Text style={styles.infoValue}>
                  {((tempSettings.sampleRate * tempSettings.duration * 2) / 1024).toFixed(1)} KB
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  triggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.background.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 0, // Square off rounded corners
  },
  triggerText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: COLORS.primary.mint,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background.dark,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background.cardLight,
  },
  title: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: COLORS.text.primary,
  },
  saveButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.text.primary,
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 14,
    color: COLORS.text.secondary,
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    backgroundColor: COLORS.background.cardLight,
    borderRadius: 0, // Square off rounded corners
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.text.primary,
    minWidth: 80,
    textAlign: 'right',
  },
  unit: {
    fontSize: 12,
    color: COLORS.text.secondary,
    minWidth: 40,
  },
  formatButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  formatButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 0, // Square off rounded corners
    backgroundColor: COLORS.background.cardLight,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  formatButtonActive: {
    backgroundColor: COLORS.primary.purple + '30',
    borderColor: COLORS.primary.purple,
  },
  formatButtonText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontWeight: '500' as const,
  },
  formatButtonTextActive: {
    color: COLORS.primary.mint,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.background.card,
    padding: 16,
    borderRadius: 0, // Square off rounded corners
    marginBottom: 12,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: COLORS.text.primary,
  },
  resetButton: {
    padding: 16,
    borderRadius: 0, // Square off rounded corners
    borderWidth: 1,
    borderColor: COLORS.text.secondary + '40',
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: COLORS.text.secondary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.primary.mint,
    fontWeight: '500' as const,
  },
});
