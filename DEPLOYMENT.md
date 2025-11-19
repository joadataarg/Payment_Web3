# 🚀 Guía de Despliegue - MidatoPay

Esta guía te ayudará a desplegar MidatoPay en producción en el dominio `midatopay.com`.

## 📋 Prerrequisitos

- VPS con Ubuntu 20.04+ o similar
- Dominio configurado en Spaceship
- Nameservers configurados en Cloudflare
- Acceso SSH al servidor (Termius)
- Acceso a Cloudflare Dashboard

---

## 🔧 Paso 1: Conectarse al VPS

1. **Abre Termius** y crea una nueva conexión SSH si no la tienes:
   - Host: IP de tu VPS
   - Usuario: `root` (o el usuario que tengas configurado)
   - Puerto: `22`
   - Guarda la conexión

2. **Conéctate al servidor** y actualiza el sistema:
```bash
ssh root@TU_IP_DEL_VPS
apt update && apt upgrade -y
```

---

## 🌐 Paso 2: Configurar DNS en Cloudflare

Antes de continuar, necesitas configurar los registros DNS en Cloudflare:

1. **Entra a Cloudflare Dashboard** → Selecciona el dominio `midatopay.com`
2. **Ve a DNS** → **Records**
3. **Agrega/Edita los siguientes registros:**

   | Tipo | Nombre | Contenido | Proxy |
   |------|--------|-----------|-------|
   | A | @ | IP_DEL_VPS | ✅ Proxied |
   | A | www | IP_DEL_VPS | ✅ Proxied |

   ⚠️ **Nota:** Reemplaza `IP_DEL_VPS` con la IP pública de tu servidor VPS.

4. **Espera a que se propaguen los DNS** (puede tomar 5-30 minutos)
   - Verifica con: `ping midatopay.com` o `nslookup midatopay.com`

---

## 🛠️ Paso 3: Instalar Dependencias en el Servidor

Ejecuta estos comandos en tu VPS para instalar todas las dependencias necesarias:

```bash
# Instalar Docker y Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh

# Agregar usuario actual al grupo docker
usermod -aG docker $USER

# Instalar Docker Compose (versión standalone)
DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Instalar Git
apt install git -y

# Instalar Nginx
apt install nginx -y

# Instalar Certbot para SSL
apt install certbot python3-certbot-nginx -y

# Verificar instalaciones
docker --version
docker-compose --version
git --version
nginx -v
```

---

## 📁 Paso 4: Crear Estructura de Directorios

```bash
# Crear directorio principal del proyecto
mkdir -p /var/www/midatopay
cd /var/www/midatopay

# Crear subdirectorios para variables de entorno
mkdir -p backend frontend
```

---

## 📥 Paso 5: Subir el Código al Servidor

Tienes dos opciones:

### Opción A: Usar Git (Recomendado)

```bash
# Si tu proyecto está en GitHub/GitLab/etc
git clone https://github.com/TU_USUARIO/midatopay.git /var/www/midatopay

# O si es un repo privado, configura SSH keys primero
```

### Opción B: Usar SCP desde tu máquina local (Termius también soporta SCP)

Desde tu máquina local (Windows):
```bash
# Si tienes Git Bash o WSL
scp -r ./midatopay/* root@TU_IP_DEL_VPS:/var/www/midatopay/

# O usa Termius para transferir archivos con SFTP
```

### Opción C: Usar Termius File Transfer

1. En Termius, conecta a tu servidor
2. Usa la opción de **File Transfer** (SFTP)
3. Sube los archivos de tu proyecto local a `/var/www/midatopay`

---

## ⚙️ Paso 6: Configurar Variables de Entorno

### Backend (.env)

```bash
cd /var/www/midatopay/backend
nano .env
```

Pega el siguiente contenido (ajusta los valores según tu configuración):

