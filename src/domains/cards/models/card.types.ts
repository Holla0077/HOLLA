export type CardTypeEnum = 'NIGHT' | 'GO_EAT' | 'BTC_GIFT';
export type CardStatusEnum = 'CREATED' | 'ACTIVATED' | 'REDEEMED' | 'EXPIRED';

export interface CreateCardInput {
  type: CardTypeEnum;
  currency?: string;
  initialValue: bigint;
  isReloadable?: boolean;
  kycRequired?: boolean;
  expiresAt?: Date;
  userId?: string; // optional, can be assigned later
}