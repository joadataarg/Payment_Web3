// Hook para manejar conversiones ARS → USDT usando Oracle real de blockchain
import { useState } from 'react';
import { starknetQuoteService } from '@/services/starknetOracleService';

interface OracleConversionResult {
  cryptoAmount: number;
  source: string;
}

export function useOracleConversion() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Llamada directa al Oracle de blockchain
  const quoteARSToUSDT = async (amountARS: number): Promise<OracleConversionResult | null> => {
    if (!amountARS || amountARS <= 0) {
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // Llamar al Oracle directamente
      const result = await starknetQuoteService.getARSToUSDTQuote(amountARS);
      
      if (!result) {
        throw new Error('Oracle no disponible');
      }
      
      return {
        cryptoAmount: Number(result.amountUSDT),
        source: result.source
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error consultando Oracle de blockchain';
      setError(errorMessage);
      console.error('Error calling Oracle:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Conversión ARS → USDT usando Oracle real
  const convertARSToCrypto = async (amountARS: number, targetCrypto: string): Promise<OracleConversionResult | null> => {
    if (targetCrypto !== 'USDT') {
      setError('Solo USDT está soportado por el Oracle');
      return null;
    }

    return await quoteARSToUSDT(amountARS);
  };

  return {
    loading,
    error,
    convertARSToCrypto,
    quoteARSToUSDT
  };
}
