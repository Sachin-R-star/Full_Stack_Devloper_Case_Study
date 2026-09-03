import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Layers, Building2, UserCheck, Lock, AlertCircle, ArrowRight } from 'lucide-react';

interface InvitationDetails {
  email: string;
  role: string;
  organizationName: string;
  expiresAt: string;
}

export const AcceptInvitationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Account creation state
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setErrorMsg('No invitation token provided. Please check your invitation link.');
      setLoading(false);
      return;
    }
    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.get(`/auth/invitation/${token}`);
      setInvitation(res.data.invitation);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Invalid or expired invitation token.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await api.post('/auth/accept-invitation', {
        token,
        name,
        password,
        confirmPassword,
      });

      // Log user in automatically with issued JWT session token
      loginWithToken(res.data.token, res.data.user);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to complete registration');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-slate-400 text-sm">
        Verifying secure invitation link...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-md w-full space-y-8">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-red-700/20 border border-red-500/30 rounded-2xl text-red-400 mb-2">
            <Layers className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-white">Join Workspace</h1>
          <p className="text-slate-400 text-sm">Set up your account to join your organization team</p>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-300 flex items-start space-x-3 text-sm">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{errorMsg}</p>
              <p className="text-xs text-red-400 mt-1">
                If your link expired, ask your Organization Admin to issue a new invite.
              </p>
            </div>
          </div>
        )}

        {invitation && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
            {/* Invitation Banner */}
            <div className="bg-red-950/40 border border-red-800/40 rounded-2xl p-4 flex items-center space-x-3">
              <Building2 className="h-6 w-6 text-red-400 flex-shrink-0" />
              <div>
                <div className="text-xs text-red-300 font-medium">You have been invited to join</div>
                <div className="text-base font-bold text-white">{invitation.organizationName}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Assigned Role: <span className="text-red-300 uppercase font-semibold">{invitation.role}</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Invited Work Email</label>
                <input
                  type="email"
                  readOnly
                  value={invitation.email}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm font-mono text-slate-400 select-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Your Full Name</label>
                <div className="relative">
                  <UserCheck className="h-4 w-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Jane Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Create Password</label>
                <div className="relative">
                  <Lock className="h-4 w-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="h-4 w-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3.5 rounded-xl text-sm shadow-lg shadow-red-700/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 mt-2"
              >
                <span>{submitting ? 'Creating Account...' : 'Accept Invitation & Complete Setup'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}

        <div className="text-center text-xs text-slate-500">
          Already have an active account?{' '}
          <Link to="/login" className="text-red-400 hover:underline font-semibold">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
