// @ts-expect-error 必须要用后置，因为 server 没做自动加后缀的兼容
import { subModule } from './sub-module.ts'
import logo from './logo.svg'

// @ts-expect-error
import { ReactComponent } from './react-component.tsx'
import './style/style.css'

console.log(logo)

// import './style/less-test.less'

const app = document.getElementById('app')
app!.innerText = 'Hello World'

subModule(app!)
const comp = ReactComponent()
// @ts-expect-error
const root = ReactDOM.createRoot(document.getElementById('react-root'))
root.render(comp)
