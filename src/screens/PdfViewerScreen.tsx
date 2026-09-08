import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  StatusBar,
  BackHandler,
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

const OUT_OF_MEMORY_MESSAGE =
  'This PDF needed more memory than the device could give it, so the viewer was closed.';

export const PdfViewerScreen: React.FC = () => {
  const { theme } = useTheme();
  const route = useRoute<RouteProp<RouteParams, 'PdfViewer'>>();
  const navigation = useNavigation();
  const { pdf } = route.params;
  const webViewRef = useRef<WebView>(null);
  const colors = theme.colors;
  const progressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [viewer, setViewer] = useState<{ htmlUri: string; dirUri: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedWord, setSelectedWord] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Latest page from the WebView, so a pending debounced save can be flushed
  // if the screen unmounts before the timer fires.
  const pendingProgress = useRef<{ page: number; totalPages: number } | null>(null);
  const generatedHtmlUri = useRef<string | null>(null);

  useEffect(() => {
    // Defer PDF loading slightly to let the navigation animation finish
    const timer = setTimeout(() => loadPdf(), 100);
    return () => clearTimeout(timer);
  }, []);

  // Flush any debounced progress write and clean up the generated HTML file.
  useEffect(() => {
    return () => {
      if (progressTimer.current) {
        clearTimeout(progressTimer.current);
        progressTimer.current = null;
      }
      const pending = pendingProgress.current;
      if (pending) {
        updatePdfProgress(pdf.id, pending.page, pending.totalPages).catch(() => {});
      }
      if (generatedHtmlUri.current) {
        FileSystem.deleteAsync(generatedHtmlUri.current, { idempotent: true }).catch(() => {});
      }
    };
  }, []);

  // Android back button leaves fullscreen before it leaves the screen.
  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!isFullscreen) return false;
      webViewRef.current?.injectJavaScript(
        `if (typeof toggleFullscreen === 'function') toggleFullscreen(); true;`
      );
      setIsFullscreen(false);
      return true;
    });
    return () => handler.remove();
  }, [isFullscreen]);

  const loadPdf = async () => {
    try {
      setLoading(true);
      setError(null);

      const info = await FileSystem.getInfoAsync(pdf.uri);
      if (!info.exists) {
        setError('This file is no longer on your device. Open it again to restore it.');
        return;
      }

      // The bytes are deliberately not read here: the viewer HTML goes next to
      // the PDF and PDF.js fetches the file itself over file://. Reading it to
      // base64 and inlining it is what used to exhaust memory on big documents.
      const lastSlash = pdf.uri.lastIndexOf('/');
      const dirUri = pdf.uri.slice(0, lastSlash + 1);
      // Already a URI segment, so usable as-is as a relative URL.
      const pdfUrlSegment = pdf.uri.slice(lastSlash + 1);

      const html = getPdfViewerHtml(
        pdfUrlSegment,
        pdf.lastPage || 1,
        pdf.name
      );

      const viewerUri = `${dirUri}.viewer-${pdf.id}.html`;
      await FileSystem.writeAsStringAsync(viewerUri, html);
      generatedHtmlUri.current = viewerUri;
      setViewer({ htmlUri: viewerUri, dirUri });
    } catch (err: any) {
      setError(err?.message || 'Failed to load PDF');
    } finally {
      setLoading(false);
    }
  };

  // Fallback for WebViews that refuse file-to-file access: hand the bytes over
  // directly. Only viable for documents small enough to fit in memory, which is
  // exactly the set that already worked before this change.
  const loadViaBase64Fallback = async () => {
    try {
      const base64 = await FileSystem.readAsStringAsync(pdf.uri, { encoding: 'base64' });
      webViewRef.current?.injectJavaScript(
        `window.__loadPdfFromBase64('${base64}'); true;`
      );
    } catch {
      webViewRef.current?.injectJavaScript(
        `window.__pdfLoadFailed('The file could not be read.'); true;`
      );
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
        // Debounced so a fast scroll doesn't write on every page boundary.
        pendingProgress.current = { page: message.page, totalPages: message.totalPages };
        if (progressTimer.current) clearTimeout(progressTimer.current);
        progressTimer.current = setTimeout(() => {
          updatePdfProgress(pdf.id, message.page, message.totalPages);
          pendingProgress.current = null;
        }, 1000);
      } else if (message.type === 'fullscreenChanged') {
        setIsFullscreen(message.isFullscreen);
      } else if (message.type === 'goBack') {
        navigation.goBack();
      } else if (message.type === 'urlLoadFailed') {
        loadViaBase64Fallback();
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

      {viewer && (
        <WebView
          ref={webViewRef}
          source={{ uri: viewer.htmlUri }}
          style={styles.webview}
          onMessage={handleMessage}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['*']}
          allowFileAccess
          // Gives the file:// page a scheme-based origin, so PDF.js's XHR for the
          // PDF next to it is not rejected as a null-origin request. Deliberately
          // not allowUniversalAccessFromFileURLs: file-to-file is all we need, and
          // the universal grant would let the CDN script read the app's own files.
          allowFileAccessFromFileURLs
          // Without this iOS grants read access to the HTML file alone, so the
          // sibling PDF stays outside the sandbox and the fetch fails.
          allowingReadAccessToURL={viewer.dirUri}
          // A large PDF can still exhaust the renderer. Handling these turns that
          // into an error screen instead of taking the whole app down.
          onRenderProcessGone={() => setError(OUT_OF_MEMORY_MESSAGE)}
          onContentProcessDidTerminate={() => setError(OUT_OF_MEMORY_MESSAGE)}
          onError={({ nativeEvent }) =>
            setError(nativeEvent.description || 'Failed to display this PDF.')
          }
          mixedContentMode="always"
          cacheEnabled={true}
          cacheMode="LOAD_DEFAULT"
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
        onClose={() => {
          setModalVisible(false);
          webViewRef.current?.injectJavaScript(
            `document.querySelectorAll('.word-highlight').forEach(el => el.classList.remove('word-highlight')); true;`
          );
        }}
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
