# Publicar UniPlace en Railway + Vercel

## 1. Subir el proyecto a GitHub

1. Revisa que `server/.env` no se suba.
2. Sube el repositorio a GitHub.
3. Asegúrate de incluir:
   - `server/.env.example`
   - `server/railway.json`
   - `vercel.json`
   - `database/migrations/001_deploy_support.sql`
   - `js/config.js`

## 2. Publicar backend en Railway

1. Crea un nuevo proyecto en Railway desde GitHub.
2. Selecciona este repositorio.
3. En la configuración del servicio, usa `server` como root directory.
4. Agrega una base MySQL en Railway.
5. Copia las variables de `server/.env.example` en Railway.
6. Usa la variable `DATABASE_URL` o `MYSQL_URL` que Railway genere para MySQL.
7. Configura:
   - `JWT_SECRET`
   - `GEMINI_API_KEY`
   - variables SMTP de correo
   - `FRONTEND_URL` con tu URL final de Vercel cuando la tengas
8. Ejecuta la migración `database/migrations/001_deploy_support.sql` en la base MySQL.
9. Verifica que la API responda en:
   - `https://TU-BACKEND.up.railway.app/api/health`

## 3. Conectar frontend con Railway

Cuando Railway te dé la URL pública del backend, edita `js/config.js`:

```js
const productionApiUrl = "https://TU-BACKEND-RAILWAY.up.railway.app/api";
```

Reemplaza esa URL por la real.

Para probar una API temporal sin editar archivos, puedes abrir la consola del navegador y ejecutar:

```js
localStorage.setItem("uniplace_api_url", "https://TU-BACKEND-RAILWAY.up.railway.app/api");
location.reload();
```

Para volver a la configuración del archivo:

```js
localStorage.removeItem("uniplace_api_url");
location.reload();
```

## 4. Publicar frontend en Vercel

1. Crea un proyecto en Vercel desde GitHub.
2. Usa la raíz del repositorio como root directory.
3. No necesitas build command.
4. No necesitas output directory.
5. Publica.
6. Copia la URL final de Vercel.

## 5. Volver a Railway y cerrar CORS

En Railway, configura:

```env
FRONTEND_URL=https://TU-FRONTEND.vercel.app
```

Si tienes más dominios:

```env
FRONTEND_URLS=https://www.tudominio.com,https://tudominio.com
```

## 6. Checklist antes de mostrarlo

- Registro de usuario funciona.
- Llega correo de verificación.
- Login funciona con y sin "Recuérdame".
- Dashboard carga.
- Chat responde.
- Registro de emprendimiento guarda ficha.
- Subida de imágenes funciona.
- Subida de RUC/permisos funciona.
- Admin ve documentos y puede aprobar.
- Mapa La Mariscal carga con OpenStreetMap.

## 7. Pendientes recomendados para producción real

- Mover uploads sensibles a storage privado como Cloudinary, S3 o Supabase Storage.
- Agregar coordenadas exactas a cada emprendimiento.
- Cambiar documentos RUC/permisos a acceso privado, no público.
- Agregar pruebas automáticas.
- Agregar logs/monitoreo.
