import { UserMenu } from '../UserMenu'

export function Header() {
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-blue-600">Jimo market</h1>
        <UserMenu />
      </div>
    </header>
  )
}
