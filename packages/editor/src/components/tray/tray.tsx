import './tray.css'

import React from 'react'
import { observer } from 'mobx-react'

import { Category } from './category'
import { PYTHON_FILE, PythonLanguageTray, PythonNode } from '@splootcode/language-python'
import { RenderedFragment } from '../../layout/rendered_fragment'
import { ScopeTray } from './scope_tray'
import { SplootNode, TrayCategory } from '@splootcode/core'

interface TrayProps {
  rootNode: SplootNode
  width: number
  startDrag: (fragment: RenderedFragment, offsetX: number, offsetY: number) => any
}

interface TrayState {
  listing: TrayCategory
}

function getTrayListing(rootNode: SplootNode): TrayCategory {
  if (rootNode.type === PYTHON_FILE) {
    return PythonLanguageTray
  }
  return {
    category: '',
    entries: [],
  }
}

@observer
export class Tray extends React.Component<TrayProps, TrayState> {
  constructor(props) {
    super(props)
    this.state = {
      listing: getTrayListing(props.rootNode),
    }
  }

  render() {
    const { rootNode, startDrag } = this.props
    return (
      <div className="tray">
        <ScopeTray rootNode={rootNode as PythonNode} startDrag={startDrag} />
        <Category category={this.state.listing} startDrag={startDrag} />
      </div>
    )
  }
}