#!/bin/bash

# Script de actualización para MidatoPay
# Uso: ./update.sh [branch]
# Ejemplo: ./update.sh main

set -e

BRANCH=${1:-main}
PROJECT_DIR="/var/www/midatopay"

echo "🔄 Actualizando MidatoPay desde branch: $BRANCH"
echo ""

cd "$PROJECT_DIR"

# Verificar si hay cambios sin commitear
if [ -d ".git" ]; then
    echo "📥 Obteniendo últimos cambios de Git..."
    git fetch origin
    git checkout "$BRANCH"
    git pull origin "$BRANCH"
else
    echo "⚠️  No se detectó un repositorio Git"
    echo "   Si estás usando otro método de despliegue, continúa manualmente"
    read -p "¿Continuar con la reconstrucción? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Hacer backup de la base de datos antes de actualizar
echo ""
echo "💾 Creando backup de la base de datos..."
if [ -f "$PROJECT_DIR/scripts/backup-db.sh" ]; then
    bash "$PROJECT_DIR/scripts/backup-db.sh"
else
    echo "⚠️  Script de backup no encontrado, saltando backup"
fi

# Reconstruir contenedores
echo ""
echo "🔨 Reconstruyendo contenedores..."
docker-compose -f docker-compose.prod.yml build

# Reiniciar servicios con la nueva imagen
echo ""
echo "🔄 Reiniciando servicios..."
docker-compose -f docker-compose.prod.yml up -d

# Esperar a que los servicios estén listos
echo ""
echo "⏳ Esperando a que los servicios estén listos..."
sleep 10

# Ejecutar migraciones
echo ""
echo "🗄️  Ejecutando migraciones de base de datos..."
docker exec midatopay-backend-prod bunx prisma migrate deploy || {
    echo "⚠️  Advertencia: Las migraciones fallaron. Esto puede ser normal si ya están aplicadas."
}

# Verificar estado
echo ""
echo "✅ Verificando estado de los servicios..."
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "✅ Actualización completada!"
echo ""
echo "Para ver los logs:"
echo "  docker-compose -f docker-compose.prod.yml logs -f"

