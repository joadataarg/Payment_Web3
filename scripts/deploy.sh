#!/bin/bash

# Script de despliegue para MidatoPay
# Uso: ./deploy.sh

set -e  # Salir si hay errores

echo "🚀 Iniciando despliegue de MidatoPay..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar que estamos en el directorio correcto
if [ ! -f "docker-compose.prod.yml" ]; then
    echo -e "${RED}❌ Error: No se encontró docker-compose.prod.yml${NC}"
    echo "Ejecuta este script desde el directorio raíz del proyecto"
    exit 1
fi

# Verificar que existe .env en backend
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}⚠️  Advertencia: No se encontró backend/.env${NC}"
    echo "Asegúrate de configurar las variables de entorno antes de continuar"
    read -p "¿Continuar de todos modos? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Construir imágenes
echo -e "${GREEN}📦 Construyendo imágenes Docker...${NC}"
docker-compose -f docker-compose.prod.yml build

# Detener contenedores existentes
echo -e "${GREEN}🛑 Deteniendo contenedores existentes...${NC}"
docker-compose -f docker-compose.prod.yml down

# Levantar servicios
echo -e "${GREEN}🚀 Iniciando servicios...${NC}"
docker-compose -f docker-compose.prod.yml up -d

# Esperar a que los servicios estén listos
echo -e "${GREEN}⏳ Esperando a que los servicios estén listos...${NC}"
sleep 10

# Ejecutar migraciones
echo -e "${GREEN}🗄️  Ejecutando migraciones de base de datos...${NC}"
docker exec midatopay-backend-prod bunx prisma migrate deploy || {
    echo -e "${YELLOW}⚠️  Advertencia: Las migraciones fallaron. Esto puede ser normal si ya están aplicadas.${NC}"
}

# Generar cliente de Prisma
echo -e "${GREEN}🔧 Generando cliente de Prisma...${NC}"
docker exec midatopay-backend-prod bunx prisma generate || {
    echo -e "${YELLOW}⚠️  Advertencia: Error generando cliente de Prisma${NC}"
}

# Verificar estado
echo -e "${GREEN}✅ Verificando estado de los servicios...${NC}"
docker-compose -f docker-compose.prod.yml ps

# Mostrar logs recientes
echo -e "${GREEN}📋 Últimos logs del backend:${NC}"
docker-compose -f docker-compose.prod.yml logs --tail=20 backend

echo -e "${GREEN}📋 Últimos logs del frontend:${NC}"
docker-compose -f docker-compose.prod.yml logs --tail=20 frontend

echo -e "${GREEN}✅ Despliegue completado!${NC}"
echo ""
echo "Para ver los logs en tiempo real, ejecuta:"
echo "  docker-compose -f docker-compose.prod.yml logs -f"
echo ""
echo "Para verificar el estado de los servicios:"
echo "  docker-compose -f docker-compose.prod.yml ps"

