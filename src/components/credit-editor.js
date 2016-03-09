import React, {createElement as el} from 'react'
import imgflo from 'imgflo-url'

import TextareaAutosize from './textarea-autosize'

import DropdownWrap from './dropdown-wrap'
import Arrow from 'rebass/dist/Arrow'
import Avatar from 'rebass/dist/Avatar'


export default function CreditEditor (props, context) {
  const {name, label, url, avatar, onChange, onlyUrl, path} = props

  return el(DropdownWrap
  , { buttonText: (name || label)
    , menuIcon: el(Arrow, {direction: 'down'})
    , menuKids: el('div'
      , { style:
          { padding: '1rem 1rem 0 1rem' }
        }
      , renderAvatar(avatar, context.imgfloConfig)
      , (onlyUrl
        ? renderBasedOnUrl(url, onChange, path)
        : renderFields(name, label, url, avatar, onChange, path)
        )
      )
    }
  )
}
CreditEditor.contextTypes = {imgfloConfig: React.PropTypes.object}


function renderAvatar (avatar, imgfloConfig) {
  if (!avatar || !avatar.src) return
  let {src} = avatar
  if (imgfloConfig) {
    const params =
      { input: src
      , width: 72
      }
    src = imgflo(imgfloConfig, 'passthrough', params)
  }
  return el(Avatar,
    { key: 'avatar'
    , style: {float: 'right'}
    , src
    }
  )
}

function renderFields (name, label, url, avatar, onChange, path) {
  return (
    [ renderTextField('name', 'Name', name, onChange, path.concat(['name']))
    , renderTextField('url', 'Link', url, onChange, path.concat(['url']))
    ]
  )
}

function renderBasedOnUrl (value, onChange, path) {
  return renderTextField('url', 'Link', value, onChange, path)
}

function renderTextField (key, label, value, onChange, path) {
  return el(TextareaAutosize
  , { className: `AttributionEditor-${key}`
    , label
    , defaultValue: value
    , key: key
    , name: key
    , multiLine: true
    , style: {width: '100%'}
    , onChange: makeChange(path, onChange)
    }
  )
}

function makeChange (path, onChange) {
  return function (event) {
    onChange(path, event.target.value)
  }
}
