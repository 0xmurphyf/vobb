import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';

export default function LoginScreen({ navigation }: any) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGuestLogin = async () => {
    setLoading(true);
    // TODO: Call /api/auth/guest
    Alert.alert('Not implemented', 'Guest login will create a temporary account');
    setLoading(false);
  };

  const handleLogin = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Enter a username');
      return;
    }
    setLoading(true);
    // TODO: Call /api/auth/login
    Alert.alert('Not implemented', 'Login coming in Phase 1');
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Voxx{'\n'}Blood Brothers</Text>

      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor="#666"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.guestButton]} onPress={handleGuestLogin} disabled={loading}>
        <Text style={styles.buttonText}>Play as Guest</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#0a0a0a' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#e0e0e0', textAlign: 'center', marginBottom: 48 },
  input: { width: '100%', padding: 12, backgroundColor: '#1a1a1a', borderRadius: 8, color: '#e0e0e0', marginBottom: 16, fontSize: 16 },
  button: { width: '100%', padding: 14, backgroundColor: '#8b0000', borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  guestButton: { backgroundColor: '#333' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
