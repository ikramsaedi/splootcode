import { ExpressionNode, ForNode, ParseNodeType, SuiteNode } from 'structured-pyright'

import {
  ChildSetType,
  ForLoopData,
  ForLoopIteration,
  HighlightColorCategory,
  LayoutComponent,
  LayoutComponentType,
  NodeAnnotation,
  NodeAnnotationType,
  NodeCategory,
  NodeLayout,
  NodeMutation,
  NodeMutationType,
  ParentReference,
  SerializedNode,
  SingleStatementData,
  SplootNode,
  StatementCapture,
  SuggestedNode,
  SuggestionGenerator,
  TypeRegistration,
  registerAutocompleter,
  registerNodeCateogry,
  registerType,
} from '@splootcode/core'
import { PYTHON_IDENTIFIER, PythonIdentifier } from './python_identifier'
import { ParseMapper } from '../analyzer/python_analyzer'
import { PythonExpression } from './python_expression'
import { PythonNode } from './python_node'
import { PythonStatement } from './python_statement'
import { parseToPyright } from './utils'

export const PYTHON_FOR_LOOP = 'PYTHON_FOR_LOOP'

class ForGenerator implements SuggestionGenerator {
  constantSuggestions(): SuggestedNode[] {
    const sampleNode = new PythonForLoop(null)
    const suggestedNode = new SuggestedNode(sampleNode, 'for', 'for', true)
    return [suggestedNode]
  }
}

export class PythonForLoop extends PythonNode {
  runtimeCapture: ForLoopData
  runtimeCaptureFrame: number
  scopedVariables: Set<string>

  constructor(parentReference: ParentReference) {
    super(parentReference, PYTHON_FOR_LOOP)
    this.isRepeatableBlock = true
    this.runtimeCapture = null
    this.runtimeCaptureFrame = 0
    this.scopedVariables = new Set()
    this.addChildSet('target', ChildSetType.Many, NodeCategory.PythonLoopVariable)
    this.addChildSet('iterable', ChildSetType.Immutable, NodeCategory.PythonExpression, 1)
    this.getChildSet('iterable').addChild(new PythonExpression(null))
    this.addChildSet('block', ChildSetType.Many, NodeCategory.PythonStatement, 1)
    this.getChildSet('block').addChild(new PythonStatement(null))
    this.childSetWrapPriorityOrder = ['block', 'target', 'iterable']
  }

  getTarget() {
    return this.getChildSet('target')
  }

  generateParseTree(parseMapper: ParseMapper): ForNode {
    const forSuite: SuiteNode = {
      nodeType: ParseNodeType.Suite,
      id: parseMapper.getNextId(),
      start: 0,
      length: 0,
      statements: [],
    }
    this.getBlock().children.forEach((statementNode: PythonStatement) => {
      const statement = statementNode.generateParseTree(parseMapper)
      if (statement) {
        forSuite.statements.push(statement)
        statement.parent = forSuite
      }
    })
    const iterableExpression: ExpressionNode = (this.getIterable().getChild(0) as PythonExpression).generateParseTree(
      parseMapper
    )
    const targetExpression: ExpressionNode = parseToPyright(parseMapper, this.getTarget().children)
    const forNode: ForNode = {
      nodeType: ParseNodeType.For,
      forSuite: forSuite,
      id: parseMapper.getNextId(),
      iterableExpression: iterableExpression,
      targetExpression: targetExpression,
      start: 0,
      length: 0,
    }
    targetExpression.parent = forNode
    iterableExpression.parent = forNode
    forSuite.parent = forNode
    return forNode
  }

  validateSelf(): void {
    if (this.getTarget().getCount() === 0) {
      this.setValidity(false, 'Needs a variable name', 'target')
    } else {
      this.setValidity(true, '')
    }
    ;(this.getIterable().getChild(0) as PythonExpression).requireNonEmpty('needs a sequence or iterable to loop over')
  }

  addSelfToScope() {
    const targetChildset = this.getTarget()
    const currentNames: Set<string> = new Set()
    for (const leftChild of targetChildset.children) {
      if (leftChild.type === PYTHON_IDENTIFIER) {
        const name = (leftChild as PythonIdentifier).getName()
        currentNames.add(name)
      }
    }
    currentNames.forEach((name) => {
      if (!this.scopedVariables.has(name)) {
        this.getScope().addVariable(
          name,
          {
            documentation: 'for-loop variable',
          },
          this
        )
        this.scopedVariables.add(name)
      }
    })
    this.scopedVariables.forEach((name) => {
      if (!currentNames.has(name)) {
        this.getScope().removeVariable(name, this)
        this.scopedVariables.delete(name)
      }
    })
  }

  removeSelfFromScope(): void {
    this.scopedVariables.forEach((name) => {
      this.getScope().removeVariable(name, this)
      this.scopedVariables.delete(name)
    })
  }

  getIterable() {
    return this.getChildSet('iterable')
  }

  getBlock() {
    return this.getChildSet('block')
  }

