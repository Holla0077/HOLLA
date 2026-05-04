export type LedgerEntryType =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'CONVERSION'
  | 'FEE'
  | 'CARD_PURCHASE'
  | 'MERCHANT_SETTLEMENT';

export type LedgerDirection = 'CREDIT' | 'DEBIT';