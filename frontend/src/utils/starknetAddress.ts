/**
 * Utilidades para normalizar direcciones de Starknet
 * 
 * Las direcciones de Starknet deben tener exactamente 66 caracteres:
 * - 0x (prefijo)
 * - 64 caracteres hexadecimales
 * 
 * Si una dirección tiene menos de 64 caracteres hex, se debe hacer padding
 * con ceros a la izquierda.
 */

/**
 * Normaliza una dirección de Starknet para que tenga exactamente 66 caracteres
 * 
 * @param address - Dirección de Starknet (puede tener menos de 64 caracteres hex)
 * @returns Dirección normalizada con exactamente 66 caracteres
 * 
 * @example
 * normalizeStarknetAddress('0x9f87f07fa85eb9ae6d50812ccb8afb389a83cf6bfbe5a5a0fce4da70aad87d')
 * // Retorna: '0x009f87f07fa85eb9ae6d50812ccb8afb389a83cf6bfbe5a5a0fce4da70aad87d'
 */
export function normalizeStarknetAddress(address: string | null | undefined): string | null {
  if (!address) return null
  
  const trimmed = address.trim()
  
  // Si no empieza con 0x, retornar null
  if (!trimmed.startsWith('0x')) {
    return null
  }
  
  // Obtener la parte hexadecimal (sin el 0x)
  const hexPart = trimmed.slice(2)
  
  // Validar que solo contenga caracteres hexadecimales
  if (!/^[0-9a-fA-F]+$/.test(hexPart)) {
    return null
  }
  
  // Hacer padding con ceros a la izquierda hasta tener 64 caracteres
  const paddedHex = hexPart.padStart(64, '0')
  
  // Retornar dirección normalizada
  return `0x${paddedHex}`
}

/**
 * Valida si una dirección de Starknet es válida (después de normalización)
 * 
 * @param address - Dirección de Starknet
 * @returns true si la dirección es válida
 */
export function isValidStarknetAddress(address: string | null | undefined): boolean {
  if (!address) return false
  
  const normalized = normalizeStarknetAddress(address)
  return normalized !== null && normalized.length === 66
}

