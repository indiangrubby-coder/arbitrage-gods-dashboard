import type { NextApiRequest, NextApiResponse } from 'next';

interface Account {
  account_id: string;
  vendor_name: string;
  spend: number;
  budget: number;
  account_status: number; // 0 = active, 100 = suspended
}

interface ApiResponse {
  success: boolean;
  accounts: Account[];
  message?: string;
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  try {
    // Mock account data for simulation mode
    const mockAccounts: Account[] = [
      {
        account_id: 'acc_001',
        vendor_name: 'Tech Startup Campaign',
        spend: 2450.50,
        budget: 5000,
        account_status: 0, // active
      },
      {
        account_id: 'acc_002',
        vendor_name: 'E-commerce Store',
        spend: 3890.75,
        budget: 4500,
        account_status: 0, // warning but active
      },
      {
        account_id: 'acc_003',
        vendor_name: 'SaaS Product Launch',
        spend: 1200.25,
        budget: 3000,
        account_status: 0, // active
      },
      {
        account_id: 'acc_004',
        vendor_name: 'Brand Awareness',
        spend: 5000.00,
        budget: 5000,
        account_status: 100, // suspended
      },
      {
        account_id: 'acc_005',
        vendor_name: 'Lead Generation',
        spend: 1850.60,
        budget: 2500,
        account_status: 0, // active
      },
    ];

    res.status(200).json({
      success: true,
      accounts: mockAccounts,
    });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({
      success: false,
      accounts: [],
      message: 'Failed to fetch accounts',
    });
  }
}
