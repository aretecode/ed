import {buildKeymap} from 'prosemirror/dist/example-setup'
import EdSchema from '../schema/ed-schema-full'


const EdKeymap = buildKeymap(EdSchema)

export default EdKeymap