```env
# Database
DATABASE_URL="postgresql://midatopay:TU_PASSWORD_SEGURO@postgres:5432/midatopay"

# JWT
JWT_SECRET="GENERA_UN_SECRETO_SUPER_SEGURO_AQUI_MINIMO_32_CARACTERES"
JWT_EXPIRES_IN="7d"

# Server
PORT=3001
NODE_ENV="production"

# Frontend URL
FRONTEND_URL=https://midatopay.com

# APIs Externas (obtén tus propias keys)
RIPIO_API_KEY="tu_ripio_api_key"
BINANCE_API_KEY="tu_binance_api_key"
BINANCE_SECRET_KEY="tu_binance_secret_key"

# Cavos Aegis Integration
CAVOS_APP_ID="app-a5b17a105d604090e051a297a8fad33d"
CAVOS_API_SECRET="tu_cavos_api_secret_aqui"

# Starknet Configuration
STARKNET_RPC_URL="https://starknet-sepolia.public.blastapi.io/rpc/v0_9"
USDT_CONTRACT_ADDRESS="0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c7b7f451cd475"
STRK_CONTRACT_ADDRESS="0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d"

# Blockchain
USDT_DECIMALS=6

# WebSocket (se sirve en el mismo servidor, no necesita puerto separado)

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Importante:**
- Cambia `TU_PASSWORD_SEGURO` por una contraseña segura para PostgreSQL
- Genera un `JWT_SECRET` seguro: `openssl rand -base64 32`
- Guarda y cierra: `Ctrl+X`, luego `Y`, luego `Enter`

### Frontend (.env.production)

```bash
cd /var/www/midatopay/frontend
nano .env.production
```

```env
# API Configuration
NEXT_PUBLIC_API_URL=https://midatopay.com/api
NEXT_PUBLIC_WS_URL=wss://midatopay.com/ws

# App Configuration
NEXT_PUBLIC_APP_NAME=MidatoPay
NEXT_PUBLIC_APP_VERSION=1.0.0

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_DEBUG=false
```

⚠️ **Nota:** Next.js requiere que las variables que empiezan con `NEXT_PUBLIC_` estén disponibles en el momento del build. Asegúrate de que estas variables estén configuradas antes de construir el contenedor Docker, o pásalas como build args en el docker-compose.prod.yml (ya está configurado así).

---

## 🐳 Paso 7: Configurar Docker Compose para Producción

El archivo `docker-compose.prod.yml` ya está incluido en el proyecto. Solo necesitas verificar que esté presente:

```bash
cd /var/www/midatopay
ls -la docker-compose.prod.yml
```

Si no existe, créalo copiando el contenido del proyecto o usa el que ya viene incluido.

También necesitas crear un archivo `.env` en la raíz del proyecto para Docker Compose (para la contraseña de PostgreSQL):

```bash
cd /var/www/midatopay
nano .env
```

```env
POSTGRES_PASSWORD=TU_PASSWORD_SEGURO_AQUI
NEXT_PUBLIC_API_URL=https://midatopay.com/api
NEXT_PUBLIC_WS_URL=wss://midatopay.com/ws
```

⚠️ **Importante:** Esta contraseña debe coincidir con la que configuraste en `backend/.env` en la variable `DATABASE_URL`.

---

## 🌐 Paso 8: Configurar Nginx como Reverse Proxy

```bash
nano /etc/nginx/sites-available/midatopay
```

Pega esta configuración:

```nginx
# Redirección HTTP a HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name midatopay.com www.midatopay.com;

    # Para Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirigir todo lo demás a HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# Configuración HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name midatopay.com www.midatopay.com;

    # SSL Configuration (se configurará con Certbot)
    ssl_certificate /etc/letsencrypt/live/midatopay.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/midatopay.com/privkey.pem;
    
    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logs
    access_log /var/log/nginx/midatopay-access.log;
    error_log /var/log/nginx/midatopay-error.log;

    # Proxy para Frontend Next.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Proxy para Backend API
    location /api {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
    }

    # WebSocket para backend (mismo puerto que la API)
    location /ws {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Compresión
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;
}
```

Habilita el sitio:

```bash
ln -s /etc/nginx/sites-available/midatopay /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default  # Elimina la configuración por defecto
nginx -t  # Verifica que la configuración sea correcta
```

---

## 🔒 Paso 9: Configurar SSL con Let's Encrypt

```bash
# Obtener certificado SSL
certbot --nginx -d midatopay.com -d www.midatopay.com

# Seguir las instrucciones:
# - Email: tu email
# - Aceptar términos
# - Compartir email: (opcional)

# Verificar renovación automática
certbot renew --dry-run
```

El certificado se renovará automáticamente. Nginx ya quedará configurado con SSL.

---

## 🔥 Paso 10: Configurar Firewall (UFW)

```bash
# Instalar UFW si no está instalado
apt install ufw -y

