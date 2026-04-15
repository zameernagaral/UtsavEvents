import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { ChevronLeft, Clock, Flame, Sparkles, Zap, Award, Shield } from 'lucide-react'

const rules = [
  {
    title: 'BLITZ',
    tagline: 'Lightning Fast',
    time: '5 + 3',
    icon: Zap,
    features: ['Quick decision making', 'Intense gameplay', 'Perfect for practice'],
    color: 'from-red-600 to-red-400',
    badge: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    button: 'bg-red-600 hover:bg-red-700',
    iconColor: 'text-red-600',
    border: 'border-red-200 dark:border-red-800',
    route: '/game/common-rules?format=blitz',
  },
  {
    title: 'RAPID',
    tagline: 'Strategic Depth',
    time: '5 + 3',
    icon: Clock,
    features: ['Careful planning', 'Deep strategy', 'Classic experience'],
    color: 'from-purple-600 to-purple-400',
    badge: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    button: 'bg-purple-600 hover:bg-purple-700',
    iconColor: 'text-purple-600',
    border: 'border-purple-200 dark:border-purple-800',
    route: '/game/common-rules?format=rapid',
  },
  {
    title: 'POWERS',
    tagline: 'Unique Abilities',
    time: '5 + 3',
    icon: Sparkles,
    features: ['Special abilities', 'Tactical environment', 'Cultural pieces'],
    color: 'from-orange-600 to-orange-400',
    badge: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    button: 'bg-orange-600 hover:bg-orange-700',
    iconColor: 'text-orange-600',
    border: 'border-orange-200 dark:border-orange-800',
    route: '/game/powers-rules',
  },
  {
    title: 'KNOCKOUT',
    tagline: 'Token Strategy',
    time: '5 + 0',
    icon: Flame,
    features: ['Time burning', 'Harmony Tokens', 'Tournament ready'],
    color: 'from-blue-600 to-blue-400',
    badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    button: 'bg-blue-600 hover:bg-blue-700',
    iconColor: 'text-blue-600',
    border: 'border-blue-200 dark:border-blue-800',
    route: '/game/harmony-rules?format=knockout',
  },
]

export default function GameRulesMain() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-secondary/20">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(37,128,255,0.03)_0%,transparent_50%)] pointer-events-none" />
      
      <Header />
      
      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto">
          {/* Back Button */}
          <Link 
            to="/game" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-8 group"
          >
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            Back to Formats
          </Link>

          {/* Header Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6">
              <Award size={16} />
              <span className="text-xs font-semibold tracking-wide">GAME RULES</span>
            </div>
            
            <h1 className="text-5xl sm:text-7xl font-black text-foreground mb-4 tracking-tight">
              RULES<span className="text-primary"> & FORMATS</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Select a format below to view its complete rules and special conditions
            </p>
          </div>

          {/* Rules Grid */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {rules.map((rule) => {
              const Icon = rule.icon
              
              return (
                <div key={rule.title} className="relative group">
                  <Card className={`relative border-2 ${rule.border} bg-gradient-to-br from-white to-secondary/20 dark:from-gray-950 dark:to-gray-900 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}>
                    <div className={`h-2 w-full bg-gradient-to-r ${rule.color}`} />

                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className={`inline-flex items-center gap-1 ${rule.badge} text-xs font-bold px-3 py-1 rounded-full mb-3`}>
                            <Shield size={12} />
                            {rule.tagline}
                          </div>
                          <CardTitle className="text-3xl font-bold text-foreground">{rule.title}</CardTitle>
                          <p className={`text-sm font-semibold mt-1 ${rule.iconColor}`}>
                            {rule.time} time control
                          </p>
                        </div>
                        <div className={`w-14 h-14 ${rule.badge} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <Icon size={28} className={rule.iconColor} />
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">KEY FEATURES</p>
                        {rule.features.map((feature, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className={`w-1.5 h-1.5 rounded-full ${rule.iconColor}`} />
                            {feature}
                          </div>
                        ))}
                      </div>

                      <Link to={rule.route} className="block">
                        <Button className={`w-full ${rule.button} text-white font-bold py-6 rounded-xl text-lg hover:shadow-lg hover:shadow-${rule.button.split('-')[1]}-600/25 transition-all duration-300`}>
                          LEARN RULES
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </div>
              )
            })}
          </div>

          {/* Additional Info */}
          <div className="text-center text-sm text-muted-foreground border-t border-border/50 pt-8">
            <p>All formats follow standard chess rules unless modified by special conditions.</p>
          </div>
        </div>
      </main>
    </div>
  )
}
