import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { getBookmarks, removeBookmark } from '../services/storageService';
import { BookmarkedWord } from '../types';

export const BookmarksScreen: React.FC = () => {
  const { theme } = useTheme();
  const [bookmarks, setBookmarks] = useState<BookmarkedWord[]>([]);
  const colors = theme.colors;
  const isDark = theme.mode === 'dark';

  useFocusEffect(
    useCallback(() => {
      loadBookmarks();
    }, [])
  );

  const loadBookmarks = async () => {
    const saved = await getBookmarks();
    setBookmarks(saved);
  };

  const handleDelete = (bookmark: BookmarkedWord) => {
    Alert.alert('Remove Word', `Remove "${bookmark.word}" from bookmarks?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await removeBookmark(bookmark.id);
          await loadBookmarks();
        },
      },
    ]);
  };

  const handleGoogleSearch = (word: string) => {
    const url = `https://www.google.com/search?q=define+${encodeURIComponent(word)}`;
    Linking.openURL(url);
  };

  const renderBookmark = ({ item }: { item: BookmarkedWord }) => {
    const firstMeaning = item.meanings[0];
    const firstDef = firstMeaning?.definitions[0];

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card }]}
        onLongPress={() => handleDelete(item)}
        onPress={() => handleGoogleSearch(item.word)}
        activeOpacity={0.65}
      >
        <View style={styles.cardBody}>
          {/* Word row */}
          <View style={styles.wordRow}>
            <View style={styles.wordLeft}>
              <Text style={[styles.word, { color: colors.text }]}>{item.word}</Text>
              {item.phonetic && (
                <Text style={[styles.phonetic, { color: colors.textSecondary }]}>
                  {item.phonetic}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={[styles.searchBtn, { backgroundColor: isDark ? 'rgba(129,140,248,0.1)' : '#F0EEFF' }]}
              onPress={() => handleGoogleSearch(item.word)}
              activeOpacity={0.6}
            >
              <Ionicons name="search" size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {firstMeaning && (
            <View style={[styles.posChip, { backgroundColor: isDark ? 'rgba(129,140,248,0.1)' : '#F0EEFF' }]}>
              <Text style={[styles.posText, { color: colors.primary }]}>
                {firstMeaning.partOfSpeech}
              </Text>
            </View>
          )}

          {firstDef && (
            <Text style={[styles.definition, { color: colors.text }]} numberOfLines={3}>
              {firstDef.definition}
            </Text>
          )}

          {firstDef?.example && (
            <View style={[styles.exampleWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FAFAFA' }]}>
              <Ionicons name="chatbubble-outline" size={12} color={colors.textSecondary} style={{ marginTop: 2 }} />
              <Text style={[styles.example, { color: colors.textSecondary }]} numberOfLines={2}>
                {firstDef.example}
              </Text>
            </View>
          )}

          <View style={[styles.cardFooter, { borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9' }]}>
            {item.pdfName ? (
              <View style={styles.sourceRow}>
                <Ionicons name="document-text-outline" size={12} color={colors.textSecondary} />
                <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                  {item.pdfName.replace('.pdf', '')}
                </Text>
              </View>
            ) : <View />}
            <Text style={[styles.footerDate, { color: colors.textSecondary }]}>
              {new Date(item.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconRow}>
            <View style={[styles.headerIcon, { backgroundColor: colors.primary }]}>
              <Ionicons name="bookmark" size={16} color="#FFF" />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Vocabulary</Text>
          </View>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {bookmarks.length} saved {bookmarks.length === 1 ? 'word' : 'words'}
          </Text>
        </View>
      </View>

      {bookmarks.length > 0 ? (
        <FlatList
          data={bookmarks}
          keyExtractor={(item) => item.id}
          renderItem={renderBookmark}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyWrap}>
          <View style={[styles.emptyIcon, { backgroundColor: isDark ? 'rgba(129,140,248,0.08)' : '#F0EEFF' }]}>
            <Ionicons name="bookmark-outline" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No saved words yet
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
            Tap any word while reading to see its{'\n'}meaning, then save it here.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 48 : 60,
    paddingBottom: 12,
  },
  headerLeft: {},
  headerIconRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { fontSize: 13, marginLeft: 1, letterSpacing: 0.1 },

  list: { paddingHorizontal: 20, paddingBottom: 100 },

  card: {
    borderRadius: 16,
    marginBottom: 10,
    ...Platform.select({
      android: { elevation: 1 },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
    }),
  },
  cardBody: { padding: 16 },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  wordLeft: { flex: 1 },
  word: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  phonetic: { fontSize: 13, marginTop: 2 },
  searchBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  posChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  posText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  definition: { fontSize: 14, lineHeight: 21, letterSpacing: 0.1 },
  exampleWrap: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
  },
  example: { flex: 1, fontSize: 13, fontStyle: 'italic', lineHeight: 19 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText: { fontSize: 11, fontWeight: '500' },
  footerDate: { fontSize: 11, fontWeight: '500' },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 44 },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8, letterSpacing: -0.2 },
  emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 22, letterSpacing: 0.1 },
});
