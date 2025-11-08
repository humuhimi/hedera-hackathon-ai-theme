import { AgentType } from '../../types/agent'
import { Spinner } from '../common/Spinner'

interface AgentTypeCardProps {
  type: AgentType
  onCreateAgent: () => void
  isLoading: boolean
}

export const AgentTypeCard = ({ type, onCreateAgent, isLoading }: AgentTypeCardProps) => {
  const isGiveType = type === 'give'

  const config = {
    give: {
      icon: '💰',
      title: 'Seller',
      subtitle: 'Sell Items',
      description: 'Register items you want to sell, then',
      highlight: 'let AI handle everything.',
      details: 'AI automatically responds to inquiries and finds buyers.',
      features: [
        { title: 'Auto-respond to inquiries', desc: '24/7 automated responses' },
        { title: 'Price negotiation', desc: 'AI negotiates within your terms' },
        { title: 'Schedule coordination', desc: 'Automatic pickup time arrangement' }
      ],
      buttonText: 'Create Seller AI',
      colorFrom: 'from-orange-50',
      colorTo: 'to-orange-100',
      textColor: 'text-orange-600',
      textColorLight: 'text-orange-700',
      buttonGradient: 'from-orange-500 to-orange-600',
      buttonHoverGradient: 'hover:from-orange-600 hover:to-orange-700',
      borderHover: 'hover:border-orange-300'
    },
    want: {
      icon: '🛒',
      title: 'Buyer',
      subtitle: 'Buy Items',
      description: 'Register items you want to buy, then',
      highlight: 'AI searches 24/7 for you.',
      details: 'Get instant notifications when matching items are found.',
      features: [
        { title: '24/7 automatic search', desc: 'Constantly monitors new listings' },
        { title: 'Instant notifications', desc: 'Alerts you on perfect matches' },
        { title: 'Negotiation support', desc: 'Assists with price and terms' }
      ],
      buttonText: 'Create Buyer AI',
      colorFrom: 'from-blue-50',
      colorTo: 'to-blue-100',
      textColor: 'text-blue-600',
      textColorLight: 'text-blue-700',
      buttonGradient: 'from-blue-500 to-blue-600',
      buttonHoverGradient: 'hover:from-blue-600 hover:to-blue-700',
      borderHover: 'hover:border-blue-300'
    }
  }

  const c = isGiveType ? config.give : config.want

  return (
    <div className={`bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-shadow duration-300 overflow-hidden border-2 border-transparent ${c.borderHover}`}>
      <div className={`bg-gradient-to-br ${c.colorFrom} ${c.colorTo} p-8 text-center`}>
        <div className="text-6xl mb-4">{c.icon}</div>
        <h2 className={`text-3xl font-bold ${c.textColor} mb-2`}>
          {c.title}
        </h2>
        <p className={`${c.textColorLight} font-medium`}>{c.subtitle}</p>
      </div>

      <div className="p-8">
        <p className="text-gray-700 mb-6 leading-relaxed">
          {c.description}<br />
          <span className={`font-bold ${c.textColor}`}>{c.highlight}</span><br />
          {c.details}
        </p>

        <div className="space-y-3 mb-8">
          {c.features.map((feature, index) => (
            <div key={index} className="flex items-start gap-3">
              <span className="text-green-600 mt-1">✓</span>
              <div>
                <p className="font-semibold text-gray-800">{feature.title}</p>
                <p className="text-sm text-gray-600">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onCreateAgent}
          disabled={isLoading}
          className={`w-full bg-gradient-to-r ${c.buttonGradient} ${c.buttonHoverGradient} text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner size="md" className="text-white" />
              Creating...
            </span>
          ) : (
            c.buttonText
          )}
        </button>
      </div>
    </div>
  )
}
