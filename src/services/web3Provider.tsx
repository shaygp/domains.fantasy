import { createConfig, WagmiProvider } from 'wagmi';
import { mainnet, sepolia, arbitrum } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConnectKitProvider, getDefaultConfig } from 'connectkit';
import { ReactNode } from 'react';

const domaTestnet = {
  id: 1234,
  name: 'Doma Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'DOMA',
    symbol: 'DOMA',
  },
  rpcUrls: {
    default: { http: ['https://testnet.doma.xyz'] },
    public: { http: ['https://testnet.doma.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://explorer.doma.xyz' },
  },
  testnet: true,
};

const config = createConfig(
  getDefaultConfig({
    appName: 'Fantasy Domains',
    chains: [mainnet, sepolia, arbitrum, domaTestnet],
    walletConnectProjectId: process.env.VITE_WALLETCONNECT_PROJECT_ID || '',
  })
);

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider theme="midnight">
          {children}
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}