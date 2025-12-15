import { useState, useCallback } from 'react'
import JSZip from 'jszip'

// Parser del formato de texto
function parseSlideContent(text) {
  const slides = {}
  const regex = /\[SLIDE\s*(\d+)\]\s*\n([^\[]*)/gi
  let match

  while ((match = regex.exec(text)) !== null) {
    const slideNum = parseInt(match[1])
    const content = match[2].trim()
    const lines = content.split('\n')
    const title = lines[0] || ''
    const body = lines.slice(1).join('\n').trim()
    
    slides[slideNum] = { title, body }
  }

  return slides
}

// Genera el XML del cuadro de texto
function createTextBoxXml(id, title, text) {
  const escapedTitle = escapeXml(title)
  const escapedText = escapeXml(text)
  
  return `
    <p:sp xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
      <p:nvSpPr>
        <p:cNvPr id="${id}" name="CuadroTexto ${id - 1}"/>
        <p:cNvSpPr txBox="1"/>
        <p:nvPr/>
      </p:nvSpPr>
      <p:spPr>
        <a:xfrm>
          <a:off x="187890" y="8467594"/>
          <a:ext cx="14779616" cy="1200329"/>
        </a:xfrm>
        <a:prstGeom prst="rect">
          <a:avLst/>
        </a:prstGeom>
        <a:noFill/>
      </p:spPr>
      <p:txBody>
        <a:bodyPr rot="0" spcFirstLastPara="0" vertOverflow="overflow" horzOverflow="overflow" vert="horz" wrap="square" lIns="91440" tIns="45720" rIns="91440" bIns="45720" numCol="1" spcCol="0" rtlCol="0" fromWordArt="0" anchor="t" anchorCtr="0" forceAA="0" compatLnSpc="1">
          <a:prstTxWarp prst="textNoShape">
            <a:avLst/>
          </a:prstTxWarp>
          <a:spAutoFit/>
        </a:bodyPr>
        <a:lstStyle/>
        <a:p>
          <a:r>
            <a:rPr lang="es-ES"/>
            <a:t>${escapedTitle}</a:t>
          </a:r>
        </a:p>
        <a:p>
          <a:r>
            <a:rPr lang="es-ES"/>
            <a:t>${escapedText}</a:t>
          </a:r>
        </a:p>
        <a:p>
          <a:endParaRPr lang="es-ES"/>
        </a:p>
      </p:txBody>
    </p:sp>`
}

function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// Encuentra el máximo ID en el XML de una slide
function getMaxId(xmlContent) {
  const idRegex = /id="(\d+)"/g
  let maxId = 0
  let match
  while ((match = idRegex.exec(xmlContent)) !== null) {
    maxId = Math.max(maxId, parseInt(match[1]))
  }
  return maxId
}

// Inserta el cuadro de texto en el XML de la slide
function insertTextBox(xmlContent, textBoxXml) {
  // Insertar antes del cierre de </p:spTree>
  const insertPoint = xmlContent.lastIndexOf('</p:spTree>')
  if (insertPoint === -1) return xmlContent
  
  return xmlContent.slice(0, insertPoint) + textBoxXml + '\n    ' + xmlContent.slice(insertPoint)
}

export default function App() {
  const [file, setFile] = useState(null)
  const [fileName, setFileName] = useState('')
  const [textContent, setTextContent] = useState('')
  const [parsedSlides, setParsedSlides] = useState({})
  const [processing, setProcessing] = useState(false)
  const [message, setMessage] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const handleFileDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const droppedFile = e.dataTransfer?.files[0] || e.target.files[0]
    if (droppedFile && droppedFile.name.endsWith('.pptx')) {
      setFile(droppedFile)
      setFileName(droppedFile.name)
      setMessage('')
    } else {
      setMessage('Por favor, seleccioná un archivo .pptx')
    }
  }, [])

  const handleTextChange = (e) => {
    const text = e.target.value
    setTextContent(text)
    setParsedSlides(parseSlideContent(text))
  }

  const processFile = async () => {
    if (!file || Object.keys(parsedSlides).length === 0) {
      setMessage('Necesitás subir un archivo y agregar contenido para las slides')
      return
    }

    setProcessing(true)
    setMessage('Procesando...')

    try {
      const zip = await JSZip.loadAsync(file)
      
      // Procesar cada slide que tenga contenido definido
      for (const [slideNum, content] of Object.entries(parsedSlides)) {
        const slidePath = `ppt/slides/slide${slideNum}.xml`
        const slideFile = zip.file(slidePath)
        
        if (slideFile) {
          let xmlContent = await slideFile.async('string')
          const maxId = getMaxId(xmlContent)
          const textBoxXml = createTextBoxXml(maxId + 1, content.title, content.body)
          xmlContent = insertTextBox(xmlContent, textBoxXml)
          zip.file(slidePath, xmlContent)
        }
      }

      // Generar el archivo modificado
      const blob = await zip.generateAsync({ type: 'blob' })
      
      // Descargar
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName.replace('.pptx', '-con-guion.pptx')
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setMessage('¡Archivo generado exitosamente!')
    } catch (error) {
      console.error(error)
      setMessage('Error al procesar el archivo: ' + error.message)
    }

    setProcessing(false)
  }

  const slideCount = Object.keys(parsedSlides).length

  const exampleText = `[SLIDE 1]
Diapositiva 1 – Introducción
Hola, en este video vamos a ver los conceptos básicos del tema...

[SLIDE 2]
Diapositiva 2 – Primer concepto
Aquí explicamos el primer concepto importante que deben conocer...

[SLIDE 3]
Diapositiva 3 – Segundo concepto
Continuamos con el segundo concepto que se relaciona con el anterior...`

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-2 text-blue-400">
          PPTX Text Adder
        </h1>
        <p className="text-center text-gray-400 mb-8">
          Agregá cuadros de texto con el guion a tus presentaciones
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Columna izquierda */}
          <div className="space-y-6">
            {/* Drop zone */}
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                dragOver 
                  ? 'border-blue-400 bg-blue-900/20' 
                  : 'border-gray-600 hover:border-gray-500'
              }`}
              onDrop={handleFileDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
            >
              <input
                type="file"
                accept=".pptx"
                onChange={handleFileDrop}
                className="hidden"
                id="fileInput"
              />
              <label htmlFor="fileInput" className="cursor-pointer">
                <div className="text-5xl mb-4">📎</div>
                {fileName ? (
                  <p className="text-green-400 font-medium">{fileName}</p>
                ) : (
                  <>
                    <p className="text-gray-300">Arrastrá tu archivo .pptx aquí</p>
                    <p className="text-gray-500 text-sm mt-1">o hacé clic para seleccionar</p>
                  </>
                )}
              </label>
            </div>

            {/* Textarea para el contenido */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-gray-300">
                  Contenido de las slides
                </label>
                <button
                  onClick={() => { setTextContent(exampleText); setParsedSlides(parseSlideContent(exampleText)) }}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Cargar ejemplo
                </button>
              </div>
              <textarea
                value={textContent}
                onChange={handleTextChange}
                placeholder={`[SLIDE 1]\nDiapositiva 1 – Título\nTexto del guion para esta diapositiva...\n\n[SLIDE 2]\nDiapositiva 2 – Título\nTexto del guion para la segunda diapositiva...`}
                className="w-full h-80 bg-gray-800 border border-gray-700 rounded-lg p-4 text-gray-100 font-mono text-sm resize-none focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Botón de procesar */}
            <button
              onClick={processFile}
              disabled={processing || !file || slideCount === 0}
              className={`w-full py-3 rounded-lg font-medium transition-colors ${
                processing || !file || slideCount === 0
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              {processing ? 'Procesando...' : `Generar PPTX (${slideCount} slides)`}
            </button>

            {message && (
              <p className={`text-center ${message.includes('Error') ? 'text-red-400' : 'text-green-400'}`}>
                {message}
              </p>
            )}
          </div>

          {/* Columna derecha - Preview */}
          <div>
            <h2 className="text-sm font-medium text-gray-300 mb-3">
              Vista previa ({slideCount} slides detectadas)
            </h2>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 h-[500px] overflow-y-auto space-y-4">
              {slideCount === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  El contenido parseado aparecerá aquí...
                </p>
              ) : (
                Object.entries(parsedSlides)
                  .sort(([a], [b]) => parseInt(a) - parseInt(b))
                  .map(([num, content]) => (
                    <div key={num} className="bg-gray-750 border border-gray-600 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">
                          Slide {num}
                        </span>
                      </div>
                      <h3 className="font-medium text-blue-300 mb-1">{content.title}</h3>
                      <p className="text-gray-400 text-sm whitespace-pre-wrap">{content.body}</p>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>

        {/* Instrucciones */}
        <div className="mt-8 bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h2 className="font-medium text-gray-200 mb-3">📝 Formato del texto</h2>
          <pre className="text-sm text-gray-400 bg-gray-900 p-4 rounded-lg overflow-x-auto">
{`[SLIDE 1]
Diapositiva 1 – Título de la sección
Texto del guion que aparecerá en el cuadro de texto...

[SLIDE 2]
Diapositiva 2 – Otro título
Más texto para la segunda diapositiva...`}
          </pre>
          <ul className="mt-4 text-sm text-gray-400 space-y-1">
            <li>• <code className="text-blue-400">[SLIDE X]</code> marca el inicio de cada bloque</li>
            <li>• La primera línea después es el <strong className="text-gray-300">título</strong> del cuadro</li>
            <li>• El resto es el <strong className="text-gray-300">contenido/guion</strong></li>
          </ul>
        </div>
      </div>
    </div>
  )
}
