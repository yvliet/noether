import React from 'react';
import { useFsrsSettings, DEFAULT_FSRS_SETTINGS } from './fsrsSettings';
import { useWorkspaceStore } from '@/store/workspaceStore';
import { CustomSelect } from '@/components/common/CustomSelect';
import { RotateCcwIcon } from '@/components/common/Icons';
import { ToggleSwitch } from '@/components/common/ToggleSwitch';

export const FsrsSettingsTab: React.FC = () => {
  const {
    fsrsRetention,
    setFsrsRetention,
    fsrsMaxInterval,
    setFsrsMaxInterval,
    autoFlip,
    setAutoFlip,
    maxReviewsPerSession,
    setMaxReviewsPerSession,
    showReviewSummary,
    setShowReviewSummary,
    restoreDefaults,
  } = useFsrsSettings();

  const { showToast } = useWorkspaceStore();

  const isModified =
    fsrsRetention !== DEFAULT_FSRS_SETTINGS.fsrsRetention ||
    fsrsMaxInterval !== DEFAULT_FSRS_SETTINGS.fsrsMaxInterval ||
    autoFlip !== DEFAULT_FSRS_SETTINGS.autoFlip ||
    maxReviewsPerSession !== DEFAULT_FSRS_SETTINGS.maxReviewsPerSession ||
    showReviewSummary !== DEFAULT_FSRS_SETTINGS.showReviewSummary;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between px-4">
        <div>
          <h3 className="text-sm font-semibold text-white mb-0.5">Spaced repetition (FSRS v4.5)</h3>
          <p className="text-[11px] text-[#777]">Fine-tune the Free Spaced Repetition Scheduler algorithm and study session behavior.</p>
        </div>
        {isModified && (
          <button
            onClick={() => {
              restoreDefaults();
              showToast('Restored FSRS spaced repetition defaults', 'info');
            }}
            className="px-2.5 py-1 text-xs text-[#888] hover:text-white hover:bg-[#282828] rounded-[5px] border border-[#333] hover:border-[#444] shadow-[0_1px_2px_rgba(0,0,0,0.35)] cursor-pointer flex items-center gap-1.5 transition-all"
          >
            <RotateCcwIcon size={12} />
            <span>Restore defaults</span>
          </button>
        )}
      </div>

      <div className="bg-[#202020] border border-[#2a2a2a] rounded-xl overflow-hidden divide-y divide-[#282828]">
        {/* Request Retention */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Request retention</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Target probability of recalling a card at the scheduled review date.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {fsrsRetention !== DEFAULT_FSRS_SETTINGS.fsrsRetention && (
              <button
                type="button"
                onClick={() => setFsrsRetention(DEFAULT_FSRS_SETTINGS.fsrsRetention)}
                title="Restore default retention (90%)"
                className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] transition-colors cursor-pointer shrink-0 flex items-center justify-center"
              >
                <RotateCcwIcon size={13} />
              </button>
            )}
            <CustomSelect
              value={fsrsRetention}
              onChange={setFsrsRetention}
              options={[
                { value: '0.80', label: '80% (Long intervals, less review time)' },
                { value: '0.85', label: '85% (Fewer reviews)' },
                { value: '0.90', label: '90% (Recommended default)' },
                { value: '0.95', label: '95% (Higher retention, more reviews)' },
              ]}
            />
          </div>
        </div>

        {/* Max Interval */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Maximum interval</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Maximum review interval cap in days for mature flashcards.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {fsrsMaxInterval !== DEFAULT_FSRS_SETTINGS.fsrsMaxInterval && (
              <button
                type="button"
                onClick={() => setFsrsMaxInterval(DEFAULT_FSRS_SETTINGS.fsrsMaxInterval)}
                title="Restore default max interval (36500 days)"
                className="p-1 rounded-md text-[#777] hover:text-white hover:bg-[#282828] transition-colors cursor-pointer shrink-0 flex items-center justify-center"
              >
                <RotateCcwIcon size={13} />
              </button>
            )}
            <input
              type="number"
              value={fsrsMaxInterval}
              onChange={(e) => setFsrsMaxInterval(e.target.value)}
              className="w-28 bg-[#181818] border border-[#383838] focus:border-[#555] text-white text-xs rounded-[5px] px-3 py-1.5 outline-none font-mono shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] transition-colors"
            />
          </div>
        </div>

        {/* Spacebar to Auto-Flip */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Spacebar reveals answer</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Pressing Space or Enter will flip the flashcard to reveal the answer.
            </span>
          </div>
          <ToggleSwitch
            checked={autoFlip}
            onChange={setAutoFlip}
          />
        </div>

        {/* Max Reviews Per Session */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Max cards per study session</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Limit the number of due cards reviewed in a single continuous session.
            </span>
          </div>
          <input
            type="number"
            min={5}
            max={500}
            step={5}
            value={maxReviewsPerSession}
            onChange={(e) => setMaxReviewsPerSession(Math.max(5, parseInt(e.target.value) || 50))}
            className="w-28 bg-[#181818] border border-[#383838] focus:border-[#555] text-white text-xs rounded-[5px] px-3 py-1.5 outline-none font-mono shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] transition-colors text-right"
          />
        </div>

        {/* Show Review Summary */}
        <div className="flex items-center justify-between p-4">
          <div className="flex flex-col pr-4">
            <span className="text-[13px] font-normal text-[#dcddde]">Celebration & session summary</span>
            <span className="text-[11px] text-[#777] mt-0.5">
              Display confetti celebration and card score statistics upon finishing daily reviews.
            </span>
          </div>
          <ToggleSwitch
            checked={showReviewSummary}
            onChange={setShowReviewSummary}
          />
        </div>
      </div>
    </div>
  );
};
