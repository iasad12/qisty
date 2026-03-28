import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

const PlaceholderScreen = ({ name }: { name: string }) => (
  <View style={styles.container}>
    <Text variant="headlineMedium">{name} Screen</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PlaceholderScreen;
