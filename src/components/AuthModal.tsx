import React, { useState } from 'react';
import { UserProfile, ExamCategory } from '../types';
import { 
  X, 
  User, 
  ShieldCheck, 
  LogIn, 
  GraduationCap, 
  Sparkles, 
  Building2, 
  BookOpen,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { switchStudentPersona, saveUserProfile } from '../data/storage';
import { ADMIN_USER_PROFILE } from '../data/seedData';
import { Avatar } from './Avatar';

interface AuthModalProps {
  currentUser: UserProfile;
  onClose: () => void;
  onProfileUpdated: (profile: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  currentUser,
  onClose,
  onProfileUpdated
}) => {
  const [authMode, setAuthMode] = useState<'switch_persona' | 'custom_login' | 'admin_auth'>('switch_persona');
  const [name, setName] = useState(currentUser.name);
  const [rollNo, setRollNo] = useState(currentUser.rollNo);
  const [email, setEmail] = useState(currentUser.email);
  const [targetExam, setTargetExam] = useState<ExamCategory>(currentUser.targetExam);
  const [institute, setInstitute] = useState(currentUser.institute);
  const [adminPin, setAdminPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handlePersonaSelect = (persona: 'rishabh' | 'admin') => {
    const updated = switchStudentPersona(persona);
    onProfileUpdated(updated);
    setSuccessMsg(`Switched profile to ${updated.name} (${updated.role.toUpperCase()})`);
    setTimeout(() => {
      onClose();
    }, 800);
  };

  const handleCustomStudentLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !rollNo.trim()) {
      setErrorMsg('Please complete candidate name and roll number fields.');
      return;
    }

    const updated: UserProfile = {
      ...currentUser,
      name: name.trim(),
      rollNo: rollNo.trim(),
      email: email.trim(),
      targetExam,
      institute: institute.trim() || 'Nirmala Memorial Foundation College of Commerce and Science (Autonomous)',
      role: 'student'
    };

    saveUserProfile(updated);
    onProfileUpdated(updated);
    setSuccessMsg('Student profile authenticated successfully!');
    setTimeout(() => onClose(), 800);
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Default PIN: admin123 or 2026
    if (adminPin === 'admin123' || adminPin === '2026' || adminPin === 'admin') {
      const updated: UserProfile = {
        ...ADMIN_USER_PROFILE,
        role: 'admin'
      };
      saveUserProfile(updated);
      onProfileUpdated(updated);
      setSuccessMsg('Admin Faculty Access Granted!');
      setTimeout(() => onClose(), 800);
    } else {
      setErrorMsg('Invalid Administrator Passcode. (Try "admin123" or "2026")');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col transition-colors duration-200">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white font-serif truncate">Candidate & Faculty Authentication</h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">Competitive Exam and Current Affairs Mock Test Portal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] sm:min-h-0 sm:min-w-0 flex items-center justify-center p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 p-1.5 gap-1.5 text-xs font-bold overflow-x-auto scrollbar-none shrink-0">
          <button
            onClick={() => { setAuthMode('switch_persona'); setErrorMsg(''); }}
            className={`shrink-0 sm:shrink sm:flex-1 whitespace-nowrap min-h-[40px] sm:min-h-0 px-3 sm:px-2 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              authMode === 'switch_persona'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>Demo Candidates</span>
          </button>

          <button
            onClick={() => { setAuthMode('custom_login'); setErrorMsg(''); }}
            className={`shrink-0 sm:shrink sm:flex-1 whitespace-nowrap min-h-[40px] sm:min-h-0 px-3 sm:px-2 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              authMode === 'custom_login'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <User className="w-3.5 h-3.5 shrink-0" />
            <span>Custom Student</span>
          </button>

          <button
            onClick={() => { setAuthMode('admin_auth'); setErrorMsg(''); }}
            className={`shrink-0 sm:shrink sm:flex-1 whitespace-nowrap min-h-[40px] sm:min-h-0 px-3 sm:px-2 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              authMode === 'admin_auth'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Faculty Admin</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
              <X className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Mode 1: Quick Persona Switcher */}
          {authMode === 'switch_persona' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Quickly switch between the demo aspirant profile and faculty admin mode:
              </p>

              <div className="grid grid-cols-1 gap-3">
                {/* Rishabh Demo Profile */}
                <div
                  onClick={() => handlePersonaSelect('rishabh')}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all shadow-xs ${
                    currentUser.name === 'Rishabh' && currentUser.role === 'student'
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 ring-1 ring-amber-500/50'
                      : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Avatar
                      name="Rishabh"
                      size="md"
                    />
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">Rishabh</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Roll #101 • TYIT B • rishabh@gmail.com</p>
                      <span className="inline-block mt-1 px-2 py-0.5 bg-cyan-50 dark:bg-cyan-950/50 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 rounded text-[10px] font-bold">
                        Demo Candidate · Target: UPSC
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Admin Persona */}
              <div
                onClick={() => handlePersonaSelect('admin')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between shadow-xs ${
                  currentUser.role === 'admin'
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 ring-1 ring-amber-500/50'
                    : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Avatar
                    name="Admin"
                    role="admin"
                    size="md"
                  />
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Admin</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Portal Administrator • Admin Module</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-amber-500 text-slate-950 text-[10px] font-extrabold uppercase rounded-lg">
                  Admin Mode
                </span>
              </div>
            </div>
          )}

          {/* Mode 2: Custom Student Login Form */}
          {authMode === 'custom_login' && (
            <form onSubmit={handleCustomStudentLogin} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Candidate Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm sm:text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:bg-white dark:focus:bg-slate-900 transition-colors"
                    placeholder="e.g. Aditi Sharma"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Roll Number / Student ID *</label>
                  <input
                    type="text"
                    value={rollNo}
                    onChange={e => setRollNo(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm sm:text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:bg-white dark:focus:bg-slate-900 transition-colors"
                    placeholder="e.g. 45"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm sm:text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:bg-white dark:focus:bg-slate-900 transition-colors"
                    placeholder="rishabh@gmail.com"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Primary Target Exam</label>
                  <select
                    value={targetExam}
                    onChange={e => setTargetExam(e.target.value as ExamCategory)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm sm:text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:bg-white dark:focus:bg-slate-900 font-medium transition-colors"
                  >
                    <option value="UPSC Civil Services">UPSC Civil Services</option>
                    <option value="SSC (CGL/CHSL/MTS)">SSC (CGL/CHSL/MTS)</option>
                    <option value="Banking (IBPS/SBI/RBI)">Banking (IBPS/SBI/RBI)</option>
                    <option value="Railways (RRB NTPC/Group D)">Railways (RRB NTPC/Group D)</option>
                    <option value="General Studies & Science">General Studies & Science</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 text-xs">College / Educational Institution</label>
                <input
                  type="text"
                  value={institute}
                  onChange={e => setInstitute(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white text-sm sm:text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white dark:focus:bg-slate-900 transition-colors"
                  placeholder="Nirmala Memorial Foundation College of Commerce and Science (Autonomous)"
                />
              </div>

              <button
                type="submit"
                className="w-full min-h-[44px] py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4" /> Save Student Profile & Enter Portal
              </button>
            </form>
          )}

          {/* Mode 3: Faculty Admin Login */}
          {authMode === 'admin_auth' && (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                <span className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> Administrator Management Clearance
                </span>
                <p>
                  Faculty and administrators can manage daily current affairs posts, add/edit question bank items, create custom mock tests, and review aggregate student analytics.
                </p>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 font-mono pt-1">
                  Default Demo Passcode: <span className="text-amber-800 dark:text-amber-300 font-bold">admin123</span> or <span className="text-amber-800 dark:text-amber-300 font-bold">2026</span>
                </p>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 text-xs">Admin Access Key / PIN *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={adminPin}
                    onChange={e => setAdminPin(e.target.value)}
                    placeholder="Enter admin passcode (e.g. admin123)"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-slate-900 dark:text-white text-sm sm:text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white dark:focus:bg-slate-900 transition-colors"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full min-h-[44px] py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" /> Unlock Admin Faculty Dashboard
              </button>
            </form>
          )}

        </div>

      </div>
    </div>
  );
};
