import { useAccount, useDisconnect } from 'wagmi'

export function useWallet() {
  const { address, isConnected, chain } = useAccount()
  const { disconnect } = useDisconnect()

  return {
    address,
    isConnected,
    chain,
    disconnect,
  }
}
