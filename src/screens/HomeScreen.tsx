import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Directory, File, Paths } from 'expo-file-system';
import { useTheme } from '../context/ThemeContext';
import { getSavedPdfs, savePdf, deletePdf } from '../services/storageService';
import { buildStoredFileName, stripPdfExtension } from '../utils/filename';
import { PdfDocument } from '../types';

/**
 * Above this we warn before opening. We never hard-block: whether a given file
 * actually opens depends on the device, and the viewer now fails gracefully.
 */
const LARGE_FILE_WARNING_BYTES = 150 * 1024 * 1024;

function confirmLargeFile(sizeBytes: number): Promise<boolean> {
  const mb = Math.round(sizeBytes / (1024 * 1024));
  return new Promise((resolve) => {
    Alert.alert(
      'Large file',
      `This PDF is about ${mb} MB. It may take a while to open, and on some devices it may not open at all.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Open anyway', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}

type RootStackParamList = {
  HomeTabs: undefined;
  PdfViewer: { pdf: PdfDocument };
};

export const HomeScreen: React.FC = () => {
  const { theme } = useTheme();
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
        // Keep the provider URI so the modern File API can read it directly.
        copyToCacheDirectory: false,
      });

      if (!result.canceled && result.assets.length > 0) {
        const file = result.assets[0];
        const sourceFile = new File(file.uri);

        if (typeof file.size === 'number' && file.size > LARGE_FILE_WARNING_BYTES) {
          const proceed = await confirmLargeFile(file.size);
          if (!proceed) return;
        }

        // Under documentDirectory, not cache, so the copy is not evicted.
        if (!FileSystem.documentDirectory) {
          throw new Error('App storage is unavailable. Please restart the app and try again.');
        }
        const pdfDir = new Directory(Paths.document, 'pdfs');
        if (!pdfDir.exists) {
          pdfDir.create({ intermediates: true });
        }

        const existing = pdfs.find((p) => p.name === file.name);

        // Keyed on the entry id: sanitising the display name alone maps
        // "my file.pdf" and "my-file.pdf" onto one path, so two documents would
        // overwrite each other and deleting one would take the other's file too.
        const id = existing?.id ?? Date.now().toString();

        // Use the modern file API because Android provider URIs can be unreadable
        // through the legacy copyAsync implementation in Expo Go.
        const destinationFile = new File(pdfDir, buildStoredFileName(id, file.name));
        await sourceFile.copy(destinationFile, { overwrite: true });
        const permanentUri = destinationFile.uri;

        if (existing) {
          // Left behind by the previous naming scheme.
          if (existing.uri && existing.uri !== permanentUri) {
            await FileSystem.deleteAsync(existing.uri, { idempotent: true });
          }
          const updatedPdf = { ...existing, uri: permanentUri, lastReadAt: Date.now() };
          await savePdf(updatedPdf);
          await loadPdfs();
          navigation.navigate('PdfViewer', { pdf: updatedPdf });
        } else {
          const pdf: PdfDocument = {
            id,
            name: file.name,
            uri: permanentUri,
            addedAt: Date.now(),
          };

          await savePdf(pdf);
          await loadPdfs();
          navigation.navigate('PdfViewer', { pdf });
        }
      }
    } catch (err) {
      console.error('Unable to import PDF', err);
      const message = err instanceof Error ? err.message : 'Please try selecting the file again.';
      Alert.alert('Unable to open PDF', message);
    } finally {
      setLoading(false);
    }
  };

  const openPdf = async (pdf: PdfDocument) => {
    // The file can vanish between sessions (uninstall/reinstall, storage
    // cleanup), which previously surfaced as a raw error inside the viewer.
    const info = await FileSystem.getInfoAsync(pdf.uri);
    if (!info.exists) {
      Alert.alert(
        'File missing',
        `"${stripPdfExtension(pdf.name)}" is no longer on your device. Open it again to restore it.`
      );
      return;
    }
    navigation.navigate('PdfViewer', { pdf });
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
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getProgress = (pdf: PdfDocument) => {
    if (pdf.lastPage && pdf.totalPages) {
      return Math.round((pdf.lastPage / pdf.totalPages) * 100);
    }
    return 0;
  };

  const renderPdfItem = ({ item }: { item: PdfDocument }) => {
    const progress = getProgress(item);
    const hasProgress = progress > 0 && progress < 100;
    const isComplete = progress >= 100;
    return (
      <TouchableOpacity
        style={[
          styles.pdfCard,
          { backgroundColor: colors.card },
        ]}
        onPress={() => openPdf(item)}
        onLongPress={() => handleDelete(item)}
        activeOpacity={0.65}
      >
        <View style={[styles.pdfIconWrap, { backgroundColor: 'rgba(129,140,248,0.1)' }]}>
          <Ionicons name="document-text" size={24} color={colors.primary} />
        </View>

        <View style={styles.pdfInfo}>
          <Text style={[styles.pdfName, { color: colors.text }]} numberOfLines={1}>
            {stripPdfExtension(item.name)}
          </Text>
          <View style={styles.pdfMetaRow}>
            <Text style={[styles.pdfMeta, { color: colors.textSecondary }]}>
              {formatDate(item.lastReadAt || item.addedAt)}
            </Text>
            {item.lastPage ? (
              <View style={styles.pageBadge}>
                <Ionicons name="bookmark" size={10} color={colors.primary} />
                <Text style={[styles.pageText, { color: colors.primary }]}> p.{item.lastPage}</Text>
              </View>
            ) : null}
            {isComplete && (
              <View style={styles.pageBadge}>
                <Ionicons name="checkmark-circle" size={12} color="#34D399" />
                <Text style={[styles.pageText, { color: '#34D399' }]}> Done</Text>
              </View>
            )}
          </View>
          {hasProgress && (
            <View style={[styles.progressTrack, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
              <View
                style={[styles.progressFill, { width: `${progress}%`, backgroundColor: colors.primary }]}
              />
            </View>
          )}
        </View>

        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} style={{ marginLeft: 8 }} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.background}
      />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoRow}>
            <View style={[styles.logoMark, { backgroundColor: colors.primary }]}>
              <Ionicons name="book" size={20} color="#FFF" />
            </View>
            <Text style={[styles.brandName, { color: colors.text }]}>
              Read<Text style={{ color: colors.primary, fontWeight: '900' }}>X</Text>
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.uploadBtn, { backgroundColor: colors.primary }]}
        onPress={pickPdf}
        disabled={loading}
        activeOpacity={0.75}
      >
        <View style={styles.uploadInner}>
          <View style={styles.uploadIconWrap}>
            <Ionicons name="add" size={28} color="#FFF" />
          </View>
          <View style={styles.uploadTextWrap}>
            <Text style={styles.uploadTitle}>
              {loading ? 'Opening...' : 'Open PDF'}
            </Text>
            <Text style={styles.uploadSub}>Browse files on your device</Text>
          </View>
          <Ionicons name="folder-open-outline" size={20} color="rgba(255,255,255,0.5)" />
        </View>
      </TouchableOpacity>

      {pdfs.length > 0 ? (
        <>
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              RECENT
            </Text>
            <View style={[styles.countPill, { backgroundColor: 'rgba(129,140,248,0.1)' }]}>
              <Text style={[styles.countNum, { color: colors.primary }]}>{pdfs.length}</Text>
            </View>
          </View>
          <FlatList
            data={pdfs}
            keyExtractor={(item) => item.id}
            renderItem={renderPdfItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        </>
      ) : (
        <View style={styles.emptyWrap}>
          <View style={[styles.emptyIcon, { backgroundColor: 'rgba(129,140,248,0.08)' }]}>
            <Ionicons name="library-outline" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No documents yet</Text>
          <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
            Open a PDF to start reading.{'\n'}Tap any word to see its meaning.
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
    paddingTop: Platform.OS === 'android' ? 50 : 60,
    paddingBottom: 14,
  },
  headerLeft: {},
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  logoMark: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      android: { elevation: 8 },
      ios: { shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10 },
    }),
  },
  brandName: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },

  uploadBtn: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 4,
    borderRadius: 18,
    overflow: 'hidden',
    ...Platform.select({
      android: { elevation: 6 },
      ios: { shadowColor: '#6366F1', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14 },
    }),
  },
  uploadInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
  },
  uploadIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadTextWrap: { flex: 1 },
  uploadTitle: { fontSize: 16, fontWeight: '700', color: '#FFF', letterSpacing: 0.2 },
  uploadSub: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 },

  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    marginTop: 26,
    marginBottom: 10,
  },
  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  countPill: {
    minWidth: 28,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  countNum: { fontSize: 12, fontWeight: '800' },

  list: { paddingHorizontal: 20, paddingBottom: 100 },
  pdfCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginBottom: 8,
    ...Platform.select({
      android: { elevation: 1 },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
    }),
  },
  pdfIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pdfInfo: { flex: 1 },
  pdfName: { fontSize: 15, fontWeight: '600', letterSpacing: 0.05 },
  pdfMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  pdfMeta: { fontSize: 12 },
  pageBadge: { flexDirection: 'row', alignItems: 'center' },
  pageText: { fontSize: 11, fontWeight: '700' },
  progressTrack: { height: 3, borderRadius: 2, marginTop: 8 },
  progressFill: { height: 3, borderRadius: 2 },

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
