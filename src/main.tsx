import { lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App'
import RouteError from './components/RouteError'
import Home from './pages/Home'
import './style.css'

// 页面级分包(P4-1):除首页外的页面按需加载,减小首屏 JS
const UnitPlayer = lazy(() => import('./pages/UnitPlayer'))
const AiParse = lazy(() => import('./pages/AiParse'))
const AiDialogue = lazy(() => import('./pages/AiDialogue'))
const Wordbook = lazy(() => import('./pages/Wordbook'))
const Dict = lazy(() => import('./pages/Dict'))
const Settings = lazy(() => import('./pages/Settings'))
const ZhentiList = lazy(() => import('./pages/ZhentiList'))
const ZhentiReader = lazy(() => import('./pages/ZhentiReader'))
const MyArticles = lazy(() => import('./pages/MyArticles'))
const Library = lazy(() => import('./pages/Library'))
const GrammarTree = lazy(() => import('./pages/GrammarTree'))
const Plan = lazy(() => import('./pages/Plan'))
const Writing = lazy(() => import('./pages/Writing'))
const VocabGames = lazy(() => import('./pages/VocabGames'))
const Practice = lazy(() => import('./pages/Practice'))
const Placement = lazy(() => import('./pages/Placement'))
const Achievements = lazy(() => import('./pages/Achievements'))

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Home /> },
      { path: 'plan', element: <Plan /> },
      { path: 'unit/:unitId', element: <UnitPlayer /> },
      { path: 'ai-parse', element: <AiParse /> },
      { path: 'ai-dialogue', element: <AiDialogue /> },
      { path: 'wordbook', element: <Wordbook /> },
      { path: 'dict', element: <Dict /> },
      { path: 'vocab-games', element: <VocabGames /> },
      { path: 'practice', element: <Practice /> },
      { path: 'placement', element: <Placement /> },
      { path: 'achievements', element: <Achievements /> },
      { path: 'zhenti', element: <ZhentiList /> },
      { path: 'zhenti/:id', element: <ZhentiReader /> },
      { path: 'library', element: <Library /> },
      { path: 'grammar', element: <GrammarTree /> },
      { path: 'writing', element: <Writing /> },
      { path: 'my-articles', element: <MyArticles /> },
      { path: 'settings', element: <Settings /> },
    ],
  },
])

ReactDOM.createRoot(document.getElementById('root')!).render(<RouterProvider router={router} />)
