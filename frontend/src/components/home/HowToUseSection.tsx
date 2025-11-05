export const HowToUseSection = () => {
  const steps = [
    {
      number: 1,
      title: 'Register Item Info',
      description: 'Just add photos, description, and your terms'
    },
    {
      number: 2,
      title: 'AI Activates',
      description: 'Starts working 24/7 automatically'
    },
    {
      number: 3,
      title: 'Just Check Notifications',
      description: 'Get notified when deals progress'
    }
  ]

  return (
    <div className="mt-16 max-w-4xl mx-auto">
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-8 border border-purple-200">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center flex items-center justify-center gap-2">
          <span>💡</span>
          <span>Super Simple to Use</span>
        </h3>

        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((step) => (
            <div key={step.number} className="text-center">
              <div className="w-16 h-16 bg-purple-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                {step.number}
              </div>
              <h4 className="font-bold text-gray-800 mb-2">{step.title}</h4>
              <p className="text-gray-600 text-sm">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
