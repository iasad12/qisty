import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, FlatList, Image } from 'react-native';
import { TextInput, Button, Portal, Dialog, List, Searchbar, Text, Divider, IconButton, Avatar } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import * as Contacts from 'expo-contacts';
import * as ImagePicker from 'expo-image-picker';
import { dbService } from '../services/dbService';

import { Customer } from '../types';

interface AddCustomerModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSuccess: () => void;
  initialCustomer?: Customer | null;
}

const AddCustomerModal: React.FC<AddCustomerModalProps> = ({ visible, onDismiss, onSuccess, initialCustomer }) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [contacts, setContacts] = useState<Contacts.Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredContacts, setFilteredContacts] = useState<Contacts.Contact[]>([]);

  useEffect(() => {
    if (visible) {
      if (initialCustomer) {
        setName(initialCustomer.name);
        setPhone(initialCustomer.phone);
        setImageUri(initialCustomer.image_uri || null);
      } else {
        setName('');
        setPhone('');
        setImageUri(null);
      }
      setShowPicker(false);
    }
  }, [visible, initialCustomer]);

  const fetchContacts = async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status === 'granted') {
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.Image],
        sort: Contacts.SortTypes.FirstName,
      });
      setContacts(data);
      setFilteredContacts(data);
      setShowPicker(true);
    }
  };

  const onSearchContacts = (query: string) => {
    setSearchQuery(query);
    const filtered = contacts.filter(c => 
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      (c.phoneNumbers && c.phoneNumbers.some(p => p.number?.includes(query)))
    );
    setFilteredContacts(filtered);
  };

  const selectContact = (contact: Contacts.Contact) => {
    setName(contact.name);
    if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
      const num = contact.phoneNumbers[0].number || '';
      setPhone(num.replace(/[\s\-\(\)]/g, ''));
    }
    if (contact.imageAvailable && contact.image?.uri) {
      setImageUri(contact.image.uri);
    }
    setShowPicker(false);
  };

  const pickImage = async (useCamera: boolean) => {
    let result;
    if (useCamera) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') return;
      result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });
    }

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!name || !phone) return;
    setLoading(true);
    try {
      const customerData = { name, phone, image_uri: imageUri || undefined };
      if (initialCustomer) {
        await dbService.updateCustomer({ ...initialCustomer, ...customerData });
      } else {
        await dbService.addCustomer(customerData);
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
        <Dialog.Title>{initialCustomer ? t('editCustomer') : t('addCustomer')}</Dialog.Title>
        <Dialog.ScrollArea>
          <ScrollView contentContainerStyle={styles.scrollArea}>
            {!showPicker ? (
              <View>
                <View style={styles.imageContainer}>
                  {imageUri ? (
                    <Avatar.Image size={100} source={{ uri: imageUri }} />
                  ) : (
                    <Avatar.Icon size={100} icon="account" />
                  )}
                  <View style={styles.imageButtons}>
                    <IconButton icon="camera" onPress={() => pickImage(true)} />
                    <IconButton icon="image" onPress={() => pickImage(false)} />
                  </View>
                </View>

                <TextInput
                  label={t('name')}
                  value={name}
                  onChangeText={setName}
                  mode="outlined"
                  style={styles.input}
                />
                <TextInput
                  label={t('phone')}
                  value={phone}
                  onChangeText={setPhone}
                  mode="outlined"
                  keyboardType="phone-pad"
                  style={styles.input}
                />
                <Button 
                  icon="contacts" 
                  mode="outlined" 
                  onPress={fetchContacts}
                  style={styles.contactBtn}
                >
                  {t('selectContact')}
                </Button>
              </View>
            ) : (
              <View style={styles.pickerContainer}>
                <Searchbar
                  placeholder={t('selectContact')}
                  onChangeText={onSearchContacts}
                  value={searchQuery}
                  style={styles.searchBar}
                />
                <FlatList
                  data={filteredContacts.slice(0, 50)}
                  keyExtractor={(item, index) => (item as any).id || index.toString()}
                  renderItem={({ item }) => (
                    <List.Item
                      title={item.name}
                      description={item.phoneNumbers?.[0]?.number}
                      onPress={() => selectContact(item)}
                      left={props => (
                        item.imageAvailable && item.image?.uri 
                          ? <Avatar.Image {...props} size={40} source={{ uri: item.image.uri }} />
                          : <Avatar.Icon {...props} size={40} icon="account" />
                      )}
                    />
                  )}
                  style={styles.list}
                  ItemSeparatorComponent={() => <Divider />}
                />
                <Button onPress={() => setShowPicker(false)}>{t('cancel')}</Button>
              </View>
            )}
          </ScrollView>
        </Dialog.ScrollArea>
        {!showPicker && (
          <Dialog.Actions>
            <Button onPress={onDismiss}>{t('cancel')}</Button>
            <Button onPress={handleSave} loading={loading} disabled={loading || !name}>{t('save')}</Button>
          </Dialog.Actions>
        )}
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
  imageContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  imageButtons: {
    flexDirection: 'row',
    marginTop: 8,
  },
  input: {
    marginBottom: 12,
  },
  contactBtn: {
    marginTop: 8,
  },
  pickerContainer: {
    height: 400,
  },
  searchBar: {
    marginBottom: 8,
  },
  list: {
    flex: 1,
  },
});

export default AddCustomerModal;
