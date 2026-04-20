import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';

type Props = {
  userId: string;
  onComplete: () => void;
};

const PRIMARY = '#4A90D9';
const DEFAULT_AVATAR_URL =
  'https://ui-avatars.com/api/?name=HabiMatch&background=E5EAF4&color=AEB7C5&size=256&rounded=true&bold=true';

export default function ProfilePhotoScreen({ userId, onComplete }: Props) {
  const [selectedAsset, setSelectedAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const saveProfileAvatar = async (avatarUrl: string) => {
    const { error: profileError } = await supabase.from('profiles').upsert(
      {
        id: userId,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );

    if (profileError) {
      throw profileError;
    }
  };

  const handleChooseImage = async () => {
    setError('');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Allow photo access to choose a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedAsset(result.assets[0] ?? null);
    }
  };

  const handleSkip = async () => {
    setError('');
    setSaving(true);
    try {
      await saveProfileAvatar(DEFAULT_AVATAR_URL);
      onComplete();
    } catch {
      setError('We could not save the default profile picture. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleContinue = async () => {
    if (!selectedAsset?.uri) {
      Alert.alert('Choose a photo', 'Select a profile picture or tap Skip for now.');
      return;
    }

    setError('');
    setSaving(true);

    try {
      const response = await fetch(selectedAsset.uri);
      const imageBlob = await response.blob();
      const fileExtension =
        selectedAsset.fileName?.split('.').pop()?.toLowerCase()
        ?? selectedAsset.mimeType?.split('/').pop()?.toLowerCase()
        ?? 'jpg';
      const contentType = selectedAsset.mimeType ?? imageBlob.type ?? 'image/jpeg';
      const filePath = `${userId}/${Date.now()}.${fileExtension}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(filePath, imageBlob, {
          contentType,
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(filePath);

      await saveProfileAvatar(publicUrlData.publicUrl);
      onComplete();
    } catch (uploadFailure) {
      const detail =
        uploadFailure instanceof Error ? uploadFailure.message : 'Unknown upload error.';
      setError(`We could not upload your profile picture. ${detail}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <Text style={styles.logo}>HabiMatch</Text>
          <Text style={styles.tagline}>Set up your first impression</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add a profile picture</Text>
          <Text style={styles.cardSubtitle}>
            Upload a photo now or skip for the moment and keep moving.
          </Text>

          <View style={styles.uploadFrame}>
            <View style={styles.previewCircle}>
              {selectedAsset?.uri ? (
                <Image source={{ uri: selectedAsset.uri }} style={styles.previewImage} />
              ) : (
                <Ionicons name="cloud-upload-outline" size={42} color={PRIMARY} />
              )}
            </View>

            <Text style={styles.uploadText}>
              {selectedAsset?.uri ? 'Photo selected. You can continue or choose a different one.' : 'Choose an image to upload'}
            </Text>

            <TouchableOpacity style={styles.chooseBtn} onPress={handleChooseImage} disabled={saving}>
              <Text style={styles.chooseBtnText}>
                {selectedAsset?.uri ? 'Choose a different image' : 'Choose image'}
              </Text>
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.primaryBtn, saving && styles.primaryBtnDisabled]}
            onPress={handleContinue}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Continue</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} disabled={saving}>
            <Text style={styles.skipBtnText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PRIMARY },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: PRIMARY },
  brand: { alignItems: 'center', marginBottom: 28 },
  logo: { fontSize: 34, fontWeight: '700', color: '#fff', letterSpacing: 1 },
  tagline: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  cardTitle: { fontSize: 22, fontWeight: '700', marginBottom: 4, color: '#111', textAlign: 'center' },
  cardSubtitle: { fontSize: 14, color: '#666', marginBottom: 20, textAlign: 'center', lineHeight: 20 },
  uploadFrame: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#E1E7F0',
    borderRadius: 20,
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: '#FCFDFF',
  },
  previewCircle: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 2,
    borderColor: '#D9DEE8',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 18,
  },
  previewImage: { width: '100%', height: '100%' },
  uploadText: { fontSize: 16, color: '#444', textAlign: 'center', marginBottom: 18, lineHeight: 22 },
  chooseBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  chooseBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  error: {
    color: '#d32f2f',
    backgroundColor: '#fdecea',
    borderRadius: 8,
    padding: 10,
    marginTop: 16,
    fontSize: 14,
    textAlign: 'center',
  },
  primaryBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  skipBtn: { alignItems: 'center', marginTop: 16 },
  skipBtnText: { color: PRIMARY, fontSize: 15, fontWeight: '700' },
});
