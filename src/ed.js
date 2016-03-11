import {createElement as el} from 'react'
import ReactDOM from 'react-dom'
import './util/react-tap-hack'
import uuid from 'uuid'

import GridToDoc from './convert/grid-to-doc'
import DocToGrid from './convert/doc-to-grid'
import {isMediaType} from './convert/types'
import determineFold from './convert/determine-fold'

import App from './components/app'


export default class Ed {
  constructor (options) {
    if (!options) {
      throw new Error('Missing options')
    }
    if (!options.initialContent) {
      throw new Error('Missing options.initialContent array')
    }
    if (!options.onChange) {
      throw new Error('Missing options.onChange')
    }
    if (!options.container) {
      throw new Error('Missing options.container')
    }

    // Initialize store
    this._events = {}
    this._content = {}
    this._initializeContent(options.initialContent)
    const {media, content} = determineFold(options.initialContent)
    options.initialMedia = media
    options.initialContent = content
    options.store = this

    // Events
    this.on('change', options.onChange)
    options.onChange = this.routeChange.bind(this)

    // Setup main DOM structure
    this.container = options.container
    this.app = el(App, options)
    ReactDOM.render(this.app, options.container)
  }
  teardown () {
    ReactDOM.unmountComponentAtNode(this.container)
  }
  routeChange (type, payload) {
    switch (type) {
      case 'EDITABLE_INITIALIZE':
        this._editableInitialize(payload)
        break
      case 'MEDIA_BLOCK_UPDATE':
        this.updateMediaBlock(payload)
        break
      case 'EDITABLE_CHANGE':
        this.trigger('change')
        break
      default:
        break
    }
  }
  _editableInitialize (editableView) {
    if (this.editableView) {
      throw new Error('Ed._editableInitialize should only be called once')
    }
    this.editableView = editableView
    this.pm = editableView.pm
  }
  _initializeContent (content) {
    for (let i = 0, len = content.length; i < len; i++) {
      const block = content[i]
      if (!block || !block.id) {
        continue
      }
      this._content[block.id] = block
    }
  }
  on (eventName, func) {
    let events = this._events[eventName]
    if (!events) {
      events = this._events[eventName] = []
    }
    events.push(func)
  }
  off (eventName, func) {
    const events = this._events[eventName]
    if (!events) {
      return
    }
    const index = events.indexOf(func)
    if (index > -1) {
      events.splice(index, 1)
    }
  }
  trigger (eventName, payload) {
    const events = this._events[eventName]
    if (!events) {
      return
    }
    for (let i = 0, len = events.length; i < len; i++) {
      events[i](payload)
    }
  }
  updateMediaBlock (block) {
    // Widget plugin calls this to update a block in the content array
    // Only media blocks can use this.
    if (!block || !block.id || !block.type || !isMediaType(block.type)) {
      throw new Error('Can not update this block')
    }
    const currentBlock = this.getBlock(block.id)
    if (!currentBlock) {
      throw new Error('Can not find this block')
    }

    // MUTATION
    this._content[block.id] = block
    this.trigger('change')
  }
  getBlock (id) {
    return this._content[id]
  }
  replaceBlock (index, block) {
    let content = this.getContent()
    // MUTATION
    content.splice(index, 1, block)
    // Render
    this._setMergedContent(content)
  }
  insertBlocks (index, blocks) {
    const content = this.getContent()
    // MUTATION
    const newContent = arrayInsertAll(content, index, blocks)
    // Render
    this._setMergedContent(newContent)
  }
  insertPlaceholders (index, count) {
    let toInsert = []
    let ids = []
    for (let i = 0, length = count; i < length; i++) {
      const id = uuid.v4()
      ids.push(id)
      toInsert.push(
        { id
        , type: 'placeholder'
        , metadata: {}
        }
      )
    }
    this.insertBlocks(index, toInsert)
    return ids
  }
  updatePlaceholder (id, status, progress) {
    let block = this.getBlock(id)
    // Mutation
    if (status != null) block.metadata.status = status
    if (progress != null) block.metadata.progress = progress
    // Let widgets know to update
    this.trigger('media.update')
  }
  getContent () {
    let doc = this.pm.getContent()
    return DocToGrid(doc, this._content)
  }
  setContent (content) {
    const merged = mergeContent(this.getContent(), content)
    this._setMergedContent(merged)
  }
  _setMergedContent (content) {
    this._initializeContent(content)
    let doc = GridToDoc(content)
    // Cache selection to restore after DOM update
    let selection = fixSelection(this.pm.selection, doc)
    // Populate ProseMirror
    this.pm.setDoc(doc, selection)
    // Let widgets know to update
    this.trigger('media.update')
  }
}

// Util

function getIndexWithId (array, id) {
  for (let i = 0, len = array.length; i < len; i++) {
    let item = array[i]
    if (item.id === id) {
      return i
    }
  }
  return -1
}

// function getItemWithId (array, id) {
//   let index = getIndexWithId(array, id)
//   if (index === -1) return
//   return array[index]
// }

function arrayInsertAll (array, index, arrayToInsert) {
  let before = array.slice(0, index)
  const after = array.slice(index)
  return before.concat(arrayToInsert, after)
}

function mergeContent (oldContent, newContent) {
  // Only add new placeholders and update exiting placeholders
  let merged = oldContent.slice()
  // New placeholders
  for (let i = 0, len = newContent.length; i < len; i++) {
    const block = newContent[i]
    if (block.type === 'placeholder') {
      const index = getIndexWithId(merged, block.id)
      if (index > -1) {
        merged.splice(index, 1, block)
      } else {
        merged.splice(i, 0, block)
      }
    }
  }
  // Old placeholders
  for (let i = 0, len = merged.length; i < len; i++) {
    const block = merged[i]
    if (block.type === 'placeholder') {
      const index = getIndexWithId(newContent, block.id)
      if (index > -1) {
        merged.splice(i, 1, newContent[index])
      }
    }
  }
  return merged
}

// Can't restore selection to a non-focuable (Media) div
function fixSelection (selection, doc) {
  let index = selection.anchor.path[0]
  if (doc.content.content[index] && doc.content.content[index].type.contains !== null) {
    return selection
  }
  while (doc.content.content[index] && doc.content.content[index].type.contains === null) {
    index++
  }
  if (!doc.content.content[index]) {
    return
  }
  // MUTATION
  selection.anchor.path = [index]
  selection.head.path = [index]
  return selection
}
