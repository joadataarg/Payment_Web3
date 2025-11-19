'use client'

import { useState, useCallback } from 'react'

/**
 * Hook para conversión ARS → USDC usando ChipiPay
 * 
 * Usa una tasa fija de conversión: $1,000 ARS = 1 USDC
 * Esta es una implementación frontend para pruebas.
 * 
 * @returns Función de conversión y estado de carga
 */
export function useChipiPayConversion() {
  const [isConverting, setIsConverting] = useState(false)

  /**
   * Convertir ARS a USDC
   * 
   * @param amountARS - Cantidad en pesos argentinos
   * @returns Cantidad en USDC
   */
  const convertARSToUSDC = useCallback(async (amountARS: number): Promise<number> => {
    setIsConverting(true)
    
    try {
      // Tasa fija: $1,000 ARS = 1 USDC
      const exchangeRate = 1000
      const usdcAmount = amountARS / exchangeRate
      
      // Simular delay de red (opcional, para pruebas)
      await new Promise(resolve => setTimeout(resolve, 500))
      
      return usdcAmount
    } catch (error) {
      console.error('Error en conversión ARS → USDC:', error)
      throw error
    } finally {
      setIsConverting(false)
    }
  }, [])

  /**
   * Convertir USDC a ARS (inverso)
   * 
   * @param amountUSDC - Cantidad en USDC
   * @returns Cantidad en ARS
   */
  const convertUSDCToARS = useCallback(async (amountUSDC: number): Promise<number> => {
    setIsConverting(true)
    
    try {
      // Tasa fija: 1 USDC = $1,000 ARS
      const exchangeRate = 1000
      const arsAmount = amountUSDC * exchangeRate
      
      // Simular delay de red
      await new Promise(resolve => setTimeout(resolve, 500))
      
      return arsAmount
    } catch (error) {
      console.error('Error en conversión USDC → ARS:', error)
      throw error
    } finally {
      setIsConverting(false)
    }
  }, [])

  return {
    convertARSToUSDC,
    convertUSDCToARS,
    isConverting,
    exchangeRate: 1000 // Tasa fija: $1,000 ARS = 1 USDC
  }
}

