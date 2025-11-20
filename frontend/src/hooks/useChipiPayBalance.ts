 'use client'

import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useProvider } from '@starknet-react/core'
import { useChipiPay } from '@/components/providers/ChipiPayProvider'
import { Contract } from 'starknet'
import toast from 'react-hot-toast'

/**
 * Hook para consultar balance USDC usando ChipiPay
 * 
 * Soporta:
 * - Wallets conectadas (usando useAccount)
 * - Direcciones arbitrarias (pasando address como parámetro)
 * 
 * @param address - Dirección opcional. Si no se proporciona, usa la wallet conectada
 * @param token - Token a consultar ('USDC' | 'USDT'). Default: 'USDC'
 */
export function useChipiPayBalance(
  address?: string,
  token: 'USDC' | 'USDT' = 'USDC'
) {
  const { account } = useAccount()
  const { provider: hookProvider } = useProvider() || {}
  const { tokenAddresses } = useChipiPay()
  const [balance, setBalance] = useState<string>('0')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Determinar la dirección a usar
  const targetAddress = address || account?.address

  // ABI mínimo para ERC20 balanceOf
  const erc20Abi = [
    {
      name: 'balanceOf',
      type: 'function',
      inputs: [
        {
          name: 'account',
          type: 'felt'
        }
      ],
      outputs: [
        {
          name: 'balance',
          type: 'Uint256'
        }
      ],
      state_mutability: 'view'
    },
    {
      name: 'decimals',
      type: 'function',
      inputs: [],
      outputs: [
        {
          name: 'decimals',
          type: 'felt'
        }
      ],
      state_mutability: 'view'
    }
  ]

  const tokenAddress = token === 'USDC' ? tokenAddresses.USDC : tokenAddresses.USDT

  // Usar useReadContract (nueva API) en lugar de useContractRead
  const readHook = useReadContract as any
  const readResult = readHook
    ? readHook({
        functionName: 'balanceOf',
        args: targetAddress ? [targetAddress] : undefined,
        abi: erc20Abi,
        address: tokenAddress,
        enabled:
          !!targetAddress && !!tokenAddress && tokenAddress !== '0x0000000000000000000000000000000000000000'
      })
    : undefined

  const balanceData = readResult?.data
  const contractLoading = readResult?.isPending
  const contractError = readResult?.error
  const refetchBalance = readResult?.refetch

  // Función para consultar balance manualmente (para direcciones arbitrarias)
  const fetchBalance = async (targetAddr: string) => {
    if (!targetAddr) {
      setError('Wallet address not provided')
      return
    }
    
    if (!tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000') {
      console.warn(`⚠️ Token address for ${token} not configured. Balance will be 0.`)
      setBalance('0')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Crear contrato temporal para consultar balance
      const provider = (account as any)?.provider || hookProvider
      if (!provider) throw new Error('No provider available to read contract')

      const contract = new Contract(erc20Abi, tokenAddress, provider)

      // Consultar decimals
      const decimalsResult = await contract.decimals()
      const decimals = Number(decimalsResult)

      // Consultar balance
      const balanceResult = await contract.balanceOf(targetAddr)
      const balanceBigInt = normalizeUint256ToBigInt(balanceResult)

      // Convertir a formato legible sin perder precision
      const balanceFormatted = formatWithDecimals(balanceBigInt, decimals, 6)

      setBalance(balanceFormatted)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error fetching balance'
      setError(errorMsg)
      console.error(`❌ Error obteniendo balance ${token}:`, err)
      toast.error(`Error obteniendo balance: ${errorMsg}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Efecto para consultar balance cuando cambia la dirección o se obtiene data del contrato
  useEffect(() => {
    if (balanceData && !address) {
      // Si tenemos data del hook useReadContract
      try {
        const balanceBigInt = normalizeUint256ToBigInt(balanceData)
        // Asumir 6 decimals para USDC/USDT
        const balanceFormatted = formatWithDecimals(balanceBigInt, 6, 6)
        setBalance(balanceFormatted)
        setIsLoading(false)
      } catch (err) {
        console.error('Error parsing balance data:', err)
      }
    } else if (targetAddress && address) {
      // Si se especificó una dirección, consultar manualmente
      fetchBalance(targetAddress)
    }
  }, [balanceData, targetAddress, address, tokenAddress, token])

  // Actualizar loading state
  useEffect(() => {
    if (contractLoading !== undefined) {
      setIsLoading(contractLoading)
    }
  }, [contractLoading])

  // Actualizar error state
  useEffect(() => {
    if (contractError) {
      setError(contractError.message || 'Error fetching balance')
    }
  }, [contractError])

  // Helpers
  function normalizeUint256ToBigInt(input: any): bigint {
    if (typeof input === 'bigint') return input
    if (input == null) return BigInt(0)

    // object with low/high
    if (typeof input === 'object') {
      if ('low' in input || 'high' in input) {
        const low = BigInt((input.low?.toString?.() ?? input.low ?? '0'))
        const high = BigInt((input.high?.toString?.() ?? input.high ?? '0'))
        return low + (high << BigInt(128))
      }
      // array-like [low, high]
      if (Array.isArray(input) && input.length >= 2) {
        const low = BigInt((input[0]?.toString?.() ?? input[0] ?? '0'))
        const high = BigInt((input[1]?.toString?.() ?? input[1] ?? '0'))
        return low + (high << BigInt(128))
      }
      if (typeof input.toString === 'function') {
        try {
          return BigInt(input.toString())
        } catch {
          return BigInt(0)
        }
      }
    }

    try {
      return BigInt(input.toString())
    } catch {
      return BigInt(0)
    }
  }

  function formatWithDecimals(value: bigint, decimals: number, displayDecimals = 6): string {
    if (decimals < 0) decimals = 0
    const neg = value < BigInt(0)
    const abs = neg ? -value : value
    const scale = BigInt(10) ** BigInt(decimals)
    const integerPart = abs / scale
    const fractionPart = abs % scale

    const fracFull = fractionPart.toString().padStart(decimals, '0')
    // take first `displayDecimals` digits from fraction (no rounding)
    const fracDisplay = (decimals <= displayDecimals)
      ? fracFull.padEnd(displayDecimals, '0')
      : fracFull.slice(0, displayDecimals)

    return `${neg ? '-' : ''}${integerPart.toString()}.${fracDisplay}`
  }

  return {
    balance,
    balanceRaw: balanceData,
    isLoading: isLoading || contractLoading,
    error: error || (contractError ? contractError.message : null),
    refetch: () => {
      if (targetAddress) return fetchBalance(targetAddress)
      if (typeof refetchBalance === 'function') return refetchBalance()
      return Promise.resolve()
    }
  }
}

// Export default for backward compatibility
export default useChipiPayBalance