import { EmptyStateHero } from '../components/home/EmptyStateHero'
import { AgentTypeCard } from '../components/home/AgentTypeCard'
import { HowToUseSection } from '../components/home/HowToUseSection'
import { AgentList } from '../components/home/AgentList'
import { useAgents } from '../hooks/useAgents'

export function HomePage() {
  const { agents, isCreatingAgent, creatingType, createAgent } = useAgents()
  const hasAgents = agents.length > 0

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      {!hasAgents ? (
        <>
          <EmptyStateHero />

          {/* Two-Column CTA Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <AgentTypeCard
              type="give"
              onCreateAgent={() => createAgent('give')}
              isLoading={creatingType === 'give'}
            />
            <AgentTypeCard
              type="want"
              onCreateAgent={() => createAgent('want')}
              isLoading={creatingType === 'want'}
            />
          </div>

          <HowToUseSection />
        </>
      ) : (
        <AgentList
          agents={agents}
          onCreateAgent={createAgent}
          isLoading={isCreatingAgent}
        />
      )}
    </main>
  )
}
