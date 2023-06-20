// @ts-ignore 必须要用后置，因为 server 没做自动加后缀的兼容
import { subModule } from './sub-module.ts';
// @ts-ignore
import { ReactComponent } from './react-component.tsx';
// 用 JS import 的 style.css 请求，它的响应值不是 JS，但浏览器期望它是 JS，这样它才能执行
import './style.css';

const app = document.getElementById('app');
app!.innerText = 'Hello World';

subModule(app!);
const comp = ReactComponent();
// @ts-ignore
const root = ReactDOM.createRoot(document.getElementById('react-root'));
root.render(comp);
