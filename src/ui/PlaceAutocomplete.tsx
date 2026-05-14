import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItem,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import type { GeocodingClient } from '../core/client';
import type { Place } from '../core/types';
import { useAutocomplete } from '../hooks/useAutocomplete';

export interface PlaceAutocompleteProps {
  onSelect: (place: Place) => void;
  placeholder?: string;
  client?: GeocodingClient;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  listStyle?: StyleProp<ViewStyle>;
  maxSuggestions?: number;
}

function highlightMatch(text: string, query: string): React.ReactNode {
  const q = query.trim();
  if (!q) {
    return text;
  }
  const lower = text.toLowerCase();
  const idx = lower.indexOf(q.toLowerCase());
  if (idx < 0) {
    return text;
  }
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + q.length);
  const after = text.slice(idx + q.length);
  return (
    <>
      {before}
      <Text style={styles.highlight}>{match}</Text>
      {after}
    </>
  );
}

export function PlaceAutocomplete({
  onSelect,
  placeholder = 'Search location',
  client,
  style,
  inputStyle,
  listStyle,
  maxSuggestions = 8,
}: PlaceAutocompleteProps): React.ReactElement {
  const [query, setQuery] = useState('');
  const { suggestions, loading } = useAutocomplete(query, { client });

  const visible = useMemo(
    () => suggestions.slice(0, maxSuggestions),
    [maxSuggestions, suggestions],
  );

  const handleSelect = useCallback(
    (place: Place) => {
      Keyboard.dismiss();
      setQuery(place.name);
      onSelect(place);
    },
    [onSelect],
  );

  const renderItem: ListRenderItem<Place> = useCallback(
    ({ item }) => (
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={() => {
          handleSelect(item);
        }}
      >
        <Text style={styles.primary} numberOfLines={1}>
          {highlightMatch(item.name, query)}
        </Text>
        <Text style={styles.secondary} numberOfLines={2}>
          {highlightMatch(item.fullName, query)}
        </Text>
      </Pressable>
    ),
    [handleSelect, query],
  );

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.inputRow}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={placeholder}
          placeholderTextColor="#888"
          autoCorrect={false}
          autoCapitalize="none"
          {...(Platform.OS === 'ios' ? { clearButtonMode: 'while-editing' as const } : {})}
          returnKeyType="search"
          style={[styles.input, inputStyle]}
        />
        {loading ? <ActivityIndicator style={styles.spinner} /> : null}
      </View>
      {query.trim().length > 0 && visible.length > 0 ? (
        <View style={[styles.dropdown, listStyle]}>
          <FlatList
            keyboardShouldPersistTaps="handled"
            data={visible}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            style={styles.list}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    zIndex: 10,
    ...Platform.select({
      ios: { zIndex: 10 },
      android: { elevation: 4 },
      default: {},
    }),
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    minHeight: 44,
    fontSize: 16,
    paddingVertical: 8,
  },
  spinner: { marginLeft: 8 },
  dropdown: {
    marginTop: 4,
    maxHeight: 240,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
    borderRadius: 10,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  list: { flexGrow: 0 },
  row: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  rowPressed: { backgroundColor: '#f4f4f4' },
  primary: { fontSize: 16, color: '#111' },
  secondary: { fontSize: 13, color: '#666', marginTop: 2 },
  highlight: { fontWeight: '700', color: '#0a7' },
});
