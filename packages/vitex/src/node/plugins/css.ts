import { dirname } from 'node:path'
import atImport from 'postcss-import'
import postcss from 'postcss'
import less from 'less'
import type { Plugin } from 'vite'
import { isCSSRequest } from '../utils'
import { isLessRequest } from '../../../../../playground/plugins/less'

export function cssPlugin(): Plugin {
  return {
    name: 'vite-css',
    async transform(code, url) {
      if (isCSSRequest(url)) {
        const file = url.startsWith('/') ? `.${url}` : url

        if (isLessRequest(url)) {
          // 预处理器处理 less
          const lessResult = await less.render(code, {
            // 用于 @import 查找路径
            paths: [dirname(file)],
          })
          code = lessResult.css
        }

        const { css } = await postcss([atImport()]).process(code, {
          from: file,
          to: file,
        })

        return css
      }
    },
  }
}

export function cssPostPlugin(): Plugin {
  return {
    name: 'da',
    async transform(code, url) {
      if (isCSSRequest(url)) {
        return `
        var style = document.createElement('style')
        style.setAttribute('type', 'text/css')
        style.innerHTML = \`${code} \`
        document.head.appendChild(style)
      `
      }
    },
  }
}
