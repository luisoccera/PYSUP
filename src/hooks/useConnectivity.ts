import * as Network from 'expo-network';

export function useConnectivity() {
  const state = Network.useNetworkState();
  const known = typeof state.isConnected === 'boolean';
  const isOffline = known && (!state.isConnected || state.isInternetReachable === false);
  return { isOffline, networkType: state.type };
}
