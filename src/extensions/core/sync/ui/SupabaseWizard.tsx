/**
 * @module SupabaseWizard
 * @description
 * Clean, professional onboarding wizard guiding users through setting up a free-tier
 * Supabase PostgreSQL database for cross-device note synchronization.
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { SupabaseProvider } from '../providers/SupabaseProvider';
import {
  CopyIcon,
  CheckIcon,
  ExternalLinkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DatabaseIcon,
  RefreshIcon,
} from './Icons';

interface SupabaseWizardProps {
  projectUrl: string;
  anonKey: string;
  onUpdateCredentials: (projectUrl: string, anonKey: string) => void;
  onTestConnection: () => void;
  isTesting: boolean;
}

export const SupabaseWizard: React.FC<SupabaseWizardProps> = ({
  projectUrl,
  anonKey,
  onUpdateCredentials,
  onTestConnection,
  isTesting,
}) => {
  const [copiedSql, setCopiedSql] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!projectUrl || !anonKey);

  const provider = new SupabaseProvider({ projectUrl, anonKey }, 'wizard');
  const sqlScript = provider.getSchemaScript();

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(sqlScript);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    } catch {}
  };

  return (
    <div className="bg-[#1e1e1e] border border-[#2e2e2e] rounded-xl overflow-hidden divide-y divide-[#282828]">
      {/* Header Banner */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#252525] border border-[#333] flex items-center justify-center text-[#34d399] shrink-0">
            <DatabaseIcon size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-white">Supabase Free Tier Setup</span>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-[#162a20] text-[#34d399] border border-[#065f46]/60 rounded-[4px]">
                Free Forever
              </span>
            </div>
            <p className="text-[11px] text-[#777] mt-0.5">
              500 MB cloud database with zero subscriptions, payment cards, or usage fees.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="noether-btn text-xs py-1 px-2.5 flex items-center gap-1.5 cursor-pointer"
        >
          <span>{isExpanded ? 'Hide Steps' : 'Show Setup Steps'}</span>
          {isExpanded ? <ChevronUpIcon size={12} /> : <ChevronDownIcon size={12} />}
        </button>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4 bg-[#1b1b1b]">
          {/* Step 1 */}
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-[#282828] text-[#aaa] text-[11px] flex items-center justify-center font-semibold border border-[#383838] shrink-0 mt-0.5">
              1
            </div>
            <div className="space-y-1 flex-1">
              <p className="text-xs text-[#dcddde] font-medium">Create a free project on Supabase</p>
              <p className="text-[11px] text-[#777] leading-relaxed">
                Sign in to <span className="font-mono text-[#dcddde]">supabase.com</span> and click{' '}
                <strong className="text-white">New Project</strong>. Choose your nearest geographic region and set any secure database password.
              </p>
              <div className="pt-0.5">
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[var(--noether-accent,#eb584d)] hover:underline font-medium"
                >
                  <span>Open Supabase Dashboard</span>
                  <ExternalLinkIcon size={11} />
                </a>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-[#282828] text-[#aaa] text-[11px] flex items-center justify-center font-semibold border border-[#383838] shrink-0 mt-0.5">
              2
            </div>
            <div className="space-y-2 flex-1">
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#dcddde] font-medium">
                  Initialize Sync Schema in SQL Editor
                </p>
                <Button
                  size="sm"
                  onClick={handleCopySql}
                  icon={copiedSql ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
                >
                  {copiedSql ? 'Copied to Clipboard' : 'Copy SQL Script'}
                </Button>
              </div>
              <p className="text-[11px] text-[#777]">
                In Supabase, open <strong className="text-white">SQL Editor</strong> on the left, click <strong className="text-white">New query</strong>, paste the copied SQL, and click <strong className="text-white">Run</strong>.
              </p>
              <pre className="text-[10px] font-mono bg-[#141414] p-3 rounded-[6px] border border-[#2a2a2a] text-[#888] max-h-24 overflow-y-auto select-all">
                {sqlScript}
              </pre>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-[#282828] text-[#aaa] text-[11px] flex items-center justify-center font-semibold border border-[#383838] shrink-0 mt-0.5">
              3
            </div>
            <div className="space-y-3 flex-1">
              <div>
                <p className="text-xs text-[#dcddde] font-medium">Paste Project Credentials</p>
                <p className="text-[11px] text-[#777] mt-0.5">
                  In your Supabase project, go to <strong className="text-white">Project Settings → API</strong>. Copy your <strong className="text-white">Project URL</strong> and <strong className="text-white">anon public key</strong>:
                </p>
              </div>

              <div className="space-y-2.5 bg-[#171717] p-3.5 rounded-lg border border-[#262626]">
                <div>
                  <label className="block text-[11px] font-normal text-[#888] mb-1">
                    Project URL
                  </label>
                  <TextInput
                    isMono
                    value={projectUrl}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdateCredentials(e.target.value.trim(), anonKey)}
                    placeholder="https://xxxxxxxxxxxxxxxxxxxx.supabase.co"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-normal text-[#888] mb-1">
                    Anon Public API Key
                  </label>
                  <TextInput
                    isMono
                    type="password"
                    value={anonKey}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdateCredentials(projectUrl, e.target.value.trim())}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full"
                  />
                </div>

                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[10px] text-[#666]">
                    Stored locally on this device. Never uploaded to third parties.
                  </span>
                  <Button
                    size="sm"
                    onClick={onTestConnection}
                    disabled={isTesting || !projectUrl || !anonKey}
                    icon={<RefreshIcon size={12} className={isTesting ? 'animate-spin' : ''} />}
                  >
                    {isTesting ? 'Testing Connection...' : 'Verify Connection'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
