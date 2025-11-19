// Wallet Service - Maneja wallets en la base de datos
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const { ec, RpcProvider, constants } = require('starknet');

const prisma = new PrismaClient();

class WalletService {
  // Clave de encriptación (en producción usar variable de entorno)
  static ENCRYPTION_KEY = 'midatopay-wallet-key-2024';
  static ALGORITHM = 'aes-256-cbc';

  // Generar nueva wallet usando Starknet
  static generateWallet() {
    try {
      // Generar clave privada aleatoria usando la curva de Starknet
      const privateKey = ec.starkCurve.utils.randomPrivateKey();
      const privateKeyHex = '0x' + Array.from(privateKey).map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Generar clave pública desde la clave privada
      const publicKey = ec.starkCurve.getPublicKey(privateKey);
      const publicKeyHex = '0x' + Array.from(publicKey).map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Generar dirección usando getStarkKey (esto genera la dirección de la cuenta)
      const address = ec.starkCurve.getStarkKey(privateKey);
      
      console.log('✅ Wallet generada:', {
        address: address.substring(0, 20) + '...',
        hasPrivateKey: !!privateKeyHex,
        hasPublicKey: !!publicKeyHex
      });
      
      return {
        address,
        privateKey: privateKeyHex,
        publicKey: publicKeyHex,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error generando wallet:', error);
      throw error;
    }
  }

  // Encriptar clave privada
  static encryptPrivateKey(privateKey) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.ALGORITHM, this.ENCRYPTION_KEY);
    let encrypted = cipher.update(privateKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  // Desencriptar clave privada
  static decryptPrivateKey(encryptedData) {
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipher(this.ALGORITHM, this.ENCRYPTION_KEY);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // Guardar wallet en la base de datos
  static async saveWallet(userId, walletData) {
    try {
      const encryptedPrivateKey = this.encryptPrivateKey(walletData.privateKey);
      
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          walletAddress: walletData.address,
          privateKey: encryptedPrivateKey,
          publicKey: walletData.publicKey,
          walletCreatedAt: new Date(walletData.createdAt)
        }
      });

      console.log('✅ Wallet guardada en BD para usuario:', user.email);
      return user;
    } catch (error) {
      console.error('❌ Error guardando wallet en BD:', error);
      throw error;
    }
  }

  // Obtener wallet de la base de datos
  static async getWallet(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          walletAddress: true,
          privateKey: true,
          publicKey: true,
          walletCreatedAt: true
        }
      });

      if (!user || !user.walletAddress) {
        return null;
      }

      // Desencriptar clave privada
      const decryptedPrivateKey = this.decryptPrivateKey(user.privateKey);

      return {
        id: user.id,
        email: user.email,
        address: user.walletAddress,
        privateKey: decryptedPrivateKey,
        publicKey: user.publicKey,
        createdAt: user.walletCreatedAt?.toISOString()
      };
    } catch (error) {
      console.error('❌ Error obteniendo wallet de BD:', error);
      return null;
    }
  }

  // Verificar si el usuario tiene wallet
  static async hasWallet(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { walletAddress: true }
      });

      return user && user.walletAddress !== null;
    } catch (error) {
      console.error('❌ Error verificando wallet:', error);
      return false;
    }
  }

  // Eliminar wallet de la base de datos
  static async clearWallet(userId) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          walletAddress: null,
          privateKey: null,
          publicKey: null,
          walletCreatedAt: null
        }
      });

      console.log('✅ Wallet eliminada de BD para usuario:', userId);
    } catch (error) {
      console.error('❌ Error eliminando wallet de BD:', error);
      throw error;
    }
  }

  // Obtener usuario por email
  static async getUserByEmail(email) {
    try {
      return await prisma.user.findUnique({
        where: { email }
      });
    } catch (error) {
      console.error('❌ Error obteniendo usuario por email:', error);
      return null;
    }
  }

  // Crear nuevo usuario con wallet
  static async createUserWithWallet(userData, walletData) {
    try {
      const encryptedPrivateKey = this.encryptPrivateKey(walletData.privateKey);
      
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          password: userData.password,
          name: userData.name,
          phone: userData.phone,
          walletAddress: walletData.address,
          privateKey: encryptedPrivateKey,
          publicKey: walletData.publicKey,
          walletCreatedAt: new Date(walletData.createdAt)
        }
      });

      console.log('✅ Usuario creado con wallet:', user.email);
      return user;
    } catch (error) {
      console.error('❌ Error creando usuario con wallet:', error);
      throw error;
    }
  }
}

module.exports = WalletService;
