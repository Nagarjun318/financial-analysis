import { Asset } from '../domain/networth/calculateNetWorth';

export const sampleAssets: Asset[] = [
  {
    id: 'mf',
    name: 'Mutual Funds',
    type: 'investment',
    currentValue: 350000,
    lastUpdated: new Date().toISOString().split('T')[0]
  },
  {
    id: 'nps',
    name: 'NPS',
    type: 'investment',
    currentValue: 120000,
    lastUpdated: new Date().toISOString().split('T')[0]
  },
  {
    id: 'plot',
    name: 'Plot (Book Value)',
    type: 'property',
    currentValue: 1500000,
    lastUpdated: new Date().toISOString().split('T')[0]
  }
];
