import {toDOM} from 'prosemirror/src/format'
import {isMediaType} from './types'
import BlockMetaSchema from '../schema/block-meta'

export default function (doc, apiContentMap) {
  const fragment = toDOM(doc)
  const dom = document.createElement('div')
  dom.appendChild(fragment)
  let currentContent = []
  for (let i = 0, len = dom.children.length; i < len; i++) {
    const child = dom.children[i]
    const id = child.getAttribute('grid-id') || null
    let type = child.getAttribute('grid-type') || child.tagName.toLowerCase()
    type = translateIrregularGridTypes(type)
    const isMedia = isMediaType(type)

    let apiBlock = apiContentMap[id]
    if (!apiBlock) {
      apiBlock = isMedia ? {id, type} : {type}
    }
    // TODO massage media types that need it
    if (!isMedia) {
      apiBlock.html = child.outerHTML
    }
    if (isMedia) {
      const html = metaToHtml(apiBlock)
      if (html) {
        apiBlock.html = html
      }
    }
    currentContent[i] = apiBlock
  }

  return currentContent
}


// Ugh.
function translateIrregularGridTypes (type) {
  switch (type) {
    case 'blockquote':
      return 'quote'
    case 'p':
      return 'text'
    default:
      return type
  }
}

// Uuuugggghh.
export function metaToHtml (block) {
  const {type} = block
  const schema = BlockMetaSchema[type]
  if (schema && schema.makeHtml) {
    return schema.makeHtml(block.metadata, block.cover)
  }
}