  recursivelyApplyRuntimeCapture(capture: StatementCapture): boolean {
    if (capture.type === 'EXCEPTION') {
      this.applyRuntimeError(capture)
      this.runtimeCapture = null
      return true
    }

    if (capture.type != this.type) {
      console.warn(`Capture type ${capture.type} does not match node type ${this.type}`)
      this.recursivelyClearRuntimeCapture()
      return false
    }
    const data = capture.data as ForLoopData
    this.runtimeCapture = data
    this.selectRuntimeCaptureFrame(this.runtimeCaptureFrame)
    return true
  }

  selectRuntimeCaptureFrame(index: number) {
    if (!this.runtimeCapture) {
      this.recursivelyClearRuntimeCapture()
      return
    }
    this.runtimeCaptureFrame = index

    const frames = this.runtimeCapture.frames

    if (frames.length == 0) {
      this.getBlock().recursivelyApplyRuntimeCapture([])
      const mutation = new NodeMutation()
      mutation.node = this
      mutation.type = NodeMutationType.SET_RUNTIME_ANNOTATIONS
      mutation.annotations = []
      mutation.loopAnnotation = { label: 'Repeated', iterations: frames.length, currentFrame: this.runtimeCaptureFrame }
      this.fireMutation(mutation)
      return
    }

    index = Math.min(this.runtimeCapture.frames.length - 1, index)
    if (index == -1) {
      index = this.runtimeCapture.frames.length - 1
    }
    const annotation: NodeAnnotation[] = []

    const frame = frames[index]

    if (frame.type === 'EXCEPTION') {
      if (frame.exceptionInFunction) {
        annotation.push({
          type: NodeAnnotationType.SideEffect,
          value: {
            message: `Exception in ${frame.exceptionInFunction}`,
          },
        })
      }
      annotation.push({
        type: NodeAnnotationType.RuntimeError,
        value: {
          errorType: frame.exceptionType,
          errorMessage: frame.exceptionMessage,
        },
      })
    } else {
      const frameData = frame.data as ForLoopIteration
      const iterable = frameData.iterable[0]
      const iterableData = iterable.data as SingleStatementData

      if (iterable.sideEffects && iterable.sideEffects.length > 0) {
        const stdout = iterable.sideEffects
          .filter((sideEffect) => sideEffect.type === 'stdout')
          .map((sideEffect) => sideEffect.value)
          .join('')
        annotation.push({ type: NodeAnnotationType.SideEffect, value: { message: `prints "${stdout}"` } })
      }
      annotation.push({
        type: NodeAnnotationType.ReturnValue,
        value: {
          value: iterableData.result,
          type: iterableData.resultType,
        },
      })
      this.getBlock().recursivelyApplyRuntimeCapture(frameData.block || [])
    }
    const mutation = new NodeMutation()
    mutation.node = this
    mutation.type = NodeMutationType.SET_RUNTIME_ANNOTATIONS
    mutation.annotations = annotation
    mutation.loopAnnotation = { label: 'Repeated', iterations: frames.length, currentFrame: this.runtimeCaptureFrame }
    this.fireMutation(mutation)
  }

  recursivelyClearRuntimeCapture(): void {
    const mutation = new NodeMutation()
    mutation.node = this
    mutation.type = NodeMutationType.SET_RUNTIME_ANNOTATIONS
    mutation.annotations = []
    this.fireMutation(mutation)
    this.getBlock().recursivelyClearRuntimeCapture()
  }

  static deserializer(serializedNode: SerializedNode): PythonForLoop {
    const node = new PythonForLoop(null)
    node.deserializeChildSet('target', serializedNode)
    node.deserializeChildSet('iterable', serializedNode)
    node.deserializeChildSet('block', serializedNode)
    return node
  }

  static register() {
    const typeRegistration = new TypeRegistration()
    typeRegistration.typeName = PYTHON_FOR_LOOP
    typeRegistration.deserializer = PythonForLoop.deserializer
    typeRegistration.childSets = {
      target: NodeCategory.PythonLoopVariable,
      iterable: NodeCategory.PythonExpression,
      block: NodeCategory.PythonStatement,
    }
    typeRegistration.layout = new NodeLayout(HighlightColorCategory.CONTROL, [
      new LayoutComponent(LayoutComponentType.KEYWORD, 'for'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_TOKEN_LIST, 'target', ['item']),
      new LayoutComponent(LayoutComponentType.KEYWORD, 'in'),
      new LayoutComponent(LayoutComponentType.CHILD_SET_ATTACH_RIGHT, 'iterable', ['iterable']),
      new LayoutComponent(LayoutComponentType.CHILD_SET_BLOCK, 'block'),
    ])
    typeRegistration.pasteAdapters = {
      PYTHON_STATEMENT: (node: SplootNode) => {
        const statement = new PythonStatement(null)
        statement.getStatement().addChild(node)
        return statement
      },
    }

    registerType(typeRegistration)
    registerNodeCateogry(PYTHON_FOR_LOOP, NodeCategory.PythonStatementContents)
    registerAutocompleter(NodeCategory.PythonStatementContents, new ForGenerator())
  }
}
