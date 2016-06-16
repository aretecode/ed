require('./editable.css')
require('./editable-menu.css')

import React, {createElement as el} from 'react'
import {ProseMirror} from 'prosemirror/dist/edit/main'
// import 'prosemirror/dist/inputrules/autoinput'
import 'prosemirror/dist/menu/tooltipmenu'
import 'prosemirror/dist/menu/menubar'

import GridToDoc from '../convert/grid-to-doc'
import commands from '../commands/index'
import {inlineMenu, blockMenu, barMenu} from '../menu/ed-menu'
import EdSchemaFull from '../schema/ed-schema-full'
import {posToIndex} from '../util/pm'

import '../inputrules/autoinput.js'

import PluginWidget from '../plugins/widget.js'
import ShareUrl from '../plugins/share-url'
import FixedMenuBarHack from '../plugins/fixed-menu-hack'
import CommandsInterface from '../plugins/commands-interface'
import PluginPlaceholder from '../plugins/placeholder'
import PluginContentHints from '../plugins/content-hints'

function noop () { /* noop */ }


class Editable extends React.Component {
  constructor (props) {
    super(props)
    this.boundOnDrop = this.onDrop.bind(this)
  }
  setState () {
    throw new Error('Can not setState of Editable')
  }
  render () {
    return el('div'
    , { className: 'Editable'
      , style: {position: 'relative'} /* So widgets can position selves */
      }
    , el('div', {className: 'Editable-Mirror', ref: 'mirror'})
    , el('div', {className: 'Editable-Plugins', ref: 'plugins'})
    )
  }
  componentDidMount () {
    const {mirror, plugins} = this.refs
    const { initialContent
      , menuBar
      , menuTip
      , onChange
      , onShareFile
      , onCommandsChanged
      , widgetPath } = this.props
    const {store} = this.context

    // PM setup
    let pmOptions =
      { place: mirror
      , autoInput: true
      , commands: commands
      , doc: GridToDoc(initialContent)
      , schema: EdSchemaFull
      }

    this.pm = new ProseMirror(pmOptions)

    if (menuBar) {
      this.pm.setOption('menuBar'
      , { content: barMenu }
      )
    }
    if (menuTip) {
      this.pm.setOption('tooltipMenu'
      , { showLinks: true
        , emptyBlockMenu: true
        , selectedBlockMenu: true
        , inlineContent: inlineMenu
        , selectedBlockContent: inlineMenu
        , blockContent: blockMenu
        }
      )
    }

    this.pm.on('change', () => {
      onChange('EDITABLE_CHANGE', this.pm)
    })

    this.pm.on('drop', this.boundOnDrop)

    // Setup plugins
    let pluginsToInit =
      [ PluginWidget
      , ShareUrl
      , PluginPlaceholder
      , PluginContentHints
      ]
    if (menuBar) {
      pluginsToInit.push(FixedMenuBarHack)
    }
    this.pm.on('ed.menu.file', (onShareFile || noop))
    if (onCommandsChanged) {
      pluginsToInit.push(CommandsInterface)
    }

    const pluginOptions =
      { ed: store
      , editableView: this
      , pm: this.pm
      , container: plugins
      , widgetPath
      }

    this.plugins = pluginsToInit.map((Plugin) => new Plugin(pluginOptions))

    onChange('EDITABLE_INITIALIZE', this)
  }
  componentWillUnmount () {
    this.pm.off('change')
    this.pm.off('ed.plugin.url')
    this.pm.off('ed.menu.file')
    this.pm.off('drop', this.boundOnDrop)
    this.plugins.forEach((plugin) => plugin.teardown())
  }
  updatePlaceholderHeights (changes) {
    // Do this in a batch, with one widget remeasure/move
    for (let i = 0, len = changes.length; i < len; i++) {
      const change = changes[i]
      // TODO do this with standard pm.tr interface, not direct DOM
      if (!this.refs.mirror) return
      const placeholder = this.refs.mirror.querySelector(`.EdSchemaMedia[grid-id="${change.id}"]`)
      placeholder.style.height = change.height + 'px'
    }
    this.pm.signal('draw')
  }
  onDrop (event) {
    if (!event.dataTransfer || !event.dataTransfer.files || !event.dataTransfer.files.length) return
    const {onDropFiles} = this.props
    if (!onDropFiles) return
    const pos = this.pm.posAtCoords({left: event.clientX, top: event.clientY})
    if (pos == null) return
    const index = posToIndex(this.pm.doc, pos)
    if (index == null) return
    event.preventDefault()
    event.stopPropagation()
    onDropFiles(index, event.dataTransfer.files)
  }
}
Editable.contextTypes = {store: React.PropTypes.object}
Editable.propTypes =
  { initialContent: React.PropTypes.array.isRequired
  , onChange: React.PropTypes.func.isRequired
  , onShareFile: React.PropTypes.func
  , onShareUrl: React.PropTypes.func
  , onDropFiles: React.PropTypes.func
  , onEditableInit: React.PropTypes.func
  , onCommandsChanged: React.PropTypes.func
  , menuBar: React.PropTypes.bool
  , menuTip: React.PropTypes.bool
  , widgetPath: React.PropTypes.string
  }
export default React.createFactory(Editable)
