'use client'

/**
 * Hook para obtener lista de SKUs usando ChipiPay SDK
 * 
 * Este hook usa el hook oficial useGetSkuList de @chipi-stack/nextjs
 * 
 * @example
 * ```tsx
 * const { getSkuListAsync, data, isLoading, error } = useGetSkuList()
 * 
 * const handleGetSkus = async () => {
 *   const skus = await getSkuListAsync({
 *     params: {
 *       // parámetros opcionales de filtrado
 *     },
 *     bearerToken: token
 *   })
 * }
 * ```
 */

import { useGetSkuList as useChipiGetSkuList } from '@chipi-stack/nextjs'
import { useAuth as useClerkAuth } from '@clerk/nextjs'

export function useGetSkuList() {
  const { getToken } = useClerkAuth()
  const { getSkuListAsync, data, isLoading, error } = useChipiGetSkuList()

  const getSkuList = async (params?: {
    limit?: number
    offset?: number
    // otros parámetros de filtrado según la documentación
  }) => {
    const bearerToken = await getToken()
    if (!bearerToken) {
      throw new Error('No se pudo obtener el token de autenticación')
    }

    return getSkuListAsync({
      params: params || {},
      bearerToken
    })
  }

  return {
    getSkuList,
    getSkuListAsync,
    data,
    isLoading,
    error
  }
}

