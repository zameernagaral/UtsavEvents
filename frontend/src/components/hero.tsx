import { ChevronRight, Zap, Shield, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import heroBg from './image.png';

export function Hero() {
  return (
    <section
      // Added min-h-[80vh], flex, and bg-no-repeat to fix the image stretching/cropping
      className="relative flex items-center bg-cover bg-center bg-no-repeat py-24 md:py-32 px-4 overflow-hidden min-h-[80vh]"
      style={{
        // Light overlay so dark text stays readable on a bright photo
        backgroundImage: `linear-gradient(90deg, rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.25)), url(${heroBg})`,
      }}
    >
      {/* Simple background pattern overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(0,0,0,0.02)_0%,transparent_50%)] pointer-events-none" />

      <div className="relative w-full max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-20">
          {/* Left Content */}
          <div className="flex-1 flex flex-col justify-center text-center lg:text-left space-y-8 pl-6 md:pl-10 lg:pl-14">
            <h1 className="font-black leading-tight text-slate-900">
  <div className="flex items-center justify-center lg:justify-start gap-3 text-lg md:text-xl">
    <span className="text-slate-900 text-base md:text-lg">———</span>
    <span className="text-slate-900">THINK FAST.</span>
    <span className="text-blue-500">PLAY SMART.</span>
    <span className="text-slate-900 text-base md:text-lg">———</span>
  </div>
</h1>
            {/* Heading */}
            <h1 className="font-black leading-tight text-slate-900">
              <span className="block text-5xl md:text-7xl">GRANDMASTER'S</span>
              <span className="block text-5xl md:text-7xl text-blue-500">GAMBIT 4.0</span>
            </h1>

            {/* Description */}
            <p className="text-xl text-slate-700 max-w-2xl mx-auto lg:mx-0">
              Experience chess like never before with unique cultural pieces,
              special powers, and strategic harmony tokens.
            </p>

            {/* Feature Tags */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-3">
              {[
                { text: 'Special Powers', icon: Zap },
                { text: 'Cultural Pieces', icon: Shield },
                { text: 'Tournament Mode', icon: Trophy },
              ].map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={i}
                    className="flex items-center gap-2 bg-blue-100 text-blue-700 border border-blue-200 px-4 py-2 rounded-full"
                  >
                    <Icon size={14} className="text-blue-700" />
                    <span className="text-sm font-medium text-blue-700">{feature.text}</span>
                  </div>
                );
              })}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center lg:justify-start">
              <Link to="/game">
                <button className="group px-8 py-3 bg-blue-500/90 text-white border border-blue-500 rounded-full font-semibold hover:bg-blue-600/90 transition-all inline-flex items-center gap-2 shadow-lg shadow-blue-500/20">
                  Play Now
                  <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              <Link to="/game/rules">
                <button className="px-8 py-3 border-2 border-blue-500 text-blue-600 rounded-full font-semibold hover:bg-blue-50 transition">
                  Learn Rules
                </button>
              </Link>
            </div>

          </div>

          {/* Right Content */}
          <div className="flex-1" />
        </div>

        {/* Simple scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 hidden lg:block">
          <div className="w-5 h-8 border-2 border-slate-500 rounded-full flex justify-center">
            <div className="w-1 h-2 bg-slate-500 rounded-full mt-2 animate-pulse" />
          </div>
        </div>
      </div>
    </section>
  );
}
