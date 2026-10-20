# anuar-desktop

Convierte **cualquier app Node** (con o sin MariaDB) en un programa de escritorio para Windows: un solo instalador `.exe`
que instala todo, abre la app en el navegador y funciona sin Internet. Se escribe **una vez**; cada app solo trae su configuración.

## Qué hace por vos
- **Instalador `.exe`** (Inno Setup, sin permisos de administrador, acceso directo en el escritorio).
- **Node portable** y **MariaDB portable** adentro (solo escucha en `127.0.0.1`).
- **Primera configuración** en una pantalla del navegador, generada desde tu lista de campos.
- **Base de datos** creada la primera vez, esquema cargado desde un `.sql` (convierte volcados de MySQL 8 a MariaDB).
- **Datos separados del programa** en `%LOCALAPPDATA%\<id>-datos`: actualizar no borra nada.
- Registros en `…\logs`.

## Usar en otra app (3 pasos)

1. Agregá en la raíz de la app **`desktop.config.json`** (ver `ejemplo/` y la tabla de abajo).
2. Agregá **`.github/workflows/instalador-windows.yml`**:
   ```yaml
   name: Instalador Windows
   on: { workflow_dispatch: {} }
   jobs:
     instalador:
       uses: Sebamiranda82/anuar-desktop/.github/workflows/build-windows.yml@v1
   ```
3. GitHub → **Actions → Instalador Windows → Run workflow**. Al terminar, descargá el `.exe` en *Artifacts*.

Si la app usa base de datos, necesita `mysql2` en sus dependencias y un `.sql` con la estructura
(`mariadb-dump --no-data --skip-add-drop-table --skip-comments --no-tablespaces …`).

## desktop.config.json

| Campo | Qué es |
|---|---|
| `id` | nombre corto sin espacios (`cfb-caja`); nombra la carpeta de datos y el instalador |
| `nombre`, `version`, `editor` | textos del instalador y de la ventana |
| `entrada` | archivo que arranca la app (`server.js`) |
| `puertoWeb` | puerto donde escucha la app (se le pasa en el entorno) |
| `listo` / `abrir` | ruta que responde cuando la app está lista / ruta que se abre en el navegador |
| `incluir` / `excluir` | qué copiar (`"*.js"`, `"public"`, `"node_modules"`; excluir `"*backup*"`) |
| `baseDatos` | `{ "nombre": "mi_bd", "esquema": "estructura.sql" }` (opcional) |
| `puertoDb` | puerto de MariaDB (3307 por defecto) |
| `campos` | pantalla de primera configuración: `[{ id, etiqueta, ayuda, defecto, patron, error, secreto }]` |
| `entorno` | variables de entorno de la app, con `{campos.x}`, `{db.usuario}`, `{db.clave}`, `{db.nombre}`, `{db.puerto}`, `{puertoWeb}`, `{datos}`, `{aleatorio.hex32}` (valor estable por instalación) |

## Versiones
Publicá cambios con una etiqueta (`git tag v1.1 && git push --tags`) y las apps eligen cuál usar (`@v1`, `@v1.1`).
El repo debe ser **público** para que otros repos puedan usar el flujo reutilizable (no contiene secretos).

## Probar sin Windows
`node prueba/test.js` · `cd ejemplo && node ../bin/armar.js --salida stage && node stage/launcher.js`
