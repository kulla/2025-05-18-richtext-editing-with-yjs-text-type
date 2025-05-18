import * as Y from 'yjs'
import './App.css'
import {
  useRef,
  useSyncExternalStore,
  useState,
  useEffect,
  type FormEvent,
  useCallback,
  useLayoutEffect,
} from 'react'
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

  const handleBeforeInput = useCallback(
    (event: FormEvent<HTMLDivElement>) => {
      event.stopPropagation()

      if (!isInputEvent(event.nativeEvent)) return

      const { data } = event.nativeEvent

      if (typeof data !== 'string') return
      if (data.length === 0) return

      if (selection == null) return

      ytext.insert(selection.index, data)
      setSelection((prev) => {
        if (prev == null) return null

        const newPosition = {
          index: prev.index + data.length,
        }

        return newPosition
      })
    },
    [selection],
  )

  const handleSelectionChange = useCallback(() => {
    const newPosition = getSelectionPosition(window.getSelection())

    if (!isEqual(newPosition, selection)) {
      setSelection(newPosition)
    }
  }, [selection])

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange)

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange)
    }
  }, [handleSelectionChange])

  useLayoutEffect(() => {
    const windowSelection = window.getSelection()

    if (windowSelection == null) return

    windowSelection.removeAllRanges()

    if (selection == null) {
      return
    }

    const richtext = document.getElementById('richtext')

    if (richtext == null) return

    let anchorNode: Node | null = null
    let lastPosition = 0

    for (let i = 0; i < richtext.childNodes.length; i++) {
      const child = richtext.childNodes[i]

      if (!isElement(child)) continue

      const position = Number.parseInt(child.dataset.position ?? '', 10)

      if (Number.isNaN(position)) continue

      if (position > selection.index) break

      anchorNode = child
      lastPosition = position
    }

    if (anchorNode == null) return

    windowSelection.setPosition(
      anchorNode.childNodes[0],
      selection.index - lastPosition,
    )
  }, [selection])

  return (
    <main className="prose p-10">
      <h1>Richtext:</h1>
      {text != null ? (
        <RichText text={text} handleBeforeInput={handleBeforeInput} />
      ) : (
        <p>Loading...</p>
      )}
      <h1 className="mt-5">Internal state</h1>
      <pre>{JSON.stringify({ selection, text }, null, 2)}</pre>
    </main>
  )
}

function RichText({
  text,
  handleBeforeInput,
}: {
  text: RichText
  handleBeforeInput: (event: FormEvent<HTMLDivElement>) => void
}) {
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
      onBeforeInput={handleBeforeInput}
      onKeyDown={(event) => {
        if (event.key.length > 1) event.preventDefault()
      }}
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

function isInputEvent(event: Event): event is InputEvent {
  return 'data' in event
}

function isElement(node: Node): node is HTMLElement {
  return node.nodeType === Node.ELEMENT_NODE
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
