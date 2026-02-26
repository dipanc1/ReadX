import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  StatusBar,
  Animated,
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

  const getProgress = (pdf: PdfDocument) => {
    if (pdf.lastPage && pdf.totalPages) {
      return Math.round((pdf.lastPage / pdf.totalPages) * 100);
    }
    return 0;
  };

  const renderPdfItem = ({ item, index }: { item: PdfDocument; index: number }) => {
    const progress = getProgress(item);
    return (
      <TouchableOpacity
        style={[
          styles.pdfCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            shadowColor: theme.mode === 'dark' ? '#000' : '#6366F1',
          },
        ]}
        onPress={() => navigation.navigate('PdfViewer', { pdf: item })}
        onLongPress={() => handleDelete(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.pdfIconContainer, { backgroundColor: colors.primaryLight }]}>
          <Text style={styles.pdfIconText}>📄</Text>
        </View>
        <View style={styles.pdfInfo}>
          <Text style={[styles.pdfName, { color: colors.text }]} numberOfLines={1}>
            {item.name.replace('.pdf', '')}
          </Text>
          <Text style={[styles.pdfMeta, { color: colors.textSecondary }]}>
            {formatDate(item.addedAt)}
            {item.lastPage ? `  •  Page ${item.lastPage}` : ''}
          </Text>
          {progress > 0 && (
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progress}%`, backgroundColor: colors.primary },
                ]}
              />
            </View>
          )}
        </View>
        <View style={[styles.arrowContainer, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.arrow, { color: colors.primary }]}>→</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.brandLabel, { color: colors.primary }]}>READX</Text>
          <Text style={[styles.title, { color: colors.text }]}>Your Library</Text>
        </View>
        <TouchableOpacity
          onPress={toggleTheme}
          style={[
            styles.themeBtn,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              shadowColor: theme.mode === 'dark' ? '#000' : '#6366F1',
            },
          ]}
          activeOpacity={0.7}
        >
          <Text style={styles.themeBtnText}>
            {theme.mode === 'dark' ? '☀️' : '🌙'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Upload Button */}
      <TouchableOpacity
        style={[
          styles.uploadBtn,
          { backgroundColor: colors.primary, shadowColor: colors.primary },
        ]}
        onPress={pickPdf}
        disabled={loading}
        activeOpacity={0.8}
      >
        <View style={styles.uploadContent}>
          <View style={styles.uploadIconCircle}>
            <Text style={styles.uploadPlus}>+</Text>
          </View>
          <View>
            <Text style={styles.uploadText}>
              {loading ? 'Opening...' : 'Upload PDF'}
            </Text>
            <Text style={styles.uploadHint}>Choose a file from your device</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* PDF List */}
      {pdfs.length > 0 ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              RECENT FILES
            </Text>
            <Text style={[styles.sectionCount, { color: colors.primary }]}>
              {pdfs.length}
            </Text>
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
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconCircle, { backgroundColor: colors.primaryLight }]}>
            <Text style={styles.emptyEmoji}>📚</Text>
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Start your reading journey
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
            Upload a PDF to begin reading.{'\n'}Tap any word to learn its meaning instantly.
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
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 4,
  },
  brandLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 3,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  themeBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  themeBtnText: {
    fontSize: 22,
  },
  uploadBtn: {
    marginHorizontal: 24,
    marginTop: 24,
    marginBottom: 8,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  uploadContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  uploadIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadPlus: {
    fontSize: 26,
    color: '#FFFFFF',
    fontWeight: '400',
    marginTop: -2,
  },
  uploadText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  uploadHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginTop: 28,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '700',
    width: 26,
    height: 26,
    lineHeight: 26,
    textAlign: 'center',
    borderRadius: 13,
    overflow: 'hidden',
  },
  list: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  pdfCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  pdfIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  pdfIconText: {
    fontSize: 24,
  },
  pdfInfo: {
    flex: 1,
  },
  pdfName: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  pdfMeta: {
    fontSize: 12,
    marginTop: 3,
    letterSpacing: 0.2,
  },
  progressBar: {
    height: 3,
    borderRadius: 2,
    marginTop: 8,
  },
  progressFill: {
    height: 3,
    borderRadius: 2,
  },
  arrowContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  arrow: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 48,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyEmoji: {
    fontSize: 44,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
});
