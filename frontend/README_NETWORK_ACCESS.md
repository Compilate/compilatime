# Acceso a CompilaTime Frontend desde la Red Local

## Configuración Realizada

Se ha configurado el frontend de CompilaTime para que sea accesible desde cualquier dispositivo en la red local.

## Cambios Realizados

### 1. Configuración de Vite
Se ha modificado `vite.config.ts` para agregar:
```typescript
server: {
    host: '0.0.0.0', // Permite acceso desde cualquier dispositivo en la red
    port: 3000,
    // ... resto de configuración
}
```

### 2. Scripts de npm
Se han agregado nuevos scripts en `package.json`:
```json
"scripts": {
    "dev": "vite --host 0.0.0.0", // Inicia servidor accesible desde la red
    "dev:local": "vite", // Inicia servidor solo para localhost
    // ... otros scripts
}
```

## Cómo Acceder desde Otros Dispositivos

### Método 1: Usar el script de red
1. Inicia el servidor con:
   ```bash
   npm run dev
   ```
2. Desde otro dispositivo en la misma red, accede a:
   ```
   http://[IP_DEL_SERVIDOR]:3000
   ```

### Método 2: Usar el script local
1. Si solo quieres acceso local, usa:
   ```bash
   npm run dev:local
   ```
2. Accede desde el mismo equipo:
   ```
   http://localhost:3000
   ```

## Cómo Encontrar tu IP Local

### Windows
1. Abre Símbolo del sistema (CMD)
2. Ejecuta: `ipconfig`
3. Busca "Dirección IPv4" bajo tu adaptador de red

### macOS/Linux
1. Abre Terminal
2. Ejecuta: `ip addr show` o `ifconfig`
3. Busca la dirección inet (generalmente 192.168.x.x o 10.x.x.x)

### Alternativa Universal
1. En cualquier dispositivo, visita: `https://ipinfo.io`
2. Tu IP pública aparecerá (si necesitas acceso desde fuera de tu red local)

## Consideraciones de Seguridad

⚠️ **Importante**: Esta configuración expone el servidor de desarrollo a toda tu red local.

### Recomendaciones:
1. **Uso temporal**: Usa esta configuración solo durante el desarrollo
2. **Red segura**: Asegúrate de estar en una red de confianza
3. **Firewall**: Verifica que tu firewall permita conexiones al puerto 3000
4. **Producción**: Nunca uses esta configuración en producción

## Para Volver al Comportamiento Anterior

Si deseas volver al comportamiento anterior (solo localhost):
1. Usa el script: `npm run dev:local`
2. O modifica `vite.config.ts` y elimina la línea `host: '0.0.0.0'`

## Problemas Comunes

### "Conexión rechazada"
- Verifica que ambos dispositivos estén en la misma red
- Confirma que el firewall no esté bloqueando el puerto 3000

### "Página no encontrada"
- Asegúrate de que el servidor esté corriendo
- Verifica la IP correctamente (sin typos)

### "Cargando lento"
- Verifica la calidad de la conexión Wi-Fi
- Considera usar conexión cableada si es posible

## Acceso Móvil

Para acceder desde un dispositivo móvil:
1. Conecta el móvil a la misma Wi-Fi que el servidor
2. Abre el navegador y usa la IP del servidor: `http://[IP]:3000`
3. Considera agregar a pantalla de inicio para acceso rápido

## Notas Finales

- El servidor de desarrollo recarga automáticamente los cambios
- Los errores de CORS están manejados por la configuración de proxy
- El backend debe estar corriendo en `http://localhost:4000`