import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppUpdates } from '../../hooks/useAppUpdates';

export function UpdateBanner() {
  const { status, reloadApp } = useAppUpdates();
  const insets = useSafeAreaInsets();

  if (status !== 'pronta') return null;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <Text style={styles.text}>Nova versão disponível!</Text>
      <TouchableOpacity style={styles.button} onPress={reloadApp}>
        <Text style={styles.buttonText}>Atualizar agora</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  text: { color: 'white', fontWeight: 'bold' },
  button: { backgroundColor: 'white', padding: 6, borderRadius: 4 },
  buttonText: { color: '#007AFF', fontSize: 12, fontWeight: 'bold' },
});
