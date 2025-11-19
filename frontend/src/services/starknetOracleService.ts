// StarknetServices.ts
// - Un solo archivo con dos servicios:
//   1) StarknetBalanceService -> balanceOf() con USDT_DECIMALS_BALANCE = 18n
//   2) StarknetQuoteService   -> quote_ars_to_usdt con USDT_DECIMALS = 0n
// - BigInt end-to-end, helpers para u256, format/parse units sin perder precisión.

import {
  RpcProvider,
  Contract,
  BigNumberish,
  shortString,
} from 'starknet';

// ==========================
// Config de despliegues
// ==========================
const CONTRACTS = {
  oracle: '0x01d5f1e352b69065229f872828a2ccaf9182302a34a326fe503df66c042e498c',
  usdtToken: '0x040898923d06af282d4a647966fc65c0f308020c43388026b56ef833eda0efdc',
};

// ==========================
// Config RPC / Chain
// ==========================
const SEPOLIA_CONFIG = {
  rpcUrl:
    'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_9/b6oJemkCmlgEGq1lXC5uTXwOHZA14WNP',
  chainId: '0x534e5f5345504f4c4941', // SN_SEPOLIA
};

// ==========================
// Decimales (según función)
// ==========================
// ❗ Para COTIZACIÓN (quote_ars_to_usdt) mantener 0n (no modificar)
const USDT_DECIMALS = BigInt(0); // ✅ pedido explícito

// ❗ Para BALANCE (balanceOf) usar 6n
const USDT_DECIMALS_BALANCE = BigInt(18); // ✅ pedido explícito

// Entrada esperada por el oráculo para ARS (0 decimales - el backend ya hace la conversión a 6 decimales)
let ARS_DECIMALS = BigInt(0);

// Decimales que DEVUELVE el oráculo para USDT (por defecto 0n)
let ORACLE_USDT_DECIMALS = BigInt(0);

export function setArsDecimals(decimals: number) {
  ARS_DECIMALS = BigInt(decimals);
}
export function setOracleUsdtDecimals(decimals: number) {
  ORACLE_USDT_DECIMALS = BigInt(decimals);
}

// ==========================
// ABIs mínimos
// ==========================
const ORACLE_ABI = [
  {
    name: 'quote_ars_to_usdt',
    type: 'function',
    inputs: [{ name: 'amount_ars', type: 'core::integer::u128' }],
    outputs: [{ type: 'core::integer::u128' }],
    stateMutability: 'view',
  },
];

const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [
      {
        name: 'account',
        type: 'core::starknet::contract_address::ContractAddress',
      },
    ],
    outputs: [{ type: 'core::integer::u256' }],
    stateMutability: 'view',
  },
  {
    name: 'decimals',
    type: 'function',
    inputs: [],
    outputs: [{ type: 'core::integer::u8' }],
    stateMutability: 'view',
  },
  {
    name: 'symbol',
    type: 'function',
    inputs: [],
    outputs: [{ type: 'core::felt252' }],
    stateMutability: 'view',
  },
];

// ==========================
// Utils BigInt / Units
// ==========================
const TEN = BigInt(10);

function toBN(x: BigNumberish): bigint {
  if (typeof x === 'bigint') return x;
  if (typeof x === 'number') return BigInt(x);
  const s = String(x);

  // Limpiar strings con comas/espacios
  if (s.includes(',')) {
    const cleaned = s.replace(/[,\s]/g, '');
    return cleaned.startsWith('0x') ? BigInt(cleaned) : BigInt('0x' + cleaned);
  }

  if (s.startsWith('0x')) return BigInt(s);

  try {
    return BigInt(s);
  } catch (error) {
    try {
      return BigInt('0x' + s);
    } catch (hexError) {
      throw new Error(`No se pudo convertir "${s}" a BigInt`);
    }
  }
}

function u256ToBN(u: any): bigint {
  // Admite {low, high}, [low, high], { balance: {low, high} } o single felt
  if (u?.low !== undefined && u?.high !== undefined) {
    return toBN(u.low) + (toBN(u.high) << BigInt(128));
  }
  if (Array.isArray(u) && u.length >= 2) {
    return toBN(u[0]) + (toBN(u[1]) << BigInt(128));
  }
  if (u?.balance?.low !== undefined && u?.balance?.high !== undefined) {
    const b = u.balance;
    return toBN(b.low) + (toBN(b.high) << BigInt(128));
  }
  return toBN(u);
}

function pow10(n: bigint): bigint {
  // 10n ** n (compat con TS)
  let r = BigInt(1);
  for (let i = BigInt(0); i < n; i++) r *= BigInt(10);
  return r;
}

function formatUnits(raw: bigint, decimals: bigint): string {
  if (decimals === BigInt(0)) return raw.toString();
  const base = pow10(decimals);
  const whole = raw / base;
  const fracRaw = raw % base;
  if (fracRaw === BigInt(0)) return whole.toString();
  const frac = fracRaw.toString().padStart(Number(decimals), '0').replace(/0+$/, '');
  return `${whole.toString()}.${frac}`;
}

function parseUnits(human: string | number, decimals: bigint): bigint {
  const s = String(human);
  if (!s.includes('.')) return toBN(s) * pow10(decimals);
  const [w, f] = s.split('.');
  const frac = f.slice(0, Number(decimals)).padEnd(Number(decimals), '0');
  return toBN(w) * pow10(decimals) + (frac ? toBN(frac) : BigInt(0));
}

// ==========================
// Servicio SOLO Balance (18n)
// ==========================
export class StarknetBalanceService {
  private provider: RpcProvider;
  private usdt: Contract;

