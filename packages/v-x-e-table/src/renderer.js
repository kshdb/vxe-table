import XEUtils from 'xe-utils/methods/xe-utils'
import { UtilTools } from '../../tools'

function getAttrs ({ name, attrs }) {
  if (name === 'input') {
    attrs = Object.assign({ type: 'text' }, attrs)
  }
  return attrs
}

function isSyncCell (renderOpts, params, context) {
  return renderOpts.immediate || renderOpts.type === 'visible' || context.$type === 'cell'
}

/**
 * 内置渲染器
 * 支持原生的 input、textarea、select
 */
function defaultEditRender (h, renderOpts, params, context) {
  let { row, column } = params
  let { name } = renderOpts
  let attrs = getAttrs(renderOpts)
  let cellValue = isSyncCell(renderOpts, params, context) ? UtilTools.getCellValue(row, column) : column.model.value
  return [
    h(name, {
      class: `vxe-default-${name}`,
      attrs,
      domProps: {
        value: cellValue
      },
      on: getEvents(renderOpts, params, context)
    })
  ]
}

function getEvents (renderOpts, params, context) {
  let { name, events } = renderOpts
  let { $table, row, column } = params
  let { model } = column
  let isSelect = name === 'select'
  let type = isSelect ? 'change' : 'input'
  let on = {
    [type] (evnt) {
      let cellValue = evnt.target.value
      if (isSyncCell(renderOpts, params, context)) {
        UtilTools.setCellValue(row, column, cellValue)
      } else {
        model.update = true
        model.value = cellValue
      }
      $table.updateStatus(params, cellValue)
      if (events && events[type]) {
        events[type](params, evnt)
      }
    }
  }
  if (events) {
    return XEUtils.assign({}, XEUtils.objectMap(events, cb => function () {
      cb.apply(null, [params].concat.apply(params, arguments))
    }), on)
  }
  return on
}

function renderOptgroups (h, renderOpts, params, context, renderOptionsMethods) {
  let { optionGroups, optionGroupProps = {} } = renderOpts
  let groupOptions = optionGroupProps.options || 'options'
  let groupLabel = optionGroupProps.label || 'label'
  return optionGroups.map((group, gIndex) => {
    return h('optgroup', {
      domProps: {
        label: group[groupLabel]
      },
      key: gIndex
    }, renderOptionsMethods(h, group[groupOptions], renderOpts, params, context))
  })
}

function renderOptions (h, options, renderOpts, params, context) {
  let { optionProps = {} } = renderOpts
  let { row, column } = params
  let labelProp = optionProps.label || 'label'
  let valueProp = optionProps.value || 'value'
  let disabledProp = optionProps.disabled || 'disabled'
  let cellValue = isSyncCell(renderOpts, params, context) ? UtilTools.getCellValue(row, column) : column.model.value
  return options.map((item, index) => {
    return h('option', {
      attrs: {
        value: item[valueProp],
        disabled: item[disabledProp]
      },
      domProps: {
        selected: item[valueProp] === cellValue
      },
      key: index
    }, item[labelProp])
  })
}

function getFilterEvents (item, renderOpts, params, context) {
  let { column } = params
  let { events } = renderOpts
  let type = name === 'select' ? 'change' : 'input'
  let on = {
    [type] (evnt) {
      item.data = evnt.target.value
      handleConfirmFilter(context, column, !!item.data, item)
      if (events && events[type]) {
        events[type](Object.assign({ context }, params), evnt)
      }
    }
  }
  if (events) {
    return XEUtils.assign({}, XEUtils.objectMap(events, cb => function () {
      params = Object.assign({ context }, params)
      cb.apply(null, [params].concat.apply(params, arguments))
    }), on)
  }
  return on
}

function defaultFilterRender (h, renderOpts, params, context) {
  let { column } = params
  let { name } = renderOpts
  let attrs = getAttrs(renderOpts)
  return column.filters.map(item => {
    return h(name, {
      class: `vxe-default-${name}`,
      attrs,
      domProps: {
        value: item.data
      },
      on: getFilterEvents(item, renderOpts, params, context)
    })
  })
}

function handleConfirmFilter (context, column, checked, item) {
  context[column.filterMultiple ? 'changeMultipleOption' : 'changeRadioOption']({}, checked, item)
}

function defaultFilterMethod ({ option, row, column }) {
  let { data } = option
  let cellValue = XEUtils.get(row, column.property)
  /* eslint-disable eqeqeq */
  return cellValue == data
}

function renderSelectEdit (h, renderOpts, params, context) {
  return [
    h('select', {
      class: 'vxe-default-select',
      attrs: getAttrs(renderOpts),
      on: getEvents(renderOpts, params, context)
    },
    renderOpts.optionGroups ? renderOptgroups(h, renderOpts, params, context, renderOptions) : renderOptions(h, renderOpts.options, renderOpts, params, context))
  ]
}

