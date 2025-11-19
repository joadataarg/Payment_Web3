const QRCode = require('qrcode');
const crypto = require('crypto');

class EMVQRGenerator {
  constructor() {
    // Campos simplificados para MidatoPay
    this.MIDATOPAY_FIELDS = {
      MERCHANT_ADDRESS: '01', // Wallet del comercio
      AMOUNT: '02',           // Monto en ARS
      PAYMENT_ID: '03'        // ID único del pago
    };
  }

  // Generar QR simplificado con solo 3 campos
  generateEMVQR(merchantAddress, amount, paymentId) {
    const tlvData = [];
    
    // Solo los 3 campos necesarios
    tlvData.push({ tag: this.MIDATOPAY_FIELDS.MERCHANT_ADDRESS, value: merchantAddress });
    tlvData.push({ tag: this.MIDATOPAY_FIELDS.AMOUNT, value: amount.toString() });
    tlvData.push({ tag: this.MIDATOPAY_FIELDS.PAYMENT_ID, value: paymentId });
    
    // Serializar a formato TLV
    const tlvString = this.serializeTLV(tlvData);
    
    // Calcular CRC
    const crc = this.calculateCRC(tlvString);
    
    // Agregar CRC al final
    const finalTLV = tlvString + crc;
    
    return finalTLV;
  }

  // Serializar datos TLV
  serializeTLV(tlvData) {
    return tlvData.map(item => {
      const length = item.value.length.toString().padStart(2, '0');
      return `${item.tag}${length}${item.value}`;
    }).join('');
  }

  // Calcular CRC16-CCITT
  calculateCRC(data) {
    const polynomial = 0x1021;
    let crc = 0xFFFF;
    
    for (let i = 0; i < data.length; i++) {
      crc ^= data.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        if (crc & 0x8000) {
          crc = (crc << 1) ^ polynomial;
        } else {
          crc <<= 1;
        }
        crc &= 0xFFFF;
      }
    }
    
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  // Generar QR visual
  async generateQRCodeImage(tlvData, options = {}) {
    const defaultOptions = {
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 300
    };
    
    const qrOptions = { ...defaultOptions, ...options };
    
    try {
      const qrCodeImage = await QRCode.toDataURL(tlvData, qrOptions);
      return qrCodeImage;
    } catch (error) {
      console.error('Error generando QR code:', error);
      throw error;
    }
  }

  // Generar payment ID único
  generatePaymentId() {
    return `pay_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  // Validar datos antes de generar QR
  validatePaymentData(merchantAddress, amount, paymentId) {
    const errors = [];
    
    // Validaciones básicas
    if (!merchantAddress) errors.push('Merchant address es requerido');
    if (!amount || amount <= 0) errors.push('Amount debe ser mayor a 0');
    if (!paymentId) errors.push('Payment ID es requerido');
    
    // Validaciones específicas
    if (merchantAddress.length < 10) errors.push('Merchant address muy corto');
    if (amount > 999999999.99) errors.push('Amount excede el límite máximo');
    if (paymentId.length < 5) errors.push('Payment ID muy corto');
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Parser para leer QR simplificado
class EMVQRParser {
  constructor() {
    this.MIDATOPAY_FIELDS = {
      '01': 'MERCHANT_ADDRESS',
      '02': 'AMOUNT',
      '03': 'PAYMENT_ID'
    };
  }

  // Parsear QR simplificado
  parseEMVQR(qrData) {
    try {
      const parsed = this.parseTLV(qrData);
      
      // Verificar CRC
      if (!this.validateCRC(qrData)) {
        throw new Error('Invalid CRC');
      }
      
      // Extraer los 3 campos
      const result = {
        merchantAddress: parsed['01'],
        amount: parseInt(parsed['02']), // ✅ Usar parseInt para mantener enteros sin decimales
        paymentId: parsed['03']
      };
      
      // Validar que todos los campos estén presentes
      if (!result.merchantAddress || !result.amount || !result.paymentId) {
        throw new Error('Missing required fields');
      }
      
      return {
        type: 'MIDATOPAY_SIMPLE',
        data: result,
        isValid: true,
        rawData: parsed
      };
      
    } catch (error) {
      console.error('QR parsing error:', error);
      return {
        type: 'MIDATOPAY_SIMPLE',
        data: null,
        isValid: false,
        error: error.message
      };
    }
  }

  // Parsear formato TLV
  parseTLV(data) {
    const result = {};
    let i = 0;
    
    while (i < data.length) {
      const tag = data.substring(i, i + 2);
      i += 2;
      
      const length = parseInt(data.substring(i, i + 2));
      i += 2;
      
      const value = data.substring(i, i + length);
      i += length;
      
      result[tag] = value;
    }
    
    return result;
  }

  // Validar CRC
  validateCRC(data) {
    const dataWithoutCRC = data.substring(0, data.length - 4);
    const providedCRC = data.substring(data.length - 4);
    const calculatedCRC = this.calculateCRC(dataWithoutCRC);
    
    return providedCRC === calculatedCRC;
  }

  // Calcular CRC16-CCITT
  calculateCRC(data) {
    const polynomial = 0x1021;
    let crc = 0xFFFF;
    
    for (let i = 0; i < data.length; i++) {
      crc ^= data.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        if (crc & 0x8000) {
          crc = (crc << 1) ^ polynomial;
        } else {
          crc <<= 1;
        }
        crc &= 0xFFFF;
      }
    }
    
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }
}

module.exports = {
  EMVQRGenerator,
  EMVQRParser
};