  constructor() {
    this.provider = new RpcProvider({
      nodeUrl: SEPOLIA_CONFIG.rpcUrl,
      chainId: SEPOLIA_CONFIG.chainId as any,
    });
    this.usdt = new Contract(ERC20_ABI as any, CONTRACTS.usdtToken, this.provider);
  }

  // Info del token USDT (opcional on-chain)
  async getUSDTTokenInfo(): Promise<{ address: string; symbol: string; decimals: number }> {
    try {
      let symbol = 'USDT';
      let decimals = Number(USDT_DECIMALS_BALANCE);

      try {
        const sym = await this.usdt.call('symbol', [], { blockIdentifier: 'latest' });
        const felt = Array.isArray(sym) ? sym[0] : sym;
        symbol = shortString.decodeShortString(String(felt));
      } catch {}

      try {
        const dec = await this.usdt.call('decimals', [], { blockIdentifier: 'latest' });
        const val = Array.isArray(dec) ? Number(dec[0]) : Number(dec);
        if (!Number.isNaN(val) && val >= 0 && val <= 255) decimals = val;
      } catch {}

      return { address: CONTRACTS.usdtToken, symbol, decimals };
    } catch {
      return { address: CONTRACTS.usdtToken, symbol: 'USDT', decimals: Number(USDT_DECIMALS_BALANCE) };
    }
  }

  // Balance USDT formateado con 18 decimales
  async getUSDTBalance(accountAddress: string): Promise<{
    address: string;
    balanceRaw: bigint;
    balance: string;
  }> {
    const res: any = await this.usdt.call('balanceOf', [accountAddress], { blockIdentifier: 'latest' });
    const raw = u256ToBN(res);
    const human = formatUnits(raw, USDT_DECIMALS_BALANCE);
    return { address: accountAddress, balanceRaw: raw, balance: human };
  }
}

// ==========================
// Servicio SOLO Cotización (0n)
// ==========================
export class StarknetQuoteService {
  private provider: RpcProvider;
  private oracle: Contract;

  constructor() {
    this.provider = new RpcProvider({
      nodeUrl: SEPOLIA_CONFIG.rpcUrl,
      chainId: SEPOLIA_CONFIG.chainId as any,
    });
    this.oracle = new Contract(ORACLE_ABI as any, CONTRACTS.oracle, this.provider);
  }

  /**
   * amountARSHuman: cantidad de ARS en formato humano (p.e. "10000")
   * Escala según ARS_DECIMALS (entrada del oráculo).
   * Devuelve USDT formateado según ORACLE_USDT_DECIMALS (por defecto 0n).
   */
  async getARSToUSDTQuote(amountARSHuman: string | number): Promise<{
    amountARS: string;
    amountUSDT: string;
    amountUSDT_raw: bigint;
    source: string;
  }> {
    const amountARS_raw = parseUnits(amountARSHuman, ARS_DECIMALS);
    const res: any = await this.oracle.call('quote_ars_to_usdt', [amountARS_raw.toString()], { blockIdentifier: 'latest' });
    const rawUSDT = u256ToBN(res); // aunque sea u128, soporta single felt

    const usdtHuman = formatUnits(rawUSDT, ORACLE_USDT_DECIMALS); // por defecto 0n
    const arsHuman = formatUnits(amountARS_raw, ARS_DECIMALS);

    return {
      amountARS: arsHuman,
      amountUSDT: usdtHuman,
      amountUSDT_raw: rawUSDT,
      source: 'Oracle Blockchain',
    };
  }

  /**
   * rate ≈ ARS_human / USDT_human
   * Usa 6 decimales de escala para el rate textual.
   */
  async getOracleInfo(sampleArsHuman: string | number = '1000'): Promise<{
    address: string;
    isActive: boolean;
    rate_ars_per_usdt: string;
  }> {
    const quote = await this.getARSToUSDTQuote(sampleArsHuman);
    const SCALE = BigInt(1_000_000);
    const ars = parseUnits(quote.amountARS, BigInt(0));  // texto → entero
    const usdt = parseUnits(quote.amountUSDT, BigInt(0)); // texto → entero
    const rateScaled = (ars * SCALE) / (usdt === BigInt(0) ? BigInt(1) : usdt);
    const rateStr = formatUnits(rateScaled, BigInt(6));
    return {
      address: CONTRACTS.oracle,
      isActive: true,
      rate_ars_per_usdt: rateStr,
    };
  }
}

// ==========================
// Instancias opcionales
// ==========================
export const starknetBalanceService = new StarknetBalanceService();
export const starknetQuoteService = new StarknetQuoteService();

/*
==========================
Ejemplo de uso
==========================
import { starknetBalanceService, starknetQuoteService, setArsDecimals, setOracleUsdtDecimals } from './StarknetServices';

// Para el oráculo, si necesitás ajustar escalas:
setArsDecimals(0);            // 0 si el oráculo espera pesos enteros; 2 si centavos; 6/18 si corresponde
setOracleUsdtDecimals(0);     // por defecto 0n (mantener), o setear 6 si el oráculo devuelve micro-USDT

// Cotización (decimales USDT = 0n)
const q = await starknetQuoteService.getARSToUSDTQuote('10000');
console.log(q);

// Balance (formateo a 18 decimales)
const bal = await starknetBalanceService.getUSDTBalance('0x...');
console.log(bal);

// Info del oráculo
const oracleInfo = await starknetQuoteService.getOracleInfo(1000);
console.log(oracleInfo);
*/