import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  StatusBar,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../context/ThemeContext';
import { getSavedPdfs, savePdf, deletePdf } from '../services/storageService';
import { PdfDocument } from '../types';

type RootStackParamList = {
  HomeTabs: undefined;
  PdfViewer: { pdf: PdfDocument };
};

export const HomeScreen: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [pdfs, setPdfs] = useState<PdfDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const colors = theme.colors;

  useFocusEffect(
    useCallback(() => {
      loadPdfs();
    }, [])
  );

  const loadPdfs = async () => {
    const saved = await getSavedPdfs();
    setPdfs(saved);
  };

  const pickPdf = async () => {
    try {
      setLoading(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        const pdf: PdfDocument = {
          id: Date.now().toString(),
          name: file.name,
          uri: file.uri,
          addedAt: Date.now(),
        };

        await savePdf(pdf);
        await loadPdfs();

        // Navigate to PDF viewer
        navigation.navigate('PdfViewer', { pdf });
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick PDF file');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (pdf: PdfDocument) => {
    Alert.alert('Remove PDF', `Remove "${pdf.name}" from history?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deletePdf(pdf.id);
          await loadPdfs();
        },
      },
    ]);
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderPdfItem = ({ item }: { item: PdfDocument }) => (
    <TouchableOpacity
      style={[styles.pdfCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => navigation.navigate('PdfViewer', { pdf: item })}
      onLongPress={() => handleDelete(item)}
    >
      <View style={[styles.pdfIcon, { backgroundColor: colors.primaryLight }]}>
        <Text style={styles.pdfIconText}>📄</Text>
      </View>
      <View style={styles.pdfInfo}>
        <Text style={[styles.pdfName, { color: colors.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.pdfMeta, { color: colors.textSecondary }]}>
          Added {formatDate(item.addedAt)}
          {item.lastPage ? ` · Page ${item.lastPage}` : ''}
        </Text>
      </View>
      <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>ReadX</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Tap a word. Learn its meaning.
          </Text>
        </View>
        <TouchableOpacity
          onPress={toggleTheme}
          style={[styles.themeBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text style={styles.themeBtnText}>
            {theme.mode === 'dark' ? '☀️' : '🌙'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Upload Button */}
      <TouchableOpacity
        style={[styles.uploadBtn, { backgroundColor: colors.primary }]}
        onPress={pickPdf}
        disabled={loading}
      >
        <Text style={styles.uploadIcon}>+</Text>
        <Text style={styles.uploadText}>
          {loading ? 'Opening...' : 'Upload PDF'}
        </Text>
      </TouchableOpacity>

      {/* PDF List */}
      {pdfs.length > 0 ? (
        <>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            READING HISTORY
          </Text>
          <FlatList
            data={pdfs}
            keyExtractor={(item) => item.id}
            renderItem={renderPdfItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        </>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📚</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No PDFs yet
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
            Upload a PDF to start reading and learning new words
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  themeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  themeBtnText: {
    fontSize: 20,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  uploadIcon: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '300',
  },
  uploadText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 8,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  pdfCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  pdfIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pdfIconText: {
    fontSize: 22,
  },
  pdfInfo: {
    flex: 1,
  },
  pdfName: {
    fontSize: 15,
    fontWeight: '600',
  },
  pdfMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  chevron: {
    fontSize: 24,
    fontWeight: '300',
    marginLeft: 8,
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
