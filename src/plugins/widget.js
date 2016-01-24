/*
* Plugin to sync widget overlays with media blocks
*/

require('./widget.css')

import {debounce} from 'lodash'

// WidgetTypes keys correspond with PM media block's grid-type attribute

import WidgetCode from './widget-code'
import WidgetCover from './widget-cover'

const WidgetTypes = {
  code: WidgetCode,
  cover: WidgetCover
}

// Functions to bind in class constructor

// Should use debounced version
function onDOMChanged () {
  // Mount or move widget overlays
  const els = this.ed.pm.content.querySelectorAll('div[grid-type]')
  let inDoc = []
  for (let i = 0, len = els.length; i < len; i++) {
    const el = els[i]
    const id = el.getAttribute('grid-id')
    const type = el.getAttribute('grid-type')
    if (!id || !type) {
      throw new Error('Bad placeholder!')
    }
    inDoc.push(id)
    const rect = el.getBoundingClientRect()
    const rectangle = {
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height
    }
    this.checkWidget(id, type, rectangle)
  }

  // Hide or show widgets
  let inDOM = Object.keys(this.widgets)
  for (let i = 0, len = inDOM.length; i < len; i++) {
    const id = inDOM[i]
    const widget = this.widgets[id]
    if (inDoc.indexOf(id) !== -1) {
      widget.show()
    } else {
      widget.hide()
    }
  }

  // Measure inner heights of widgets
  let heightChanges = []
  for (let i = 0, len = inDOM.length; i < len; i++) {
    const id = inDOM[i]
    const widget = this.widgets[id]
    if (!widget.shown) continue
    const innerHeight = widget.getHeight()
    if (innerHeight !== widget.height) {
      heightChanges.push({
        id: id,
        height: innerHeight
      })
    }
  }
  if (heightChanges.length) {
    // Will trigger a redraw / this onDOMChanged again
    this.ed.updatePlaceholderHeights(heightChanges)
  }
}

function checkWidget (id, type, rectangle) {
  if (this.widgets[id]) {
    // Move it
    this.widgets[id].move(rectangle)
  } else {
    // Make it
    this.initializeWidget(id, type, rectangle)
  }
}

function initializeWidget (id, type, rectangle) {
  let Widget = WidgetTypes[type] || WidgetTypes.cover

  let initialBlock = this.ed.getBlock(id)

  this.widgets[id] = new Widget({
    id: id,
    widgetContainer: this.el,
    initialRectangle: rectangle,
    initialBlock: initialBlock
  })
}

function onIframeMessage (message) {
  if (!message || !message.source || !message.source.frameElement) return
  const fromId = message.source.frameElement.getAttribute('grid-id')
  if (!fromId) return
  const messageId = message.data.id
  if (!messageId) throw new Error('Iframe widget message missing message.data.id')
  if (fromId !== messageId) throw new Error('Iframe message id does not match frame id')
  switch (message.data.topic) {
    case 'changed':
      let block = message.data.payload
      if (fromId !== block.id) throw new Error('Iframe block id does not match frame id')
      this.ed.updateMediaBlock(block)
      break
    case 'height':
      if (isNaN(message.data.payload)) throw new Error('Iframe height message with non-numeric payload')
      this.ed.updatePlaceholderHeights([{
        id: message.data.id,
        height: message.data.payload
      }])
    case 'cursor':
    default:
      break
  }
}

// The plugin

export default class PluginWidget {
  constructor (ed) {
    this.onDOMChanged = onDOMChanged.bind(this)
    this.debouncedDOMChanged = debounce(this.onDOMChanged, 50)
    this.checkWidget = checkWidget.bind(this)
    this.initializeWidget = initializeWidget.bind(this)
    this.onIframeMessage = onIframeMessage.bind(this)

    this.ed = ed
    this.widgets = {}
    this.el = document.createElement('div')
    this.el.className = 'EdPlugins-Widgets'
    this.ed.pluginContainer.appendChild(this.el)

    this.ed.pm.on('draw', this.debouncedDOMChanged)
    window.addEventListener('resize', this.debouncedDOMChanged)
    window.addEventListener('message', this.onIframeMessage)
  }
  teardown () {
    this.ed.pm.off('draw', this.debouncedDOMChanged)
    window.removeEventListener('resize', this.debouncedDOMChanged)
    window.removeEventListener('message', this.onIframeMessage)

    this.el.parentNode.removeChild(this.el)
  }
}