# Permitir SSH (IMPORTANTE: hazlo primero)
ufw allow 22/tcp

# Permitir HTTP y HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Habilitar firewall
ufw enable

# Verificar estado
ufw status
```

---

## 🚀 Paso 11: Construir y Levantar los Contenedores

```bash
cd /var/www/midatopay

# Construir las imágenes Docker
docker-compose -f docker-compose.prod.yml build

# Levantar los servicios
docker-compose -f docker-compose.prod.yml up -d

# Verificar que todo esté corriendo
docker-compose -f docker-compose.prod.yml ps

# Ver logs (si hay errores)
docker-compose -f docker-compose.prod.yml logs -f
```

---

## 🗄️ Paso 12: Ejecutar Migraciones de Base de Datos

```bash
# Entrar al contenedor del backend
docker exec -it midatopay-backend-prod bash

# Dentro del contenedor, ejecutar migraciones
npx prisma migrate deploy
npx prisma generate

# Salir del contenedor
exit
```

---

## ✅ Paso 13: Verificar que Todo Funciona

1. **Verifica los servicios:**
```bash
docker-compose -f docker-compose.prod.yml ps
systemctl status nginx
```

2. **Verifica los logs:**
```bash
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml logs frontend
```

3. **Accede al sitio:**
   - Abre tu navegador y ve a: `https://midatopay.com`
   - Deberías ver la página funcionando

---

## 🔄 Paso 14: Configurar Scripts de Utilidad

El proyecto incluye scripts útiles en la carpeta `scripts/`. Copia estos scripts al servidor y hazlos ejecutables:

```bash
cd /var/www/midatopay

# Hacer ejecutables los scripts
chmod +x scripts/*.sh

# Estos scripts incluyen:
# - deploy.sh: Despliegue completo del proyecto
# - update.sh: Actualizar código y reconstruir
# - backup-db.sh: Backup de la base de datos
# - check-status.sh: Verificar estado de servicios
```

### Usar los scripts:

```bash
# Desplegar inicialmente
./scripts/deploy.sh

# Actualizar el proyecto
./scripts/update.sh main

# Hacer backup de la base de datos
./scripts/backup-db.sh

# Verificar estado
./scripts/check-status.sh
```

---

## 📊 Comandos Útiles para Mantenimiento

### Ver logs en tiempo real
```bash
docker-compose -f docker-compose.prod.yml logs -f
```

### Reiniciar servicios
```bash
docker-compose -f docker-compose.prod.yml restart
```

### Detener servicios
```bash
docker-compose -f docker-compose.prod.yml down
```

### Actualizar y reconstruir
```bash
cd /var/www/midatopay
git pull
docker-compose -f docker-compose.prod.yml up -d --build
```

### Backup de base de datos
```bash
docker exec midatopay-postgres-prod pg_dump -U midatopay midatopay > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restaurar base de datos
```bash
docker exec -i midatopay-postgres-prod psql -U midatopay midatopay < backup.sql
```

---

## 🐛 Solución de Problemas

### El sitio no carga
1. Verifica que Nginx esté corriendo: `systemctl status nginx`
2. Verifica los logs de Nginx: `tail -f /var/log/nginx/midatopay-error.log`
3. Verifica que los contenedores estén corriendo: `docker ps`

### Error 502 Bad Gateway
- Los contenedores no están corriendo o hay un error en el backend
- Verifica: `docker-compose -f docker-compose.prod.yml logs backend`

### Error de conexión a base de datos
- Verifica que PostgreSQL esté corriendo: `docker ps | grep postgres`
- Verifica las variables de entorno en `backend/.env`
- Verifica los logs: `docker-compose -f docker-compose.prod.yml logs postgres`

### SSL no funciona
- Verifica que el certificado exista: `ls -la /etc/letsencrypt/live/midatopay.com/`
- Renueva el certificado: `certbot renew`

---

## 📝 Notas Importantes

1. **Seguridad:**
   - Cambia todas las contraseñas por defecto
   - Usa `JWT_SECRET` fuerte (mínimo 32 caracteres)
   - No commits `.env` files al repositorio

2. **Backups:**
   - Configura backups automáticos de la base de datos
   - Guarda backups de las variables de entorno

3. **Monitoreo:**
   - Considera usar herramientas como PM2 o supervisord si no usas Docker
   - Configura alertas para cuando los servicios caigan

4. **Actualizaciones:**
   - Mantén Docker y las imágenes actualizadas
   - Revisa logs regularmente

---

## 📝 Resumen Rápido (Referencia)

Para referencia rápida, aquí están los pasos esenciales en orden:

1. **Conectarse al VPS:** `ssh root@TU_IP`
2. **Instalar dependencias:** Docker, Docker Compose, Nginx, Certbot
3. **Configurar DNS en Cloudflare:** A record apuntando a la IP del VPS
4. **Subir código:** `git clone` o SCP al `/var/www/midatopay`
5. **Configurar variables de entorno:** `backend/.env` y `frontend/.env.production`
6. **Crear `.env` raíz:** Para Docker Compose (POSTGRES_PASSWORD)
7. **Configurar Nginx:** `/etc/nginx/sites-available/midatopay`
8. **Configurar SSL:** `certbot --nginx -d midatopay.com -d www.midatopay.com`
9. **Desplegar:** `docker-compose -f docker-compose.prod.yml up -d --build`
10. **Migraciones:** `docker exec midatopay-backend-prod npx prisma migrate deploy`

**Comandos clave:**
```bash
# Ver estado
docker-compose -f docker-compose.prod.yml ps

