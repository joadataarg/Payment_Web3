'use client'

import { useState, useCallback } from 'react'

/**
 * Hook para conversión ARS → USDT usando Cavos
 * 
 * Usa una tasa fija de conversión: $1,000 ARS = 1 USDT
 * Esta es una implementación frontend para pruebas.
 * 
 * @returns Función de conversión y estado de carga
 */
export function useCavosConversion() {
  const [isConverting, setIsConverting] = useState(false)

  /**
   * Convertir ARS a USDT
   * 
   * @param amountARS - Cantidad en pesos argentinos
   * @returns Cantidad en USDT
   */
  const convertARSToUSDT = useCallback(async (amountARS: number): Promise<number> => {
    setIsConverting(true)
    
    try {
      // Tasa fija: $1,000 ARS = 1 USDT
      const exchangeRate = 1000
      const usdtAmount = amountARS / exchangeRate
      
      // Simular delay de red (opcional, para pruebas)
      await new Promise(resolve => setTimeout(resolve, 500))
      
      return usdtAmount
    } catch (error) {
      console.error('Error en conversión ARS → USDT:', error)
      throw error
    } finally {
      setIsConverting(false)
    }
  }, [])

  /**
   * Convertir USDT a ARS (inverso)
   * 
   * @param amountUSDT - Cantidad en USDT
   * @returns Cantidad en ARS
   */
  const convertUSDTToARS = useCallback(async (amountUSDT: number): Promise<number> => {
    setIsConverting(true)
    
    try {
      // Tasa fija: 1 USDT = $1,000 ARS
      const exchangeRate = 1000
      const arsAmount = amountUSDT * exchangeRate
      
      // Simular delay de red
      await new Promise(resolve => setTimeout(resolve, 500))
      
      return arsAmount
    } catch (error) {
      console.error('Error en conversión USDT → ARS:', error)
      throw error
    } finally {
      setIsConverting(false)
    }
  }, [])

  return {
    convertARSToUSDT,
    convertUSDTToARS,
    isConverting,
    exchangeRate: 1000 // Tasa fija: $1,000 ARS = 1 USDT
  }
}

