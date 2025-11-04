import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center">
        <h1 className="text-4xl font-bold text-blue-600 mb-4">
          Jimo market
        </h1>
        <p className="text-gray-600 mb-6">
          Hello World - フロントエンド起動成功！
        </p>
        <button
          onClick={() => setCount(count + 1)}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Count: {count}
        </button>
      </div>
    </div>
  )
}

export default App