# Ver logs
docker-compose -f docker-compose.prod.yml logs -f

# Reiniciar
docker-compose -f docker-compose.prod.yml restart

# Actualizar
./scripts/update.sh main
```

---

## ✅ Checklist Final

- [ ] DNS configurado en Cloudflare apuntando al IP del VPS
- [ ] Docker y Docker Compose instalados
- [ ] Nginx instalado y configurado
- [ ] SSL configurado con Let's Encrypt
- [ ] Variables de entorno configuradas (backend/.env y frontend/.env.production)
- [ ] Contenedores construidos y corriendo
- [ ] Migraciones de base de datos ejecutadas
- [ ] Firewall configurado
- [ ] Sitio accesible en https://midatopay.com
- [ ] Logs verificados sin errores críticos

---

## 🐳 Notas sobre Docker

### Configuración Docker

- **Dockerfiles optimizados** para producción con usuario no-root
- **Healthchecks configurados** para verificar que los servicios estén listos
- **Volúmenes**: En producción NO se montan volúmenes de código (solo datos persistentes)
- **`.dockerignore`**: Configurado para excluir archivos innecesarios

### Información Técnica

- **Backend**: Usa `starkli` CLI para transacciones Starknet (instalado en servidor, no en Docker)
- **Frontend**: Variables `NEXT_PUBLIC_*` se pasan como build args
- **StarknetService**: No se usa actualmente (el proyecto usa `midatopayService.js` con `starkli` directamente)

---

## 📦 Archivos Docker Clave

### Archivos para Mostrar al Equipo:

1. **Dockerfiles:**
   - `backend/Dockerfile` - Backend Node.js optimizado
   - `frontend/Dockerfile` - Frontend Next.js optimizado

2. **Docker Compose:**
   - `docker-compose.yml` - **Desarrollo** (con hot-reload)
   - `docker-compose.prod.yml` - **Producción** (optimizado)

3. **Configuración:**
   - `backend/.dockerignore` - Excluye archivos innecesarios
   - `frontend/.dockerignore` - Excluye archivos innecesarios

### Para Desarrollo Local:

```bash
# 1. Copiar variables de entorno
cp backend/env.example backend/.env
cp frontend/env.example frontend/.env.local

# 2. Editar backend/.env con tus valores
# (DATABASE_URL, JWT_SECRET, etc.)

# 3. Levantar servicios
docker-compose up -d

# 4. Ejecutar migraciones
docker exec midatopay-backend npx prisma migrate dev

# 5. Acceder:
# - Frontend: http://localhost:3000
# - Backend API: http://localhost:3001
```

### Comandos Útiles:

**Desarrollo:**
```bash
docker-compose ps              # Ver servicios
docker-compose logs -f         # Ver logs
docker-compose up -d --build   # Reconstruir
docker-compose down            # Detener
```

**Producción:**
```bash
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs -f
docker-compose -f docker-compose.prod.yml up -d --build
```

---

¡Listo! Tu aplicación debería estar funcionando en producción. 🎉

Si tienes problemas, revisa los logs y la sección de solución de problemas arriba.

