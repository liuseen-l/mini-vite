import { dirname } from 'node:path'
import fs from 'node:fs'
import atImport from 'postcss-import'
import postcss from 'postcss'
import less from 'less'
import type { Plugin } from 'vite'
import { isCSSRequest } from '../utils'
import { isLessRequest } from '../../../../../playground/plugins/less'

export function cssPlugin(): Plugin {
  return {
    name: 'vitex:css',
    load(id) {
      // 加载
      if (isCSSRequest(id))
        return fs.readFileSync(id, 'utf-8')
    },
    async transform(code, url) {
      if (isCSSRequest(url)) {
        // const file = url.startsWith('/') ? `.${url}` : url

        if (isLessRequest(url)) {
          // 预处理器处理 less
          const lessResult = await less.render(code, {
            // 用于 @import 查找路径
            paths: [dirname(url)],
          })
          code = lessResult.css
        }

        const { css } = await postcss([atImport()]).process(code, {
          from: url,
          to: url,
        })

        return css
      }
    },
  }
}

export function cssPostPlugin(): Plugin {
  return {
    name: 'vitex:postCss',
    async transform(code, url) {
      // 包装成js模块
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
