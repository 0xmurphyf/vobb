import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function PvpScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>PvP</Text>
      <Text>Attack other players' defenses</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold' },
});
