# PPTX Text Adder

Aplicación para agregar cuadros de texto con guiones a presentaciones de PowerPoint.

## Instalación

```bash
cd pptx-text-adder
npm install
```

## Uso

### Desarrollo
```bash
npm run dev
```
Abre http://localhost:5173

### Build para producción
```bash
npm run build
```
Los archivos se generan en `dist/`

## Formato del texto

```
[SLIDE 1]
Diapositiva 1 – Introducción
Hola, en este video vamos a ver los conceptos básicos...

[SLIDE 2]
Diapositiva 2 – Primer concepto
Aquí explicamos el primer concepto importante...

[SLIDE 3]
Diapositiva 3 – Segundo concepto
Continuamos con el segundo concepto...
```

### Reglas:
- `[SLIDE X]` marca el inicio de cada bloque (X = número de diapositiva)
- Primera línea después del marcador = título del cuadro
- Resto del texto = contenido/guion

## Cómo funciona

1. Subí tu archivo .pptx
2. Pegá el texto con el formato indicado
3. Verificá la vista previa
4. Hacé clic en "Generar PPTX"
5. Se descarga el archivo modificado con los cuadros de texto agregados

Los cuadros se agregan en la parte inferior de cada slide, fuera del área de presentación (ideal para notas de grabación).
