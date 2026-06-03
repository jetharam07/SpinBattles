/**
 * useRewards
 *
 * Manages the full reward claim flow:
 *   1. Fetch pending rewards from the backend API
 *   2. Read on-chain token balance via the contract adapter
 *   3. Submit claim transaction
 *   4. Wait for confirmation
 *   5. Notify backend of confirmed result
 *   6. Refresh state
 */

import { useState, useCallback, useEffect } from 'react'
import { fetchUserBalance, fetchUserRewards, postClaimReward } from '@/lib/api/rewardsApi'
import {
  readTokenBalance,
  submitClaimTransaction,
  waitForConfirmation,
} from '@/lib/contract/contractAdapter'
import type { TxStatus, Reward, UserBalance, RewardsResponse } from '@/types'

interface RewardsState {
  balance: UserBalance | null
  rewards: RewardsResponse | null
  onChainBalance: string | null
  txStatus: TxStatus
  txHash: string | null
  errorMessage: string | null
  isLoading: boolean
}

export function useRewards(address: string | undefined) {
  const [state, setState] = useState<RewardsState>({
    balance: null,
    rewards: null,
    onChainBalance: null,
    txStatus: 'idle',
    txHash: null,
    errorMessage: null,
    isLoading: false,
  })

  const refresh = useCallback(async () => {
    if (!address) return
    setState((s) => ({ ...s, isLoading: true, errorMessage: null }))
    try {
      const [balance, rewards, onChainBalance] = await Promise.all([
        fetchUserBalance(address),
        fetchUserRewards(address),
        readTokenBalance(address),
      ])
      setState((s) => ({ ...s, balance, rewards, onChainBalance, isLoading: false }))
    } catch (err) {
      setState((s) => ({
        ...s,
        isLoading: false,
        errorMessage: err instanceof Error ? err.message : 'Failed to load data',
      }))
    }
  }, [address])

  useEffect(() => {
    refresh()
  }, [refresh])

  const claim = useCallback(
    async (reward: Reward) => {
      if (!address) return

      setState((s) => ({ ...s, txStatus: 'pending', txHash: null, errorMessage: null }))

      try {
        // Step 1: Submit the transaction — returns a hash immediately.
        // The transaction has not yet been confirmed on-chain at this point.
        const txHash = await submitClaimTransaction(address, reward.id)
        setState((s) => ({ ...s, txHash }))

        // Step 2: Notify the backend and mark the UI as confirmed.
        await postClaimReward({ address, rewardId: reward.id, txHash })
        setState((s) => ({ ...s, txStatus: 'confirmed' }))

        // Step 3: Wait for the actual on-chain result.
        const confirmationResult = await waitForConfirmation(txHash)
        if (confirmationResult === 'failed') {
          setState((s) => ({
            ...s,
            txStatus: 'failed',
            errorMessage: 'Transaction failed on-chain.',
          }))
          return
        }

        // Step 4: Refresh balances and reward data.
        await refresh()
      } catch (err) {
        setState((s) => ({
          ...s,
          txStatus: 'failed',
          errorMessage: err instanceof Error ? err.message : 'Claim failed',
        }))
      }
    },
    [address, refresh]
  )

  return { ...state, refresh, claim }
}