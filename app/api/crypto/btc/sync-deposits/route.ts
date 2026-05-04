import { NextResponse } from 'next/server';
import { AuthService } from '@/src/domains/auth/services/auth.service';
import { CryptoDepositService } from '@/src/domains/crypto/services/deposit.service';
import { BitcoinService } from '@/src/domains/crypto/services/bitcoin.service';
import prisma from '@/src/shared/database/prisma';

export async function POST() {
  try {
    const user = await AuthService.getSessionUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const btcRecord = await prisma.cryptoAddress.findUnique({
      where: { userId_coin: { userId: user.id, coin: 'BTC' } },
    });
    if (!btcRecord) return NextResponse.json({ error: 'No BTC wallet' }, { status: 404 });

    // Fetch UTXOs for the user's address
    const utxos = await BitcoinService.fetchUtxos(btcRecord.address);
    if (utxos.length === 0) {
      return NextResponse.json({ message: 'No deposits detected yet', status: 'NONE' });
    }

    // For simplicity, we process the first UTXO that hasn't been fully credited.
    // In a production system, you'd track which txids have been processed.
    const pendingUtxos = utxos.filter(utxo => !utxo.status.confirmed); // only unconfirmed? We'll check for confirmed ones too.
    // Let's process any UTXO with at least 1 confirmation and that hasn't been processed yet.
    // We'll need a way to mark processed txids. We can use a simple database table or check the metadata of existing transactions.
    // For now, we'll process the first confirmed UTXO that we haven't seen.
    const confirmed = utxos.filter(utxo => utxo.status.confirmed);
    if (confirmed.length === 0) {
      return NextResponse.json({ message: 'Deposits are waiting for confirmations', status: 'PENDING' });
    }

    // Process the first confirmed UTXO (simplified; ideally you'd process all that haven't been credited)
    const utxo = confirmed[0];

    // Check if this txid already exists in a deposit transaction (avoid double credit)
    const existing = await prisma.ledgerEntry.findFirst({
      where: { reference: utxo.txid, userId: user.id, type: 'DEPOSIT', direction: 'CREDIT' },
    });
    if (existing) {
      return NextResponse.json({ message: 'Deposit already processed', status: 'ALREADY' });
    }

    // Process deposit with fee
    const result = await CryptoDepositService.processDeposit({
      userId: user.id,
      grossAmountSatoshis: BigInt(utxo.value),
      txid: utxo.txid,
    });

    return NextResponse.json({
      message: `Deposit of ${utxo.value} satoshis received. Fee: ${result.feeAmount} sat. Net: ${result.netAmount} sat.`,
      status: 'COMPLETED',
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed';
    console.error('[sync-deposits]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}