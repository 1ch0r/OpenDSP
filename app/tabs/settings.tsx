import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Trash2, Info, Github, Heart } from 'lucide-react-native';
import { useDSP } from '@/hooks/use-dsp-store';
import { COLORS } from '@/constants/dsp-config';
import * as Haptics from 'expo-haptics';

export default function SettingsScreen() {
  const { clearAll } = useDSP();

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Waveforms',
      'This will remove all waveform lines and blocks. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearAll();
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          },
        },
      ]
    );
  };

  return (
    <LinearGradient
      colors={[COLORS.background.dark, COLORS.primary.darkPurple + '20']}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data</Text>
          
          <TouchableOpacity style={styles.option} onPress={handleClearAll}>
            <View style={styles.optionLeft}>
              <View style={[styles.iconContainer, styles.dangerIcon]}>
                <Trash2 size={20} color="#FF6B6B" />
              </View>
              <View>
                <Text style={styles.optionTitle}>Clear All Data</Text>
                <Text style={styles.optionDescription}>Remove all waveforms and start fresh</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <View style={styles.option}>
            <View style={styles.optionLeft}>
              <View style={styles.iconContainer}>
                <Info size={20} color={COLORS.primary.mint} />
              </View>
              <View>
                <Text style={styles.optionTitle}>DSP Waveform Builder</Text>
                <Text style={styles.optionDescription}>Version 2.7.7</Text>
              </View>
            </View>
          </View>


        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Create and visualize digital signal processing waveforms
          </Text>
          <Text style={styles.footerSubtext}>
            Inspired by GNU Radio Companion
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: COLORS.text.primary,
    marginBottom: 16,
  },
  option: {
    backgroundColor: COLORS.background.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary.purple + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dangerIcon: {
    backgroundColor: '#FF6B6B20',
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  footerText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  footerSubtext: {
    fontSize: 12,
    color: COLORS.text.secondary + '80',
    textAlign: 'center',
  },
});
