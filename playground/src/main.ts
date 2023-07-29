import { head } from 'lodash-es'

// @ts-expect-error 必须要用后置，因为 server 没做自动加后缀的兼容
import { subModule } from './sub-module.ts'

// @ts-expect-error
import { ReactComponent } from './react-component.tsx'
import './style/style.css'

console.log(head([1, 2, 3]))

// import './style/less-test.less'

const app = document.getElementById('app')
app!.innerText = 'Hello 12fa332orld'

subModule(app!)
const comp = ReactComponent()

// @ts-expect-error
const root = ReactDOM.createRoot(document.getElementById('react-root'))
import.meta.hot.accept(() => {
})
root.render(comp)
console.log(2135)
