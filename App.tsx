import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppController } from './src/controllers/AppController';
import { ErrorBoundary } from './src/views/ErrorBoundary';

export default function App() {
  return <ErrorBoundary><SafeAreaProvider><AppController /></SafeAreaProvider></ErrorBoundary>;
}
