import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
import { TextInput, Button, Portal, Dialog, IconButton, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { dbService } from '../services/dbService';
import { Item } from '../types';

interface AddItemModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSuccess: () => void;
  initialItem?: Item | null;
}

const AddItemModal: React.FC<AddItemModalProps> = ({ visible, onDismiss, onSuccess, initialItem }) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [profit, setProfit] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      if (initialItem) {
        setName(initialItem.name);
        setBasePrice(initialItem.base_price.toString());
        setProfit(initialItem.profit_percentage.toString());
        setImage(initialItem.image_uri || null);
      } else {
        setName('');
        setBasePrice('');
        setProfit('');
        setImage(null);
      }
    }
  }, [visible, initialItem]);

  const pickImage = async (useCamera: boolean) => {
    let result;
    if (useCamera) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') return;
      result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
      });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
      });
    }

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!name || !basePrice || !profit) return;
    setLoading(true);
    try {
      const itemData = {
        name,
        base_price: parseFloat(basePrice),
        profit_percentage: parseFloat(profit),
        image_uri: image || undefined,
      };

      if (initialItem) {
        await dbService.updateItem({ ...itemData, id: initialItem.id });
      } else {
        await dbService.addItem(itemData);
      }
      
      onSuccess();
      onDismiss();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title>{initialItem ? t('editItem') : t('addItem')}</Dialog.Title>
        <Dialog.ScrollArea>
          <ScrollView contentContainerStyle={styles.scrollArea}>
            <TextInput
              label={t('name')}
              value={name}
              onChangeText={setName}
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label={t('basePrice')}
              value={basePrice}
              onChangeText={setBasePrice}
              mode="outlined"
              keyboardType="numeric"
              style={styles.input}
            />
            <TextInput
              label={t('profitPercentage')}
              value={profit}
              onChangeText={setProfit}
              mode="outlined"
              keyboardType="numeric"
              style={styles.input}
            />

            <View style={styles.imageContainer}>
              {image ? (
                <Image source={{ uri: image }} style={styles.image} />
              ) : (
                <View style={[styles.image, styles.placeholder]}>
                  <IconButton icon="camera" size={40} />
                </View>
              )}
              <View style={styles.imageButtons}>
                <Button onPress={() => pickImage(true)}>{t('takePhoto')}</Button>
                <Button onPress={() => pickImage(false)}>{t('chooseGallery')}</Button>
              </View>
            </View>
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button onPress={onDismiss}>{t('cancel')}</Button>
          <Button onPress={handleSave} loading={loading} disabled={loading || !name}>{t('save')}</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialog: {
    maxHeight: '90%',
  },
  scrollArea: {
    paddingVertical: 8,
  },
  input: {
    marginBottom: 12,
  },
  imageContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  image: {
    width: 200,
    height: 150,
    borderRadius: 8,
  },
  placeholder: {
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageButtons: {
    flexDirection: 'row',
    marginTop: 8,
  },
});

export default AddItemModal;
