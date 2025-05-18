import * as Y from 'yjs'
import './App.css'
import { useRef, useSyncExternalStore } from 'react'
import { isEqual } from 'lodash'

const ydoc = new Y.Doc()
const ytext = ydoc.getText('text')

// Insert some initial text
ytext.insert(0, 'Hello World!')

export default function App() {
  const previousText = useRef(null)
  const text = useSyncExternalStore(
    (callback) => {
      ytext.observe(callback)

      return () => {
        ytext.unobserve(callback)
      }
    },
    () => {
      const text = ytext.toDelta()

      if (isEqual(previousText.current, text)) {
        return previousText.current
      }

      previousText.current = text
      return text
    },
  )

  return (
    <main className="prose p-10">
      <h1>Rsbuild with React</h1>
      <p>Start building amazing things with Rsbuild.</p>
      <h1 className="mt-5">Internal state</h1>
      <pre>{JSON.stringify(text, null, 2)}</pre>
    </main>
  )
}
