import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  ShieldCheck, 
  Sparkles, 
  Sun, 
  Moon, 
  Layers, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface PaletteDrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PaletteDrawerModal: React.FC<PaletteDrawerModalProps> = ({ isOpen, onClose }) => {
  const { theme, toggleTheme } = useTheme();
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [demoButtonTextColor, setDemoButtonTextColor] = useState<'charcoal' | 'white'>('charcoal');

  if (!isOpen) return null;

  const handleCopy = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 1800);
  };

  const paletteTable = [
    {
      element: 'Main Page Background',
      lightName: 'Soft Off-White / Cool Gray',
      lightHex: '#F8FAFC',
      darkName: 'Deep Charcoal Gray',
      darkHex: '#121212',
      wcagStatus: 'Canvas Baseline',
      note: '60% canvas rule. #F8FAFC prevents blinding eye-glare during 2-hour exam papers; #121212 reduces battery draw and eye strain on OLED displays.'
    },
    {
      element: 'Test Cards & Containers',
      lightName: 'Pure White w/ subtle gray borders',
      lightHex: '#FFFFFF',
      darkName: 'Elevated Slate Gray',
      darkHex: '#1E1E22',
      lightBorder: '#E4E4E7',
      darkBorder: '#27272A',
      wcagStatus: 'Border: #E4E4E7 / #27272A',
      note: 'Cards use crisp hairline borders (#E4E4E7 in light, #27272A in dark) to keep container edges sharp without heavy fuzzy drop shadows.'
    },
    {
      element: 'Primary Text',
      lightName: 'Charcoal',
      lightHex: '#18181B',
      darkName: 'Off-White',
      darkHex: '#F4F4F5',
      wcagStatus: 'AAA Pass (16.5:1 / 17.5:1)',
      note: 'Exceeds WCAG AAA requirements. #18181B gives softer optical contrast than harsh #000000 pure black.'
    },
    {
      element: 'Muted Text (Timers/Labels)',
      lightName: 'Medium Slate',
      lightHex: '#71717A',
      darkName: 'Light Ash Gray',
      darkHex: '#A1A1AA',
      wcagStatus: 'AA Pass (4.8:1 / 7.6:1)',
      note: 'Used for countdown timers, question numbers, and metadata. Keeps secondary labels legible without competing with question prompts.'
    },
    {
      element: 'Passion Accent (Buttons)',
      lightName: 'Vibrant Orange',
      lightHex: '#EA580C',
      darkName: 'Slightly Softened Orange',
      darkHex: '#FB923C',
      wcagStatus: 'Large Text AA (Light) / AAA (Dark)',
      note: 'High-energy action anchor for "Save & Next", "Submit Test", and "Start Exam". Lightened to #FB923C in dark mode.'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-5">
      <div className="bg-[#FFFFFF] dark:bg-[#1E1E22] border border-[#E4E4E7] dark:border-[#27272A] rounded-2xl sm:rounded-3xl w-full max-w-4xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl p-4 sm:p-8 space-y-5 sm:space-y-6 text-[#18181B] dark:text-[#F4F4F5]">
        
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E4E4E7] dark:border-[#27272A] pb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#EA580C]/10 dark:bg-[#FB923C]/20 border border-[#EA580C]/30 dark:border-[#FB923C]/30 flex items-center justify-center text-[#EA580C] dark:text-[#FB923C] shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-xl font-bold tracking-tight text-[#18181B] dark:text-[#F4F4F5]">
                Design System Palette Specification
              </h3>
              <p className="text-xs text-[#71717A] dark:text-[#A1A1AA]">
                Applied color tokens for Clean &amp; Focused Light Mode and Sleek &amp; Eye-Friendly Dark Mode
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="min-h-[40px] sm:min-h-0 px-3 py-1.5 rounded-xl border border-[#E4E4E7] dark:border-[#27272A] bg-slate-100 dark:bg-zinc-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-[#FB923C]" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-[#18181B]" />
                  <span>Dark Mode</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="min-h-[40px] min-w-[40px] sm:min-h-0 sm:min-w-0 flex items-center justify-center p-1.5 text-[#71717A] dark:text-[#A1A1AA] hover:text-[#18181B] dark:hover:text-[#F4F4F5] rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Token Cards */}
        <div className="sm:hidden space-y-3">
          {paletteTable.map((item) => (
            <div key={item.element} className="p-3.5 rounded-2xl border border-[#E4E4E7] dark:border-[#27272A] bg-slate-50/70 dark:bg-zinc-900/40 space-y-2.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-[#18181B] dark:text-[#F4F4F5]">{item.element}</span>
                <span className="inline-flex items-center gap-1 font-semibold text-[10px] text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-3 h-3 shrink-0" />
                  {item.wcagStatus}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-[#E4E4E7] dark:border-[#27272A]">
                  <span className="text-[10px] text-[#71717A] dark:text-[#A1A1AA] block mb-1">Light Theme</span>
                  <button
                    onClick={() => handleCopy(item.lightHex)}
                    className="font-mono text-xs text-[#18181B] dark:text-[#F4F4F5] flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="w-3.5 h-3.5 rounded border border-slate-300 shrink-0" style={{ backgroundColor: item.lightHex }} />
                    <span>{item.lightHex}</span>
                    {copiedHex === item.lightHex ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-2.5 h-2.5 opacity-40" />}
                  </button>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-[#E4E4E7] dark:border-[#27272A]">
                  <span className="text-[10px] text-[#71717A] dark:text-[#A1A1AA] block mb-1">Dark Theme</span>
                  <button
                    onClick={() => handleCopy(item.darkHex)}
                    className="font-mono text-xs text-[#18181B] dark:text-[#F4F4F5] flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="w-3.5 h-3.5 rounded border border-zinc-700 shrink-0" style={{ backgroundColor: item.darkHex }} />
                    <span>{item.darkHex}</span>
                    {copiedHex === item.darkHex ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-2.5 h-2.5 opacity-40" />}
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-[#71717A] dark:text-[#A1A1AA] leading-relaxed">{item.note}</p>
            </div>
          ))}
        </div>

        {/* Desktop Master Tokens Table */}
        <div className="hidden sm:block overflow-x-auto rounded-2xl border border-[#E4E4E7] dark:border-[#27272A]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-zinc-900/60 text-[#71717A] dark:text-[#A1A1AA] border-b border-[#E4E4E7] dark:border-[#27272A]">
              <tr>
                <th className="py-3 px-4 font-bold">UI Element</th>
                <th className="py-3 px-4 font-bold">Light Theme (#Hex)</th>
                <th className="py-3 px-4 font-bold">Dark Theme (#Hex)</th>
                <th className="py-3 px-4 font-bold">WCAG Compliance</th>
                <th className="py-3 px-4 font-bold">Implementation Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E4E7] dark:divide-[#27272A]">
              {paletteTable.map((item) => (
                <tr key={item.element} className="hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-[#18181B] dark:text-[#F4F4F5]">
                    {item.element}
                  </td>

                  {/* Light Theme Hex */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-4 h-4 rounded-md border border-slate-300 shadow-2xs shrink-0"
                        style={{ backgroundColor: item.lightHex }}
                      />
                      <button
                        onClick={() => handleCopy(item.lightHex)}
                        className="font-mono text-xs text-[#18181B] dark:text-[#F4F4F5] flex items-center gap-1 hover:text-[#EA580C] cursor-pointer"
                        title="Click to copy"
                      >
                        <span>{item.lightHex}</span>
                        {copiedHex === item.lightHex ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-2.5 h-2.5 opacity-40" />}
                      </button>
                    </div>
                    <span className="text-[10px] text-[#71717A] dark:text-[#A1A1AA] block mt-0.5">
                      {item.lightName}
                    </span>
                  </td>

                  {/* Dark Theme Hex */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-4 h-4 rounded-md border border-zinc-700 shadow-2xs shrink-0"
                        style={{ backgroundColor: item.darkHex }}
                      />
                      <button
                        onClick={() => handleCopy(item.darkHex)}
                        className="font-mono text-xs text-[#18181B] dark:text-[#F4F4F5] flex items-center gap-1 hover:text-[#FB923C] cursor-pointer"
                        title="Click to copy"
                      >
                        <span>{item.darkHex}</span>
                        {copiedHex === item.darkHex ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-2.5 h-2.5 opacity-40" />}
                      </button>
                    </div>
                    <span className="text-[10px] text-[#71717A] dark:text-[#A1A1AA] block mt-0.5">
                      {item.darkName}
                    </span>
                  </td>

                  {/* WCAG */}
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 font-semibold text-[11px] text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {item.wcagStatus}
                    </span>
                  </td>

                  {/* Note */}
                  <td className="py-3.5 px-4 text-[#71717A] dark:text-[#A1A1AA] text-[11px] leading-relaxed max-w-xs">
                    {item.note}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Priority Accessibility Recommendation Showcase */}
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border border-[#E4E4E7] dark:border-[#27272A] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#EA580C] dark:text-[#FB923C]" />
              <h4 className="text-sm font-bold text-[#18181B] dark:text-[#F4F4F5]">
                Key Improvement: Dark Mode Button Contrast (#FB923C)
              </h4>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              WCAG AAA Recommendation
            </span>
          </div>

          <p className="text-xs text-[#71717A] dark:text-[#A1A1AA] leading-relaxed">
            In Dark Mode, your softened orange accent is <code className="font-mono text-xs font-bold text-[#18181B] dark:text-[#F4F4F5]">#FB923C</code>. If white text is used, the contrast ratio is only <strong>2.2:1 (Fails WCAG)</strong>. By using your Charcoal token (<code className="font-mono text-xs font-bold text-[#18181B] dark:text-[#F4F4F5]">#18181B</code>), the contrast jumps to <strong>7.9:1 (WCAG AAA)</strong>.
          </p>

          {/* Interactive Contrast Demonstration */}
          <div className="p-4 rounded-xl bg-[#121212] border border-[#27272A] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDemoButtonTextColor('white')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  demoButtonTextColor === 'white'
                    ? 'bg-zinc-700 text-white'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                White Text (2.2:1 Fail)
              </button>
              <button
                onClick={() => setDemoButtonTextColor('charcoal')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                  demoButtonTextColor === 'charcoal'
                    ? 'bg-[#FB923C] text-[#18181B]'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                Charcoal Text (7.9:1 AAA)
              </button>
            </div>

            <button
              className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${
                demoButtonTextColor === 'white'
                  ? 'bg-[#FB923C] text-white shadow-xs'
                  : 'bg-[#FB923C] text-[#18181B] shadow-md'
              }`}
            >
              Start Exam (Live Preview)
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs text-[#71717A] dark:text-[#A1A1AA] pt-2 text-center sm:text-left">
          <span>Active Palette: Clean &amp; Focused Light / Sleek &amp; Eye-Friendly Dark</span>
          <button
            onClick={onClose}
            className="w-full sm:w-auto min-h-[44px] sm:min-h-0 px-4 py-2 rounded-xl bg-[#EA580C] dark:bg-[#FB923C] text-white dark:text-[#18181B] font-bold cursor-pointer hover:opacity-95 transition-opacity"
          >
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );
};
