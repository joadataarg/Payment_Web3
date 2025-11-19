'use client'

import { useState, useEffect } from 'react'
import { useAccount, useContractRead } from '@starknet-react/core'
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

  // Usar useContractRead si hay una wallet conectada y no se especifica address
  const { data: balanceData, isLoading: contractLoading, error: contractError } = useContractRead({
    functionName: 'balanceOf',
    args: targetAddress ? [targetAddress] : undefined,
    abi: erc20Abi,
    address: tokenAddress,
    enabled: !!targetAddress && !!tokenAddress && tokenAddress !== '0x0000000000000000000000000000000000000000'
  })

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
      const contract = new Contract(erc20Abi, tokenAddress, account?.provider)
      
      // Consultar decimals
      const decimalsResult = await contract.decimals()
      const decimals = Number(decimalsResult)

      // Consultar balance
      const balanceResult = await contract.balanceOf(targetAddr)
      const balanceBigInt = BigInt(balanceResult.low.toString()) + (BigInt(balanceResult.high?.toString() || '0') << 128n)
      
      // Convertir a formato legible
      const balanceFormatted = (Number(balanceBigInt) / Math.pow(10, decimals)).toFixed(6)
      
      setBalance(balanceFormatted)
      console.log(`✅ Balance ${token} obtenido:`, balanceFormatted)
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
      // Si tenemos data del hook useContractRead
      try {
        const balanceBigInt = BigInt(balanceData.low?.toString() || '0') + (BigInt(balanceData.high?.toString() || '0') << 128n)
        // Asumir 6 decimals para USDC/USDT
        const balanceFormatted = (Number(balanceBigInt) / Math.pow(10, 6)).toFixed(6)
        setBalance(balanceFormatted)
        setIsLoading(false)
      } catch (err) {
        console.error('Error parsing balance data:', err)
      }
    } else if (targetAddress && address) {
      // Si se especificó una dirección, consultar manualmente
      fetchBalance(targetAddress)
    }
  }, [balanceData, targetAddress, address])

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

  return {
    balance,
    balanceRaw: balanceData,
    isLoading: isLoading || contractLoading,
    error: error || (contractError ? contractError.message : null),
    refetch: () => targetAddress ? fetchBalance(targetAddress) : Promise.resolve()
  }
}

