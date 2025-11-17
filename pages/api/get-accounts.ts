import type { NextApiRequest, NextApiResponse } from 'next';

interface Account {
  id: string;
  name: string;
  spend: number;
  budget: number;
  status: 'active' | 'suspended' | 'warning';
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Account[]>
) {
  // Mock account data for simulation mode
  const mockAccounts: Account[] = [
    {
      id: 'acc_001',
      name: 'Tech Startup Campaign',
      spend: 2450.50,
      budget: 5000,
      status: 'active',
    },
    {
      id: 'acc_002',
      name: 'E-commerce Store',
      spend: 3890.75,
      budget: 4500,
      status: 'warning',
    },
    {
      id: 'acc_003',
      name: 'SaaS Product Launch',
      spend: 1200.25,
      budget: 3000,
      status: 'active',
    },
    {
      id: 'acc_004',
      name: 'Brand Awareness',
      spend: 5000.00,
      budget: 5000,
      status: 'suspended',
    },
    {
      id: 'acc_005',
      name: 'Lead Generation',
      spend: 1850.60,
      budget: 2500,
      status: 'active',
    },
  ];

  res.status(200).json(mockAccounts);
}
