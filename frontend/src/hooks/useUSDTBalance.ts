// Hook para obtener balance USDT del merchant usando contrato real
import { useState, useEffect } from 'react';
import { starknetBalanceService } from '@/services/starknetOracleService';

interface USDTBalance {
  balance: number;
  balanceRaw: bigint;
  address: string;
  isLoading: boolean;
  error: string | null;
}

export function useUSDTBalance(merchantAddress?: string) {
  const [balanceData, setBalanceData] = useState<USDTBalance>({
    balance: 0,
    balanceRaw: BigInt(0),
    address: '',
    isLoading: false,
    error: null
  });

  const fetchBalance = async (address: string) => {
    setBalanceData(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      console.log('🔍 Consultando balance USDT para:', address);
      
      const result = await starknetBalanceService.getUSDTBalance(address);
      
      if (result) {
        setBalanceData({
          balance: Number(result.balance),
          balanceRaw: result.balanceRaw,
          address: result.address,
          isLoading: false,
          error: null
        });
        
        console.log('✅ Balance USDT obtenido:', result);
      } else {
        throw new Error('No se pudo obtener el balance');
      }
    } catch (error) {
      console.error('❌ Error obteniendo balance USDT:', error);
      setBalanceData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }));
    }
  };

  // Consultar balance cuando cambia la dirección
  useEffect(() => {
    if (merchantAddress) {
      fetchBalance(merchantAddress);
    } else {
      setBalanceData({
        balance: 0,
        balanceRaw: BigInt(0),
        address: '',
        isLoading: false,
        error: null
      });
    }
  }, [merchantAddress]);

  return {
    ...balanceData,
    refetch: () => merchantAddress ? fetchBalance(merchantAddress) : Promise.resolve()
  };
}
