import * as Y from 'yjs'
import './App.css'
import { useRef, useSyncExternalStore, useState, useEffect } from 'react'
import { isEqual, last } from 'lodash'
import { clsx } from 'clsx'

const ydoc = new Y.Doc()
const ytext = ydoc.getText('text')

// Insert some initial text
ytext.insert(0, 'Hello ')
ytext.insert(6, 'World!', { bold: true })

export default function App() {
  const previousText = useRef<RichText>(null)
  const text = useSyncExternalStore(
    (callback) => {
      ytext.observe(callback)

      return () => {
        ytext.unobserve(callback)
      }
    },
    () => {
      // In a real application we need to some tyoe checking here (for example
      // with io-ts)
      const text = ytext.toDelta() as RichText

      if (isEqual(previousText.current, text)) {
        return previousText.current
      }

      previousText.current = text
      return text
    },
  )

  const [selection, setSelection] = useState<Position | null>(null)

  useEffect(() => {
    const handleSelectionChange = () => {
      const newPosition = getSelectionPosition(window.getSelection())

      if (!isEqual(newPosition, selection)) {
        setSelection(newPosition)
      }
    }

    document.addEventListener('selectionchange', handleSelectionChange)

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange)
    }
  }, [selection])

  return (
    <main className="prose p-10">
      <h1>Richtext:</h1>
      {text != null ? <RichText text={text} /> : <p>Loading...</p>}
      <h1 className="mt-5">Internal state</h1>
      <pre>{JSON.stringify({ selection, text }, null, 2)}</pre>
    </main>
  )
}

function RichText({ text }: { text: RichText }) {
  const positions = text
    .map((item) => item.insert.length)
    .reduce((acc, length) => {
      const lastSum = last(acc) ?? 0
      acc.push(lastSum + length)
      return acc
    }, [] as number[])

  return (
    <p
      id="richtext"
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
    >
      {text.map((item, index) => {
        return (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
            key={index}
            className={clsx(
              item.attributes?.bold ? 'font-bold' : null,
              item.attributes?.italic ? 'italic' : null,
              'whitespace-pre-wrap',
            )}
            data-position={index > 0 ? positions[index - 1] : 0}
            data-type="insert"
          >
            {item.insert}
          </span>
        )
      })}
    </p>
  )
}

function getSelectionPosition(selection: Selection | null) {
  if (selection == null) return null
  if (!selection.isCollapsed) return null

  const { anchorNode, anchorOffset } = selection

  if (anchorNode == null) return null
  if (anchorNode.nodeType !== Node.TEXT_NODE) return null

  if (anchorNode.parentElement?.parentElement?.id !== 'richtext') return null

  const positionString = anchorNode.parentElement?.dataset.position

  if (positionString == null) return null

  const position = Number.parseInt(positionString, 10)

  if (Number.isNaN(position)) return null

  return { index: position + anchorOffset }
}

type RichText = Array<InsertText>

interface InsertText {
  insert: string
  attributes?: {
    bold?: boolean
    italic?: boolean
  }
}

interface Position {
  index: number
}
