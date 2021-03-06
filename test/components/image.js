import {expect} from 'chai'

import Image from '../../src/components/image'

function expectImage (image, src) {
  expect(image.type).to.equal('div')
  expect(image.props.className).to.equal('Image')
  expect(image.props.children.type).to.equal('img')
  expect(image.props.children.props.src).to.equal(src)
}


describe('Image', function () {
  describe('without imageflo', function () {
    it('gives expected output', function () {
      const props = {src: 'http://a.com/b.jpg'}
      const image = Image(props)
      expectImage(image, 'http://a.com/b.jpg')
    })
  })

  describe('with imageflo', function () {
    const context =
      { imgfloConfig:
        { server: 'https://iflo.grid/'
        , key: 'abc'
        , secret: '123'
        }
      }

    const url72 = 'https://iflo.grid/graph/abc/12ecaddb783ca3f911391be0a6f9d718/passthrough.jpg?input=http%3A%2F%2Fa.com%2Fb.jpg&width=72'
    const url360 = 'https://iflo.grid/graph/abc/6c68237fa1da785b80706af7f52dfb8b/passthrough.jpg?input=http%3A%2F%2Fa.com%2Fb.jpg&width=360'
    const url720 = 'https://iflo.grid/graph/abc/cc04e4bf16f02fbd1ec883fe6112b1c0/passthrough.jpg?input=http%3A%2F%2Fa.com%2Fb.jpg&width=720'

    it('without dimensions gives expected output', function () {
      const props = {
        src: 'http://a.com/b.jpg'
      }
      const image = Image(props, context)
      expectImage(image, url360)
    })

    it('with landscape dimensions gives expected output', function () {
      const props =
        { src: 'http://a.com/b.jpg'
        , width: 1000
        , height: 500
        }
      const image = Image(props, context)
      expectImage(image, url720)
    })

    it('with small landscape dimensions gives expected output', function () {
      const props =
        { src: 'http://a.com/b.jpg'
        , width: 500
        , height: 300
        }
      const image = Image(props, context)
      expectImage(image, url360)
    })

    it('with tiny dimensions gives expected output', function () {
      const props =
        { src: 'http://a.com/b.jpg'
        , width: 72
        , height: 72
        }
      const image = Image(props, context)
      expectImage(image, url72)
    })

    it('with portrait dimensions gives expected output', function () {
      const props =
        { src: 'http://a.com/b.jpg'
        , width: 500
        , height: 1000
        }
      const image = Image(props, context)
      expectImage(image, url360)
    })
  })
})
