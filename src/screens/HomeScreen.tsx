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
  const isDark = theme.mode === 'dark';

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
    return (
      <TouchableOpacity
        style={[
          styles.pdfCard,
          { backgroundColor: colors.card },
        ]}
        onPress={() => navigation.navigate('PdfViewer', { pdf: item })}
        onLongPress={() => handleDelete(item)}
        activeOpacity={0.65}
      >
        {/* Left icon */}
        <View style={[styles.pdfIconWrap, { backgroundColor: isDark ? 'rgba(129,140,248,0.1)' : '#F0EEFF' }]}>
          <Ionicons name="document-text" size={24} color={colors.primary} />
        </View>

        {/* Info */}
        <View style={styles.pdfInfo}>
          <Text style={[styles.pdfName, { color: colors.text }]} numberOfLines={1}>
            {item.name.replace('.pdf', '')}
          </Text>
          <View style={styles.pdfMetaRow}>
            <Text style={[styles.pdfMeta, { color: colors.textSecondary }]}>
              {formatDate(item.addedAt)}
            </Text>
            {item.lastPage ? (
              <View style={styles.pageBadge}>
                <Ionicons name="bookmark" size={10} color={colors.primary} />
                <Text style={[styles.pageText, { color: colors.primary }]}> p.{item.lastPage}</Text>
              </View>
            ) : null}
          </View>
          {hasProgress && (
            <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F0FF' }]}>
              <View
                style={[styles.progressFill, { width: `${progress}%`, backgroundColor: colors.primary }]}
              />
            </View>
          )}
        </View>

        {/* Arrow */}
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} style={{ marginLeft: 8 }} />
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
          <View style={styles.logoRow}>
            <View style={[styles.logoMark, { backgroundColor: colors.primary }]}>
              <Ionicons name="book" size={16} color="#FFF" />
            </View>
            <Text style={[styles.brandName, { color: colors.text }]}>ReadX</Text>
          </View>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Tap any word to learn
          </Text>
        </View>
        <TouchableOpacity
          onPress={toggleTheme}
          style={[styles.themeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#F1F5F9' }]}
          activeOpacity={0.6}
        >
          <Ionicons name={isDark ? 'sunny' : 'moon'} size={20} color={isDark ? '#FBBF24' : '#6366F1'} />
        </TouchableOpacity>
      </View>

      {/* Upload area */}
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

      {/* Content */}
      {pdfs.length > 0 ? (
        <>
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              RECENT
            </Text>
            <View style={[styles.countPill, { backgroundColor: isDark ? 'rgba(129,140,248,0.1)' : '#F0EEFF' }]}>
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
          <View style={[styles.emptyIcon, { backgroundColor: isDark ? 'rgba(129,140,248,0.08)' : '#F0EEFF' }]}>
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

  /* Header */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 48 : 60,
    paddingBottom: 6,
  },
  headerLeft: {},
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  logoMark: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: { fontSize: 24, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { fontSize: 13, marginLeft: 1, letterSpacing: 0.1 },

  themeBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Upload */
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
    paddingVertical: 18,
    paddingHorizontal: 18,
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

  /* Section header */
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

  /* PDF list */
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
    width: 46,
    height: 46,
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

  /* Empty state */
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
