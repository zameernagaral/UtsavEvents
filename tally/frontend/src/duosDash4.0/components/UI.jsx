
export function SectionTitle({ children }) {
  return (
    <h2 className="font-extrabold text-[1.4rem] mb-6 text-black tracking-tight">
      {children}
    </h2>
  )
}

export function Card({ children, style = {} }) {
  return (
    <div
      style={style}
      className="bg-white border border-[#d8d8d0] rounded-xl p-7 shadow-[0_2px_16px_rgba(0,0,0,0.05)]"
    >
      {children}
    </div>
  )
}

export function FormGroup({ label, children }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] tracking-[2px] uppercase text-gray-400">
        {label}
      </label>
      {children}
    </div>
  )
}

export function NumberInput({ id, value, onChange, placeholder, min = 0, max, disabled }) {
  return (
    <input
      id={id}
      type="number"
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      placeholder={placeholder}
      min={min}
      max={max}
      disabled={disabled}
      className={`w-full rounded-lg px-3 py-2 text-sm outline-none font-mono transition border ${
        disabled
          ? 'bg-[#f0f0ea] text-gray-400 border-[#d8d8d0]'
          : 'bg-[#f9f9f5] text-black border-[#d8d8d0] focus:border-black'
      }`}
    />
  )
}

export function Toggle({ id, checked, onChange, label, bonus }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full relative cursor-pointer transition ${
          checked ? 'bg-black' : 'bg-[#d8d8d0]'
        }`}
      >
        <div
          className={`absolute w-4.5 h-4.5 bg-white rounded-full top-[3px] shadow ${
            checked ? 'left-[23px]' : 'left-[3px]'
          } transition-all`}
        />
      </div>

      <span className={`text-sm ${checked ? 'text-black' : 'text-gray-400'}`}>
        {checked ? (label?.yes || 'Yes ✓') : (label?.no || 'No')}
        {bonus && <span className="text-gray-500 ml-1">{bonus}</span>}
      </span>
    </div>
  )
}

export function Btn({ children, onClick, variant = 'primary', size = 'md', disabled = false, style: extraStyle = {} }) {
  const base =
    'inline-flex items-center gap-2 rounded-md font-bold transition tracking-wide'

  const variants = {
    primary: 'bg-black text-[#f5f5f0] hover:bg-[#333]',
    danger: 'bg-[#c0392b] text-white',
    outline: 'bg-transparent text-black border border-[#d8d8d0] hover:border-black',
    ghost: 'bg-[#f5f5f0] text-black border border-[#d8d8d0] hover:border-black',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2 text-sm',
    lg: 'px-7 py-3 text-base',
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={extraStyle}
      className={`${base} ${variants[variant]} ${sizes[size]} ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      {children}
    </button>
  )
}

export function ResultBox({ points, breakdown }) {
  if (points === null) return null

  function renderBreakdown(obj, depth = 0) {
    return Object.entries(obj).map(([k, v]) => {
      if (Array.isArray(v)) {
        return (
          <div key={k} className="mt-1">
            {v.map((item, i) => (
              <div key={i}>
                <span className="text-[10px] uppercase tracking-wide text-gray-400">
                  {k} {i + 1}
                </span>
                <div className="pl-3">{renderBreakdown(item, depth + 1)}</div>
              </div>
            ))}
          </div>
        )
      }

      if (typeof v === 'object' && v !== null) {
        return (
          <div key={k} className="mt-1">
            <span className="text-[10px] text-gray-400">{k}:</span>
            <div className="pl-3">{renderBreakdown(v, depth + 1)}</div>
          </div>
        )
      }

      const color =
        v > 0 ? 'text-green-700' : v < 0 ? 'text-red-600' : 'text-gray-400'

      return (
        <div key={k} className="text-xs text-gray-600 leading-6">
          {k}:{' '}
          <span className={`font-bold ${color}`}>
            {v > 0 ? '+' : ''}
            {v}
          </span>
        </div>
      )
    })
  }

  return (
    <div className="bg-[#f9f9f5] border border-[#d8d8d0] rounded-lg px-5 py-5 mt-5 animate-[fadeIn_.3s_ease]">
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-[10px] text-gray-400 uppercase tracking-widest">
          Points Earned
        </span>
        <span className="font-extrabold text-3xl text-black tracking-tight">
          {points}
        </span>
        <span className="text-sm text-gray-400">pts</span>
      </div>

      <div className="border-t border-[#e8e8e0] pt-3">
        {renderBreakdown(breakdown)}
      </div>
    </div>
  )
}

export function LoadingDots() {
  return (
    <div className="text-gray-400 text-sm py-5 animate-pulse">
      Loading...
    </div>
  )
}

export function SelectWrap({ id, value, onChange, options, placeholder }) {
  return (
    <div className="relative inline-block min-w-[200px]">
      <select
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-[#f9f9f5] border border-[#d8d8d0] rounded-lg px-4 py-2 pr-9 text-sm text-black outline-none font-mono cursor-pointer appearance-none focus:border-black transition"
      >
        {placeholder && <option value="">— {placeholder} —</option>}
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 pointer-events-none">
        ▼
      </span>
    </div>
  )
}