import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAppUpdates } from '../../hooks/useAppUpdates';

export function UpdateBanner() {
  const { status, reloadApp } = useAppUpdates();

  if (status !== 'pronta') return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Nova versão disponível!</Text>
      <TouchableOpacity style={styles.button} onPress={reloadApp}>
        <Text style={styles.buttonText}>Atualizar agora</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#007AFF',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  text: { color: 'white', fontWeight: 'bold' },
  button: { backgroundColor: 'white', padding: 6, borderRadius: 4 },
  buttonText: { color: '#007AFF', fontSize: 12, fontWeight: 'bold' },
});