/**
 * 表单渲染器
 */
function defaultItemRender (h, renderOpts, params, context) {
  let { data, field } = params
  let { name } = renderOpts
  let attrs = getAttrs(renderOpts)
  let cellValue = XEUtils.get(data, field)
  return [
    h(name, {
      class: `vxe-default-${name}`,
      attrs,
      domProps: attrs && name === 'input' && (attrs.type === 'submit' || attrs.type === 'reset') ? null : {
        value: cellValue
      },
      on: getFormEvents(renderOpts, params, context)
    })
  ]
}

function getFormEvents (renderOpts, params, context) {
  let { data, field } = params
  let { events } = renderOpts
  let type = name === 'select' ? 'change' : 'input'
  let on = {
    [type] (evnt) {
      XEUtils.set(data, field, evnt.target.value)
      if (events && events[type]) {
        events[type](Object.assign({ context }, params), evnt)
      }
    }
  }
  if (events) {
    return XEUtils.assign({}, XEUtils.objectMap(events, cb => function () {
      params = Object.assign({ context }, params)
      cb.apply(null, [params].concat.apply(params, arguments))
    }), on)
  }
  return on
}

function renderFormOptions (h, options, renderOpts, params, context) {
  let { data, field } = params
  let { optionProps = {} } = renderOpts
  let labelProp = optionProps.label || 'label'
  let valueProp = optionProps.value || 'value'
  let disabledProp = optionProps.disabled || 'disabled'
  let cellValue = XEUtils.get(data, field)
  return options.map((item, index) => {
    return h('option', {
      attrs: {
        value: item[valueProp],
        disabled: item[disabledProp]
      },
      domProps: {
        selected: item[valueProp] === cellValue
      },
      key: index
    }, item[labelProp])
  })
}

const renderMap = {
  input: {
    autofocus: 'input',
    renderEdit: defaultEditRender,
    renderDefault: defaultEditRender,
    renderFilter: defaultFilterRender,
    filterMethod: defaultFilterMethod,
    renderItem: defaultItemRender
  },
  textarea: {
    autofocus: 'textarea',
    renderEdit: defaultEditRender,
    renderDefault: defaultEditRender,
    renderFilter: defaultFilterRender,
    filterMethod: defaultFilterMethod,
    renderItem: defaultItemRender
  },
  select: {
    renderEdit: renderSelectEdit,
    renderDefault: renderSelectEdit,
    renderCell (h, renderOpts, params, context) {
      let { options, optionGroups, optionProps = {}, optionGroupProps = {} } = renderOpts
      let { row, column } = params
      let cellValue = XEUtils.get(row, column.property)
      let selectItem
      let labelProp = optionProps.label || 'label'
      let valueProp = optionProps.value || 'value'
      if (optionGroups) {
        let groupOptions = optionGroupProps.options || 'options'
        for (let index = 0; index < optionGroups.length; index++) {
          selectItem = XEUtils.find(optionGroups[index][groupOptions], item => item[valueProp] === cellValue)
          if (selectItem) {
            break
          }
        }
        return selectItem ? selectItem[labelProp] : cellValue
      } else {
        selectItem = XEUtils.find(options, item => item[valueProp] === cellValue)
        return selectItem ? selectItem[labelProp] : cellValue
      }
    },
    renderFilter (h, renderOpts, params, context) {
      let { column } = params
      return column.filters.map(item => {
        return h('select', {
          class: 'vxe-default-select',
          attrs: getAttrs(renderOpts),
          on: getFilterEvents(item, renderOpts, params, context)
        },
        renderOpts.optionGroups ? renderOptgroups(h, renderOpts, params, context, renderOptions) : renderOptions(h, renderOpts.options, renderOpts, params, context))
      })
    },
    filterMethod: defaultFilterMethod,
    renderItem (h, renderOpts, params, context) {
      return [
        h('select', {
          class: 'vxe-default-select',
          attrs: getAttrs(renderOpts),
          on: getFormEvents(renderOpts, params, context)
        },
        renderOpts.optionGroups ? renderOptgroups(h, renderOpts, params, context, renderFormOptions) : renderFormOptions(h, renderOpts.options, renderOpts, params, context))
      ]
    }
  }
}

/**
 * 全局渲染器
 */
export const renderStore = {
  mixin (map) {
    XEUtils.each(map, (options, name) => renderStore.add(name, options))
    return renderStore
  },
  get (name) {
    return renderMap[name] || null
  },
  add (name, options) {
    if (name && options) {
      let renders = renderMap[name]
      if (renders) {
        Object.assign(renders, options)
      } else {
        renderMap[name] = options
      }
    }
    return renderStore
  },
  delete (name) {
    delete renderMap[name]
    return renderStore
  }
}

export default renderStore
