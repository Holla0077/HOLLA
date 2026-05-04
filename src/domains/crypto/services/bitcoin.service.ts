// src/domains/crypto/services/bitcoin.service.ts
import {
  deriveBitcoinAddress,
  fetchAddressUtxos,
  fetchTxConfirmations,
} from '@/lib/bitcoin';
import type { UtxoEntry, TxStatus } from '@/lib/bitcoin';

export class BitcoinService {
  static deriveAddress = deriveBitcoinAddress;
  static fetchUtxos = fetchAddressUtxos;
  static fetchConfirmations = fetchTxConfirmations;
}