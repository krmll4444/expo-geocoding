import React, { useState } from 'react';
import { configureDefaultClient, PlaceAutocomplete, type Place } from 'expo-geocoding';
import { Platform, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

configureDefaultClient({
  userAgent: 'expo-geocoding-example/1.0 (contact: dev@localhost)',
});

export default function App(): React.ReactElement {
  const [selected, setSelected] = useState<Place | null>(null);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>expo-geocoding</Text>
        <Text style={styles.sub}>
          Search powered by OpenStreetMap Nominatim (~1 req/s, 24h in-memory cache).
        </Text>

        <View style={styles.block}>
          <PlaceAutocomplete
            placeholder="Search location"
            onSelect={(place) => {
              setSelected(place);
            }}
          />
        </View>

        {selected ? (
          <View style={styles.result}>
            <Text style={styles.resultTitle}>Selected</Text>
            <Text style={styles.mono}>{JSON.stringify(selected, null, 2)}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f6f8' },
  scroll: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 8 },
  sub: { fontSize: 15, color: '#555', marginBottom: 20 },
  block: { marginBottom: 24 },
  result: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
  },
  resultTitle: { fontSize: 17, fontWeight: '600', marginBottom: 8 },
  mono: { fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), fontSize: 12 },
});
