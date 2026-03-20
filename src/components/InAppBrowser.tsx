import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface InAppBrowserProps {
  visible: boolean;
  url: string;
  onClose: () => void;
}

export const InAppBrowser: React.FC<InAppBrowserProps> = ({ visible, url, onClose }) => {
  const { theme } = useTheme();
  const colors = theme.colors;
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.surface} />

        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.6}>
            <Ionicons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.titleWrap}>
            <Ionicons name="globe-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {title || url}
            </Text>
          </View>
          {loading && <ActivityIndicator size="small" color={colors.primary} style={styles.spinner} />}
        </View>

        {/* WebView */}
        <WebView
          source={{ uri: url }}
          style={styles.webview}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={(e) => {
            setLoading(false);
            setTitle(e.nativeEvent.title);
          }}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState={false}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 40) + 8 : 54,
    paddingBottom: 12,
    paddingHorizontal: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  title: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  spinner: {
    marginLeft: 4,
  },
  webview: {
    flex: 1,
  },
});
