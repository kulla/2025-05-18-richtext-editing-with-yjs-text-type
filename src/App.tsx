import * as Y from 'yjs'
import './App.css'
import { useRef, useSyncExternalStore } from 'react'
import { isEqual } from 'lodash'
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

  return (
    <main className="prose p-10">
      <h1>Richtext:</h1>
      {text != null ? <RichText text={text} /> : <p>Loading...</p>}
      <h1 className="mt-5">Internal state</h1>
      <pre>{JSON.stringify(text, null, 2)}</pre>
    </main>
  )
}

function RichText({ text }: { text: RichText }) {
  return (
    <p id="richtext">
      {text.map((item, index) => {
        return (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
            key={index}
            className={clsx(
              item.attributes?.bold ? 'font-bold' : null,
              item.attributes?.italic ? 'italic' : null,
            )}
          >
            {item.insert}
          </span>
        )
      })}
    </p>
  )
}

type RichText = Array<InsertText>

interface InsertText {
  insert: string
  attributes?: {
    bold?: boolean
    italic?: boolean
  }
}
