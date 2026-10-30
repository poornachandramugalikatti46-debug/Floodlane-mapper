import React, {useState} from 'react';
import {Download} from 'lucide-react';
import {usePWAInstall} from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'sidebar' | 'card';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({variant = 'sidebar'}) => {
  const {isInstallable, isInstalled, isIOS, install} = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        className={
          variant === 'sidebar'
            ? 'w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer'
            : 'inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer'
        }
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>{isIOS ? 'Install on iPhone / iPad' : 'Install Offline App (PWA)'}</span>
      </button>

      {showGuideModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-guide-title"
        >
          <div className="w-full max-w-md rounded-xl bg-white border border-slate-200 p-6 shadow-xl text-slate-900">
            <h3 id="pwa-install-guide-title" className="text-lg font-bold">
              Install FloodLane Mapper to Home Screen
            </h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              FloodLane Mapper includes a Web App Manifest and Workbox Service Worker for offline basti mapping.
            </p>
            {isIOS ? (
              <ol className="mt-3 space-y-2 text-sm text-slate-700 list-decimal list-inside">
                <li>Tap the <strong>Share</strong> icon in your Safari toolbar.</li>
                <li>Select <strong>Add to Home Screen</strong> to launch standalone offline mode.</li>
              </ol>
            ) : (
              <ol className="mt-3 space-y-2 text-sm text-slate-700 list-decimal list-inside">
                <li>Open this app in a full browser tab (outside an embedded preview frame if applicable).</li>
                <li>Click the browser address-bar <strong>Install FloodLane Mapper</strong> icon or menu option <strong>Install App</strong>.</li>
              </ol>
            )}
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
