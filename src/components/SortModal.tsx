import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Portal, Dialog, Button, RadioButton, Text, Divider } from 'react-native-paper';
import { useTranslation } from 'react-i18next';

interface SortModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSave: (criteria: string, order: 'asc' | 'desc') => void;
  options: { label: string; value: string }[];
  initialCriteria: string;
  initialOrder: 'asc' | 'desc';
}

const SortModal: React.FC<SortModalProps> = ({
  visible,
  onDismiss,
  onSave,
  options,
  initialCriteria,
  initialOrder,
}) => {
  const { t } = useTranslation();
  const [criteria, setCriteria] = useState(initialCriteria);
  const [order, setOrder] = useState<'asc' | 'desc'>(initialOrder);

  useEffect(() => {
    if (visible) {
      setCriteria(initialCriteria);
      setOrder(initialOrder);
    }
  }, [visible, initialCriteria, initialOrder]);

  const handleSave = () => {
    onSave(criteria, order);
    onDismiss();
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title>{t('sortBy')}</Dialog.Title>
        <Dialog.ScrollArea style={styles.scrollArea}>
          <ScrollView>
            <RadioButton.Group onValueChange={value => setCriteria(value)} value={criteria}>
              {options.map(option => (
                <View key={option.value} style={styles.radioRow}>
                  <RadioButton value={option.value} />
                  <Text onPress={() => setCriteria(option.value)}>{option.label}</Text>
                </View>
              ))}
            </RadioButton.Group>

            <Divider style={styles.divider} />
            <Text variant="titleSmall" style={styles.sectionTitle}>{t('order')}</Text>

            <RadioButton.Group onValueChange={value => setOrder(value as 'asc' | 'desc')} value={order}>
              <View style={styles.radioRow}>
                <RadioButton value="asc" />
                <Text onPress={() => setOrder('asc')}>{t('asc')}</Text>
              </View>
              <View style={styles.radioRow}>
                <RadioButton value="desc" />
                <Text onPress={() => setOrder('desc')}>{t('desc')}</Text>
              </View>
            </RadioButton.Group>
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button onPress={onDismiss}>{t('cancel')}</Button>
          <Button onPress={handleSave}>{t('done')}</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialog: {
    maxHeight: '80%',
  },
  scrollArea: {
    paddingHorizontal: 0,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  divider: {
    marginVertical: 8,
  },
  sectionTitle: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    opacity: 0.7,
  },
});

export default SortModal;
