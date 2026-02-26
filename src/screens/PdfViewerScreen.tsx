import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  StatusBar,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { updatePdfProgress } from '../services/storageService';
import { getPdfViewerHtml } from '../utils/pdfHtml';
import { WordModal } from '../components/WordModal';
import { PdfDocument, WebViewMessage } from '../types';
import { Ionicons } from '@expo/vector-icons';

type RouteParams = {
  PdfViewer: { pdf: PdfDocument };
};

export const PdfViewerScreen: React.FC = () => {
  const { theme } = useTheme();
  const route = useRoute<RouteProp<RouteParams, 'PdfViewer'>>();
  const navigation = useNavigation();
  const { pdf } = route.params;
  const webViewRef = useRef<WebView>(null);
  const colors = theme.colors;

  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Word modal state
  const [selectedWord, setSelectedWord] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    loadPdf();
  }, []);

  const loadPdf = async () => {
    try {
      setLoading(true);
      setError(null);

      // Read PDF file as base64
      const base64 = await FileSystem.readAsStringAsync(pdf.uri, {
        encoding: 'base64',
      });

      // Generate HTML with embedded PDF data, resuming from last page
      const html = getPdfViewerHtml(base64, pdf.lastPage || 1);
      setHtmlContent(html);
    } catch (err: any) {
      setError(err?.message || 'Failed to load PDF');
    } finally {
      setLoading(false);
    }
  };

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);

      if (message.type === 'wordTapped') {
        const word = message.word?.trim();
        if (word && word.length >= 2) {
          setSelectedWord(word);
          setModalVisible(true);
        }
      } else if (message.type === 'pageChanged') {
        updatePdfProgress(pdf.id, message.page, message.totalPages);
      } else if (message.type === 'fullscreenChanged') {
        setIsFullscreen(message.isFullscreen);
        navigation.setOptions({
          headerShown: !message.isFullscreen,
        });
      }
    } catch {
      // Invalid message, ignore
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading PDF...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#0F172A"
        hidden={isFullscreen}
        translucent={isFullscreen}
      />

      {htmlContent && (
        <WebView
          ref={webViewRef}
          source={{ html: htmlContent }}
          style={styles.webview}
          onMessage={handleMessage}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['*']}
          allowFileAccess
          mixedContentMode="always"
          startInLoadingState
          renderLoading={() => (
            <View style={[styles.webviewLoading, { backgroundColor: colors.background }]}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
        />
      )}

      <WordModal
        visible={modalVisible}
        word={selectedWord}
        pdfName={pdf.name}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 32,
    marginTop: 12,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  webviewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
