import type { UserBalance, RewardsResponse, ClaimRequest, ClaimResponse } from '@/types'

const BASE = '/api'

export async function fetchUserBalance(address: string): Promise<UserBalance> {
  const res = await fetch(`${BASE}/user/balance?address=${encodeURIComponent(address)}`)
  if (!res.ok) throw new Error('Failed to fetch balance')
  return res.json()
}

export async function fetchUserRewards(address: string): Promise<RewardsResponse> {
  const res = await fetch(`${BASE}/user/rewards?address=${encodeURIComponent(address)}`)
  if (!res.ok) throw new Error('Failed to fetch rewards')
  return res.json()
}

export async function postClaimReward(payload: ClaimRequest): Promise<ClaimResponse> {
  const res = await fetch(`${BASE}/rewards/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Claim request failed')
  }
  return res.json()
}
