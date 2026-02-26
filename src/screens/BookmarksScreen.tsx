import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { getBookmarks, removeBookmark } from '../services/storageService';
import { BookmarkedWord } from '../types';

export const BookmarksScreen: React.FC = () => {
  const { theme } = useTheme();
  const [bookmarks, setBookmarks] = useState<BookmarkedWord[]>([]);
  const colors = theme.colors;

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
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onLongPress={() => handleDelete(item)}
        onPress={() => handleGoogleSearch(item.word)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.word, { color: colors.text }]}>{item.word}</Text>
          {item.phonetic && (
            <Text style={[styles.phonetic, { color: colors.textSecondary }]}>
              {item.phonetic}
            </Text>
          )}
        </View>

        {firstMeaning && (
          <View
            style={[styles.posTag, { backgroundColor: colors.primaryLight }]}
          >
            <Text style={[styles.posText, { color: colors.primary }]}>
              {firstMeaning.partOfSpeech}
            </Text>
          </View>
        )}

        {firstDef && (
          <Text
            style={[styles.definition, { color: colors.text }]}
            numberOfLines={3}
          >
            {firstDef.definition}
          </Text>
        )}

        {firstDef?.example && (
          <Text
            style={[styles.example, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            "{firstDef.example}"
          </Text>
        )}

        <View style={styles.cardFooter}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            {item.pdfName ? `From: ${item.pdfName}` : ''}
          </Text>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            {new Date(item.savedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Saved Words</Text>
        <Text style={[styles.count, { color: colors.textSecondary }]}>
          {bookmarks.length} {bookmarks.length === 1 ? 'word' : 'words'}
        </Text>
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
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>⭐</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No saved words
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
            When you find an interesting word while reading, save it here for later
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  count: {
    fontSize: 14,
    marginTop: 2,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 8,
  },
  word: {
    fontSize: 20,
    fontWeight: '700',
  },
  phonetic: {
    fontSize: 13,
  },
  posTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    marginBottom: 8,
  },
  posText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  definition: {
    fontSize: 14,
    lineHeight: 20,
  },
  example: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 6,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  footerText: {
    fontSize: 11,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
