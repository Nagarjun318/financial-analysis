import { Liability } from '../domain/networth/calculateNetWorth';

export const sampleLiabilities: Liability[] = [
  {
    id: 'plot-loan',
    name: 'Plot Loan',
    type: 'loan',
    openingPrincipal: 1200000,
    currentPrincipal: 845000,
    interestRateAnnual: 8.5,
    monthlyEMI: 18000,
    startDate: '2023-06-15',
    extraPaymentMonthly: 0
  },
  {
    id: 'car-loan',
    name: 'Car Loan',
    type: 'loan',
    openingPrincipal: 900000,
    currentPrincipal: 410000,
    interestRateAnnual: 9.2,
    monthlyEMI: 15500,
    startDate: '2024-02-01',
    extraPaymentMonthly: 2000
  }
];
