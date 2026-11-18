# Formulario de asistencia

Sitio estático preparado para GitHub Pages. Utiliza un único QR por evento y envía los datos a Power Automate, que determina la franja activa usando `tblFranjas`.

## Probar localmente

Abra una terminal en esta carpeta y ejecute:

```powershell
python -m http.server 8080
```

Visite:

```text
http://localhost:8080/?evento=EVT001
```

## Conexión con Power Automate

Cuando exista el flujo, coloque su URL HTTP en `config.js`. El formulario envía un JSON con esta estructura:

```json
{
  "eventoId": "EVT001",
  "tipoDocumento": "CC",
  "numeroDocumento": "123456789",
  "claveParticipante": "CC|123456789",
  "nombreCompleto": "Ana Martinez",
  "correo": "ana@ejemplo.com",
  "empresa": "Empresa ABC",
  "autorizaDatos": "Si",
  "origen": "GitHubPages"
}
```

La fecha y hora válidas deben generarse en Power Automate, no tomarse del navegador del participante.
